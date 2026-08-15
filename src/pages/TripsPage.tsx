import { Building2, CalendarDays, Compass, Eye, MapPin, Plane, RefreshCw, Ticket, UtensilsCrossed, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Link } from 'react-router-dom';
import { bookingsApi, restaurantsApi, type BookableType, type Booking, type BookingStatus } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonChip, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { formatDate, formatMoney, formatTime } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// "My Trips" — GET /bookings/me returns **unified** trips: tours plus
// stay / flight / table reservations, discriminated by `itemType`.
//
// Two things follow from that and are easy to get wrong:
//  1. `seats` and `departureId` are TOUR-only, so a hotel row must not
//     render "undefined seats".
//  2. Cancelling uses a different endpoint per family — tours go to
//     /bookings/:ref/cancel, everything else to /reservations/:ref/cancel.
const tabs = ['Upcoming', 'Completed', 'Cancelled'] as const;
type Tab = (typeof tabs)[number];

function matchesTab(booking: Booking, tab: Tab): boolean {
  if (tab === 'Upcoming') return booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  if (tab === 'Completed') return booking.status === 'COMPLETED';
  return booking.status === 'CANCELLED';
}

const statusStyles: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500',
  COMPLETED: 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500',
  PENDING: 'bg-accent-500/10 text-accent-500',
  CANCELLED: 'bg-danger-500/10 text-danger-500',
};

// The accent edge that gives each card its colour. Driven by real status
// rather than an invented per-category palette.
const accentByStatus: Record<BookingStatus, string> = {
  CONFIRMED: 'bg-brand-500',
  COMPLETED: 'bg-brand-500',
  PENDING: 'bg-accent-500',
  CANCELLED: 'bg-danger-500',
};

