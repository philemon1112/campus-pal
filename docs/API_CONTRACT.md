# CampusPal — API Contract

The exact wire contract the CampusPal frontend speaks: every request it
sends, every response shape it parses.

> **Delivered 2026-08-15.** This started as a request to the backend team;
> all of it now exists. Statuses below were re-verified against the live API
> on that date, and the notes marked **⚠️ gotcha** are the places where the
> delivered shape differs from what this document originally asked for —
> those are the ones that broke the client. What's still outstanding is in
> [`API_REQUIREMENTS.md`](API_REQUIREMENTS.md).

- **Base URL:** `https://tms-api-m7yf.onrender.com/api/v1`
- **Legend:** ✅ verified live · ⚠️ live with a caveat
- Every curl below assumes `BASE=https://tms-api-m7yf.onrender.com/api/v1`
  and, where authed, `TOKEN=<accessToken>`.

---

## 0. Conventions — these apply to every endpoint

The client (`src/lib/api/client.ts`) assumes all of this. The existing API
already honours it; match it exactly for anything new.

### 0.1 Response envelope

**Every** response, success or error, is:

```json
{ "code": 200, "message": "OK", "data": { } }
```

The client reads `data` on success and `{ code, message }` on failure. A bare
payload with no envelope will throw at the boundary.

### 0.2 Pagination

Any list endpoint takes `?page=&limit=` and returns `data` as:

```json
{
  "results": [],
  "total": 0,
  "page": 1,
  "pageSize": 20,
  "totalPages": 0
}
```

`results` is always present and an array, even when empty.

**⚠️ gotcha — `limit` is capped at 100.** Anything higher is a `400`:

```json
{ "code": 400, "message": "limit must not be greater than 100", "data": null }
```

Defaults are `page=1`, `limit=20`. This broke the admin location console,
which was asking for `limit=200`. `MAX_PAGE_LIMIT` in
`src/lib/api/types.ts` is the client-side constant.

Note also that filters apply **before** paging, so `total` is the count
within the filter, not the size of the table.

### 0.3 Auth

JWT bearer: `Authorization: Bearer <accessToken>`.

Endpoints marked **PUBLIC** below must work with **no `Authorization` header
at all** — not "optional auth that 401s without it". Anyone can browse
CampusPal without an account (SRS FR-4.1), and the client deliberately sends
those calls with no header.

On `401` the client transparently calls `POST /auth/refresh` once and retries
the original request. If refresh fails it clears tokens and surfaces the
original error.

### 0.4 Errors

| Code | When |
| --- | --- |
| `400` | Validation. Join multiple messages into one string — the client renders `message` verbatim. |
| `401` | Missing/expired token. |
| `403` | Authenticated but wrong role. |
| `404` | Not found — **also** for a resource owned by another user. |
| `409` | Conflict (duplicate slug, email already registered). |

Error body uses the same envelope:

```json
{ "code": 400, "message": "lat must be a number", "data": null }
```

### 0.5 Other

- **Time:** ISO 8601 UTC strings (`"2026-08-15T09:30:00.000Z"`).
- **IDs:** opaque strings. The client never parses them.
- **Detail routes by `slug`, list/relations and writes by `id`** — the split
  `/restaurants/:slug` vs `/restaurants/:id/menu` already uses.
- **DELETE** returns `"data": null` with `200` or `204`.
- **Money:** integer minor units, field name `priceMinor` (`2500` = GHS
  25.00). See §7.2 — the API currently contradicts its own spec here.

---

## 1. Campus Locations ✅ — delivered

Backs `/explore`, `/explore/:slug` and `/admin/locations`. Live with 20 real
UG Legon records (Akuafo, Legon, Volta, Commonwealth, Balme Library, the
Great Hall, Night Market…).

### The `Location` object

