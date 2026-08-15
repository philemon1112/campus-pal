import { LocateFixed, MapPin, RefreshCw, Search, Star, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { destinationsApi, toursApi, type Destination, type Tour } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { formatDuration } from '@/lib/format';
import { ROUTES } from '@/lib/routes';
import { haversineKm, useGeolocation, type LatLng } from '@/lib/geo';
import type { MapMarker } from '@/components/map/MapView';

// MapLibre is ~800 KB before gzip, so it loads on demand rather than in the
// entry bundle. The <Skeleton> below is the same size as the map frame, so
// the chunk arriving doesn't move anything.
const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// Centre of Ghana — only used to frame the map when no destination has
// coordinates, which shouldn't happen with the current seed data.
const GHANA_CENTER: LatLng = { lat: 7.95, lng: -1.03 };

// Module M1 — Place of Interest Locator (search, category filters, map,
// "Nearby Places"). Results are real Tours: the API still has no generic
// POI concept, and `Tour` carries no category field.
//
// Restaurants and Hotels DO exist now as their own verticals, so those two
// pills navigate to those modules instead of filtering nothing. Only
// "Attractions" has no equivalent — a tour category would be needed — so it
// keeps an honest empty state.
const categories = ['All', 'Attractions', 'Restaurants', 'Hotels'] as const;
type Category = (typeof categories)[number];

// Pills that are really a jump to another module.
const categoryRoutes: Partial<Record<Category, string>> = {
  Restaurants: ROUTES.food,
  Hotels: ROUTES.hotels,
};

export function ExplorePage() {
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');

  // The API now supports ?q=, so search runs server-side across the whole
  // catalogue instead of filtering the single page already in memory.
  // Debounced so typing doesn't fire a request per keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const queryRef = useRef(debouncedQuery);
  queryRef.current = debouncedQuery;

  const { data, status, retry } = useApiResource(() =>
    forkJoin({
      toursPage: toursApi.listTours$({ limit: 20, q: queryRef.current || undefined }),
      destinationsPage: destinationsApi.listDestinations$(1, 50),
    }).pipe(
      map(({ toursPage, destinationsPage }) => ({
        tours: toursPage.results,
        destinationsById: new Map<string, Destination>(
          destinationsPage.results.map((d) => [d.id, d]),
        ),
      })),
    ),
  );

  // Refetch on a new search term (the documented useApiResource pattern).
  const retryRef = useRef(retry);
  retryRef.current = retry;
  const firstSearch = useRef(true);
  useEffect(() => {
    if (firstSearch.current) {
      firstSearch.current = false;
      return;
    }
    retryRef.current();
  }, [debouncedQuery]);

  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const geo = useGeolocation();

  // Only destinations the API gave real coordinates for get a pin. The
  // others are simply absent — no placeholder position is invented.
  const markers = useMemo<MapMarker[]>(() => {
    if (!data) return [];
    return [...data.destinationsById.values()]
      .filter((d): d is Destination & LatLng => d.lat !== undefined && d.lng !== undefined)
      .map((d) => ({ id: d.id, lat: d.lat, lng: d.lng, label: d.name }));
  }, [data]);

  // Camera: the user's location if they shared it, else the selected
  // destination. With neither, the map frames every pin itself
  // (fitToMarkers below), so this is just the pre-load starting position.
  const camera = useMemo(() => {
    if (geo.coords) return { center: geo.coords, zoom: 10 };
    const selected = selectedDestinationId
      ? markers.find((m) => m.id === selectedDestinationId)
      : undefined;
    if (selected) return { center: { lat: selected.lat, lng: selected.lng }, zoom: 11 };
    return { center: GHANA_CENTER, zoom: 6 };
  }, [geo.coords, selectedDestinationId, markers]);

  const selectedDestination = selectedDestinationId
    ? data?.destinationsById.get(selectedDestinationId)
    : undefined;

  const filteredTours = useMemo(() => {
    if (!data) return [];
    if (category !== 'All') return [];

    let tours = data.tours;
    if (selectedDestinationId) {
      tours = tours.filter((tour: Tour) => tour.destinationId === selectedDestinationId);
    }
    // No client-side title filter: `q` is applied by the API above.

    // Sort by how far each tour's destination is from the user, but only
    // once they've actually shared a location. Tours whose destination has
    // no coordinates sort last rather than being dropped.
    if (geo.coords) {
      const here = geo.coords;
      tours = [...tours].sort((a, b) => distanceFor(a) - distanceFor(b));

      function distanceFor(tour: Tour): number {
        const destination = data?.destinationsById.get(tour.destinationId);
        if (destination?.lat === undefined || destination.lng === undefined) return Infinity;
        return haversineKm(here, { lat: destination.lat, lng: destination.lng });
      }
    }
    return tours;
  }, [data, category, selectedDestinationId, geo.coords]);

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-0 lg:px-2">
      <header className="px-5 pt-6 pb-4 md:px-8 md:pt-10">
        <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400 md:max-w-lg">
          <Search className="size-5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search locations..."
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
          />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-5 pb-4 md:px-8">
        {categories.map((c) => {
          const pill = `shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
            category === c
              ? 'bg-brand-600 text-white'
              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
          }`;
          const route = categoryRoutes[c];
          return route ? (
            <Link key={c} to={route} className={pill}>
              {c}
            </Link>
          ) : (
            <button key={c} type="button" onClick={() => setCategory(c)} className={pill}>
              {c}
            </button>
          );
        })}
      </div>

      {/* SRS FR-POI-04: a map of everything in the current viewport. The
          frame is static and owns its height, so the lazy chunk and the
          tiles both fill in without moving the list below. */}
      <div className="mx-5 mb-3 md:mx-8">
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-card md:h-96 lg:h-[30rem]" />}>
          <MapView
            center={camera.center}
            zoom={camera.zoom}
            markers={markers}
            selectedId={selectedDestinationId}
            onMarkerSelect={setSelectedDestinationId}
            fitToMarkers={!geo.coords && !selectedDestinationId}
            ariaLabel="Map of destinations"
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

        {selectedDestination && (
          <button
            type="button"
            onClick={() => setSelectedDestinationId(null)}
            className="flex items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 dark:bg-brand-700/20 dark:text-brand-500"
          >
            {selectedDestination.name} <X className="size-4" />
          </button>
        )}

        {geo.status === 'denied' && (
          <span className="text-sm text-neutral-400">
            Location unavailable — showing all places.
          </span>
        )}
        {geo.status === 'unsupported' && (
          <span className="text-sm text-neutral-400">This browser can’t share a location.</span>
        )}
      </div>

      <section className="px-5 md:px-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Nearby Places</h2>
          {status === 'ready' && (
            <span className="text-sm text-neutral-400">{filteredTours.length} places</span>
          )}
        </div>

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load places.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Same grid, same card count, same internal layout as the real
            results below: thumbnail, title, meta line, rating row. */}
        {status === 'loading' && (
          <SkeletonRegion
            label="Loading places"
            className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Skeleton className="size-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-3/4" />
                  <SkeletonLine className="w-1/2" />
                  <SkeletonLine className="h-3 w-12" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && category !== 'All' && (
          <p className="py-6 text-center text-sm text-neutral-400">
            Attractions aren't a category the API has yet — tours have no
            category field. Browse them all under "All".
          </p>
        )}

        {status === 'ready' && category === 'All' && filteredTours.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            {selectedDestination
              ? `No tours in ${selectedDestination.name} yet.`
              : 'No places match that search.'}
          </p>
        )}

        {status === 'ready' && category === 'All' && (
          <div className="space-y-3 pb-4 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {filteredTours.map((tour) => {
              const destination = data?.destinationsById.get(tour.destinationId);
              return (
                <Link
                  key={tour.id}
                  to={`/explore/${tour.slug}`}
                  className="flex gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950">
                    {tour.heroImageUrl ? (
                      <img
                        src={tour.heroImageUrl}
                        alt={tour.title}
                        className="size-full object-cover"
                      />
                    ) : (
                      <MapPin className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-ink-900 dark:text-white">
                      {tour.title}
                    </div>
                    <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                      {destination?.name ?? destination?.region} · {formatDuration(tour.durationMinutes)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-sm">
                      <Star className="size-4 fill-accent-500 text-accent-500" />
                      <span className="font-medium text-ink-900 dark:text-white">
                        {tour.ratingCount > 0 ? tour.ratingAvg.toFixed(1) : 'New'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