function statusLabel(status: BookingStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

// Per-family icon and the route its "view the thing" action should open.
const typeMeta: Record<BookableType, { icon: typeof Compass; label: string; route?: string }> = {
  TOUR: { icon: Compass, label: 'Tour', route: ROUTES.explore },
  STAY: { icon: Building2, label: 'Stay', route: ROUTES.hotels },
  FLIGHT: { icon: Plane, label: 'Flight' }, // no per-offer page to link to
  TABLE: { icon: UtensilsCrossed, label: 'Table', route: ROUTES.food },
};

function BookingCard({
  booking,
  cancelling,
  onCancel,
}: {
  booking: Booking;
  cancelling: boolean;
  onCancel: (booking: Booking) => void;
}) {
  const item = booking.item;
  const type = booking.itemType ?? 'TOUR';
  const meta = typeMeta[type] ?? typeMeta.TOUR;
  const Icon = meta.icon;
  const cancellable = booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  // The trip's own date is what a traveller cares about; fall back to when
  // the booking was made only if the API didn't send one.
  const when = item?.startsAt ?? booking.createdAt;

  return (
    <article className="group relative flex overflow-hidden rounded-card border border-neutral-100 bg-white shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <span className={`w-1.5 shrink-0 ${accentByStatus[booking.status]}`} aria-hidden />

      <div className="min-w-0 flex-1">
        <div className="flex gap-3 p-4">
          {/* Real hero image from the embedded item summary, with the icon
              tile as the fallback when the API sends no image. */}
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
            {item?.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                loading="lazy"
                className="size-full object-cover transition duration-300 group-hover:scale-105"
              />
            ) : (
              <Icon className="size-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="truncate font-bold text-ink-900 dark:text-white">
                {item?.title ?? 'Tour booking'}
              </h3>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[booking.status]}`}
              >
                {statusLabel(booking.status)}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0" />
                {formatDate(when)} · {formatTime(when)}
              </span>
              {booking.seats !== undefined ? (
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 shrink-0" />
                  {booking.seats} {booking.seats === 1 ? 'seat' : 'seats'}
                </span>
              ) : (
                item?.subtitle && (
                  <span className="flex items-center gap-1.5">
                    <Icon className="size-4 shrink-0" />
                    {item.subtitle}
                  </span>
                )
              )}
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Ticket className="size-3.5 shrink-0" />
                {booking.reference}
              </span>
              <span className="font-bold text-ink-900 dark:text-white">
                {formatMoney(booking.totalMinor, booking.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex divide-x divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {/* Only tour bookings have a detail screen (payment, review). */}
          <Link
            to={type === 'TOUR' ? `${ROUTES.bookings}/${booking.reference}` : (meta.route ?? ROUTES.trips)}
            className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-700/10"
          >
            <Eye className="size-4" /> View
          </Link>
          {/* Flights have no per-offer page, so that family gets no link
              rather than one pointing somewhere wrong. */}
          {item?.slug && meta.route && (
            <Link
              to={`${meta.route}/${item.slug}`}
              className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <MapPin className="size-4" /> {meta.label}
            </Link>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => onCancel(booking)}
              disabled={cancelling}
              className="flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium text-danger-500 transition hover:bg-danger-500/5 disabled:opacity-50"
            >
              <X className="size-4" />
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function TripsPage() {
  const [tab, setTab] = useState<Tab>('Upcoming');
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);

  // One request. The embedded `item` carries everything the card renders.
  const { data, status, retry } = useApiResource(() => bookingsApi.listMyBookings$());

  const bookings = useMemo(() => data?.results ?? [], [data]);
  const filtered = useMemo(() => bookings.filter((b) => matchesTab(b, tab)), [bookings, tab]);

  // Tours and reservations cancel through different endpoints.
  function handleCancel(booking: Booking) {
    const reference = booking.reference;
    setCancellingRef(reference);
    // Both return a payload we don't use — the list is refetched instead —
    // so they're mapped to a common void observable.
    const cancel$: Observable<void> =
      (booking.itemType ?? 'TOUR') === 'TOUR'
        ? bookingsApi.cancelBooking$(reference).pipe(map(() => undefined))
        : restaurantsApi.cancelReservation$(reference).pipe(map(() => undefined));
    cancel$.subscribe({
      next: retry,
      error: () => setCancellingRef(null),
      complete: () => setCancellingRef(null),
    });
  }

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-6 lg:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">My Bookings</h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Everything you've booked, with live status.
        </p>
      </header>

      {/* Scrolls rather than stretching: with the count badges these tabs
          are wider than a small phone. Scrollbars are hidden app-wide
          (src/index.css), so this stays clean. */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-4 md:px-0 md:pb-6">
        {tabs.map((t) => {
          const count = bookings.filter((b) => matchesTab(b, t)).length;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === t
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-400'
              }`}
            >
              {t}
              {status === 'ready' && count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    tab === t ? 'bg-white/20' : 'bg-white dark:bg-neutral-800'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {status === 'error' && (
        <div className="mx-5 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 md:mx-0">
          <span>Couldn't load your bookings.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {/* Mirrors the real card: accent edge, image tile, title, status badge,
          two meta lines, and the divided action footer. */}
      {status === 'loading' && (
        <SkeletonRegion
          label="Loading your bookings"
          className="space-y-3 px-5 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-0 xl:grid-cols-3"
        >
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="flex overflow-hidden rounded-card border border-neutral-100 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <span className="w-1.5 shrink-0 bg-neutral-200 dark:bg-neutral-800" />
              <div className="min-w-0 flex-1">
                <div className="flex gap-3 p-4">
                  <Skeleton className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <SkeletonLine className="w-2/3" />
                      <SkeletonChip className="w-20 shrink-0" />
                    </div>
                    <SkeletonLine className="mt-2 w-1/2" />
                    <div className="mt-2 flex items-center justify-between">
                      <SkeletonLine className="h-3 w-1/3" />
                      <SkeletonLine className="w-16" />
                    </div>
                  </div>
                </div>
                <div className="flex divide-x divide-neutral-100 border-t border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                  <div className="flex flex-1 items-center justify-center py-3">
                    <SkeletonLine className="w-14" />
                  </div>
                  <div className="flex flex-1 items-center justify-center py-3">
                    <SkeletonLine className="w-14" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </SkeletonRegion>
      )}

      {status === 'ready' && filtered.length === 0 && (
        <div className="px-5 py-12 text-center md:px-0">
          <Compass className="mx-auto size-10 text-neutral-300 dark:text-neutral-700" />
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            No {tab.toLowerCase()} bookings.
          </p>
          <Link
            to={ROUTES.explore}
            className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Explore tours
          </Link>
        </div>
      )}

      {status === 'ready' && filtered.length > 0 && (
        <div className="space-y-3 px-5 pb-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-0 xl:grid-cols-3">
          {filtered.map((booking) => (
            <BookingCard
              key={booking.reference}
              booking={booking}
              cancelling={cancellingRef === booking.reference}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
