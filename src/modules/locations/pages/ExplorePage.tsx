import { LocateFixed, RefreshCw, Search, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  locationsApi,
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_LABELS,
  type LocationCategory,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { LocationCard, LocationCardSkeleton } from '@/components/cards/LocationCard';
import { useGeolocation } from '@/lib/geo';
import { CAMPUS_ZOOM, UG_LEGON } from '@/lib/campus';
import type { MapMarker } from '@/components/map/MapView';

// MapLibre is ~800 KB before gzip, so it loads on demand rather than in the
// entry bundle. The <Skeleton> fallback is the same size as the map frame,
// so the chunk arriving doesn't move anything.
const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// Campus Explorer — SRS 3.1 (FR-1.1, 1.2, 1.4, 1.6).
//
// The category pills here are REAL: they drive `?category=` on the request,
// which is the whole point of FR-1.1/FR-1.6. Search is server-side and
// debounced (FR-1.2). Both are only as good as the endpoint behind them —
// GET /locations does not exist yet (docs/API_REQUIREMENTS.md §A), so this
// screen currently renders its full shell and an honest "not available yet"
// notice in the results region. It does not invent buildings.

type Filter = 'ALL' | LocationCategory;

export function ExplorePage() {
  const [category, setCategory] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');

  // Debounced so typing doesn't fire a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const geo = useGeolocation();

  const filtersRef = useRef({ debouncedQuery, category, coords: geo.coords });
  filtersRef.current = { debouncedQuery, category, coords: geo.coords };

  const { data, status, retry } = useApiResource(() => {
    const f = filtersRef.current;
    return locationsApi.listLocations$({
      limit: 60,
      q: f.debouncedQuery || undefined,
      category: f.category === 'ALL' ? undefined : f.category,
      // Sending coordinates is what makes the API return distanceKm, so
      // "Near me" is a server-side sort rather than a client-side one.
      lat: f.coords?.lat,
      lng: f.coords?.lng,
    });
  });

  // Refetch whenever a filter changes (the documented useApiResource
  // pattern — see src/hooks/useApiResource.ts).
  const retryRef = useRef(retry);
  retryRef.current = retry;
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSelectedId(null);
    retryRef.current();
  }, [debouncedQuery, category, geo.coords]);

  const allLocations = useMemo(() => data?.results ?? [], [data]);

  // A pin click narrows the list to that one location; the filters above
  // still drive what's on the map.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const markers = useMemo<MapMarker[]>(
    () => allLocations.map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, label: l.name })),
    [allLocations],
  );
  const selected = useMemo(
    () => allLocations.find((l) => l.id === selectedId) ?? null,
    [allLocations, selectedId],
  );
  const locations = selected ? [selected] : allLocations;

  const camera = geo.coords
    ? { center: geo.coords, zoom: CAMPUS_ZOOM }
    : selected
      ? { center: { lat: selected.lat, lng: selected.lng }, zoom: 17 }
      : { center: UG_LEGON, zoom: CAMPUS_ZOOM };

  const loading = status === 'loading';

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-0 lg:px-2">
      {/* Static shell — heading, search box, pills and the map frame all
          paint on the first frame and never wait on data. */}
      <header className="px-5 pt-6 pb-4 md:px-8 md:pt-10">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">
          Explore campus
        </h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Lecture halls, departments, halls of residence and everything else on the Legon campus.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400 md:max-w-lg">
          <Search className="size-5 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a place on campus…"
            aria-label="Search campus locations"
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
          />
        </div>
      </header>

      {/* FR-1.1 / FR-1.6 — the six SRS categories, driving the query. */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-4 md:px-8">
        {(['ALL', ...LOCATION_CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
              category === c
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            {c === 'ALL' ? 'All' : LOCATION_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      {/* FR-1.4 — every result on an interactive campus map. */}
      <div className="mx-5 mb-3 md:mx-8">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-card md:h-96 lg:h-[30rem]" />}>
          <MapView
            center={camera.center}
            zoom={camera.zoom}
            markers={markers}
            selectedId={selectedId}
            onMarkerSelect={setSelectedId}
            fitToMarkers={!geo.coords && !selected}
            ariaLabel="Map of campus locations"
            className="h-48 w-full rounded-card md:h-96 lg:h-[30rem]"
          />
        </Suspense>
      </div>

      <div className="mx-5 mb-6 flex flex-wrap items-center gap-2 md:mx-8">
        <button
          type="button"
          onClick={geo.request}
          disabled={geo.status === 'locating'}
          className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 disabled:opacity-50 dark:bg-neutral-900 dark:text-white"
        >
          <LocateFixed className="size-4" />
          {geo.status === 'locating'
            ? 'Locating…'
            : geo.status === 'ready'
              ? 'Sorted by distance'
              : 'Near me'}
        </button>

        {selected && (
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 dark:bg-brand-700/20 dark:text-brand-500"
          >
            {selected.name} <X className="size-4" />
          </button>
        )}

        {geo.status === 'denied' && (
          <span className="text-sm text-neutral-400">
            Location unavailable — showing everywhere on campus.
          </span>
        )}
        {geo.status === 'unsupported' && (
          <span className="text-sm text-neutral-400">This browser can’t share a location.</span>
        )}
      </div>

      <section className="px-5 pb-4 md:px-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">
            {category === 'ALL' ? 'Places on campus' : LOCATION_CATEGORY_LABELS[category]}
          </h2>
          {status === 'ready' && (
            <span className="text-sm text-neutral-400">
              {locations.length} {locations.length === 1 ? 'place' : 'places'}
            </span>
          )}
        </div>

        {/* Errors go inline, in the region that failed — the heading, pills
            and map above stay exactly where they are. */}
        {status === 'error' && (
          <div className="rounded-card border border-neutral-100 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="text-sm font-medium text-ink-900 dark:text-white">
              Campus locations aren’t available yet
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              The <code className="font-mono text-xs">GET /locations</code> endpoint hasn’t been
              built on the backend. Once it lands, this list, the map pins and the category filters
              all work as they are — see docs/API_REQUIREMENTS.md §A.
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-3 flex items-center gap-1 text-sm font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Try again
            </button>
          </div>
        )}

        {loading && (
          <SkeletonRegion
            label="Loading campus locations"
            className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <LocationCardSkeleton key={i} />
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && locations.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            {debouncedQuery ? `Nothing on campus matches “${debouncedQuery}”.` : 'Nothing here yet.'}
          </p>
        )}

        {status === 'ready' && locations.length > 0 && (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {locations.map((location) => (
              <LocationCard key={location.id} location={location} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
