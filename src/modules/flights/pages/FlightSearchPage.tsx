import { ArrowLeftRight, Plane, Search, Users } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { flightsApi, type Airport, type Cabin } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ROUTES } from '@/lib/routes';

// Module M2 — Flight Booking (SRS 3.3). Real data: airports come from
// GET /flights/airports; the search itself runs on the results page so the
// query lives in the URL and can be shared or reloaded.
//
// Only ONE_WAY is offered: the API's search body takes a single `date`, so
// a return/multi-city toggle would be a control the backend can't honour.
const cabins: { value: Cabin; label: string }[] = [
  { value: 'ECONOMY', label: 'Economy' },
  { value: 'PREMIUM_ECONOMY', label: 'Premium' },
  { value: 'BUSINESS', label: 'Business' },
  { value: 'FIRST', label: 'First' },
];

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function AirportSelect({
  id,
  label,
  value,
  onChange,
  airports,
  loading,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (code: string) => void;
  airports: Airport[];
  loading: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white">
        {label}
      </label>
      {loading ? (
        <SkeletonLine boxClassName="h-12" className="w-full" />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
        >
          {airports.map((a) => (
            <option key={a.code} value={a.code}>
              {a.city} ({a.code}) — {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function FlightSearchPage() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState('ACC');
  const [destination, setDestination] = useState('LOS');
  const [date, setDate] = useState(tomorrow());
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<Cabin>('ECONOMY');

  // Empty q returns the full list on this API.
  const { data, status } = useApiResource(() => flightsApi.searchAirports$(''));
  const airports = data ?? [];

  // Default the two selects to real codes once the list arrives.
  const seeded = useRef(false);
  const airportsRef = useRef(airports);
  airportsRef.current = airports;
  useEffect(() => {
    if (seeded.current || status !== 'ready') return;
    const list = airportsRef.current;
    if (list.length < 2) return;
    seeded.current = true;
    if (!list.some((a) => a.code === origin)) setOrigin(list[0].code);
    if (!list.some((a) => a.code === destination)) setDestination(list[1].code);
  }, [status, origin, destination]);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      origin,
      destination,
      date,
      adults: String(adults),
      cabin,
    });
    navigate(`${ROUTES.flightResults}?${params}`);
  }

  return (
    <div className="md:mx-auto md:max-w-2xl md:px-6">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-12">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-4xl">Flights</h1>
        <p className="mt-1 hidden text-neutral-500 dark:text-neutral-400 md:block">
          Search live fares across West Africa and beyond.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="px-5 md:px-0">
        <div className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800">
          <div className="grid grid-cols-1 gap-3">
            <AirportSelect
              id="origin"
              label="From"
              value={origin}
              onChange={setOrigin}
              airports={airports}
              loading={status === 'loading'}
            />
            <button
              type="button"
              onClick={swap}
              className="mx-auto flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand-600 transition hover:bg-brand-100 dark:bg-brand-700/20"
              aria-label="Swap origin and destination"
            >
              <ArrowLeftRight className="size-4" />
            </button>
            <AirportSelect
              id="destination"
              label="To"
              value={destination}
              onChange={setDestination}
              airports={airports}
              loading={status === 'loading'}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="date"
                className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
              >
                Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="adults"
                className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
              >
                Passengers
              </label>
              <div className="flex items-center gap-2 rounded-xl bg-neutral-100 pl-4 dark:bg-neutral-900">
                <Users className="size-4 shrink-0 text-neutral-500" />
                <select
                  id="adults"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full bg-transparent py-3 pr-4 text-sm text-ink-900 focus:outline-none dark:text-white"
                >
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'passenger' : 'passengers'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <span className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white">
              Cabin
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cabins.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCabin(c.value)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    cabin === c.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={origin === destination}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            <Search className="size-4" />
            {origin === destination ? 'Pick two different airports' : 'Search flights'}
          </button>
        </div>
      </form>

      <section className="px-5 py-6 md:px-0">
        <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white">Airports</h2>
        {status === 'loading' ? (
          <SkeletonRegion label="Loading airports" className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <SkeletonLine key={i} boxClassName="h-12" className="w-full" />
            ))}
          </SkeletonRegion>
        ) : (
          <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
            {airports.map((a, i) => (
              <div
                key={a.code}
                className={`flex items-center gap-3 px-4 py-3 ${
                  i !== airports.length - 1
                    ? 'border-b border-neutral-100 dark:border-neutral-800'
                    : ''
                }`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                  <Plane className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-900 dark:text-white">
                    {a.city} ({a.code})
                  </div>
                  <div className="truncate text-sm text-neutral-500 dark:text-neutral-400">
                    {a.name} · {a.country}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
