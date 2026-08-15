# CampusPal — API Contract

**For the backend engineer.** This is the exact wire contract the CampusPal
frontend is already written against: every request it sends, every response
shape it parses. Implement these and the screens light up with no client
change.

`API_REQUIREMENTS.md` explains *why* each of these is needed (traced to SRS
requirements). This document is the *what* — copy-pasteable curls and the
JSON expected back.

- **Base URL:** `https://tms-api-m7yf.onrender.com/api/v1`
- **Legend:** ✅ exists and works · ⚠️ exists but incomplete · ❌ not built
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

`results` must be present and an array even when empty — the client maps over
it unconditionally.

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

## 1. Campus Locations ❌ — the whole module is missing

Backs `/explore`, `/explore/:slug` and `/admin/locations`, all three already
built. This is the largest single unlock in the app.

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

```bash
curl -s -X POST "$BASE/locations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Great Hall",
    "category": "ADMINISTRATION",
    "description": "Ceremonial hall used for congregation and matriculation.",
    "lat": 5.6519,
    "lng": -0.1863,
    "photos": ["https://res.cloudinary.com/.../great-hall.jpg"],
    "buildingNotes": "Top of the Legon hill, above the University Square."
  }'
```

`201` with the created `Location` (server generates `id` and `slug`).
`409` if the generated slug collides. `403` for a non-admin.

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

### 1.6 Seed data

UG Legon needs a real dataset, verified against the official campus map:
halls of residence (Commonwealth, Legon, Akuafo, Volta, Mensah Sarbah), Balme
Library, the Registry, the Great Hall, departmental blocks, the sports
stadium. The schema work is wasted without it.

---

## 2. Food Joints ✅⚠️ — works; four gaps

`GET /restaurants`, `/restaurants/:slug` and `/restaurants/:id/menu` are live
and confirmed returning real data. What follows is the current shape plus the
fields that are missing.

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

  // ---- MISSING TODAY — §2.3 and §2.4 ----
  phone?: string;
  whatsapp?: string;
  email?: string;
  contactConsent: boolean;
  campusArea?: string;
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

Returns a page of `FoodJoint`. **Data gap:** the four seeded rows are Accra
city restaurants (Azmera in Airport Residential, etc.). They need replacing
with real campus joints.

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
            "priceMinor": 4500
          }
        ]
      }
    ]
  }
}
```

**Please send `priceMinor` (integer minor units).** The live API currently
sends `price: 45` in major units, which the client normalises at the
boundary — see §7.2.

Optional, per FR-2.3: add `photoUrl?: string` to a menu item.

### 2.3 ❌ Contact fields — **this blocks the headline food feature**

`RestaurantResponseDto` carries **no contact information of any kind**. FR-2.4
— call or WhatsApp a food joint — is the SRS's flagship food capability, and
the Contact bar on `/food/:slug` is built and renders **disabled**, with the
reason shown to the user, because there is nothing to call.

Add to `FoodJoint`:

```ts
phone?: string;          // "+233201234567"
whatsapp?: string;       // digits only for wa.me links: "233201234567"
email?: string;
contactConsent: boolean;
```

`contactConsent` is a legal requirement, not a nicety — SRS §7 says vendor
contact details are published only with consent. **Suppress `phone` and
`whatsapp` server-side when it is false**, rather than trusting clients to
hide them.

### 2.4 ❌ `campusArea`

FR-2.2 searches food joints **by location** and FR-2.3 shows a joint's
**location on campus**. `lat`/`lng` cannot render "behind Commonwealth Hall",
and neither can `distanceKm`, which only exists once the user shares a
position.

```ts
campusArea?: string;          // "Behind Commonwealth Hall"
// or, better, a real join to §1:
nearestLocationId?: string;
```

The join would also let the assistant answer "food joints near Legon Hall"
properly instead of by radius guesswork.

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

`POST` returns `201` with the single created review. `rating` is an integer
1–5; reject anything else with `400`.

**Please include `author`.** The tourism API's review payload carries an
`authorId` and no name, which is why its review list deliberately shows no
reviewer identity — the alternative would have been inventing one. Don't
repeat that.

### 2.6 ❌ Vendor writes — blocks FR-2.7

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
    "campusArea": "Bush Canteen",
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
  -d '{"sections":[{"category":"Mains","items":[{"name":"Waakye","priceMinor":2000}]}]}'

# read back your own listing
curl -s "$BASE/restaurants/mine" -H "Authorization: Bearer $TOKEN"
```

`GET /restaurants/mine` matters more than it looks: without it a vendor
cannot read back their own listing, so `/vendor` can only ever create and
never edit. The tourism app hit exactly this with tours and worked around it
by caching the create response in `localStorage`. Please don't make us do
that again.

Non-owner writes return `404`, not `403` (§0.4).

---

## 3. AI Assistant ❌ — the whole module is missing

The chat panel, its action executor and `/assistant/history` are all built.
This is the biggest build on the list and it depends on §1 existing, so the
assistant has real data to ground itself in.

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

`actions` must be a **closed, typed union**, never prose. FR-3.5 requires the
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

`actions` is always present — send `[]`, never omit it or send `null`.
`results` is optional; `kind` picks which card component renders the rows, and
`items` must be full `Location` / `FoodJoint` objects so the same card
component works in chat and in a list.

### 3.3 Five requirements on the implementation

1. **It must accept unauthenticated callers.** SRS 6.1 makes
   `Chat Session.User ID` nullable and FR-4.1 allows browsing without an
   account — a fresher's first question comes from a signed-out session.
   Issue an ephemeral `sessionId` rather than demanding a bearer token. The
   client sends no `Authorization` header, and attaches one only if a token
   happens to exist.