```ts
{
  id: string;
  slug: string;
  name: string;
  category: 'LECTURE_HALL' | 'DEPARTMENT' | 'PARK_FIELD'
          | 'HOSTEL_HALL' | 'ADMINISTRATION' | 'OTHER';
  description?: string;
  lat: number;            // REQUIRED — not optional
  lng: number;            // REQUIRED
  photos: string[];       // array, not a single hero image
  buildingNotes?: string; // "Second floor, above the Registry"
  distanceKm?: number;    // present ONLY when the request supplied lat/lng
}
```

Three things that are load-bearing:

1. **`category` is the whole point.** The six pills on `/explore` drive
   `?category=`, and the values above are sent verbatim.
2. **`lat`/`lng` are required.** A location without coordinates can't be
   pinned or navigated to, which is most of what the app does with one.
3. **`photos` is an array.** The tourism API's single `heroImageUrl` is why
   the detail page can only show one image today.

### 1.1 `GET /locations` — PUBLIC

Query params: `q`, `category`, `lat`, `lng`, `radiusKm`, `page`, `limit`.
All optional. `q` searches **name and description**. Passing `lat`/`lng`
should sort by proximity and populate `distanceKm` on each row — that is what
makes "Near me" a server-side sort.

The frontend sends `limit=60` on `/explore` and `limit=200` on
`/admin/locations`.

```bash
curl -s "$BASE/locations?q=balme&category=ADMINISTRATION&lat=5.6508&lng=-0.1870&limit=60"
```

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "results": [
      {
        "id": "loc_01HZY3",
        "slug": "balme-library",
        "name": "Balme Library",
        "category": "ADMINISTRATION",
        "description": "The main university library, opposite the Great Hall.",
        "lat": 5.6508,
        "lng": -0.187,
        "photos": [
          "https://res.cloudinary.com/.../balme-1.jpg",
          "https://res.cloudinary.com/.../balme-2.jpg"
        ],
        "buildingNotes": "Main entrance faces the University Square.",
        "distanceKm": 0.32
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 60,
    "totalPages": 1
  }
}
```

Omit `distanceKm` entirely when no coordinates were supplied — don't send
`null` or `0`.

### 1.2 `GET /locations/:slug` — PUBLIC

```bash
curl -s "$BASE/locations/balme-library"
```

`data` is a single `Location` object (same shape as a row above). `404` if
the slug is unknown.

### 1.3 `POST /locations` — ADMIN

**⚠️ gotcha — the caller supplies `slug`.** Unlike restaurants, where the
server generates one from the name, `POST /locations` requires a kebab-case
`slug` in the body and answers a duplicate with a `409`. The admin form
derives one from the name and lets an admin override it.

```bash
curl -s -X POST "$BASE/locations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "great-hall",
    "name": "Great Hall",
    "category": "ADMINISTRATION",
    "description": "Ceremonial hall used for congregation and matriculation.",
    "lat": 5.6519,
    "lng": -0.1863,
    "photos": ["https://res.cloudinary.com/.../great-hall.jpg"],
    "buildingNotes": "Top of the Legon hill, above the University Square."
  }'
