import { MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LOCATION_CATEGORY_LABELS, type CampusLocation } from '@/lib/api';
import { Skeleton, SkeletonLine } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';

// One campus location, as a row. Shared by Explore, Saved and the
// assistant's inline results (FR-3.3) so a chat result and a list result are
// literally the same component — an assistant answer can't drift out of sync
// with the browse experience.
//
// The skeleton lives in this file, next to the markup it stands in for, per
// docs/UI_CONVENTIONS.md §3: same wrapper classes, same thumbnail size, same
// three text rows.

const CARD_CLASSES =
  'flex gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900';

export function LocationCard({ location }: { location: CampusLocation }) {
  return (
    <Link to={`${ROUTES.explore}/${location.slug}`} className={`group ${CARD_CLASSES}`}>
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950">
        {location.photos[0] ? (
          <img
            src={location.photos[0]}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <MapPin className="size-6" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold text-ink-900 dark:text-white">{location.name}</h3>
        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
          {LOCATION_CATEGORY_LABELS[location.category]}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-neutral-500 dark:text-neutral-400">
          {location.distanceKm !== undefined && (
            <span className="flex items-center gap-1">
              <MapPin className="size-4" /> {location.distanceKm.toFixed(1)} km
            </span>
          )}
          {location.buildingNotes && <span className="truncate">{location.buildingNotes}</span>}
        </div>
      </div>
    </Link>
  );
}

export function LocationCardSkeleton() {
  return (
    <div className={CARD_CLASSES}>
      <Skeleton className="size-16 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonLine className="w-3/4" />
        <SkeletonLine className="w-1/2" />
        <SkeletonLine className="h-3 w-16" />
      </div>
    </div>
  );
}
