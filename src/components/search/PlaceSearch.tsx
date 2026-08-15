import { Building2, Compass, MapPin, Search, UtensilsCrossed, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { destinationsApi, restaurantsApi, staysApi, toursApi } from '@/lib/api';
import { SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';

// One search box across every "place" the app knows: destinations, tours,
// stays and restaurants — the same records the Explore map plots.
//
// There is deliberately no third-party geocoder here. The map is MapLibre on
// OpenFreeMap tiles, which is keyless and ships no places/geocoding API, so
// searching real-world addresses would mean adding an external provider (and
// a key). Searching the catalogue is what's actually useful anyway: every
// result is something you can open and book.
type PlaceKind = 'destination' | 'tour' | 'stay' | 'restaurant';

interface Place {
  id: string;
  kind: PlaceKind;
  title: string;
  subtitle: string;
  to: string;
}

const kindMeta: Record<PlaceKind, { icon: typeof MapPin; label: string }> = {
  destination: { icon: MapPin, label: 'Destination' },
  tour: { icon: Compass, label: 'Tour' },
  stay: { icon: Building2, label: 'Stay' },
  restaurant: { icon: UtensilsCrossed, label: 'Food' },
};

export function PlaceSearch({ className = '' }: { className?: string }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    // Each vertical is searched server-side and any one of them failing must
    // not take the whole dropdown down, hence the per-stream catchError.
    const subscription = forkJoin({
      tours: toursApi.listTours$({ q: debounced, limit: 4 }).pipe(catchError(() => of(null))),
      stays: staysApi.listStays$({ q: debounced, limit: 4 }).pipe(catchError(() => of(null))),
      restaurants: restaurantsApi
        .listRestaurants$({ q: debounced, limit: 4 })
        .pipe(catchError(() => of(null))),
      // Destinations have no q= param, so they're filtered client-side over
      // the (small, ~5 row) full list.
      destinations: destinationsApi.listDestinations$(1, 50).pipe(catchError(() => of(null))),
    })
      .pipe(
        map(({ tours, stays, restaurants, destinations }): Place[] => {
          const needle = debounced.toLowerCase();
          return [
            ...(destinations?.results ?? [])
              .filter(
                (d) =>
                  d.name.toLowerCase().includes(needle) ||
                  d.region?.toLowerCase().includes(needle),
              )
              .slice(0, 4)
              .map((d) => ({
                id: `dest-${d.id}`,
                kind: 'destination' as const,
                title: d.name,
                subtitle: d.region,
                to: ROUTES.explore,
              })),
            ...(tours?.results ?? []).map((t) => ({
              id: `tour-${t.id}`,
              kind: 'tour' as const,
              title: t.title,
              subtitle: 'Tour',
              to: `${ROUTES.explore}/${t.slug}`,
            })),
            ...(stays?.results ?? []).map((s) => ({
              id: `stay-${s.id}`,
              kind: 'stay' as const,
              title: s.name,
              subtitle: s.location,
              to: `${ROUTES.hotels}/${s.slug}`,
            })),
            ...(restaurants?.results ?? []).map((r) => ({
              id: `rest-${r.id}`,
              kind: 'restaurant' as const,
              title: r.name,
              subtitle: r.cuisine,
              to: `${ROUTES.food}/${r.slug}`,
            })),
          ];
        }),
      )
      .subscribe({
        next: (places) => {
          setResults(places);
          setSearching(false);
        },
        error: () => {
          setResults([]);
          setSearching(false);
        },
      });
    return () => subscription.unsubscribe();
  }, [debounced]);

  // Close on an outside click / Escape, the two things people expect from a
  // dropdown like this.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function go(place: Place) {
    setOpen(false);
    setQuery('');
    navigate(place.to);
  }

  const showPanel = open && debounced.length >= 2;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400 md:rounded-full md:px-6 md:py-4">
        <Search className="size-5 shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Where do you want to go?"
          aria-label="Search destinations, tours, stays and restaurants"
          className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white md:text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            aria-label="Clear search"
            className="shrink-0 text-neutral-400 transition hover:text-ink-900 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-card border border-neutral-100 bg-white p-2 text-left shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
          {searching && results === null && (
            <SkeletonRegion label="Searching" className="space-y-2 p-2">
              {Array.from({ length: 3 }, (_, i) => (
                <SkeletonLine key={i} className="w-3/4" />
              ))}
            </SkeletonRegion>
          )}

          {results?.length === 0 && !searching && (
            <p className="px-3 py-6 text-center text-sm text-neutral-400">
              Nothing matches “{debounced}”.
            </p>
          )}

          {results?.map((place) => {
            const { icon: Icon, label } = kindMeta[place.kind];
            return (
              <button
                key={place.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(place)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink-900 dark:text-white">
                    {place.title}
                  </span>
                  <span className="block truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {place.subtitle}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