```

`201` with the created `Location`. `409` if the slug is taken, `400` if
`category` isn't one of the six, `401`/`403` for a non-admin.

### 1.4 `PATCH /locations/:id` — ADMIN

Partial update; any subset of the create body. **Note the `id`, not the
slug.**

```bash
curl -s -X PATCH "$BASE/locations/loc_01HZY3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated description.", "category": "OTHER"}'
```

`200` with the full updated `Location`.

### 1.5 `DELETE /locations/:id` — ADMIN

```bash
curl -s -X DELETE "$BASE/locations/loc_01HZY3" -H "Authorization: Bearer $TOKEN"
```

```json
{ "code": 200, "message": "Location deleted", "data": null }
```

### 1.6 Seed data ✅

Delivered — 20 real UG Legon records. The one thing still missing is
**photography**: every location carries a single generic Unsplash image, and
`photos` is an array the detail page is built to gallery.

---

## 2. Food Joints ✅ — delivered, one data caveat

All four gaps closed: contacts, campus landmark, reviews and vendor writes.
The remaining problem is **data, not schema** — see §2.1.

### The `FoodJoint` object

```ts
{
  id: string;
  slug: string;
  name: string;
  cuisine: string;
  priceTier: number;        // 1-4, rendered as ₵ to ₵₵₵₵
  lat: number;
  lng: number;
  distanceKm?: number;      // only when lat/lng were supplied
  ratingAvg: number;
  ratingCount: number;
  dietary: ('VEGETARIAN' | 'VEGAN' | 'HALAL' | 'GLUTEN_FREE')[];
  isOpenNow: boolean;
  heroImageUrl?: string;
  images?: string[];
  description?: string;
  openingHours?: { day: number; opens: string; closes: string }[];  // day 0 = Sunday

  // The campus landmark this joint sits by — a real join, see §2.4.
  nearestLocation?: { id: string; slug: string; name: string };

  contactConsent: boolean;   // always present
  phone?: string;            // present ONLY when contactConsent is true
  whatsapp?: string;
  email?: string;
}
```

### 2.1 `GET /restaurants` ✅ — PUBLIC

Already working. Documented here so the filter contract is unambiguous:
`q`, `cuisine`, `priceTier`, `dietary`, `openNow`, `lat`, `lng`, `page`,
`limit`. The frontend sends `limit=30` and omits `openNow` entirely rather
than sending `false`.

```bash
curl -s "$BASE/restaurants?q=jollof&cuisine=Ghanaian&priceTier=2&dietary=HALAL&openNow=true&lat=5.6508&lng=-0.1870&limit=30"
```

Also accepts `nearestLocationId` and `nearestLocationSlug` (§2.4), and `?q=`
matches the landmark's name as well as the joint's — so `?q=Commonwealth`
finds the joints beside Commonwealth Hall.

**⚠️ Data gap — the listing serves two products.** `GET /restaurants` returns
**28 rows: 8 campus joints and 20 tourism venues** (Santoku in Airport
Residential, Chopstix in Kumasi, Oasis Beach Restaurant on the Volta). The
Food tab requests it unfiltered, so a student browsing for lunch sees mostly
restaurants hundreds of kilometres away.

There is no campus-scope filter to fix this with: `nearestLocationSlug`
answers "food near Commonwealth Hall", not "food on campus". **A
`?campusOnly=true` flag, or separating the datasets, is the ask** —
`API_REQUIREMENTS.md` §2.

### 2.2 `GET /restaurants/:slug` ✅ and `GET /restaurants/:id/menu` ✅ — PUBLIC

```bash
curl -s "$BASE/restaurants/azmera"
curl -s "$BASE/restaurants/rest_01HZ/menu"
```

Menu response — note the nesting, `data.sections`:

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "sections": [
      {
        "category": "Mains",
        "items": [
          {
            "name": "Jollof with chicken",
            "description": "Served with shito and salad.",
            "price": 45,
            "photoUrl": "https://res.cloudinary.com/.../jollof.jpg"
          }
        ]
      }
    ]
  }
}
```

**⚠️ gotcha — money is decimal cedis, not minor units.** `price: 45` means
GHS 45.00, at most two decimal places. This document originally asked for
integer `priceMinor`; decimal under the shorter name is the settled contract.
`src/lib/api/money.ts` normalises it at the boundary so the rest of the app
works in one unit. `photoUrl` per item is delivered too.

### 2.3 ✅ Contact fields — consent-gated

FR-2.4 works. **`phone`, `whatsapp` and `email` are omitted from the payload
entirely — not `null`, not `""` — unless `contactConsent` is true**, on list
results and detail alike.

```ts
contactConsent: boolean;   // always present
phone?: string;            // "+233201110006"
whatsapp?: string;         // digits only for wa.me: "233201110006"
email?: string;
```

