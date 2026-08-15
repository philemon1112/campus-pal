import { BedDouble, CalendarDays, CheckCircle2, ChevronLeft, Hotel as HotelIcon, MapPin, RefreshCw, Star, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { throwError } from 'rxjs';
import { ApiError, getTokens, staysApi, type Room, type Stay } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';
import { formatMoney, formatDate } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Stay detail — real data via GET /stays/:slug and GET /stays/:id/rooms.
// Rooms are priced for the chosen dates, so changing check-in/out refetches
// them; booking creates a PENDING reservation via POST /stays/:id/book.
function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

function RoomPicker({ stay }: { stay: Stay }) {
  const [checkIn, setCheckIn] = useState(isoDay(1));
  const [checkOut, setCheckOut] = useState(isoDay(4));
  const [guests, setGuests] = useState(2);
  const [selected, setSelected] = useState<Room | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const params = useRef({ checkIn, checkOut, guests });
  params.current = { checkIn, checkOut, guests };

  const { data, status, retry } = useApiResource(() =>
    staysApi.listRooms$(stay.id, {
      checkIn: new Date(params.current.checkIn).toISOString(),
      checkOut: new Date(params.current.checkOut).toISOString(),
      guests: params.current.guests,
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
    setSelected(null);
    retryRef.current();
  }, [checkIn, checkOut, guests]);

  const rooms = data ?? [];
  const nights = nightsBetween(checkIn, checkOut);
  const totalMinor = selected ? selected.pricePerNightMinor * nights : 0;

  function handleBook() {
    if (!selected) return;
    if (!getTokens()) {
      setError('Log in to book a stay.');
      return;
    }
    if (nights < 1) {
      setError('Check-out must be after check-in.');
      return;
    }
    setBooking(true);
    setError(null);
    staysApi
      .bookStay$(stay.id, {
        roomId: selected.id,
        checkIn: new Date(checkIn).toISOString(),
        checkOut: new Date(checkOut).toISOString(),
        guests,
      })
      .subscribe({
        next: (reservation) => {
          setBooking(false);
          setReference(reservation.reference);
        },
        error: (err: unknown) => {
          setError(err instanceof ApiError ? err.message : 'Could not book that room.');
          setBooking(false);
        },
      });
  }

  if (reference) {
    return (
      <div className="rounded-card border border-brand-500/30 bg-brand-50 p-5 text-center dark:bg-brand-700/15">
        <CheckCircle2 className="mx-auto size-10 text-brand-600" />
        <p className="mt-3 font-semibold text-ink-900 dark:text-white">Stay reserved</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {formatDate(checkIn)} → {formatDate(checkOut)} · {nights}{' '}
          {nights === 1 ? 'night' : 'nights'}
        </p>
        <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-500">{reference}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        {[
          { id: 'check-in', label: 'Check-in', value: checkIn, set: setCheckIn, min: isoDay(0) },
          { id: 'check-out', label: 'Check-out', value: checkOut, set: setCheckOut, min: checkIn },
        ].map((f) => (
          <div key={f.id}>
            <label
              htmlFor={f.id}
              className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
            >
              {f.label}
            </label>
            <input
              id={f.id}
              type="date"
              value={f.value}
              min={f.min}
              onChange={(e) => f.set(e.target.value)}
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
            />
          </div>
        ))}
      </div>

      <label
        htmlFor="stay-guests"
        className="mb-1.5 mt-3 block text-sm font-medium text-ink-900 dark:text-white"
      >
        Guests
      </label>
      <input
        id="stay-guests"
        type="number"
        min={1}
        max={20}
        value={guests}
        onChange={(e) => setGuests(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
        className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
      />

      <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-900 dark:text-white">Rooms</h3>

      {status === 'loading' && (
        <SkeletonRegion label="Loading rooms" className="space-y-2">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-card" />
          ))}
        </SkeletonRegion>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Couldn't load rooms.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {status === 'ready' && rooms.length === 0 && (
        <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
          No rooms available for those dates.
        </p>
      )}

      {status === 'ready' && rooms.length > 0 && (
        <div className="space-y-2">
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              disabled={!room.available}
              onClick={() => setSelected(room)}
              className={`flex w-full items-center justify-between rounded-card border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                selected?.id === room.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-700/20'
                  : 'border-neutral-100 dark:border-neutral-800'
              }`}
            >
              <div className="min-w-0">
                <div className="font-medium text-ink-900 dark:text-white">{room.name}</div>
                <div className="mt-0.5 flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1">
                    <BedDouble className="size-4" /> {room.bed}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-4" /> {room.maxGuests}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-bold text-ink-900 dark:text-white">
                  {formatMoney(room.pricePerNightMinor, stay.currency)}
                </div>
                <div className="text-xs text-neutral-400">per night</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger-500">{error}</p>}

      {selected && nights > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-card bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {nights} {nights === 1 ? 'night' : 'nights'} · {selected.name}
          </span>
          <span className="text-lg font-bold text-ink-900 dark:text-white">
            {formatMoney(totalMinor, stay.currency)}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleBook}
        disabled={!selected || booking || nights < 1}
        className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {booking ? 'Booking…' : selected ? 'Book this room' : 'Pick a room'}
      </button>
    </div>
  );
}

export function AccommodationDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: stay, status, retry } = useApiResource(() => {
    if (!slug) return throwError(() => new Error('Missing stay slug'));
    return staysApi.getStay$(slug);
  });

  return (
    <div className="md:mx-auto md:max-w-2xl">
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950 md:mt-6 md:h-72 md:rounded-card">
        {stay?.heroImageUrl ? (
          <img src={stay.heroImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <HotelIcon className={`size-12 ${stay ? '' : 'opacity-40'}`} />
        )}
        <Link
          to={ROUTES.hotels}
          className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      <div className="px-5 py-5">
        {stay ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{stay.name}</h1>
              {stay.ratingCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 font-semibold text-ink-900 dark:text-white">
                  <Star className="size-5 fill-accent-500 text-accent-500" />
                  {stay.ratingAvg.toFixed(1)}
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`size-4 ${i < stay.stars ? 'fill-accent-500 text-accent-500' : 'text-neutral-200 dark:text-neutral-700'}`}
                />
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-brand-600 dark:text-brand-500">
              <MapPin className="size-4" /> {stay.location}
            </p>
            {stay.description && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {stay.description}
              </p>
            )}
            {stay.amenities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {stay.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {a.toLowerCase()}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <SkeletonRegion label="Loading stay">
            <SkeletonLine boxClassName="h-8" className="w-2/3" />
            <SkeletonLine className="mt-1 w-1/3" />
            <SkeletonText lines={2} className="mt-3" />
          </SkeletonRegion>
        )}

        {status === 'error' && (
          <div className="mt-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load this stay.</span>
            <button
              type="button"
              onClick={retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        <h2 className="mb-3 mt-6 flex items-center gap-1.5 text-lg font-bold text-ink-900 dark:text-white">
          <CalendarDays className="size-5" /> Book your stay
        </h2>
        {stay ? (
          <RoomPicker stay={stay} />
        ) : (
          <SkeletonRegion label="Loading booking options" className="space-y-2">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-20 rounded-card" />
          </SkeletonRegion>
        )}
      </div>
    </div>
  );
}
