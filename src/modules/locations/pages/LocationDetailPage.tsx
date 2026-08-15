import { ChevronLeft, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { Suspense, lazy, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { locationsApi, LOCATION_CATEGORY_LABELS } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonChip, SkeletonLine, SkeletonText } from '@/components/ui/Skeleton';
import { SaveButton } from '@/components/ui/SaveButton';
import { directionsUrl } from '@/lib/geo';
import { CAMPUS_ZOOM, UG_LEGON } from '@/lib/campus';
import { ROUTES } from '@/lib/routes';

const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// One campus location — SRS FR-1.3 (name, category, description, photo),
// FR-1.4 (on the map), FR-1.5 (walking directions), FR-1.7 (save it).
//
// FR-1.5 is served by handing off to whatever maps app the device already
// has (src/lib/geo.ts). There is no routing service behind CampusPal and
// MapLibre over OpenFreeMap tiles ships none, so drawing a route line would
// mean inventing one. The hand-off is the honest version of turn-by-turn.

export function LocationDetailPage() {
  const { slug = '' } = useParams();
  const slugRef = useRef(slug);
  slugRef.current = slug;

  const { data: location, status, retry } = useApiResource(() =>
    locationsApi.getLocation$(slugRef.current),
  );

  // Refetch when the slug changes — e.g. following one result to another
  // without unmounting the page.
  const retryRef = useRef(retry);
  retryRef.current = retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    retryRef.current();
  }, [slug]);

  const failed = status === 'error';

  return (
    <div className="md:mx-auto md:max-w-5xl md:px-6 lg:px-8">
      {/* The whole frame below is static: back link, hero slot, heading
          block, map frame and action row all render on the first frame and
          only their values swap. */}
      <div className="px-5 pt-5 md:px-0 md:pt-8">
        <Link
          to={ROUTES.explore}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 transition hover:text-ink-900 dark:hover:text-white"
        >
          <ChevronLeft className="size-4" /> Explore
        </Link>
      </div>

      <div className="px-5 pt-4 md:px-0">
        <div className="aspect-[16/9] w-full overflow-hidden rounded-card bg-gradient-to-br from-brand-100 to-brand-50 dark:from-neutral-900 dark:to-neutral-950">
          {location?.photos[0] ? (
            <img
              src={location.photos[0]}
              alt={location.name}
              className="size-full object-cover"
            />
          ) : location ? (
            <div className="flex size-full items-center justify-center text-brand-600 dark:text-brand-500">
              <MapPin className="size-12" />
            </div>
          ) : (
            <Skeleton className="size-full rounded-none" />
          )}
        </div>
      </div>

      <header className="px-5 pt-5 md:px-0">
        {location ? (
          <>
            <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">
              {location.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-500">
                {LOCATION_CATEGORY_LABELS[location.category]}
              </span>
              {location.distanceKm !== undefined && (
                <span className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
                  <MapPin className="size-4" /> {location.distanceKm.toFixed(1)} km away
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <SkeletonLine boxClassName="h-8" className="w-2/3" />
            <div className="mt-2 flex gap-2">
              <SkeletonChip className="w-28" />
            </div>
          </>
        )}
      </header>

      {failed && (
        <div className="mx-5 mt-4 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900 md:mx-0">
          <p className="text-sm font-medium text-ink-900 dark:text-white">
            This location isn’t available yet
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            <code className="font-mono text-xs">GET /locations/:slug</code> hasn’t been built on the
            backend — see docs/API_REQUIREMENTS.md §A.
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

      <section className="px-5 pt-5 md:px-0">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">About</h2>
        <div className="mt-2">
          {location ? (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {location.description ?? 'No description yet.'}
            </p>
          ) : failed ? null : (
            <SkeletonText lines={3} />
          )}
        </div>

        {location?.buildingNotes && (
          <p className="mt-3 rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
            {location.buildingNotes}
          </p>
        )}
      </section>

      {/* FR-1.4 — the map frame owns its height so tiles arriving never
          reflow the page. */}
      <section className="px-5 pt-6 md:px-0">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          On the map
        </h2>
        <Suspense fallback={<Skeleton className="h-56 w-full rounded-card md:h-72" />}>
          <MapView
            center={location ? { lat: location.lat, lng: location.lng } : UG_LEGON}
            zoom={location ? 17 : CAMPUS_ZOOM}
            markers={
              location
                ? [{ id: location.id, lat: location.lat, lng: location.lng, label: location.name }]
                : []
            }
            ariaLabel={location ? `Map showing ${location.name}` : 'Campus map'}
            className="h-56 w-full rounded-card md:h-72"
          />
        </Suspense>
      </section>

      {/* Action bar: fixed above the tab bar on mobile, settling at the end
          of the content column on desktop rather than floating over the
          footer. Follow this pattern for any new sticky bar. */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:static md:mt-8 md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none dark:md:bg-transparent">
        <div className="mx-auto flex max-w-md items-center gap-2 md:max-w-none">
          {/* FR-1.5 */}
          <a
            href={location ? directionsUrl({ lat: location.lat, lng: location.lng }) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!location}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 md:flex-none md:px-8 ${
              location ? '' : 'pointer-events-none opacity-50'
            }`}
          >
            <Navigation className="size-4" /> Directions
          </a>
          {location && <SaveButton type="LOCATION" itemId={location.id} />}
        </div>
      </div>
    </div>
  );
}