Gate the UI on `contactConsent`, then null-check each channel separately: a
vendor may consent while publishing only one of the two numbers. Suppression
is server-side, so revoking consent takes the numbers off every screen with
no client release. **6 of 28 seeded joints have consented.**

### 2.4 ✅ Campus landmark — a join, not a string

Delivered as `nearestLocation` (a `{ id, slug, name }` summary on reads) and
`nearestLocationId` (on writes) — better than the `campusArea` string this
document originally asked for, because it links through to the location's own
page and is filterable:

```bash
curl -s "$BASE/restaurants?nearestLocationSlug=commonwealth-hall"
curl -s "$BASE/restaurants?nearestLocationId=903ce8f8-…"
```

It is also what lets the assistant answer "food joints near Legon Hall"
properly rather than by radius guesswork.

### 2.5 ❌ Reviews — blocks FR-2.8

Reviews today are tour-only and keyed to a booking, which CampusPal has no
concept of. Needed:

```bash
# PUBLIC
curl -s "$BASE/restaurants/rest_01HZ/reviews?page=1&limit=20"

# authed
curl -s -X POST "$BASE/restaurants/rest_01HZ/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "body": "Great waakye, quick service."}'
```

Paged list response:

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "results": [
      {
        "id": "rev_01HZ",
        "restaurantId": "e4450e70-692e-4019-8a7c-efa22d9217b4",
        "rating": 4,
        "body": "Great waakye, quick service.",
        "createdAt": "2026-08-15T09:30:00.000Z",
        "author": {
          "fullName": "Ama Mensah",
          "avatarUrl": "https://res.cloudinary.com/.../ama.jpg"
        }
      }
    ],
    "total": 1, "page": 1, "pageSize": 20, "totalPages": 1
  }
}
```

`POST` returns `201` with the created review. `rating` is an integer 1–5.
`author` is resolved server-side, so reviews carry a name rather than a bare
`authorId` for the client to look up.

**⚠️ gotcha — one review per diner per joint.** A second attempt is a `409`:

```json
{ "code": 409, "message": "You have already reviewed this restaurant", "data": null }
```

That is a state to explain ("you've already reviewed this"), not a failure to
retry. Reviews are **not** purchase-gated — any signed-in diner may leave
one. An `ADMIN` may remove one (§6.1); the rating aggregate is then recomputed
from the remaining rows rather than decremented.

### 2.6 ✅ Vendor writes — delivered

```bash
# create — owned by the calling vendor
curl -s -X POST "$BASE/restaurants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bush Canteen Waakye",
    "cuisine": "Ghanaian",
    "priceTier": 1,
    "lat": 5.6495,
    "lng": -0.1882,
    "description": "Waakye and stew, served from 7am.",
    "nearestLocationId": "41dfae7f-b0b8-456a-b3c0-49c7a3a09af0",
    "phone": "+233201234567",
    "whatsapp": "233201234567",
    "heroImageUrl": "https://res.cloudinary.com/.../waakye.jpg",
    "contactConsent": true
  }'

# partial update, owner only
curl -s -X PATCH "$BASE/restaurants/rest_01HZ" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"priceTier": 2}'

# replace the whole menu, owner only
curl -s -X PUT "$BASE/restaurants/rest_01HZ/menu" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"sections":[{"category":"Mains","items":[{"name":"Waakye","price":20}]}]}'

