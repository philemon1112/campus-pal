# API Requirements — what CampusPal needs from the backend

Written for the backend team. Every item below is traced to a **screen that
already exists** in this repo and to a numbered requirement in
`CampusPal_SRS.md` — this is not a wishlist, it is the data those screens are
currently rendering an honest empty state in place of.

> **Implementing this?** [`API_CONTRACT.md`](API_CONTRACT.md) is the same
> scope written as a wire contract — copy-pasteable curls and the exact JSON
> the frontend parses. This document is the *why*; that one is the *what*.

> **Current state.** CampusPal is built against the API at
> `https://tms-api-m7yf.onrender.com/api/v1` (63 paths, audited 2026-08-15
> from `GET /api/docs-json`). That API was built for a tourism product. Of
> the three features the SRS specifies, **one** — food joints — is genuinely
> backed today. Campus locations and the AI assistant have no endpoints at
> all.

**Summary of the gap:**

| SRS feature | Endpoints today | Status |
| --- | --- | --- |
| 3.1 Campus Explorer & Directions | none | §A — whole module missing |
| 3.2 Food Joint Directory | 3 of what's needed | §B — 4 concrete gaps, one of them blocking |
| 3.3 AI Assistant | none | §C — whole module missing |
| 3.4 Accounts / cross-cutting | partial | §D |

---

## 0. Conventions to keep

The frontend's `src/lib/api/client.ts` already assumes all of this, and the
existing API already honours it. Match it exactly for anything new.

- **Envelope:** `{ code, message, data }` on success *and* error.
- **Pagination:** `?page=&limit=` → `{ results, total, page, pageSize, totalPages }`.
- **Time:** ISO 8601 UTC strings.
- **Auth:** JWT bearer. Reads that FR-4.1 makes public must work with **no**
  `Authorization` header at all — not "auth optional but 401 without it".
- **Detail routes by `slug`, list/relations by `id`** — as
  `/restaurants/:slug` vs `/restaurants/:id/menu` already do.
