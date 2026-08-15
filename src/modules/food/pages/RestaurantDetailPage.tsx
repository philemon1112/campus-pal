import { CalendarDays, ChevronLeft, Clock, MapPin, RefreshCw, Star, Utensils } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ApiError, getTokens, restaurantsApi, type MenuSection } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion, SkeletonText } from '@/components/ui/Skeleton';
import { formatMoney, formatDate, formatTime } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Restaurant detail — real data via GET /restaurants/:slug plus the menu.
// The Reserve tab is a working booking flow against
// GET /restaurants/:id/availability + POST /restaurants/:id/reserve.
const tabs = ['Menu', 'Reserve', 'Info'] as const;
type Tab = (typeof tabs)[number];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function MenuTab({ sections }: { sections: MenuSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-800">
        No menu published yet.
      </p>
    );
  }
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.category}>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {section.category}
          </h3>
          <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
            {section.items.map((item, i) => (
              <div
                key={item.name}
                className={`flex items-start justify-between gap-4 px-4 py-3 ${
                  i !== section.items.length - 1
                    ? 'border-b border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-ink-900 dark:text-white">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.description}
                    </p>
                  )}
                </div>
                <span className="shrink-0 font-semibold text-ink-900 dark:text-white">
                  {formatMoney(item.priceMinor, 'GHS')}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Availability + reserve. Slots come from the server for the chosen date and
// party size, so the UI can never offer a time the API would reject.
function ReserveTab({ restaurantId }: { restaurantId: string }) {
  const [date, setDate] = useState(todayIso());
  const [partySize, setPartySize] = useState(2);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [reserving, setReserving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  const paramsRef = useRef({ date, partySize });
  paramsRef.current = { date, partySize };

  const { data, status, retry } = useApiResource(() =>
    restaurantsApi.getAvailability$(restaurantId, paramsRef.current.date, paramsRef.current.partySize),
  );

  const retryRef = useRef(retry);
  retryRef.current = retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSelectedSlot(null);
    retryRef.current();
  }, [date, partySize]);

  function handleReserve() {
    if (!selectedSlot) return;
    if (!getTokens()) {
      setError('Log in to reserve a table.');
      return;
    }
    setReserving(true);
    setError(null);
    restaurantsApi.reserveTable$(restaurantId, { at: selectedSlot, partySize }).subscribe({
      next: (reservation) => {
        setReserving(false);
        setReference(reservation.reference);
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not reserve that table.');
        setReserving(false);
      },
    });
  }

  if (reference) {
    return (
      <div className="rounded-card border border-brand-500/30 bg-brand-50 p-5 text-center dark:bg-brand-700/15">
        <CalendarDays className="mx-auto size-10 text-brand-600" />
        <p className="mt-3 font-semibold text-ink-900 dark:text-white">Table reserved</p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {formatDate(selectedSlot!)} at {formatTime(selectedSlot!)} for {partySize}{' '}
          {partySize === 1 ? 'guest' : 'guests'}
        </p>
        <p className="mt-2 text-sm font-medium text-brand-700 dark:text-brand-500">{reference}</p>
      </div>
    );
  }

  const slots = data?.slots ?? [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="reserve-date"
            className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
          >
            Date
          </label>
          <input
            id="reserve-date"
            type="date"
            value={date}
            min={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          />
        </div>
        <div>
          <label
            htmlFor="reserve-party"
            className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
          >
            Guests
          </label>
          <input
            id="reserve-party"
            type="number"
            min={1}
            max={20}
            value={partySize}
            onChange={(e) => setPartySize(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          />
        </div>
      </div>

      <h3 className="mb-2 mt-5 text-sm font-semibold text-ink-900 dark:text-white">
        Available times
      </h3>

      {status === 'loading' && (
        <SkeletonRegion label="Loading available times" className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-10 rounded-xl" />
          ))}
        </SkeletonRegion>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span>Couldn't load available times.</span>
          <button
            type="button"
            onClick={retry}
            className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
          >
            <RefreshCw className="size-4" /> Retry
          </button>
        </div>
      )}

      {status === 'ready' && slots.length === 0 && (
        <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
          No tables available on that date.
        </p>
      )}

      {status === 'ready' && slots.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                selectedSlot === slot
                  ? 'bg-brand-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-900 dark:text-neutral-300'
              }`}
            >
              {formatTime(slot)}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger-500">{error}</p>}

      <button
        type="button"
        onClick={handleReserve}
        disabled={!selectedSlot || reserving}
        className="mt-4 w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {reserving ? 'Reserving…' : selectedSlot ? 'Reserve this table' : 'Pick a time'}
      </button>
    </div>
  );
}

export function RestaurantDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<Tab>('Menu');

  const { data, status, retry } = useApiResource(() => {
    if (!slug) return throwError(() => new Error('Missing restaurant slug'));
    return restaurantsApi.getRestaurant$(slug).pipe(
      switchMap((restaurant) =>
        forkJoin({
          restaurant: of(restaurant),
          // A missing menu shouldn't take the whole page down.
          menu: restaurantsApi.getMenu$(restaurant.id).pipe(catchError(() => of([] as MenuSection[]))),
        }),
      ),
    );
  });

  const restaurant = data?.restaurant;
  const menu = data?.menu ?? [];

  return (
    <div className="md:mx-auto md:max-w-2xl">
      <div className="relative flex h-56 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950 md:mt-6 md:h-72 md:rounded-card">
        {restaurant?.heroImageUrl ? (
          <img src={restaurant.heroImageUrl} alt="" className="size-full object-cover" />
        ) : (
          <Utensils className={`size-12 ${restaurant ? '' : 'opacity-40'}`} />
        )}
        <Link
          to={ROUTES.food}
          className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow"
        >
          <ChevronLeft className="size-5" />
        </Link>
      </div>

      <div className="px-5 py-5">
        {restaurant ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-ink-900 dark:text-white">{restaurant.name}</h1>
              {restaurant.ratingCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 font-semibold text-ink-900 dark:text-white">
                  <Star className="size-5 fill-accent-500 text-accent-500" />
                  {restaurant.ratingAvg.toFixed(1)}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {restaurant.cuisine} · {'₵'.repeat(restaurant.priceTier)}
              {restaurant.distanceKm !== undefined && ` · ${restaurant.distanceKm.toFixed(1)} km`}
            </p>
            {restaurant.description && (
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {restaurant.description}
              </p>
            )}
            <span
              className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                restaurant.isOpenNow
                  ? 'bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {restaurant.isOpenNow ? 'Open now' : 'Closed'}
            </span>
          </>
        ) : (
          <SkeletonRegion label="Loading restaurant">
            <SkeletonLine boxClassName="h-8" className="w-2/3" />
            <SkeletonLine className="mt-1 w-1/2" />
            <SkeletonText lines={2} className="mt-3" />
          </SkeletonRegion>
        )}

        {status === 'error' && (
          <div className="mt-4 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load this restaurant.</span>
            <button
              type="button"
              onClick={retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Tabs are static chrome — they render before the data arrives. */}
        <div className="mt-5 flex gap-2 overflow-x-auto border-b border-neutral-100 pb-px dark:border-neutral-800">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                tab === t
                  ? 'border-brand-600 text-brand-600 dark:text-brand-500'
                  : 'border-transparent text-neutral-500 dark:text-neutral-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="pt-5">
          {tab === 'Menu' &&
            (status === 'loading' ? (
              <SkeletonRegion label="Loading menu" className="space-y-2">
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
                  >
                    <SkeletonLine className="w-1/2" />
                    <SkeletonLine className="w-16" />
                  </div>
                ))}
              </SkeletonRegion>
            ) : (
              <MenuTab sections={menu} />
            ))}

          {tab === 'Reserve' &&
            (restaurant ? (
              <ReserveTab restaurantId={restaurant.id} />
            ) : (
              <SkeletonRegion label="Loading reservation options" className="grid grid-cols-4 gap-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-10 rounded-xl" />
                ))}
              </SkeletonRegion>
            ))}

          {tab === 'Info' && (
            <div className="space-y-4">
              {restaurant?.openingHours && restaurant.openingHours.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-900 dark:text-white">
                    <Clock className="size-4" /> Opening hours
                  </h3>
                  <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
                    {restaurant.openingHours.map((h, i) => (
                      <div
                        key={h.day}
                        className={`flex justify-between px-4 py-2.5 text-sm ${
                          i !== restaurant.openingHours!.length - 1
                            ? 'border-b border-neutral-100 dark:border-neutral-800'
                            : ''
                        }`}
                      >
                        <span className="text-neutral-500 dark:text-neutral-400">
                          {DAY_NAMES[h.day] ?? `Day ${h.day}`}
                        </span>
                        <span className="font-medium text-ink-900 dark:text-white">
                          {h.opens} – {h.closes}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {restaurant && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                >
                  <MapPin className="size-4" /> Get directions
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
