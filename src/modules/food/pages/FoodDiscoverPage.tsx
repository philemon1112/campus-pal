import { Leaf, MapPin, RefreshCw, Search, Star, Utensils, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { restaurantsApi, type DietaryTag, type Restaurant } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';
import type { LatLng } from '@/lib/geo';
import type { MapMarker } from '@/components/map/MapView';

// Same lazy-loading as Explore: MapLibre is ~800 KB before gzip, so it
// stays out of the entry bundle and the Skeleton below holds its space.
const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// Accra — only the pre-load framing; fitToMarkers takes over once pins land.
const ACCRA: LatLng = { lat: 5.6037, lng: -0.187 };

// Module M4 — Food & Drinks (SRS 3.5, FR-FOOD-01 to 11).
//
// Real data via GET /restaurants (was static data.ts). Filtering is done
// **server-side** — the endpoint takes q, cuisine, priceTier, dietary and
// openNow — so the pills drive the query rather than filtering one page
// client-side.
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

function priceTierLabel(tier: number): string {
  return '₵'.repeat(Math.max(1, Math.min(4, tier)));
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      to={`${ROUTES.food}/${restaurant.slug}`}
      className="group flex gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950">
        {restaurant.heroImageUrl ? (
          <img
            src={restaurant.heroImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Utensils className="size-8" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate font-bold text-ink-900 dark:text-white">{restaurant.name}</h3>
            <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
              {restaurant.cuisine} · {priceTierLabel(restaurant.priceTier)}
            </p>
          </div>
          <span className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white">
            Reserve
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
          {restaurant.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-accent-500 text-accent-500" />
              <span className="font-medium text-ink-900 dark:text-white">
                {restaurant.ratingAvg.toFixed(1)}
              </span>
              ({restaurant.ratingCount})
            </span>
          )}
          {restaurant.distanceKm !== undefined && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {restaurant.distanceKm.toFixed(1)} km
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              restaurant.isOpenNow
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {restaurant.isOpenNow ? 'Open' : 'Closed'}
          </span>
        </div>

        {restaurant.dietary.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {restaurant.dietary.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <Leaf className="size-3" />
                {tag.replace('_', ' ').toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}

export function FoodDiscoverPage() {
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

  const filtersRef = useRef({ debouncedQuery, cuisine, priceTier, dietary, openNow });
  filtersRef.current = { debouncedQuery, cuisine, priceTier, dietary, openNow };

  const { data, status, retry } = useApiResource(() => {
    const f = filtersRef.current;
    return restaurantsApi.listRestaurants$({
      limit: 30,
      q: f.debouncedQuery || undefined,
      cuisine: f.cuisine ?? undefined,
      priceTier: f.priceTier ?? undefined,
      dietary: f.dietary ?? undefined,
      openNow: f.openNow || undefined,
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
  }, [debouncedQuery, cuisine, priceTier, dietary, openNow]);

  const allRestaurants = useMemo(() => data?.results ?? [], [data]);

  // A pin click narrows the list to that one restaurant; the filters above
  // still drive what's on the map.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const markers = useMemo<MapMarker[]>(
    () =>
      allRestaurants
        .filter((r) => r.lat !== undefined && r.lng !== undefined)
        .map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: r.name })),
    [allRestaurants],
  );
  const selectedRestaurant = useMemo(
    () => allRestaurants.find((r) => r.id === selectedId) ?? null,
    [allRestaurants, selectedId],
  );
  const restaurants = selectedRestaurant ? [selectedRestaurant] : allRestaurants;

  // Cuisine pills come from the data itself rather than a hardcoded list, so
  // they can't drift from what the backend actually has. Captured only from
  // unfiltered results — otherwise picking a cuisine would collapse the pill
  // list to just that one. Stored in state (not a ref mutated during render)
  // so the update is a proper commit-phase effect.
  const [knownCuisines, setKnownCuisines] = useState<string[]>([]);
  useEffect(() => {
    if (cuisine || allRestaurants.length === 0) return;
    const next = [...new Set(allRestaurants.map((r) => r.cuisine))].sort();
    setKnownCuisines((prev) => (prev.join('|') === next.join('|') ? prev : next));
  }, [cuisine, allRestaurants]);

  return (
    <div className="md:mx-auto md:max-w-5xl md:px-6 lg:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">
          Food &amp; Drinks
        </h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Restaurants around Accra, with live opening hours and table booking.
        </p>
      </header>

      <div className="px-5 md:px-0">
        <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <Search className="size-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, cuisines..."
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
          />
        </div>
      </div>

      <section className="px-5 pt-5 md:px-0">
        <h2 className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Price Range</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {priceTiers.map(({ tier, label }) => (
            <button
              key={tier}
              type="button"
              onClick={() => setPriceTier((t) => (t === tier ? null : tier))}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                priceTier === tier
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpenNow((o) => !o)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
              openNow
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
            }`}
          >
            Open now
          </button>
        </div>
      </section>

      {knownCuisines.length > 0 && (
        <section className="px-5 pt-5 md:px-0">
          <h2 className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Cuisine</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCuisine(null)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                cuisine === null
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              All
            </button>
            {knownCuisines.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCuisine((current) => (current === c ? null : c))}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
                  cuisine === c
                    ? 'bg-brand-600 text-white'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="px-5 pt-5 md:px-0">
        <h2 className="mb-2 text-sm font-semibold text-ink-900 dark:text-white">Dietary Options</h2>
        <div className="flex flex-wrap gap-2">
          {dietaryOptions.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setDietary((d) => (d === value ? null : value))}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition ${
                dietary === value
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400'
              }`}
            >
              <Leaf className="size-4" /> {label}
            </button>
          ))}
        </div>
      </section>

      {/* Real map: every restaurant carries lat/lng, so each one gets a pin.
          Clicking a pin filters the list to it. */}
      <div className="px-5 pt-5 md:px-0">
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-card md:h-96 lg:h-[28rem]" />}>
          <MapView
            center={ACCRA}
            zoom={11}
            markers={markers}
            selectedId={selectedId}
            onMarkerSelect={setSelectedId}
            fitToMarkers={!selectedId}
            ariaLabel="Map of restaurants"
            className="h-56 w-full rounded-card md:h-96 lg:h-[28rem]"
          />
        </Suspense>

        {selectedRestaurant && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-card border border-brand-500/30 bg-brand-50 px-4 py-3 dark:bg-brand-700/15">
            <span className="min-w-0 truncate text-sm text-ink-900 dark:text-white">
              Showing <span className="font-semibold">{selectedRestaurant.name}</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-500"
            >
              <X className="size-4" /> Clear
            </button>
          </div>
        )}
      </div>

      <section className="px-5 py-6 md:px-0">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white md:text-2xl">
            Nearby Restaurants
          </h2>
          {status === 'ready' && (
            <span className="text-sm text-neutral-400">
              {data?.total ?? restaurants.length} found
            </span>
          )}
        </div>

        {status === 'loading' && (
          <SkeletonRegion
            label="Loading restaurants"
            className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-card border border-neutral-100 p-3 dark:border-neutral-800"
              >
                <Skeleton className="size-24 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="w-1/2" />
                  <SkeletonLine className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load restaurants.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {status === 'ready' && restaurants.length === 0 && (
          <p className="rounded-card border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-800">
            No restaurants match those filters.
          </p>
        )}

        {status === 'ready' && restaurants.length > 0 && (
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-4">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