2. **Echo `sessionId` back on every reply.** The client resends it to keep one
   conversation across navigation (FR-3.7).
3. **Ground it in real data.** The model may only reference locations and food
   joints that actually exist; strip anything it invents, exactly as the
   tourism API's itinerary planner already does with tours. An assistant that
   confidently directs a fresher to a hall that isn't there is worse than one
   that says it can't find it.
4. **Out-of-scope requests need no special case** (FR-3.6). Return a plain
   message and `actions: []`; the client renders an ordinary bubble.
5. **NFR-3 wants a first response in 3–5 s. Please expose SSE streaming.**
   For comparison, the tourism API's itinerary planner is a synchronous POST
   measured at **~66 s** — unusable for chat. The client currently caps this
   call at **45 s** and then surfaces a timeout, so a synchronous
   implementation will work but will not meet the NFR.

### 3.4 History — authed (FR-3.8)

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
  "messageCount": 4
}
```

Single session:

```json
{
  "id": "sess_01HZ",
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Where is Balme Library?",
      "createdAt": "2026-08-15T09:30:00.000Z"
    },
    {
      "id": "msg_2",
      "role": "assistant",
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

## 4. Accounts ✅ — one change needed

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

### 4.2 ⚠️ Roles — the enum is the tourism product's

| SRS user class | API today | Needed |
| --- | --- | --- |
| Student, Staff, Visitor | `TOURIST` | `STUDENT`, `STAFF`, `VISITOR` |
| Food Vendor | `OPERATOR` (wrong semantics) | `VENDOR` |
| Administrator | `ADMIN` ✅ | `ADMIN` |

Needed: `role: 'STUDENT' | 'STAFF' | 'VISITOR' | 'VENDOR' | 'ADMIN'`, plus the
`affiliation` field on register (above) so a user can say which they are. The
frontend already types `UserRole` this way, so today the extra members resolve
to nothing and **the vendor console is unreachable**.

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

## 5. Favourites ✅ — one missing enum member

Endpoints work. The `type` enum is still `TOUR | STAY | RESTAURANT |
DESTINATION`. **CampusPal needs `LOCATION` added.**

`RESTAURANT` is reused as-is for food joints (the client maps the name), so
saving a food joint works today and saving a campus location `400`s — which
is why `/saved` currently says so in its empty state.

```bash
curl -s "$BASE/favorites?limit=100&type=RESTAURANT" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$BASE/favorites" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"LOCATION","itemId":"loc_01HZY3"}'

curl -s -X DELETE "$BASE/favorites/fav_01HZ" -H "Authorization: Bearer $TOKEN"
```

Each row — `item` is what makes the saved-items list renderable without an
N+1 fetch, so please keep sending it:

```json
{
  "id": "fav_01HZ",
  "type": "LOCATION",
  "itemId": "loc_01HZY3",
  "item": {
    "id": "loc_01HZY3",
    "slug": "balme-library",
    "name": "Balme Library",
    "subtitle": "Administration",
    "imageUrl": "https://res.cloudinary.com/.../balme-1.jpg"
  },
  "createdAt": "2026-08-15T09:30:00.000Z"
}
```

---

## 6. Admin & reference

### 6.1 Moderation ❌ (SRS §7)

An administrator must be able to remove inappropriate ratings and feedback.

```bash
curl -s -X DELETE "$BASE/restaurants/rest_01HZ/reviews/rev_01HZ" \
  -H "Authorization: Bearer $TOKEN"
```

### 6.2 Reference sets ⚠️

`GET /reference/:set` exists and already serves `cuisines` and `dietary`.
Adding `location-categories` and `food-categories` would stop the client
hardcoding them.

```bash
curl -s "$BASE/reference/location-categories"
```

```json
{ "code": 200, "message": "OK",
  "data": [ { "value": "LECTURE_HALL", "label": "Lecture Halls" } ] }
```

---

## 7. Two problems inherited from the tourism API

### 7.1 ❌ CORS is unconfigured — **this blocks production, full stop**

There are **zero `Access-Control-Allow-Origin` headers** on any response, on
any origin. Locally the Vite dev proxy sidesteps it server-to-server; **there
is no equivalent workaround for a deployed CampusPal.**

```bash
curl -si "$BASE/restaurants?limit=1" -H "Origin: https://campuspal.example" | grep -i access-control
# (currently returns nothing)
```

Needs `Access-Control-Allow-Origin`, `-Allow-Headers: Authorization,
Content-Type`, `-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS`, and a
`204` on preflight `OPTIONS`.

### 7.2 ⚠️ Money fields contradict the spec

The API guide documents integer minor units (`priceMinor: 2500`); the running
API sends major units under a shorter name (`price: 25`). The client
normalises at the boundary (`src/lib/api/money.ts`), so fixing this needs no
coordinated release — but the spec and the API should agree. Silent unit
changes are how you get a 100× billing error.

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

## 9. Suggested build order

| # | Work | Why first |
| --- | --- | --- |
| 1 | §2.3 contact fields | One field group; unblocks FR-2.4, the SRS's headline food feature. The UI is already built and waiting. |
| 2 | §1 campus locations | The largest single unlock — eight requirements, three finished screens, the app's reason for existing. |
| 3 | §4.2 roles + §5 `LOCATION` favourite | Small. Unblocks the vendor console and saved locations. |
| 4 | §3 the assistant | Biggest build, and it needs §1 to ground itself in. |
| 5 | §2.5 / §2.6 reviews and vendor writes | |
| 6 | §7.1 CORS | Required before anything ships, whenever that is. |

Data reseeding (§1.6 campus locations, §2.1 real campus food joints) runs
alongside — the schema work is wasted without it.
