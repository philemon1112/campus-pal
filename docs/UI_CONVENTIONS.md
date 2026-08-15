# UI Conventions

Rules every page in this app follows. **New pages must follow them too** —
this is not a description of what happens to exist, it's the contract.

---

## Loading: structure first, content second

The goal: *"structure is here, content is filling in"* — never *"wait on a
blank page."* On a slow network the user should still see a complete,
recognisable page shell with quiet, content-shaped placeholders that swap
into real data **without any layout jump**.

### 1. The static shell paints on the first frame

App chrome, nav, page title, section headings, card frames, tab bars,
filters and buttons do not depend on data, so they must never wait for it.

**Never early-return a loading state for the whole page.** That is the
single most common way this gets broken:

```tsx
// ❌ Blanks the entire page — headings, frames and nav all disappear
if (status === 'loading') return <PageSkeleton />;
if (status === 'error') return <ErrorPage />;
return <RealPage data={data} />;
```

```tsx
// ✅ One shell; only the data-dependent values inside it swap
const loading = status === 'loading';
return (
  <div>
    <h1>Upcoming Departures</h1>        {/* static — always visible */}
    <div className="rounded-card border …">  {/* frame — always visible */}
      {tour ? <Price value={tour.priceMinor} /> : <SkeletonLine className="w-24" />}
    </div>
  </div>
);
```

Errors go **inline, in the region that failed**, keeping the rest of the
page intact — not as a full-page replacement.

### 2. Granular, not monolithic

Prefer several small placeholder regions that resolve independently over one
page-sized skeleton. `ProfilePage` is the reference: the name/email block and
the loyalty pill resolve separately, and the entire settings menu is static so
it never waits at all.

> **Note on Suspense.** The brief for these rules describes React `<Suspense>`
> boundaries. This app's data layer is **RxJS Observables** (a deliberate,
> documented choice — see `DEVELOPMENT_LOG.md` session 4), not promises, so
> literal Suspense boundaries don't apply without rewriting it. The
> equivalent here is **per-region conditional rendering** driven by
> `useApiResource` status, as above: same granularity, same progressive feel.
> If the data layer ever moves to promises, these regions map 1:1 onto
> Suspense boundaries.

### 3. Placeholders are content-shaped

A fallback mirrors the final UI — same grid, same card count, same row
shape, same badge/chip slots. A list skeleton looks like list rows; a card
skeleton looks like that card.

**Compose skeletons next to the real markup they stand in for**, reusing its
container classes, so the two can't drift apart. Do not build a shared
"CardSkeleton" that lives away from the card it mimics.

❌ `<div className="h-40 animate-pulse rounded-card bg-neutral-100" />`
✅ the real card's wrapper, with `<Skeleton>` blocks where the values go
(see `TripsPage`, which reproduces the accent edge, icon tile, status badge
and divided action footer).

### 4. Motion is quiet and identical everywhere

Always build from `src/components/ui/Skeleton.tsx`:

| Primitive | Use for |
| --- | --- |
| `Skeleton` | base block — any shape, pass `className` |
| `SkeletonLine` | one line of text |
| `SkeletonText` | a paragraph (last line short, like real text) |
| `SkeletonCircle` | avatars, icon buttons |
| `SkeletonChip` | badges, tags, status pills |
| `SkeletonRegion` | wraps a group; adds `role="status"` + `aria-busy` |

`animate-pulse` on a muted background, nothing else. No gradient shimmer, no
spinners floating in empty space, no full-screen sheets. `index.css` disables
the pulse under `prefers-reduced-motion`.

**One deliberate exception:** a spinner is allowed *inside a button* on a
user-initiated action, next to text saying what is happening. The AI planner
(~66s) does this and additionally previews the plan's real shape below the
form, rather than replacing the page.

### 5. Long waits state their cost

If an operation routinely takes more than a few seconds, say so in words. A
minute of silent shimmer reads as a hang. See `ItinerariesPage`:
*"This usually takes about a minute."*

### Checklist for a new page

- [ ] Headings, frames, tabs and buttons render before data arrives
- [ ] No early-return that blanks the page for loading or error
- [ ] Errors render inline in the failed region
- [ ] Every placeholder mirrors the real element's shape and container
- [ ] Placeholders built from `Skeleton.tsx`, never ad-hoc `animate-pulse` divs
- [ ] Nothing shifts position when real data replaces a placeholder
- [ ] Waits over a few seconds are explained in words

---

## Scrollbars

Scrollbars are **hidden app-wide** in `src/index.css` (`scrollbar-width: none`
plus the WebKit pseudo-element). Scrolling itself is untouched — wheel,
trackpad, touch, keyboard and programmatic scrolling all behave normally;
only the chrome isn't painted.

This keeps the horizontal carousels (Home's destinations, Explore's category
pills) clean. Don't reintroduce per-element scrollbar styling.
