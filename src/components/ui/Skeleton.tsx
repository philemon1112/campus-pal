// Shared loading vocabulary. Every skeleton in the app is built from these
// primitives so the motion and colour language is identical on every page.
//
// The rule these exist to serve (see docs/UI_CONVENTIONS.md):
// a loading screen should look like the finished page with its content
// drained out — same headings, same frames, same grid, same card count —
// not a blank page with a spinner on it.
//
// Compose these *next to* the real markup they stand in for, so the two
// can't drift apart. Don't reach for a generic block.

interface SkeletonProps {
  className?: string;
}

// Base block. Everything else is this with a shape.
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-900 ${className}`}
    />
  );
}

// One line of text.
//
// The bar is deliberately thinner than the line box it sits in: the box
// occupies a full text line's height (default `h-5`, matching `text-sm`)
// so swapping in real text doesn't move anything below it. Getting this
// wrong is the main source of layout jump — pass the matching height for
// larger type (`text-2xl` → `h-8`) via `boxClassName`.
export function SkeletonLine({
  className = '',
  boxClassName = 'h-5',
}: SkeletonProps & { boxClassName?: string }) {
  return (
    <div className={`flex items-center ${boxClassName} ${className}`}>
      <Skeleton className="h-3.5 w-full" />
    </div>
  );
}

// Multi-line paragraph with a short last line, mirroring real text flow.
// Defaults to the `text-sm leading-relaxed` metrics used for body copy
// throughout the app (14px × 1.625 ≈ 22.75px per line).
export function SkeletonText({
  lines = 2,
  className = '',
  boxClassName = 'h-[22.75px]',
}: SkeletonProps & { lines?: number; boxClassName?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine
          key={i}
          boxClassName={boxClassName}
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ className = '' }: SkeletonProps) {
  return <Skeleton className={`rounded-full ${className}`} />;
}

// Pill/badge slot — use wherever the real UI shows a chip, tag or status
// badge, so those slots don't pop in and shift the row.
//
// Height is a prop rather than part of `className` because two competing
// Tailwind height classes have equal specificity: whichever ships later in
// the stylesheet wins, not whichever is written last in the attribute.
// Default `h-6` matches a `text-xs px-3 py-1` badge; use `h-5` for the
// tighter `py-0.5` pills.
export function SkeletonChip({
  className = '',
  boxClassName = 'h-6',
}: SkeletonProps & { boxClassName?: string }) {
  return <Skeleton className={`${boxClassName} rounded-full ${className}`} />;
}

// Marks a region as busy for assistive tech while its children are
// placeholders. Wrap the skeleton group, not the whole page.
export function SkeletonRegion({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}
