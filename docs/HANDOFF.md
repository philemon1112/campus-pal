# Handoff — CampusPal Frontend

Snapshot of exactly where things stand, for picking this up cold. For what
the app is *supposed* to do, see [`../CampusPal_SRS.md`](../CampusPal_SRS.md).
For what the backend still owes us, see
[`API_REQUIREMENTS.md`](API_REQUIREMENTS.md). For the loading-state contract
every page must follow, see [`UI_CONVENTIONS.md`](UI_CONVENTIONS.md).

**Last updated:** 2026-08-15 (initial build)

---

## TL;DR

React 19 + TypeScript + Tailwind v4 SPA for **University of Ghana, Legon**,
built from `CampusPal_SRS.md`. Forked from a tourism app ("Voyago") for its
infrastructure, then stripped back to the three features the SRS specifies.

**The one thing to understand before touching anything:** of those three
features, **only food joints has a backend**. Campus locations and the AI
assistant are fully built in the UI against endpoints that return 404. That
is deliberate and documented, not unfinished work — see "Honest states"
below.

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
build** — that needs CORS on the backend or a same-origin reverse proxy. See
`API_REQUIREMENTS.md` §D.5.

## Route inventory

| Route | Auth | Backend | Notes |
| --- | --- | --- | --- |
| `/` | public | — | Redirects to `/explore`. SRS §4.1 describes two tabs and no home screen |
| `/explore` | **public** | ❌ none | Full shell works — search, six category pills, MapLibre map, "Near me". `GET /locations` doesn't exist, so the list region states that |
| `/explore/:slug` | **public** | ❌ none | Detail, map, Directions hand-off, Save. Same honest error state |
| `/food` | **public** | ✅ live | Fully working. Server-side `q`/`cuisine`/`priceTier`/`dietary`/`openNow`, plus `lat`/`lng` for real `distanceKm` |
| `/food/:slug` | **public** | ✅ partly | Real detail + menu with prices. Menu/Reviews/Info tabs. **Contact bar renders disabled** — no `phone`/`whatsapp` in the payload. Reviews tab has no endpoint |
| `/saved` | auth | ⚠️ partly | `/favorites` is live but its enum has no `LOCATION`, so only food joints can be saved |
| `/assistant/history` | auth | ❌ none | FR-3.8. Full shell, honest error state |
| `/profile` | auth | ✅ live | `GET /users/me`. Menu rows all link somewhere real except Help & Support |
| `/profile/personal-info` | auth | ✅ live | `PATCH /users/me` + avatar upload |
| `/vendor` | VENDOR | ❌ none | FR-2.7. Create-only — there's no endpoint to read back an existing listing |
| `/admin/locations` | ADMIN | ❌ none | FR-1.8. Full CRUD form, wired, waiting on the endpoints |
| `/login` `/register` `/forgot-password` `/reset-password` | public | ✅ live | Inherited and working |

The **AI assistant** has no route: SRS §4.1 makes it a persistent icon, so
it's a panel mounted in `AppLayout` that opens over whatever page you're on.

## Honest states — where the UI admits a gap

This is the project's most important convention (see `CLAUDE.md`). Nothing is
mocked. Each of these renders the real UI plus a message naming the missing
endpoint:

| Screen | What it says |
| --- | --- |
| `/explore`, `/explore/:slug`, `/admin/locations` | `GET /locations` isn't built |
| Assistant panel | "The assistant isn't connected yet" — stated **once**, with no Retry, because retrying a missing endpoint is theatre |
| `/food/:slug` Contact bar | Disabled, with "the API has no `phone` or `whatsapp` field yet" underneath |
| `/food/:slug` Reviews tab | `GET /restaurants/:id/reviews` isn't built |
| `/saved` empty state | Campus locations can't be saved — no `LOCATION` favourite type |
| `/vendor` | No endpoint to read back an existing listing |

If you wire one of these up, delete the corresponding notice.

## What's actually verified

- **Type-check, lint, production build:** all clean.
- **`GET /restaurants` and `/restaurants/:slug` and `/menu`:** confirmed
  returning real data from the live API during the build.
- **Everything else:** wired and type-checks, **not** confirmed against a
  live backend, because the endpoints don't exist. Don't report these as
  working.
- The seeded restaurants are **Accra city venues, not campus joints**
  (Azmera in Airport Residential, etc.). The Food tab works; its contents are
  wrong for UG Legon until the data is reseeded.

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
- **`src/lib/api/money.ts`** normalises the API's major-units-under-short-
  names money fields at the boundary. Only menu prices use it here, but the
  mismatch is a property of the API.

## Immediate next steps

1. **Send `docs/API_REQUIREMENTS.md` to the backend team.** Everything below
   depends on it. §F suggests an order; §B.1 (contact fields) is the
   cheapest unlock of a blocked SRS requirement.
2. **Reseed the food data** with real UG Legon joints.
3. When `GET /locations` lands: nothing to build — delete the notices on
   `/explore`, `/explore/:slug` and `/admin/locations` and confirm the pins.
4. When `/assistant/chat` lands: confirm each `AssistantAction` variant
   round-trips, especially `SHOW_DIRECTIONS` and `SAVE_FAVORITE`.
5. **In-app help/FAQ (SRS 2.6)** is not built — the Profile row is inert.
   Needs content before it needs code.

## Known gaps in this frontend (not backend)

- No onboarding tooltip walkthrough (SRS 2.6).
- Location detail shows only the first photo, not a gallery, since `photos[]`
  has never returned more than a placeholder.
- No pagination anywhere — every list requests one large page. Fine at
  campus scale, wrong at real volume.
- No test framework. Verification is the three build gates plus browser
  checks via `playwright-core` (see `CLAUDE.md`).