- **Errors:** `400` validation (messages joined into one string), `401`,
  `403`, `404` (also for another user's resource), `409` conflict.
- **Money:** see §D.5 — the API currently contradicts its own spec.

---

## A. Campus Locations — the module does not exist

**Screens already built:** `/explore` (search, six category pills, map,
list), `/explore/:slug` (detail, map, directions, save),
`/admin/locations` (full CRUD).
**SRS:** 3.1, FR-1.1 – FR-1.8. **Blocks all eight.**

```
GET    /locations?q=&category=&lat=&lng=&radiusKm=&page=&limit=
GET    /locations/:slug
POST   /locations           (ADMIN)   FR-1.8
PATCH  /locations/:id       (ADMIN)
DELETE /locations/:id       (ADMIN)
```

```ts
interface Location {
  id: string;
  slug: string;
  name: string;
  category: 'LECTURE_HALL' | 'DEPARTMENT' | 'PARK_FIELD'
          | 'HOSTEL_HALL' | 'ADMINISTRATION' | 'OTHER';   // FR-1.1, verbatim
  description?: string;
  lat: number;                 // required — FR-1.4/1.5 are impossible without it
  lng: number;
  photos: string[];            // SRS 6.1 says "Photo(s)" — plural
  buildingNotes?: string;      // SRS 6.1 "Associated Building/Landmark notes"
  distanceKm?: number;         // only when lat/lng were supplied
}
```

Notes:

1. **`GET /locations` and `/locations/:slug` must be public** (FR-4.1). The
   frontend calls them with `auth: false`.
2. **`category` is the whole point.** FR-1.1 groups locations by category and
   FR-1.6 filters by it; the pills on `/explore` already drive `?category=`.
3. **`?q=` searches name and description** (FR-1.2).
4. **`lat`/`lng` in, `distanceKm` out** — same contract `/restaurants`
   already implements. That's what makes "Near me" a server-side sort.
5. **Coordinates are required, not optional.** A location without them can't
   be pinned or navigated to, which is most of what the app does with one.

### Why `/destinations` can't be reused

It exists and it has `lat`/`lng`, but it is region/country-shaped
(`{ name, region, country, description, heroImageUrl, lat, lng }`): **no
`category`**, so FR-1.1 and FR-1.6 are impossible, and a single
`heroImageUrl` instead of `photos[]`. Adding `category` + `photos[]` and
scoping it to campus would work; a separate resource is cleaner and leaves
the tourism data alone.

**Seed data.** UG Legon needs a real dataset — halls of residence
(Commonwealth, Legon, Akuafo, Volta, Mensah Sarbah…), Balme Library, the
Registry, departmental blocks, the Great Hall, the sports stadium. Verified
against the official campus map, per SRS 2.5.

---

## B. Food joints — the module ships; four concrete gaps

**Screens already built:** `/food` (search + cuisine/price/dietary/open-now/
proximity filters, map, list), `/food/:slug` (Menu · Reviews · Info tabs,
Contact action bar), `/vendor` (listing form).
**SRS:** 3.2, FR-2.1 – FR-2.8.

Working today and wired: `GET /restaurants` (with `q`, `cuisine`,
`priceTier`, `dietary`, `lat`, `lng`, `openNow`), `GET /restaurants/:slug`,
`GET /restaurants/:id/menu`. That covers FR-2.1, FR-2.2 (partly), FR-2.5 and
FR-2.6.

### B.1 No contact fields — **blocks FR-2.4 completely**

This is the most important item in this document. FR-2.4 — call, WhatsApp or
message a food joint — is the SRS's headline food feature, and
`RestaurantResponseDto` carries **no contact information of any kind**
(verified against the live spec). The Contact bar on `/food/:slug` is built
and renders disabled, with the reason shown, because there is nothing to
call.

```ts
phone?: string;            // E.164 or local, e.g. "+233201234567"
whatsapp?: string;         // digits only for wa.me, e.g. "233201234567"
email?: string;
contactConsent: boolean;   // SRS §7 — publish only with vendor consent
```

`contactConsent` is a legal requirement, not a nicety: SRS §7 states vendor
contact information shall only be published with consent. Suppress `phone`
and `whatsapp` server-side when it is false, rather than relying on clients.

### B.2 No campus-area field

FR-2.2 asks to search food joints **by location** and FR-2.3 asks to show a
joint's **location on campus**. `lat`/`lng` cannot render "near Commonwealth
Hall", and neither can `distanceKm`, which only exists when the user has
shared a position.

```ts
campusArea?: string;          // "Behind Commonwealth Hall"
// or, better, a real join:
nearestLocationId?: string;   // -> Location from §A
```

A join to §A would also let the assistant answer "food joints near Legon
Hall" (SRS Appendix 8.1) properly rather than by radius guesswork.

### B.3 No reviews — blocks FR-2.8

Reviews today are tour-only (`GET /tours/:id/reviews`,
`POST /bookings/:reference/review`), and the second is keyed to a booking,
which CampusPal has no concept of.

```
GET  /restaurants/:id/reviews?page=&limit=      (public)
POST /restaurants/:id/reviews { rating, body }  (authed)
```

```ts
interface Review {
  id: string;
  rating: number;   // 1-5
  body: string;
  createdAt: string;
  author: { fullName: string; avatarUrl?: string };
}
```

**Please include `author`.** The tourism API's review payload carries an
`authorId` and no name, so its reviews list deliberately shows no reviewer
identity — the alternative would be inventing one. Don't repeat that.

### B.4 No vendor write path — blocks FR-2.7

```
POST  /restaurants                  (VENDOR)  — creates, owned by caller
PATCH /restaurants/:id              (VENDOR, owner only)
PUT   /restaurants/:id/menu         (VENDOR, owner only) { sections: [...] }
GET   /restaurants/mine             (VENDOR)  — see below
```

`GET /restaurants/mine` matters more than it looks: without it a vendor
cannot read back their own listing, so `/vendor` can only ever create, never
edit. (The tourism app hit exactly this with tours and worked around it by
caching the create response in `localStorage` — please don't make us do that
again.)

### B.5 Minor

- Menu items have no `photoUrl` (FR-2.3, explicitly optional).
- **Seed data:** the four seeded rows are Accra city restaurants — Azmera in
  Airport Residential, and similar. They need replacing with real campus
  joints. The schema work above is wasted otherwise.

---

## C. AI Assistant — the module does not exist

**Screens already built:** a persistent assistant button on every page, the
chat panel (`src/modules/assistant/`), and `/assistant/history`.
**SRS:** 3.3, FR-3.1 – FR-3.8, NFR-3.

```
POST   /assistant/chat        { sessionId?, message }     PUBLIC
GET    /assistant/sessions                    (authed)    FR-3.8
GET    /assistant/sessions/:id                (authed)
DELETE /assistant/sessions/:id                (authed)    SRS 6.2
```

```ts
interface ChatReply {
  sessionId: string;          // echoed back; the client resends it (FR-3.7)
  reply: string;
  actions: AssistantAction[]; // see below — the important part
  results?: { kind: 'LOCATION' | 'FOOD_JOINT'; items: Location[] | Restaurant[] }[];
}

type AssistantAction =
  | { type: 'OPEN_LOCATION';      slug: string; name: string }
  | { type: 'OPEN_FOOD_JOINT';    slug: string; name: string }
  | { type: 'SHOW_DIRECTIONS';    lat: number; lng: number; name: string }
  | { type: 'CONTACT_FOOD_JOINT'; slug: string; name: string;
                                  channel: 'CALL' | 'WHATSAPP' }
  | { type: 'SAVE_FAVORITE';      favoriteType: 'LOCATION' | 'FOOD_JOINT';
                                  itemId: string; name: string };
```

Five things about this contract are load-bearing:

1. **`actions[]` must be a closed, typed union — not prose.** FR-3.5 requires
   the assistant to *perform* tasks rather than only return text. The client
   executes these with a `switch`; it cannot safely act on a sentence. This
   is the single most important design decision in the module.
2. **It must accept unauthenticated callers.** SRS 6.1 makes
   `Chat Session.User ID` nullable and FR-4.1 allows browsing without an
   account — a fresher's first question will come from a signed-out session.
   Issue an ephemeral `sessionId` rather than requiring a bearer token. The
   client sends `auth: false` and attaches a token only when one exists.
3. **Ground it in real data.** The model may only reference locations and
   food joints that exist; strip anything it invents, exactly as the tourism
   API's itinerary planner already does with tours. An assistant that
   confidently directs a fresher to a hall that isn't there is worse than one
   that says it can't find it.
4. **FR-3.6 needs no special case.** For a request outside the app's feature
   set, return a plain message and `actions: []`. The client renders that as
   an ordinary bubble.
5. **NFR-3 wants a first response in 3–5 s.** For comparison, the tourism
   API's itinerary planner is a **synchronous POST measured at ~66 s** — that
   shape is unusable for chat. **Please expose SSE streaming.** If it has to
   stay synchronous, the client caps it at 45 s and surfaces a timeout, but
   the NFR will not be met.

---

## D. Cross-cutting

### D.1 Roles

SRS 2.3 defines five user classes; the API has three, named for a different
product.

| SRS | API today |
| --- | --- |
| Student, Staff, Visitor | `TOURIST` |
| Vendor | `OPERATOR` (wrong semantics) |
| Administrator | `ADMIN` ✅ |

Needed: `STUDENT | STAFF | VISITOR | VENDOR | ADMIN`, and an affiliation
field on `POST /auth/register` so a user can say which they are. The
frontend already types `UserRole` this way, so the extra members currently
resolve to nothing and the vendor console is unreachable.

### D.2 Favourites — one missing enum member

`GET/POST/DELETE /favorites` exist and work. The `type` enum is
`TOUR | STAY | RESTAURANT | DESTINATION`. CampusPal needs **`LOCATION`**
added. `RESTAURANT` is used as-is for food joints (the client maps the name),
so saving a food joint works today and saving a campus location does not —
which is why `/saved` says so in its empty state.

### D.3 Reference sets

`GET /reference/:set` already exists and serves `cuisines`, `dietary` and
others. Adding `location-categories` and `food-categories` would stop the
client hardcoding them.

### D.4 Moderation

SRS §7: an administrator must be able to remove inappropriate ratings and
feedback.

```
DELETE /restaurants/:id/reviews/:reviewId   (ADMIN)
```

### D.5 Two problems inherited from the tourism API

1. **CORS is unconfigured.** Zero `Access-Control-Allow-Origin` headers on
   any response, on any origin. The Vite dev proxy works around it locally;
   **there is no workaround for a deployed CampusPal.** This blocks
   production, full stop.
2. **Money fields contradict the spec.** The guide documents integer minor
   units (`priceMinor: 2500`); the API sends major units under a shorter name
   (`price: 25`). The client normalises at the boundary
   (`src/lib/api/money.ts`), so a fix needs no coordinated release — but the
   spec and the API should agree. Silent unit changes are how you get a 100×
   billing error.

---

## E. Endpoints CampusPal does **not** use

Listed so nothing here is maintained on our behalf: Tours, Departures,
Bookings, Payments, Stays, Flights, Rides, Emergency, Itineraries, Loyalty,
Notifications, Uploads-beyond-images, and the table-reservation endpoints
(`/restaurants/:id/availability`, `/restaurants/:id/reserve`,
`/reservations/*`).

The reservation endpoints work and were verified end-to-end in the app this
was forked from. They are dropped because **the CampusPal SRS specifies a
directory with a Contact action and never mentions table reservations**
(FR-2.1 – FR-2.8). If reservations are wanted later, the backend side is
already done.

---

## F. Suggested order

1. **§B.1 contact fields.** One field group, unblocks the SRS's headline food
   feature, and the UI is already built waiting for it.
2. **§A campus locations.** The largest single unlock — eight requirements,
   three finished screens, and the app's whole reason for existing.
3. **§D.1 roles + §D.2 favourites enum.** Small, and they unblock the vendor
   console and saved locations.
4. **§C the assistant.** The biggest build, and it depends on §A being there
   to ground itself in.
5. **§B.3/B.4 reviews and vendor writes.**
6. **§D.5 CORS** — needed before anything ships, whenever that is.