# read back your own listings (paginated)
curl -s "$BASE/restaurants/mine?limit=20" -H "Authorization: Bearer $TOKEN"
```

`GET /restaurants/mine` is what makes `/vendor` an edit screen rather than a
create-only one. It is declared before `/:slug`, so `mine` is never taken as
a slug.

Notes:

- The **slug is generated server-side** from the name with a short suffix —
  don't send one (the opposite of locations, §1.3).
- `PUT /menu` replaces the whole menu; send every section each time.
- **A non-owner write is a `403`** (`"Not the resource owner"`), not the
  `404` this document originally specified. `ADMIN` may act on any listing.
- **⚠️ The API whitelists DTO fields and rejects unknown ones with a `400`**,
  so don't spread extra client state into these payloads. Empty strings are
  not "unset" either — omit optional fields rather than sending `""`.

**Not verified end-to-end:** no `VENDOR` test account exists, so these calls
are wired and type-checked but have never been run against a real session.

---

## 3. AI Assistant ✅ — delivered, with SSE streaming

Live, grounded in the real location and restaurant tables, and it serves
guests. The client uses the **streaming** endpoint (§3.5) for chat and keeps
the synchronous POST as a fallback.

### 3.1 `POST /assistant/chat` — **PUBLIC**

```bash
curl -s -X POST "$BASE/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Where is Balme Library?"}'

# follow-up in the same conversation
curl -s -X POST "$BASE/assistant/chat" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "sess_01HZ", "message": "How do I get there from Legon Hall?"}'
```

```json
{
  "code": 200,
  "message": "OK",
  "data": {
    "sessionId": "sess_01HZ",
    "reply": "Balme Library is at the top of the University Square, opposite the Great Hall.",
    "actions": [
      { "type": "OPEN_LOCATION", "slug": "balme-library", "name": "Balme Library" },
      { "type": "SHOW_DIRECTIONS", "lat": 5.6508, "lng": -0.187, "name": "Balme Library" }
    ],
    "results": [
      { "kind": "LOCATION", "items": [ /* full Location objects from §1 */ ] }
    ]
  }
}
```

### 3.2 The action union — the most important design decision in the module

`actions` is a **closed, typed union**, never prose. FR-3.5 requires the
assistant to *perform* tasks, not just describe them; the client executes each
action with a `switch` and cannot safely act on a sentence.

```ts
type AssistantAction =
  | { type: 'OPEN_LOCATION';      slug: string; name: string }
  | { type: 'OPEN_FOOD_JOINT';    slug: string; name: string }
  | { type: 'SHOW_DIRECTIONS';    lat: number; lng: number; name: string }
  | { type: 'CONTACT_FOOD_JOINT'; slug: string; name: string;
                                  channel: 'CALL' | 'WHATSAPP' }
  | { type: 'SAVE_FAVORITE';      favoriteType: 'LOCATION' | 'FOOD_JOINT';
                                  itemId: string; name: string };
```

`actions` is always present — `[]` rather than omitted or `null`. `results`
is optional; `kind` picks which card component renders the rows, and `items`
are full `Location` / `FoodJoint` objects, so the same card component works
in chat and in a list.

### 3.3 What the server guarantees

1. **Guests are first-class.** No bearer token returns `200` with a fresh
   `sessionId`, not a `401`. Guest sessions have no owner, so they never
   appear in history and can't be deleted. Presenting a session id you don't
   own is a **`404`**, not a `403` — the response never confirms it exists.
2. **Every rendered field is server-authoritative.** `name`, and the
   `lat`/`lng` on `SHOW_DIRECTIONS`, are overwritten from the resolved record
   before the action is sent, so a model that names a real hall but attaches
   the wrong coordinates cannot move the map pin. Anything it invents is
   dropped, so every slug and id in `actions` resolves to a real record.
3. **`CONTACT_FOOD_JOINT` respects the §2.3 consent gate, per channel.**
   `channel: 'CALL'` only appears when a phone is published. The model is
   told which channels exist and is never given the numbers.
4. **No match means the model isn't called at all** — a fixed "I could not
   find anything on campus matching that" with `actions: []`, in ~70 ms. That
   is FR-3.6's out-of-scope answer; render it as an ordinary bubble, not an
   error.

### 3.4 ⚠️ NFR-3 latency is not met

The backend measures **9–16 s to first token** and full turns to ~120 s on
`openrouter/free`, against the SRS's 3–5 s. Measured from here on
2026-08-15 it was better — 1.8 s synchronous, ~6 s to first token in the
app — but it is model-dependent.

Closing the gap needs a faster `AI_OPENROUTE_MODEL` on the server; it's a
config change, not code. The client streams so the wait is perceived rather
than blocking, and the non-streaming fallback is capped at 130 s (up from 45
s, which the documented worst case would have exceeded).

### 3.5 `POST /assistant/chat/stream` — SSE, **PUBLIC**

What the chat panel actually calls. Same body as §3.1.

```bash
curl -N -X POST "$BASE/assistant/chat/stream" \
  -H 'Content-Type: application/json' \
  -d '{"message":"Where is Balme Library?"}'
