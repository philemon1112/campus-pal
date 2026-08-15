import { LocateFixed, RefreshCw, Search, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { foodJointsApi, type DietaryTag } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { FoodJointCard, FoodJointCardSkeleton } from '@/components/cards/FoodJointCard';
import { useGeolocation } from '@/lib/geo';
import { CAMPUS_ZOOM, UG_LEGON } from '@/lib/campus';
import type { MapMarker } from '@/components/map/MapView';

const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// Food joint directory — SRS 3.2 (FR-2.1, 2.2, 2.5, 2.6).
//
// Every filter here is applied SERVER-SIDE: the endpoint takes q, cuisine,
// priceTier, dietary, openNow and lat/lng, so the pills drive the query
// rather than filtering one page already in memory. That matters for
// FR-2.6's proximity filter in particular — distanceKm is computed by the
// API from the coordinates we send, so "Near me" has to be a request, not a
// client-side sort.

const priceTiers = [
  { tier: 1, label: '₵' },
  { tier: 2, label: '₵₵' },
  { tier: 3, label: '₵₵₵' },
  { tier: 4, label: '₵₵₵₵' },
] as const;

const dietaryOptions: { value: DietaryTag; label: string }[] = [
  { value: 'VEGETARIAN', label: 'Vegetarian' },
  { value: 'VEGAN', label: 'Vegan' },
  { value: 'HALAL', label: 'Halal' },
  { value: 'GLUTEN_FREE', label: 'Gluten free' },
];

export function FoodJointsPage() {
  const [query, setQuery] = useState('');
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [dietary, setDietary] = useState<DietaryTag | null>(null);
  const [openNow, setOpenNow] = useState(false);

  // Debounced so typing doesn't fire a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const geo = useGeolocation();

  const filtersRef = useRef({
    debouncedQuery,
    cuisine,
    priceTier,
    dietary,
    openNow,
    coords: geo.coords,
  });
  filtersRef.current = { debouncedQuery, cuisine, priceTier, dietary, openNow, coords: geo.coords };

  const { data, status, retry } = useApiResource(() => {
    const f = filtersRef.current;
    return foodJointsApi.listFoodJoints$({
      limit: 30,
      q: f.debouncedQuery || undefined,
      cuisine: f.cuisine ?? undefined,
      priceTier: f.priceTier ?? undefined,
      dietary: f.dietary ?? undefined,
      openNow: f.openNow || undefined,
      // FR-2.6 proximity. Without these the API can't return distanceKm,
      // which is why the card's distance row stays hidden until the user
      // opts in to sharing a location.
      lat: f.coords?.lat,
      lng: f.coords?.lng,
    });
  });

  // Refetch whenever a filter changes (the documented useApiResource pattern).
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
  }, [debouncedQuery, cuisine, priceTier, dietary, openNow, geo.coords]);

  const allJoints = useMemo(() => data?.results ?? [], [data]);

  // A pin click narrows the list to that one joint; the filters above still
  // drive what's on the map.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const markers = useMemo<MapMarker[]>(
    () => allJoints.map((j) => ({ id: j.id, lat: j.lat, lng: j.lng, label: j.name })),
    [allJoints],
  );
  const selected = useMemo(
    () => allJoints.find((j) => j.id === selectedId) ?? null,
    [allJoints, selectedId],
  );
  const joints = selected ? [selected] : allJoints;

  // Cuisine pills come from the data itself rather than a hardcoded list, so
  // they can't drift from what the backend actually has. Captured only from
  // unfiltered results — otherwise picking a cuisine would collapse the pill
  // list to just that one. Stored in state (not a ref mutated during render)
  // so the update is a proper commit-phase effect.
  const [knownCuisines, setKnownCuisines] = useState<string[]>([]);
  useEffect(() => {
    if (cuisine || allJoints.length === 0) return;
    const next = [...new Set(allJoints.map((j) => j.cuisine))].sort();
    setKnownCuisines((prev) => (prev.join('|') === next.join('|') ? prev : next));
  }, [cuisine, allJoints]);

  const camera = geo.coords
    ? { center: geo.coords, zoom: CAMPUS_ZOOM }
    : selected
      ? { center: { lat: selected.lat, lng: selected.lng }, zoom: 17 }
      : { center: UG_LEGON, zoom: CAMPUS_ZOOM };

  const loading = status === 'loading';

  return (
    <div className="md:mx-auto md:max-w-5xl md:px-6 lg:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">Food joints</h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Where to eat around campus, with opening hours, menus and a way to get in touch.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <Search className="size-5 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, food or place…"
            aria-label="Search food joints"
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
          />
        </div>
      </header>

      {/* Filters are static chrome — they render before any data arrives and
          never wait on it. Only the cuisine row is data-derived. */}
      <div className="space-y-2 px-5 pb-4 md:px-0">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setOpenNow((v) => !v)}
            aria-pressed={openNow}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              openNow
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            Open now
          </button>
          {priceTiers.map(({ tier, label }) => (
            <button
              key={tier}
              type="button"
              onClick={() => setPriceTier((v) => (v === tier ? null : tier))}
              aria-pressed={priceTier === tier}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                priceTier === tier
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
          {dietaryOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDietary((v) => (v === value ? null : value))}
              aria-pressed={dietary === value}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                dietary === value
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {knownCuisines.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {knownCuisines.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCuisine((v) => (v === value ? null : value))}
                aria-pressed={cuisine === value}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  cuisine === value
                    ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-600/30 dark:bg-brand-700/20 dark:text-brand-500'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* FR-2.5 — every joint on the campus map. */}
      <div className="mx-5 mb-3 md:mx-0">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-card md:h-80" />}>
          <MapView
            center={camera.center}
            zoom={camera.zoom}
            markers={markers}
            selectedId={selectedId}
            onMarkerSelect={setSelectedId}
            fitToMarkers={!geo.coords && !selected}
            ariaLabel="Map of food joints"
            className="h-48 w-full rounded-card md:h-80"
          />
        </Suspense>
      </div>

      <div className="mx-5 mb-6 flex flex-wrap items-center gap-2 md:mx-0">
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
            Location unavailable — showing every joint.
          </span>
        )}
      </div>

      <section className="px-5 pb-4 md:px-0">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Where to eat</h2>
          {status === 'ready' && (
            <span className="text-sm text-neutral-400">
              {joints.length} {joints.length === 1 ? 'place' : 'places'}
            </span>
          )}
        </div>

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load food joints.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {loading && (
          <SkeletonRegion label="Loading food joints" className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <FoodJointCardSkeleton key={i} />
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && joints.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            {debouncedQuery
              ? `Nothing matches “${debouncedQuery}”.`
              : 'No food joints match those filters.'}
          </p>
        )}

        {status === 'ready' && joints.length > 0 && (
          <div className="space-y-3">
            {joints.map((joint) => (
              <FoodJointCard key={joint.id} joint={joint} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
