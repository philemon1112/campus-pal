# Handoff — CampusPal Frontend

Snapshot of exactly where things stand, for picking this up cold. For what
the app is *supposed* to do, see [`../CampusPal_SRS.md`](../CampusPal_SRS.md).
For what the backend still owes us and why, see
[`API_REQUIREMENTS.md`](API_REQUIREMENTS.md); for the exact wire contract to
implement it against — curls and response bodies — see
[`API_CONTRACT.md`](API_CONTRACT.md). For the loading-state contract every
page must follow, see [`UI_CONVENTIONS.md`](UI_CONVENTIONS.md).

**Last updated:** 2026-08-15 (backend integration — all three features live)

---

## TL;DR

React 19 + TypeScript + Tailwind v4 SPA for **University of Ghana, Legon**,
built from `CampusPal_SRS.md`. Forked from a tourism app ("Voyago") for its
infrastructure, then stripped back to the three features the SRS specifies.

**All three SRS features are wired to real endpoints and verified against the
live API** — campus locations, food joints (with contact actions, campus
landmarks, reviews and vendor editing) and the streaming AI assistant.

**The two things to know before touching anything:**

1. **CORS is still unset on the deployed API**, so a production build cannot
   call it at all. Local dev works only because Vite proxies. This blocks
   shipping — `API_REQUIREMENTS.md` §1.
2. **The Food tab lists 20 tourism venues alongside 8 campus joints**,
   because `GET /restaurants` serves both products from one table and has no
   campus-scope filter. §2 of the same doc.

## How to run it

```bash
npm install
npm run dev           # http://localhost:5173 (or next free port)
npx tsc -b --noEmit   # type-check
npm run lint          # oxlint
npm run build         # production build (also type-checks)
```

All three gates pass clean. No `.env` is required — `src/lib/api/client.ts`
falls back to the live backend URL. Copy `.env.example` only to point at a
different backend.

**Dev-only CORS workaround:** the live API sends no CORS headers, so in dev,
API calls are proxied through Vite (`vite.config.ts` → `server.proxy['/api']`)
to sidestep it server-to-server. **This does not work in a production
build** — that needs `CORS_ORIGINS` set on the backend, or a same-origin
reverse proxy. See `API_REQUIREMENTS.md` §1.

## Route inventory

| Route | Auth | Backend | Notes |
| --- | --- | --- | --- |
| `/` | public | — | Redirects to `/explore`. SRS §4.1 describes two tabs and no home screen |
| `/explore` | **public** | ✅ live | 20 real UG Legon locations. Server-side search, six category pills, map pins, `lat`/`lng` → `distanceKm` for "Near me" |
| `/explore/:slug` | **public** | ✅ live | Detail, map, Directions hand-off, Save |
| `/food` | **public** | ⚠️ live | Works, but the listing includes 20 tourism venues — see §2 of `API_REQUIREMENTS.md` |
| `/food/:slug` | **public** | ✅ live | Detail, menu, reviews, Info. **Contact bar works** where the vendor consented; disabled with the reason where they didn't |
| `/saved` | auth | ✅ live | Both locations and food joints |
| `/assistant/history` | auth | ✅ live | FR-3.8. Signed-in sessions only — guest turns have no owner server-side |
| `/profile` | auth | ✅ live | `GET /users/me`. Menu rows all link somewhere real except Help & Support |
| `/profile/personal-info` | auth | ✅ live | `PATCH /users/me` + avatar upload |
| `/vendor` | VENDOR | ⚠️ unverified | FR-2.7. Reads its listing back via `/restaurants/mine` and PATCHes it. **No VENDOR test account exists**, so this is wired but never run |
| `/admin/locations` | ADMIN | ⚠️ unverified | FR-1.8. Full CRUD. Same — no ADMIN test account |
| `/login` `/register` `/forgot-password` `/reset-password` | public | ✅ live | Register now sends `affiliation`, which sets the account's role |

The **AI assistant** has no route: SRS §4.1 makes it a persistent icon, so
it's a panel mounted in `AppLayout` that opens over whatever page you're on.

## Honest states — where the UI still admits a gap

Nothing is mocked (see `CLAUDE.md`). The "endpoint isn't built" notices are
gone, but these remain, and they now describe **real data states** rather
than missing endpoints:

| Screen | What it says |
| --- | --- |
| `/food/:slug` Contact bar | Disabled, distinguishing "hasn't agreed to show contact details publicly" (SRS §7 consent) from "agreed but published no number" |
| `/food/:slug` Info tab | "No campus landmark recorded" when `nearestLocation` is unset |
| `/food/:slug` Menu tab | "No menu published yet" |
| Save button, signed out | Disabled with "Log in to save places" |

## What's actually verified

Verified in-browser against the live API on 2026-08-15 (`playwright-core`
driving Chrome, dev server + Vite proxy):

- **Type-check, lint, production build:** all clean.
- **`/explore`** — 20 real locations, category pills, map pins, detail pages.
- **`/food/:slug`** — detail, menu with prices, Info tab landmark link,
  Reviews tab loading a real (empty) list. **Contact `Call` renders as a live
  `tel:` link** on a consented joint.
- **Assistant** — guest and signed-in turns, SSE streaming (text appeared
  ~6 s in and grew in place), a `SHOW_DIRECTIONS` action button and an inline
  location result card, session listed in `/assistant/history` afterwards.
- **`/saved`** — a `LOCATION` favourite created via the API renders as
  "Akuafo Hall · Campus location".
- Zero console errors across all of the above.