```

```
event: delta
data: {"reply":"Balme"}

event: delta
data: {"reply":"Balme Library is"}

event: done
data: {"sessionId":"40a4ad51-…","reply":"Balme Library is …","actions":[…],"results":[…]}
```

| Event | `data` | Meaning |
| --- | --- | --- |
| `delta` | `{ reply }` | The prose **so far** — the whole reply to date, not a fragment |
| `done` | `ChatReply` | The authoritative payload: `sessionId`, grounded `actions`, `results` |
| `error` | `{ message }` | The turn failed; the stream then ends |

Three things that bite:

1. **Each `delta` is cumulative.** Replace your draft text; don't append, or
   you'll render "BalmeBalme LibraryBalme Library is".
2. **Only `done` is grounded.** Drive buttons and result cards off
   `done.actions` / `done.results`, never off streamed prose still in flight.
3. **⚠️ SSE frames are NOT enveloped** — unlike every other route in §0.1,
   the payload is the frame's own JSON. Errors *before* the stream opens
   still arrive as a normal envelope.

### 3.6 History — authed (FR-3.8)

```bash
curl -s "$BASE/assistant/sessions?limit=50" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/assistant/sessions/sess_01HZ"  -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$BASE/assistant/sessions/sess_01HZ" -H "Authorization: Bearer $TOKEN"
```

List (paged, §0.2) of:

```json
{
  "id": "sess_01HZ",
  "title": "Where is Balme Library?",
  "createdAt": "2026-08-15T09:30:00.000Z",
  "updatedAt": "2026-08-15T09:31:18.429Z"
}
```

**⚠️ gotcha — there is no `messageCount`.** This document asked for one; the
delivered shape carries `updatedAt` instead, and the list is ordered by last
activity. `title` is the first message trimmed, and is optional.

Single session — same fields plus `messages`:

```json
{
  "id": "sess_01HZ",
  "title": "Where is Balme Library?",
  "createdAt": "2026-08-15T09:30:00.000Z",
  "updatedAt": "2026-08-15T09:30:04.000Z",
  "messages": [
    {
      "id": "msg_1",
      "role": "USER",
      "content": "Where is Balme Library?",
      "createdAt": "2026-08-15T09:30:00.000Z"
    },
    {
      "id": "msg_2",
      "role": "ASSISTANT",
      "content": "Balme Library is at the top of the University Square...",
      "createdAt": "2026-08-15T09:30:04.000Z",
      "actions": [
        { "type": "OPEN_LOCATION", "slug": "balme-library", "name": "Balme Library" }
      ]
    }
  ]
}
```

`DELETE` returns `"data": null`. SRS 6.2: history is retained only for users
who opt in, and they must be able to clear it.

---

## 4. Accounts ✅ — delivered

### 4.1 Auth endpoints (all working, all PUBLIC)

```bash
curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d '{"email":"ama@st.ug.edu.gh","password":"Passw0rd!","fullName":"Ama Mensah","affiliation":"STUDENT"}'

curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"ama@st.ug.edu.gh","password":"Passw0rd!"}'

curl -s -X POST "$BASE/auth/refresh" -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

curl -s -X POST "$BASE/auth/logout" -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refreshToken>"}'

