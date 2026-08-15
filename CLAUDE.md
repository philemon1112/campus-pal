# CLAUDE.md

Project instructions for the Tourism Management System frontend.

**Read `docs/HANDOFF.md` first** — it's the current-state snapshot (what's
built, what's blocked, known backend issues). `docs/DEVELOPMENT_LOG.md` is
the chronological record of *why* decisions were made.

## Non-negotiables

### UI loading states — read `docs/UI_CONVENTIONS.md` before building any page

Every page renders its **static shell on the first frame** (headings, card
frames, tabs, buttons) and swaps only data-dependent values from
content-shaped placeholders. Never early-return a whole-page skeleton or
error screen. Build placeholders from `src/components/ui/Skeleton.tsx`, and
compose them next to the real markup so they can't drift apart. This applies
to **new pages as well as existing ones** — it's a standing requirement, not
a one-off cleanup.

Scrollbars are hidden app-wide in `src/index.css`; don't reintroduce them.

### The API layer is Observable-based (RxJS), not Promise-based

Every function in `src/lib/api/` returns `Observable<T>` and uses the `$`
suffix (`login$`, `listTours$`). This was an explicit user decision. Use
`useApiResource` for page data rather than writing a new fetch pattern, and
`useAuth()` for the signed-in user — never fetch `/users/me` in a page.

### Don't fabricate data

The Figma design shows six tourism modules; the live API only implements
**Tours** (plus auth, payments, reviews, an AI itinerary planner). Where the
design shows something with no backing endpoint, render the UI element with
an honest empty/inert state. **Never invent mock data to fill the gap.**

## Working agreements

- All work happens on the `dev` branch. Never commit large batches — one
  focused commit per feature/fix. Push to `origin/dev` only when asked.
- Run `npx tsc -b --noEmit`, `npm run lint` and `npm run build` before
  calling work done. All three currently pass with zero warnings; keep it
  that way.
- Report honestly what was and wasn't verified. Distinguish "wired and
  type-checks" from "confirmed working against the live backend."

## Verification tooling

Browser testing works via `playwright-core` driving the installed Chrome at
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` — no browser
binaries to download. Gotcha: `waitForLoadState('networkidle')` resolves
instantly after an SPA client-side navigation and will capture a
still-loading skeleton; wait on real content instead.

Test account: `claude.rxjs.test@example.com` / `RxjsTestPass123`.
