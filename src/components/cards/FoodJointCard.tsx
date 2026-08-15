import { Leaf, MapPin, Star, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FoodJoint } from '@/lib/api';
import { Skeleton, SkeletonChip, SkeletonLine } from '@/components/ui/Skeleton';
import { priceTierLabel } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// One food joint, as a row. Shared by the Food tab, Saved and the
// assistant's inline results (FR-3.4), for the same reason as LocationCard:
// the assistant should show exactly what browsing shows.

const CARD_CLASSES =
  'flex gap-3 rounded-card border border-neutral-100 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900';

export function FoodJointCard({ joint }: { joint: FoodJoint }) {
  return (
    <Link to={`${ROUTES.food}/${joint.slug}`} className={`group ${CARD_CLASSES}`}>
      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950">
        {joint.heroImageUrl ? (
          <img
            src={joint.heroImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Utensils className="size-8" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-ink-900 dark:text-white">{joint.name}</h3>
        <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">
          {joint.cuisine} · {priceTierLabel(joint.priceTier)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
          {joint.ratingCount > 0 && (
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-accent-500 text-accent-500" />
              <span className="font-medium text-ink-900 dark:text-white">
                {joint.ratingAvg.toFixed(1)}
              </span>
              ({joint.ratingCount})
            </span>
          )}
          {/* The campus landmark is what FR-2.3 actually asks for ("location
              on campus"); distanceKm is the fallback, and only exists once
              the browser has shared a position. */}
          {joint.nearestLocation ? (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-4 shrink-0" />
              <span className="truncate">Near {joint.nearestLocation.name}</span>
            </span>
          ) : (
            joint.distanceKm !== undefined && (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" /> {joint.distanceKm.toFixed(1)} km
              </span>
            )
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              joint.isOpenNow
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500'
                : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {joint.isOpenNow ? 'Open' : 'Closed'}
          </span>
        </div>

        {joint.dietary.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {joint.dietary.map((tag) => (
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

export function FoodJointCardSkeleton() {
  return (
    <div className={CARD_CLASSES}>
      <Skeleton className="size-24 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1">
        <SkeletonLine className="w-2/3" />
        <SkeletonLine className="mt-1 w-1/2" />
        <div className="mt-2 flex gap-2">
          <SkeletonChip boxClassName="h-5" className="w-16" />
          <SkeletonChip boxClassName="h-5" className="w-14" />
        </div>
        <div className="mt-1.5 flex gap-1">
          <SkeletonChip boxClassName="h-5" className="w-20" />
        </div>
      </div>
    </div>
  );
}