curl -s -X POST "$BASE/auth/forgot-password" -H "Content-Type: application/json" \
  -d '{"email":"ama@st.ug.edu.gh"}'

curl -s -X POST "$BASE/auth/reset-password" -H "Content-Type: application/json" \
  -d '{"token":"<emailed token>","password":"NewPassw0rd!"}'
```

`register`, `login` and `refresh` all return exactly:

```json
{ "code": 200, "message": "OK",
  "data": { "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

`logout`, `forgot-password` and `reset-password` return `"data": null`.

### 4.2 ✅ Roles — widened, not renamed

**⚠️ gotcha — the enum has seven members, not the SRS's five.** `TOURIST` and
`OPERATOR` were kept because they carry every existing tour booking, so
`UserRole` is:

```ts
'STUDENT' | 'STAFF' | 'VISITOR' | 'VENDOR' | 'ADMIN' | 'TOURIST' | 'OPERATOR'
```

`POST /auth/register` takes an optional **`affiliation`** of `STUDENT`,
`STAFF` or `VISITOR`, which becomes the account's role. **Omitting it creates
a `TOURIST`** — so a CampusPal signup that doesn't send one silently lands
outside every CampusPal role gate. The register screen always sends one.

`VENDOR`, `OPERATOR` and `ADMIN` are not self-selectable; sending one is a
`400` that spells out the allowed set. Those accounts are provisioned by the
backend — **and none exist for testing yet**, which is why `/vendor` and
`/admin/locations` are unverified.

### 4.3 Profile ✅

```bash
curl -s "$BASE/users/me" -H "Authorization: Bearer $TOKEN"

curl -s -X PATCH "$BASE/users/me" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fullName":"Ama Mensah","phone":"+233201234567","avatarUrl":"https://..."}'
```

```json
{
  "id": "usr_01HZ",
  "email": "ama@st.ug.edu.gh",
  "fullName": "Ama Mensah",
  "phone": "+233201234567",
  "avatarUrl": "https://res.cloudinary.com/.../ama.jpg",
  "role": "STUDENT"
}
```

`phone` and `avatarUrl` are `null` when unset — not omitted, not `""`.

### 4.4 Image upload ✅

The one multipart endpoint. Field name is `file`. Open to any authenticated
role.

```bash
curl -s -X POST "$BASE/uploads/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/photo.jpg"
```

```json
{ "code": 201, "message": "Uploaded",
  "data": { "url": "https://res.cloudinary.com/.../photo.jpg", "publicId": "campuspal/photo" } }
```

`400` if the file isn't an image; `503` if Cloudinary isn't configured.

---

## 5. Favourites ✅ — `LOCATION` delivered

The `type` enum is now `TOUR | STAY | RESTAURANT | DESTINATION | LOCATION`.
CampusPal uses two members: `LOCATION` as-is, and `RESTAURANT` under the
app's own name `FOOD_JOINT` (mapped in `src/lib/api/favorites.ts`). Both
work, so `/saved` holds locations and food joints alike.

```bash
curl -s "$BASE/favorites?limit=100&type=RESTAURANT" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$BASE/favorites" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"LOCATION","itemId":"loc_01HZY3"}'

curl -s -X DELETE "$BASE/favorites/fav_01HZ" -H "Authorization: Bearer $TOKEN"
```

Each row — `item` is snapshotted at save time, so `/saved` renders in one
call with no per-item lookups:

```json
{
  "id": "22806b01-3eca-4469-9a5a-608c43184395",
  "type": "LOCATION",
  "itemId": "ed4c3d35-e529-4236-bbf2-2cdfe5ad8e32",
  "item": {
    "title": "Akuafo Hall",
    "slug": "akuafo-hall",
    "imageUrl": "https://images.unsplash.com/photo-1552566626-52f8b828add9…"
  },
  "createdAt": "2026-08-15T07:21:32.696Z"
}
```

**⚠️ gotcha — the field is `item.title`, not `item.name`**, and there is no
`subtitle`. This document asked for `name`/`subtitle`; the delivered shape is
`{ title, slug?, imageUrl? }`, which rendered blank rows until the client was
corrected. For a `LOCATION` the snapshot's `imageUrl` is the first entry of
`photos[]`.

A duplicate save is a `409` and an unknown `itemId` a `404`. The client
treats `409` as "already saved" — the state the user asked for — rather than
as a failure.

---

## 6. Admin & reference

### 6.1 Moderation ✅ (SRS §7)

An administrator removes inappropriate ratings and feedback; the joint's
rating aggregate is recomputed from the remaining rows. Wired
(`deleteReview$`) but no UI calls it yet.

```bash
curl -s -X DELETE "$BASE/restaurants/rest_01HZ/reviews/rev_01HZ" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.2 Reference sets ✅

`location-categories` and `food-categories` were added alongside `cuisines`
and `dietary`.

```bash
curl -s "$BASE/reference/location-categories"
```

```json
{ "code": 200, "message": "OK",
  "data": [
    { "code": "LECTURE_HALL", "label": "Lecture Hall" },
    { "code": "DEPARTMENT",   "label": "Department" }
  ] }
```

**⚠️ gotcha — entries are `{ code, label }`, not `{ value, label }`.**
`GET /reference` also lists the tourism sets (`cabins`, `airports`,
`ride-statuses`…), which CampusPal ignores. Wrapped in
`src/lib/api/reference.ts`; the category pills still use the local labels,
since the server's ("Lecture Hall") are singular where the UI wants plural.

---

## 7. Still outstanding

### 7.1 ❌ CORS is unset on the deployed instance — **blocks production**

Still true as of 2026-08-15. **Zero `Access-Control-Allow-Origin` headers**
on any response, on any origin:

```bash
curl -si "$BASE/restaurants?limit=1" -H "Origin: https://campuspal.example" | grep -i access-control
# (returns nothing)
```

This is **not a code change** — `main.ts` already reads `CORS_ORIGINS` and
calls `enableCors`; the env var is simply unset on the Render service. Set it
to a comma-separated origin list and redeploy.

Locally the Vite dev proxy sidesteps it server-to-server. **There is no
equivalent workaround for a deployed CampusPal**, which calls the API from
the browser.

### 7.2 ✅ Money — resolved

Settled as **decimal cedis under the short name** (`price: 45` = GHS 45.00,
max two decimals), not the integer `priceMinor` this document originally
asked for. `src/lib/api/money.ts` normalises at the boundary so the app works
in one unit either way.

---

## 8. Not used by CampusPal

Listed so none of it is maintained on our behalf: Tours, Departures, Bookings,
Payments, Stays, Flights, Rides, Emergency, Itineraries, Loyalty,
Notifications, and the table-reservation endpoints
(`/restaurants/:id/availability`, `/restaurants/:id/reserve`,
`/reservations/*`).

The reservation endpoints work and were verified end-to-end in the app this
was forked from. They're dropped because the CampusPal SRS specifies a
directory with a Contact action and never mentions table reservations. If
reservations are wanted later, the backend side is already done.

---

## 9. What's left

Everything in §1–§6 is delivered and integrated. In priority order, what
still needs doing:

| # | Work | Where | Why it matters |
| --- | --- | --- | --- |
| 1 | Set `CORS_ORIGINS` on Render | §7.1 | Blocks any deploy. Config, not code. |
| 2 | A campus scope for `GET /restaurants` | §2.1 | The Food tab is 20/28 tourism venues today. |
| 3 | Provision `VENDOR` + `ADMIN` test accounts | §4.2 | Two finished consoles can't be exercised without them. |
| 4 | A faster `AI_OPENROUTE_MODEL` | §3.4 | NFR-3's 3–5 s budget. Config, not code. |
| 5 | Real campus photography | §1.6 | Every location has one generic stock image. |

Nothing on this list needs a frontend release.
