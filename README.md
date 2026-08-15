# Tourism Management System (TMS) — Frontend

React + TypeScript frontend for the Tourism Management System described in
`docs/Tourism Management System SRS.docx` (SRS v2.0).

**Picking this up after a break?** Start with
[`docs/HANDOFF.md`](docs/HANDOFF.md) — a current snapshot of what's built,
what's blocked, and what's next.

For the full setup rationale, decisions made, and step-by-step replication
instructions, see [`docs/DEVELOPMENT_LOG.md`](docs/DEVELOPMENT_LOG.md).

## Stack

- [Vite](https://vite.dev) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) (via `@tailwindcss/vite`)
- [React Router v7](https://reactrouter.com)
- [Oxlint](https://oxc.rs) for linting

## Getting started

```bash
npm install
npm run dev
```

## Scripts

| Script          | Purpose                          |
| --------------- | --------------------------------- |
| `npm run dev`   | Start the Vite dev server         |
| `npm run build` | Type-check and build for production |
| `npm run lint`  | Run Oxlint                        |
| `npm run preview` | Preview the production build    |

## Project structure

```
src/
  modules/         # One folder per SRS core module (poi, flights, accommodation,
                    # food, transport, emergency, auth, payments, reviews, notifications)
    <module>/
      pages/        # Route-level page components
      components/   # Module-specific UI components
  components/
    layout/         # AppLayout, NavBar
    ui/             # Shared, module-agnostic UI components
  pages/            # Top-level pages not tied to a single module (e.g. Home)
  types/            # TypeScript interfaces mirroring the SRS ER diagram (section 6.3)
  lib/              # Route constants, API client, utilities
  hooks/            # Shared React hooks
```

The `@/` import alias points at `src/` (configured in `vite.config.ts` and
`tsconfig.app.json`).