**Not verified:** `/vendor` and `/admin/locations`. Both are wired against
the live contract and type-check, but no `VENDOR` or `ADMIN` test account
exists to run them with. Don't report them as working.

## Architecture quick reference

- **API layer is Observable-based (RxJS).** Every function in `src/lib/api/`
  returns `Observable<T>` with a `$` suffix. `client.ts` uses `fromFetch` so
  unsubscribing cancels the underlying request, retries once on 401 via a
  shared refresh, and pools concurrent identical GETs (`shareInFlight$` — an
  in-flight pool, not a response cache). `src/hooks/useApiResource.ts` is the
  shared fetch-with-loading/error/retry hook every data-driven page uses.
- **Maps are MapLibre GL, lazy-loaded, over OpenFreeMap tiles.**
  `src/components/map/MapView.tsx`. Three things are load-bearing:
  1. Tiles are **OpenFreeMap Liberty**, not MapLibre's `demotiles`, which is
     country-outlines-only and blank at campus zoom.
  2. **`optimizeDeps.exclude: ['maplibre-gl']` in `vite.config.ts` is
     required.** Without it MapLibre's Web Worker 404s under Vite's dep
     pre-bundling, and it fails convincingly: style, sprites and raster tiles
     all load, so the map looks alive while fetching zero vector tiles.
  3. Readiness comes from `styledata`, **not `load`** — `load` also waits on
     every visible tile, so a stalled source pins the skeleton over a working
     map.
- **Campus framing** is `src/lib/campus.ts` (`UG_LEGON`, `CAMPUS_ZOOM`).
- **Directions** are a hand-off to the device's maps app
  (`directionsUrl()` in `src/lib/geo.ts`). There is no routing service, and
  drawing a route line would mean inventing one.
- **The assistant's state lives above the router** (`src/lib/assistant.tsx`,
  mounted in `main.tsx`) so a conversation survives navigation — following a
  result the assistant found must not unmount the conversation that found it
  (FR-3.7). Its action contract is the typed `AssistantAction` union in
  `src/lib/api/types.ts`; `AssistantPanel`'s `runAction` executes it.
- **The assistant streams over SSE** (`streamMessage$` in
  `src/lib/api/assistant.ts`). Two things are load-bearing: **each `delta`
  carries the whole reply so far**, so the consumer replaces its text rather
  than appending; and **only the `done` frame is grounded**, so action
  buttons and result cards are written from it alone, never from streamed
  prose that may still be in flight. The non-streaming `sendMessage$` remains
  as a fallback.
- **Shared auth state** (`src/lib/auth.tsx` + `src/hooks/useAuth.ts`). One
  `GET /users/me` for the whole session. **Use `useAuth()` instead of
  fetching the profile in a page.**
- **Auth guard is inverted from the app this was forked from.** `AppLayout`
  is public (FR-4.1); `RequireAuth` wraps only `/saved`, `/profile/*`,
  `/assistant/history`, `/vendor`, `/admin/*`. The guard **waits for auth to
  resolve before redirecting** — checking `!user` alone bounces a valid
  session to /login on every hard refresh, because `GET /users/me` is still
  in flight.
- **Never put a CSS transform on `AppLayout`** (or any ancestor of the nav).
  A transformed ancestor becomes the containing block for `position: fixed`
  descendants, so `BottomNav`'s `bottom-0` resolves to the bottom of the
  *page* rather than the viewport, and the tab bar scrolls away on any page
  taller than the screen.
- **Page action bars** (location Directions, food-joint Contact) are `fixed`
  above the tab bar on mobile and **`md:static`** on desktop so they settle
  at the end of the content column instead of floating over the footer.
- **Design tokens** live in `src/index.css` under `@theme`. `brand-500`
  (#f97316) is for tints/icons/borders/pins; `brand-600` (#c2410c) is the
  solid-button fill and the only one dark enough for white text (5.0:1).
  Don't swap them.
- **`src/lib/api/money.ts`** normalises the API's decimal-cedis money fields
  to minor units at the boundary, so `formatMoney` only ever sees one unit.
- **Pagination is capped at 100** (`MAX_PAGE_LIMIT`). The API 400s above it,
  so nothing can ask for "everything" — past 100 locations the admin console
  needs real pagination.

## Immediate next steps

1. **`CORS_ORIGINS` on the Render service** — `API_REQUIREMENTS.md` §1.
   Blocks any deploy; it's a config change, not a release.
2. **A campus scope for `GET /restaurants`** — §2. The Food tab is currently
   71% tourism venues.
3. **Provision `VENDOR` and `ADMIN` test accounts** so those two consoles can
   actually be exercised — §4.1.
4. **Real campus photography** — every location has one generic stock image,
   and the detail page is built for a gallery.
5. **In-app help/FAQ (SRS 2.6)** is not built — the Profile row is inert.
   Needs content before it needs code.

## Known gaps in this frontend (not backend)

- No onboarding tooltip walkthrough (SRS 2.6).
- Location detail shows only the first photo, not a gallery — `photos[]` has
  never returned more than one.
- No pagination anywhere — every list requests one page of up to 100. Fine at
  campus scale, wrong at real volume.
- The vendor console can't edit its menu. `PUT /restaurants/:id/menu` is
  wired (`replaceMenu$`) but no UI calls it yet.
- Review moderation (`deleteReview$`, ADMIN) is wired but has no UI.
- No test framework. Verification is the three build gates plus browser
  checks via `playwright-core` (see `CLAUDE.md`).
