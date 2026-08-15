# API Requirements — what CampusPal still needs from the backend

> **Status: mostly resolved (2026-08-15).** The backend delivered campus
> locations, consent-gated food-joint contacts, reviews, vendor writes, the
> assistant with guest access and SSE streaming, the widened role enum and
> the `LOCATION` favourite type. All of it is integrated and verified against
> the live API — see [`API_CONTRACT.md`](API_CONTRACT.md) for the wire
> reference and [`HANDOFF.md`](HANDOFF.md) for the current state of each
> screen.
>
> What follows is only what is **still outstanding**. The historical gap list
> is in git history (`docs/API_REQUIREMENTS.md` before this revision).

---

## 1. CORS is unset on the deployed instance — blocks production

**Severity: blocking. Nothing else on this list matters until it's done.**

`main.ts` already reads `CORS_ORIGINS` and calls `enableCors`, so this is a
config change on the Render service, not a release. The env var is simply
unset there. Verified 2026-08-15:

```bash
curl -si 'https://tms-api-m7yf.onrender.com/api/v1/restaurants?limit=1' \
  -H 'Origin: https://campuspal.example' | grep -i access-control
# returns nothing
```

**Fix:** set `CORS_ORIGINS` on the Render service to a comma-separated origin
list (e.g. `https://campuspal.example,http://localhost:5173`) and redeploy.

The Vite dev proxy hides this locally (`vite.config.ts` → `server.proxy`).
**There is no equivalent workaround for a deployed CampusPal** — a production
build calls the API from the browser, cross-origin, and every request fails.

---

## 2. The Food tab is 71% tourism venues

**Severity: high — it is the first thing a UG student sees on the Food tab.**

`GET /restaurants` returns **28 rows: 8 campus joints and 20 Accra/Kumasi/
Cape Coast/Ada venues** from the tourism product. Unfiltered — which is what
the Food tab requests — a student browsing for lunch sees Santoku in Airport
Residential, Chopstix in Kumasi's Nhyiaeso district, Oasis Beach Restaurant
and Polo Beach Club.

The backend guide (§10.1) notes the campus joints were added *alongside* the
tourism rows deliberately, since several back seeded `RSV-2026-*`
reservations, and suggests filtering with `?nearestLocationSlug=` or
`?nearestLocationId=`. That works for "food near Commonwealth Hall" but not
for "the Food tab", which has no single landmark to filter on.

**What's needed — either one:**

1. **A campus-scope filter**, e.g. `GET /restaurants?campusOnly=true`, or a
   `campus` boolean on the resource. One parameter, and the Food tab uses it.
2. **Separate the datasets** so the tourism rows aren't in CampusPal's
   listing at all.

Filtering client-side on `nearestLocation` being present was rejected: it
would silently drop any campus joint whose landmark hasn't been set, and
`total`/`totalPages` would still count the tourism rows.

---

## 3. NFR-3 assistant latency

The SRS asks for a first response in 3–5 s. The backend guide reports 9–16 s
to first token on `openrouter/free`, with full turns to ~120 s.

Measured against the deployed instance on 2026-08-15, it was **better than
documented** — 1.8 s for a non-streaming reply, ~6 s to first token in the
app — but it is model-dependent and not consistently inside the budget.

**Fix:** a faster `AI_OPENROUTE_MODEL` on the server. This is a config
change, not a code change.

The frontend has done what it can: the chat panel streams, so the wait is
perceived rather than blocking. Streaming narrows the gap; it can't close it.

---

## 4. Smaller items

### 4.1 Vendor and admin accounts need provisioning

`VENDOR`, `OPERATOR` and `ADMIN` aren't self-selectable (correctly — a 400
spells out the allowed set). But that means **the vendor console and the
admin location console cannot be exercised end-to-end from this repo**: the
test account (`claude.rxjs.test@example.com`) is a `TOURIST`.

Both screens are wired and type-check against the live contract, and their
reads/writes are the same calls verified elsewhere — but neither has been run
against a real session. **Please provision one `VENDOR` and one `ADMIN` test
account.**

### 4.2 Campus location photos

Every seeded location carries exactly one photo, and they are generic
Unsplash stock images — a lecture theatre that isn't the lecture theatre.
`photos` is an array and the detail page is built for a gallery, so real
photography is the only thing missing.

### 4.3 Menu coverage

Only some campus joints have a published menu. Nothing to build; the endpoint
and the vendor-side PUT both work.

---

## 5. Not used by CampusPal

Unchanged, listed so none of it is maintained on our behalf: Tours,
Departures, Bookings, Payments, Stays, Flights, Rides, Emergency,
Itineraries, Loyalty, Notifications, and the table-reservation endpoints
(`/restaurants/:id/availability`, `/restaurants/:id/reserve`,
`/reservations/*`).

The reservation endpoints work. They're dropped because the CampusPal SRS
specifies a directory with a Contact action and never mentions table booking.
If that changes, the backend side is already done.
