import { Hotel, MapPin, RefreshCw, Search, Star, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { staysApi, type Stay, type StayCategory } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { formatMoney } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Module M3 — Accommodation (SRS 3.4, FR-ACC-01 to 12). Real data via
// GET /stays, filtered server-side (q, category, guests) rather than in
// memory. Was static data.ts until the backend shipped this vertical.
const categories: { value: StayCategory | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'HOTEL', label: 'Hotels' },
  { value: 'VILLA', label: 'Villas' },
  { value: 'HOSTEL', label: 'Hostels' },
  { value: 'APARTMENT', label: 'Apartments' },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < count ? 'fill-accent-500 text-accent-500' : 'text-neutral-200 dark:text-neutral-700'}`}
        />
      ))}
    </div>
  );
}

function StayCard({ stay }: { stay: Stay }) {
  return (
    <Link
      to={`${ROUTES.hotels}/${stay.slug}`}
      className="group overflow-hidden rounded-card border border-neutral-100 bg-white shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-950">
        {stay.heroImageUrl ? (
          <img
            src={stay.heroImageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Hotel className="size-10" />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="truncate font-bold text-ink-900 dark:text-white">{stay.name}</h2>
          {stay.ratingCount > 0 && (
            <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-900 dark:text-white">
              <Star className="size-4 fill-accent-500 text-accent-500" />
              {stay.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
        <div className="mt-1">
          <StarRow count={stay.stars} />
        </div>
        <p className="mt-2 flex items-center gap-1 truncate text-sm text-neutral-500 dark:text-neutral-400">
          <MapPin className="size-4 shrink-0" /> {stay.location}
          {stay.distanceKm !== undefined && ` · ${stay.distanceKm.toFixed(1)} km`}
        </p>

        {stay.amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {stay.amenities.slice(0, 4).map((a) => (
              <span
                key={a}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {a.toLowerCase()}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <span>
            <span className="text-lg font-bold text-brand-600 dark:text-brand-500">
              {formatMoney(stay.fromPriceMinor, stay.currency)}
            </span>
            <span className="text-sm text-neutral-500 dark:text-neutral-400"> / night</span>
          </span>
          <span className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
            Book Now
          </span>
        </div>
      </div>
    </Link>
  );
}

export function AccommodationSearchPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<StayCategory | null>(null);
  const [guests, setGuests] = useState(2);

  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query]);

  const filters = useRef({ debounced, category, guests });
  filters.current = { debounced, category, guests };

  const { data, status, retry } = useApiResource(() => {
    const f = filters.current;
    return staysApi.listStays$({
      limit: 30,
      q: f.debounced || undefined,
      category: f.category ?? undefined,
      guests: f.guests || undefined,
    });
  });

  const retryRef = useRef(retry);
  retryRef.current = retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    retryRef.current();
  }, [debounced, category, guests]);

  const stays = data?.results ?? [];

  return (
    <div className="md:mx-auto md:max-w-5xl md:px-6 lg:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">
          Find a Place to Stay
        </h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Hotels, villas and apartments across Ghana.
        </p>
      </header>

      <div className="px-5 md:px-0">
        <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
          <Search className="size-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where are you going?"
            className="w-full bg-transparent text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none dark:text-white"
          />
        </div>

        {/* Only guests filters server-side. /stays has no availability query,
            so check-in/out are chosen on the detail page (where rooms are
            actually priced for those dates) rather than faked here. */}
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-100 px-4 py-3 dark:bg-neutral-900">
          <Users className="size-4 text-neutral-500" />
          <label htmlFor="guests" className="text-sm text-neutral-600 dark:text-neutral-400">
            Guests
          </label>
          <input
            id="guests"
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-16 bg-transparent text-sm font-medium text-ink-900 focus:outline-none dark:text-white"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 py-4 md:px-0">
        {categories.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition ${
              category === c.value
                ? 'bg-brand-600 text-white'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <section className="px-5 pb-6 md:px-0">
        {status === 'loading' && (
          <SkeletonRegion
            label="Loading stays"
            className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800"
              >
                <Skeleton className="h-44 rounded-none" />
                <div className="space-y-2 p-4">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="w-1/2" />
                  <SkeletonLine className="w-1/3" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn't load stays.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {status === 'ready' && stays.length === 0 && (
          <p className="rounded-card border border-dashed border-neutral-200 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-800">
            No stays match those filters.
          </p>
        )}

        {status === 'ready' && stays.length > 0 && (
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {stays.map((stay) => (
              <StayCard key={stay.id} stay={stay} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
