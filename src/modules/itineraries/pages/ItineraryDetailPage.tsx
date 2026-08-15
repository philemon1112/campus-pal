import { ChevronLeft, Info, RefreshCw, Sparkles, Sun, Sunrise, Sunset } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { throwError } from 'rxjs';
import { itinerariesApi, type ItineraryItem, type ItineraryPeriod } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import {
  Skeleton,
  SkeletonChip,
  SkeletonLine,
  SkeletonRegion,
  SkeletonText,
} from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Renders one AI-generated plan. The payoff of the whole feature is the
// "Book this tour" link on bookable items: the planner is grounded in real
// APPROVED tours, so item.tourSlug drops the user straight into the
// existing TourDetailPage booking flow.

// Fixed display order — the API returns items in no guaranteed period order.
const PERIODS: { key: ItineraryPeriod; label: string; icon: LucideIcon }[] = [
  { key: 'morning', label: 'Morning', icon: Sunrise },
  { key: 'afternoon', label: 'Afternoon', icon: Sun },
  { key: 'evening', label: 'Evening', icon: Sunset },
];

const kindStyles: Record<ItineraryItem['kind'], string> = {
  TOUR: 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500',
  MEAL: 'bg-accent-500/10 text-accent-500',
  FREE: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  TIP: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
};

function PlanItem({ item }: { item: ItineraryItem }) {
  // tourId/tourSlug are only meaningful when bookable is true — a
  // non-bookable item may not carry them at all, so never read them here.
  const canBook = item.bookable && Boolean(item.tourSlug);

  return (
    <div className="rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-ink-900 dark:text-white">{item.title}</h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${kindStyles[item.kind]}`}
        >
          {item.kind}
        </span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
        {item.description}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3">
        {item.estimatedCostMinor !== undefined ? (
          <span className="text-sm font-medium text-ink-900 dark:text-white">
            {formatMoney(item.estimatedCostMinor, 'GHS')}
          </span>
        ) : (
          <span />
        )}
        {canBook && (
          <Link
            to={`${ROUTES.explore}/${item.tourSlug}`}
            className="shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            Book this tour
          </Link>
        )}
      </div>
    </div>
  );
}

export function ItineraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: itinerary, status, retry } = useApiResource(() => {
    if (!id) return throwError(() => new Error('Missing itinerary id'));
    return itinerariesApi.getItinerary$(id);
  });

  const plan = itinerary?.plan;
  const totalMinor = plan?.estimatedTotalMinor ?? itinerary?.budgetMinor;

  // Shell-first: back link, header block, summary panel and two day sections
  // are all laid out on the first frame; only their contents resolve.
  return (
    <div className="px-5 py-6 md:mx-auto md:max-w-2xl md:py-10">
      <Link
        to={ROUTES.itineraries}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400"
      >
        <ChevronLeft className="size-4" /> All itineraries
      </Link>

      <header>
        {itinerary ? (
          <>
            <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{itinerary.title}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {itinerary.destinationName} · {itinerary.days}{' '}
              {itinerary.days === 1 ? 'day' : 'days'} · {itinerary.partySize}{' '}
              {itinerary.partySize === 1 ? 'traveller' : 'travellers'}
              {totalMinor !== undefined && ` · ${formatMoney(totalMinor, 'GHS')}`}
            </p>
          </>
        ) : (
          <SkeletonRegion label="Loading itinerary" className="space-y-2">
            <Skeleton className="h-8 w-4/5" />
            <SkeletonLine className="w-3/5" />
          </SkeletonRegion>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {itinerary
            ? itinerary.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  {interest}
                </span>
              ))
            : // Chip slots are reserved so the summary below doesn't jump
              // down when the real interests arrive. Literal classes — Tailwind
              // can't see interpolated ones.
              ['w-16', 'w-20'].map((w) => <SkeletonChip key={w} className={w} />)}
        </div>
      </header>

      {status === 'error' && (
        <div className="mt-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          {/* The API returns 404 rather than 403 for someone else's itinerary,
              so "not found" covers both cases honestly. */}
          <span>Couldn't load this itinerary. It may have been deleted.</span>
          <button
            type="button"
            onClick={retry}
            className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {/* Summary panel keeps its tinted frame while the text resolves. */}
      <div className="mt-4 rounded-card bg-brand-50 px-4 py-3 dark:bg-brand-700/15">
        {plan ? (
          <p className="text-sm leading-relaxed text-ink-700 dark:text-neutral-200">
            {plan.summary}
          </p>
        ) : (
          <SkeletonText lines={2} />
        )}
      </div>

      {!plan &&
        status !== 'error' &&
        // Two day sections, each with a heading and one item card, mirroring
        // the real structure below.
        [1, 2].map((day) => (
          <section key={day} className="mt-7">
            <Skeleton className="h-6 w-2/3" />
            <div className="mt-4">
              <SkeletonLine className="mb-2 w-20" />
              <SkeletonRegion
                label={`Loading day ${day}`}
                className="rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <SkeletonLine className="w-1/2" />
                  <SkeletonChip className="w-14 shrink-0" />
                </div>
                <SkeletonText lines={2} className="mt-2" />
              </SkeletonRegion>
            </div>
          </section>
        ))}

      {plan?.days.map((day) => (
        <section key={day.day} className="mt-7">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">
            Day {day.day} · {day.title}
          </h2>
          {PERIODS.map(({ key, label, icon: Icon }) => {
            const items = day.items.filter((item) => item.period === key);
            if (items.length === 0) return null;
            return (
              <div key={key} className="mt-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  <Icon className="size-3.5" /> {label}
                </h3>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <PlanItem key={`${item.title}-${index}`} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {plan?.notes && plan.notes.length > 0 && (
        <section className="mt-7">
          <h2 className="mb-2 flex items-center gap-1.5 text-lg font-bold text-ink-900 dark:text-white">
            <Info className="size-5 text-accent-500" /> Good to know
          </h2>
          <ul className="space-y-1.5">
            {plan.notes.map((note) => (
              <li
                key={note}
                className="flex gap-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300"
              >
                <span className="text-accent-500">•</span>
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {itinerary && (
        <p className="mt-8 flex items-center gap-1.5 text-xs text-neutral-400">
          <Sparkles className="size-3.5" /> Generated by {itinerary.model}
        </p>
      )}
    </div>
  );
}
