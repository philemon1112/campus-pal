# CLAUDE.md

Project instructions for the CampusPal frontend.

**Read `docs/HANDOFF.md` first** — it's the current-state snapshot (what's
built, what's blocked, which endpoints exist). `CampusPal_SRS.md` is the
requirements this app is built against; `docs/API_REQUIREMENTS.md` is the
list of endpoints the backend still owes us.

## What this is

A web app for **University of Ghana, Legon**: campus location discovery with
directions, a food-joint directory, and a conversational AI assistant that
performs in-app actions. Forked from a tourism app ("Voyago") for its
infrastructure — the RxJS API client, the MapLibre wrapper, auth, and the
loading conventions — not for its features.

## Non-negotiables

### UI loading states — read `docs/UI_CONVENTIONS.md` before building any page

Every page renders its **static shell on the first frame** (headings, card
frames, tabs, filters, buttons, map frames) and swaps only data-dependent
values from content-shaped placeholders. Never early-return a whole-page
skeleton or error screen. Build placeholders from
`src/components/ui/Skeleton.tsx`, and compose them next to the real markup so
they can't drift apart. This applies to **new pages as well as existing
ones** — it's a standing requirement, not a one-off cleanup.

Scrollbars are hidden app-wide in `src/index.css`; don't reintroduce them.

### The API layer is Observable-based (RxJS), not Promise-based

Every function in `src/lib/api/` returns `Observable<T>` and uses the `$`
suffix (`login$`, `listLocations$`). Use `useApiResource` for page data
rather than writing a new fetch pattern, and `useAuth()` for the signed-in
user — never fetch `/users/me` in a page.

### Don't fabricate data

**This is the rule most at risk in this codebase**, because two of the three
SRS features have no backend at all. Campus locations, the AI assistant,
food-joint reviews and vendor writes are all typed and wired against
endpoints that return 404 today.

Where an endpoint doesn't exist, render the real UI and an **honest empty or
inert state that names the gap** — "the assistant isn't connected yet", a
disabled Contact button with the reason underneath. **Never invent mock
locations, canned assistant replies, or placeholder reviews.** A screen that
looks like it works and doesn't is worse than one that says so.

### Colour roles are not interchangeable

`brand-500` (#f97316) is for tints, icons, borders and map pins. `brand-600`
(#c2410c) is the solid-button fill — it is dark enough for white text
(5.0:1). Don't swap them; `brand-500` behind white text fails WCAG AA.

## Working agreements

- Never commit large batches — one focused commit per feature/fix.
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
