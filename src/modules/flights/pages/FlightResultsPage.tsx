import { ChevronLeft, Clock, Luggage, Plane, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, flightsApi, getTokens, type Cabin, type FlightOffer } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonChip, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { formatDuration, formatMoney, formatTime } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Module M2 — real offers from POST /flights/search. Offers are priced and
// time-limited: the API returns 400 on an expired offerId, so a failed
// booking re-runs the search rather than silently doing nothing.
const sorts = [
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: 'departsAt', label: 'Departure Time' },
] as const;

function OfferCard({
  offer,
  onBook,
  booking,
}: {
  offer: FlightOffer;
  onBook: (offer: FlightOffer) => void;
  booking: boolean;
}) {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  const totalMinutes = offer.segments.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <article className="rounded-card border border-neutral-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
            <Plane className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink-900 dark:text-white">
              {offer.airline.name}
            </div>
            <div className="text-xs text-neutral-400">{first?.flightNumber}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold text-ink-900 dark:text-white">
            {formatMoney(offer.totalMinor, offer.currency)}
          </div>
          <div className="text-xs capitalize text-neutral-400">
            {offer.cabin.replace('_', ' ').toLowerCase()}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-center">
          <div className="font-bold text-ink-900 dark:text-white">
            {first && formatTime(first.departsAt)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{first?.origin}</div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-xs text-neutral-400">{formatDuration(totalMinutes)}</div>
          <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-700" />
          <div className="text-xs font-medium text-brand-600 dark:text-brand-500">
            {offer.stops === 0 ? 'Direct' : `${offer.stops} stop${offer.stops > 1 ? 's' : ''}`}
          </div>
        </div>
        <div className="text-center">
          <div className="font-bold text-ink-900 dark:text-white">
            {last && formatTime(last.arrivesAt)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{last?.destination}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {offer.baggageKg !== undefined && (
          <span className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Luggage className="size-3" /> {offer.baggageKg}kg
          </span>
        )}
        {offer.refundable && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
            Refundable
          </span>
        )}
        {offer.amenities.map((a) => (
          <span
            key={a}
            className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
          >
            {a}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onBook(offer)}
        disabled={booking}
        className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {booking ? 'Booking…' : 'Select'}
      </button>
    </article>
  );
}

export function FlightResultsPage() {
  const [params] = useSearchParams();
  const origin = params.get('origin') ?? 'ACC';
  const destination = params.get('destination') ?? 'LOS';
  const date = params.get('date') ?? new Date().toISOString().slice(0, 10);
  const adults = Number(params.get('adults') ?? 1);
  const cabin = (params.get('cabin') ?? 'ECONOMY') as Cabin;

  const [sort, setSort] = useState<(typeof sorts)[number]['value']>('price');
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const sortRef = useRef(sort);
  sortRef.current = sort;

  const { data, status, retry } = useApiResource(() =>
    flightsApi.searchFlights$({
      tripType: 'ONE_WAY',
      origin,
      destination,
      date: new Date(date).toISOString(),
      passengers: { adults },
      cabin,
      sort: sortRef.current,
    }),
  );

  const retryRef = useRef(retry);
  retryRef.current = retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    retryRef.current();
  }, [sort, origin, destination, date, adults, cabin]);

  const offers = useMemo(() => data?.offers ?? [], [data]);

  function handleBook(offer: FlightOffer) {
    if (!getTokens()) {
      setError('Log in to book a flight.');
      return;
    }
    setBookingId(offer.offerId);
    setError(null);
    flightsApi.bookOffer$(offer.offerId).subscribe({
      next: (reservation) => {
        setBookingId(null);
        setReference(reservation.reference);
      },
      error: (err: unknown) => {
        // 400 means the fare's price window lapsed. A fresh search is the
        // only correct recovery, so say that rather than "try again".
        const expired = err instanceof ApiError && err.code === 400;
        setError(
          expired
            ? 'That fare expired. Refreshing results for the latest prices…'
            : err instanceof ApiError
              ? err.message
              : 'Could not book that flight.',
        );
        setBookingId(null);
        if (expired) retryRef.current();
      },
    });
  }

  return (
    <div className="md:mx-auto md:max-w-2xl md:px-6">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <Link
          to={ROUTES.flights}
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400"
        >
          <ChevronLeft className="size-4" /> Change search
        </Link>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">
          {origin} → {destination}
        </h1>
        <p className="mt-1 text-sm capitalize text-neutral-500 dark:text-neutral-400">
          {new Date(date).toLocaleDateString('en', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}{' '}
          · {adults} {adults === 1 ? 'passenger' : 'passengers'} ·{' '}
          {cabin.replace('_', ' ').toLowerCase()}
        </p>
      </header>

      {reference && (
        <div className="mx-5 mb-4 rounded-card border border-brand-500/30 bg-brand-50 p-4 text-center dark:bg-brand-700/15 md:mx-0">
          <p className="font-semibold text-ink-900 dark:text-white">Flight reserved</p>
          <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-500">{reference}</p>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto px-5 pb-4 md:px-0">
        {sorts.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSort(s.value)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              sort === s.value
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <section className="px-5 pb-6 md:px-0">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white">Flight options</h2>
          {status === 'ready' && (
            <span className="text-sm text-neutral-400">{offers.length} found</span>
          )}
        </div>

        {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}

        {status === 'loading' && (
          <SkeletonRegion label="Searching flights" className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <SkeletonLine className="w-1/3" />
                  <SkeletonLine className="w-20" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <SkeletonLine className="w-12" />
                  <SkeletonLine className="w-16" />
                  <SkeletonLine className="w-12" />
                </div>
                <div className="mt-3 flex gap-2">
                  <SkeletonChip className="w-16" />
                  <SkeletonChip className="w-20" />
                </div>
                <Skeleton className="mt-4 h-10 rounded-xl" />
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't search flights.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* An empty result is legitimate, not an error: inventory only
            starts ~3 days out, so the next couple of days return nothing on
            every route. Hence "try another date" rather than a retry. */}
        {status === 'ready' && offers.length === 0 && (
          <div className="rounded-card border border-dashed border-neutral-200 px-4 py-8 text-center dark:border-neutral-800">
            <Clock className="mx-auto size-8 text-neutral-300 dark:text-neutral-700" />
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              No flights on this route for that date.
            </p>
            <Link
              to={ROUTES.flights}
              className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
            >
              Try another date
            </Link>
          </div>
        )}

        {status === 'ready' && offers.length > 0 && (
          <div className="space-y-3">
            {offers.map((offer) => (
              <OfferCard
                key={offer.offerId}
                offer={offer}
                onBook={handleBook}
                booking={bookingId === offer.offerId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
