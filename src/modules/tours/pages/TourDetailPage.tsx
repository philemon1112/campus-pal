import {
  ChevronLeft,
  Minus,
  Navigation,
  Plus,
  RefreshCw,
  MapPin,
  Star,
  Users,
} from 'lucide-react';
import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import {
  bookingsApi,
  destinationsApi,
  getTokens,
  socketApi,
  toursApi,
  ApiError,
  type Departure,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';
import { TourReviews } from '@/modules/tours/components/TourReviews';
import { formatDate, formatDuration, formatMoney, formatTime } from '@/lib/format';
import { directionsUrl } from '@/lib/geo';
import { ROUTES } from '@/lib/routes';

// Loaded on demand — see the note in ExplorePage.
const MapView = lazy(() =>
  import('@/components/map/MapView').then((m) => ({ default: m.MapView })),
);

// Tour detail — reached from ExplorePage. Real data: GET /tours/{slug},
// GET /tours/{id}/departures, and the tour's destination for context.
// No Figma screen exists for booking a Tour (see docs/DEVELOPMENT_LOG.md)
// — this booking bar is designed consistent with the rest of the app.
export function TourDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);
  const [seats, setSeats] = useState(1);
  const [booking, setBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  // Live seatsLeft pushed over the /availability socket, keyed by departure
  // id. Overlays (never mutates) the values fetched over REST, so the page
  // renders correctly whether or not the socket ever connects.
  const [liveSeats, setLiveSeats] = useState<Record<string, number>>({});

  const { data, status, retry } = useApiResource(() => {
    if (!slug) return throwError(() => new Error('Missing tour slug'));
    return toursApi.getTourBySlug$(slug).pipe(
      switchMap((tour) =>
        forkJoin({
          tour: of(tour),
          departures: toursApi.listDepartures$(tour.id),
          destination: destinationsApi
            .getDestination$(tour.destinationId)
            .pipe(catchError(() => of(null))),
        }),
      ),
    );
  });

  // Watch the selected departure's seat count drop as other people book it.
  // Opt-in per departure, so this resubscribes whenever the selection moves.
  const selectedDepartureId = selectedDeparture?.id;
  useEffect(() => {
    if (!selectedDepartureId) return;
    const subscription = socketApi.departureAvailability$(selectedDepartureId).subscribe({
      next: (event) => {
        setLiveSeats((previous) => ({ ...previous, [event.departureId]: event.seatsLeft }));
        // If seats sold out from under us, pull the picker back down so the
        // total shown and the request sent can't be stale-high.
        setSeats((current) => Math.max(1, Math.min(current, event.seatsLeft)));
      },
      // Sockets are an enhancement here — on failure the REST seat counts
      // simply stay as last fetched.
      error: () => {},
    });
    return () => subscription.unsubscribe();
  }, [selectedDepartureId]);

  // The page shell below renders on the first frame regardless of status —
  // hero frame, back button, section headings and the departures card all
  // paint immediately, and only the values inside them swap from skeleton
  // to real data. See docs/UI_CONVENTIONS.md.
  const loading = status === 'loading';
  const tour = data?.tour;
  const departures = data?.departures ?? [];
  const destination = data?.destination;

  // Live value where the socket has given us one, otherwise what REST returned.
  function seatsLeftFor(departure: Departure): number {
    return liveSeats[departure.id] ?? departure.seatsLeft;
  }

  const selectedSeatsLeft = selectedDeparture ? seatsLeftFor(selectedDeparture) : 0;
  const maxSeats = Math.min(selectedSeatsLeft, 20);
  const soldOut = selectedDeparture !== null && selectedSeatsLeft === 0;

  function selectDeparture(departure: Departure) {
    setSelectedDeparture(departure);
    setSeats(1);
    setBookingError(null);
  }

  function handleBookNow() {
    if (!selectedDeparture || !tour) return;
    if (!getTokens()) {
      navigate(ROUTES.auth.login);
      return;
    }
    setBooking(true);
    setBookingError(null);
    bookingsApi.createBooking$({ departureId: selectedDeparture.id, seats }).subscribe({
      next: (created) => navigate(`${ROUTES.bookings}/${created.reference}`),
      error: (err: unknown) => {
        setBookingError(err instanceof ApiError ? err.message : 'Could not create booking.');
        setBooking(false);
      },
    });
  }

  return (
    <div className={`md:mx-auto md:max-w-2xl ${selectedDeparture ? 'pb-24 md:pb-0' : ''}`}>
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950 md:mt-6 md:h-72 md:rounded-card">
        {tour?.heroImageUrl ? (
          <img src={tour.heroImageUrl} alt={tour.title} className="size-full object-cover" />
        ) : (
          <MapPin className={`size-12 ${loading ? 'opacity-40' : ''}`} />
        )}
        <Link
          to={ROUTES.explore}
          className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      <div className="px-5 py-5">
        {tour ? (
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{tour.title}</h1>
        ) : (
          // h-8 matches text-2xl's 2rem line box, so the title swap is silent.
          <SkeletonLine boxClassName="h-8" className="w-3/4" />
        )}

        <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
          {tour ? (
            <>
              {destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" /> {destination.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="size-4 fill-accent-500 text-accent-500" />
                {tour.ratingCount > 0 ? `${tour.ratingAvg.toFixed(1)} (${tour.ratingCount})` : 'New'}
              </span>
            </>
          ) : (
            <>
              <SkeletonLine className="w-28" />
              <SkeletonLine className="w-16" />
            </>
          )}
        </div>

        {/* Description length is unknowable in advance, so both states
            reserve the same two-line minimum. Short descriptions leave a
            little whitespace; nothing below ever jumps. */}
        <div className="mt-4 min-h-[45.5px]">
          {tour ? (
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {tour.description}
            </p>
          ) : (
            <SkeletonText lines={2} />
          )}
        </div>

        {/* The price bar's frame is static, so it stays put and only the two
            values inside it resolve — no layout jump when they arrive. */}
        <div className="mt-5 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          {tour ? (
            <>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatDuration(tour.durationMinutes)} · per person
              </span>
              <span className="text-lg font-bold text-ink-900 dark:text-white">
                {formatMoney(tour.priceMinor, tour.currency)}
              </span>
            </>
          ) : (
            <>
              <SkeletonLine className="w-32" />
              {/* h-7 matches the text-lg price beside it. */}
              <SkeletonLine boxClassName="h-7" className="w-24" />
            </>
          )}
        </div>

        {/* SRS FR-POI-01: a location map on the detail page. Rendered only
            when the destination really has coordinates -- a tour whose
            destination has none gets no section at all, rather than a pin
            dropped somewhere plausible. */}
        {destination?.lat !== undefined && destination.lng !== undefined && (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white">Location</h2>
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <MapView
                center={{ lat: destination.lat, lng: destination.lng }}
                zoom={12}
                markers={[
                  {
                    id: destination.id,
                    lat: destination.lat,
                    lng: destination.lng,
                    label: destination.name,
                  },
                ]}
                interactive={false}
                ariaLabel={`Map of ${destination.name}`}
                className="h-40 w-full"
              />
            </Suspense>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {destination.name} · {destination.region}
              </span>
              <a
                href={directionsUrl({ lat: destination.lat, lng: destination.lng })}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-900 dark:text-white"
              >
                <Navigation className="size-4" /> Directions
              </a>
            </div>
          </section>
        )}

        <h2 className="mb-3 mt-6 text-lg font-bold text-ink-900 dark:text-white">
          Upcoming Departures
        </h2>

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load this tour.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Departure rows: same height and internal layout as the real ones
            (date + time on the left, seats on the right). */}
        {loading && (
          <SkeletonRegion label="Loading departures" className="space-y-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
              >
                <div className="space-y-2">
                  <SkeletonLine className="w-28" />
                  <SkeletonLine className="w-16" />
                </div>
                <SkeletonLine className="w-14" />
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && departures.length === 0 ? (
          <p className="text-sm text-neutral-400">No departures scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {departures.map((departure) => {
              const isSelected = selectedDeparture?.id === departure.id;
              const seatsLeft = seatsLeftFor(departure);
              const isFull = seatsLeft === 0;
              return (
                <button
                  key={departure.id}
                  type="button"
                  disabled={isFull}
                  onClick={() => selectDeparture(departure)}
                  className={`flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20'
                      : 'border-neutral-100 dark:border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="font-medium text-ink-900 dark:text-white">
                      {formatDate(departure.departsAt)}
                    </div>
                    <div className="text-sm text-neutral-500 dark:text-neutral-400">
                      {formatTime(departure.departsAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                    <Users className="size-4" /> {isFull ? 'Full' : `${seatsLeft} left`}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedDeparture && (
          <div className="mt-5 flex items-center justify-between rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="text-sm font-medium text-ink-900 dark:text-white">Seats</span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSeats((s) => Math.max(1, s - 1))}
                disabled={seats <= 1}
                className="flex size-8 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-40 dark:bg-neutral-800"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-4 text-center font-semibold text-ink-900 dark:text-white">
                {seats}
              </span>
              <button
                type="button"
                onClick={() => setSeats((s) => Math.min(maxSeats, s + 1))}
                disabled={seats >= maxSeats}
                className="flex size-8 items-center justify-center rounded-full bg-neutral-100 disabled:opacity-40 dark:bg-neutral-800"
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
        )}

        {bookingError && <p className="mt-3 text-sm text-danger-500">{bookingError}</p>}

        {tour && (
          <TourReviews
            tourId={tour.id}
            ratingAvg={tour.ratingAvg}
            ratingCount={tour.ratingCount}
          />
        )}
      </div>

      {/* Only reachable once data has loaded — a departure can't be selected
          before then — but tour is narrowed explicitly for the type checker. */}
      {selectedDeparture && tour && (
        <div className="fixed inset-x-0 bottom-[72px] mx-auto flex max-w-md items-center justify-between border-t border-neutral-100 bg-white py-3 pl-5 pr-20 dark:border-neutral-800 dark:bg-neutral-950 md:pr-8 md:sticky md:inset-x-auto md:bottom-0 md:max-w-none md:rounded-t-card md:border md:border-b-0 md:shadow-[0_-6px_20px_rgba(20,33,61,0.08)]">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Total</div>
            <div className="text-lg font-bold text-ink-900 dark:text-white">
              {formatMoney(tour.priceMinor * seats, tour.currency)}
            </div>
          </div>
          <button
            type="button"
            onClick={handleBookNow}
            disabled={booking || soldOut}
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {soldOut ? 'Sold out' : booking ? 'Booking…' : 'Book Now'}
          </button>
        </div>
      )}
    </div>
  );
}
