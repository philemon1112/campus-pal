# CampusPal — Frontend

React + TypeScript web app for **University of Ghana, Legon**: campus
location discovery with directions, a food-joint directory, and a
conversational AI assistant that performs in-app actions.

Built against [`CampusPal_SRS.md`](CampusPal_SRS.md).

**Picking this up cold?** Start with [`docs/HANDOFF.md`](docs/HANDOFF.md) — a
snapshot of what's built, what's blocked and what's next.

> **Read this before judging the app:** of the SRS's three features, only
> **food joints** has a backend today. Campus locations and the AI assistant
> are fully built in the UI against endpoints that return 404, and each
> screen says so rather than showing invented data. What the backend still
> owes us is written up in
> [`docs/API_REQUIREMENTS.md`](docs/API_REQUIREMENTS.md).

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) (via `@tailwindcss/vite`)
- [React Router v7](https://reactrouter.com)
- [RxJS](https://rxjs.dev) — the API layer is Observable-based, not
  Promise-based
- [MapLibre GL](https://maplibre.org) over OpenFreeMap tiles (keyless)
- [Oxlint](https://oxc.rs) for linting

## Getting started

```bash
npm install
npm run dev
```

No `.env` is required — the client falls back to the live backend URL. Copy
`.env.example` only to point at a different one.

## Scripts

| Script            | Purpose                             |
| ----------------- | ----------------------------------- |
| `npm run dev`     | Start the Vite dev server           |
| `npm run build`   | Type-check and build for production |
| `npm run lint`    | Run Oxlint                          |
| `npm run preview` | Preview the production build        |

Run `npx tsc -b --noEmit`, `npm run lint` and `npm run build` before calling
work done. All three currently pass with zero warnings.

## Project structure

```
src/
  modules/          # One folder per SRS feature
    locations/      # 3.1 Campus Explorer & Directions
    food/           # 3.2 Food Joint Directory
    assistant/      # 3.3 AI Assistant
    auth/           # 3.4 Accounts
    vendor/         # FR-2.7 vendor listing console
    admin/          # FR-1.8 location CRUD
  components/
    layout/         # AppLayout, TopNav, BottomNav, guards
    cards/          # Shared result cards (also used by assistant replies)
    map/            # MapLibre wrapper
    ui/             # Skeletons, fields, SaveButton, theme toggle
  pages/            # Screens not owned by one feature (Profile, Saved)
  lib/
    api/            # Observable-based API client, one file per resource
    campus.ts       # UG Legon map framing
    geo.ts          # Distance, geolocation, directions hand-off
  hooks/            # useApiResource, useAuth, useAssistant, useTheme
```

The `@/` import alias points at `src/` (configured in `vite.config.ts` and
`tsconfig.app.json`).

## Docs

| File | What it's for |
| --- | --- |
| [`CampusPal_SRS.md`](CampusPal_SRS.md) | The requirements this app is built against |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Current state: routes, what's verified, architecture notes |
| [`docs/API_REQUIREMENTS.md`](docs/API_REQUIREMENTS.md) | What the backend still needs to build, per SRS requirement |
| [`docs/UI_CONVENTIONS.md`](docs/UI_CONVENTIONS.md) | The loading-state contract every page follows |
| [`CLAUDE.md`](CLAUDE.md) | Working agreements and non-negotiables |
