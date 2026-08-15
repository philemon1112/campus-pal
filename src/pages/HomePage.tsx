import {
  AlertCircle,
  Building2,
  Car,
  Compass,
  MapPin,
  Plane,
  RefreshCw,
  Sparkles,
  Tag,
  Utensils,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { destinationsApi } from '@/lib/api';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/hooks/useAuth';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine } from '@/components/ui/Skeleton';
import { PlaceSearch } from '@/components/search/PlaceSearch';

// Six tiles on mobile (3x2), seven on desktop.
//
// `desktopOnly`: Emergency is hidden on mobile because the raised SOS button
// in the bottom nav already covers it there — a second entry point would be
// redundant. Desktop has no FAB, so it earns a tile.
//
// `disabled`: Transport has no backend (no dispatch or fare-quote endpoints),
// so it renders greyed and inert rather than linking to a dead end.
const quickAccess: {
  to: string;
  label: string;
  icon: typeof Compass;
  desktopOnly?: boolean;
  disabled?: boolean;
  danger?: boolean;
}[] = [
  { to: ROUTES.explore, label: 'Explore', icon: Compass },
  { to: ROUTES.itineraries, label: 'Plan Trip', icon: Sparkles },
  { to: ROUTES.flights, label: 'Flights', icon: Plane },
  { to: ROUTES.hotels, label: 'Hotels', icon: Building2 },
  { to: ROUTES.food, label: 'Food', icon: Utensils },
  { to: ROUTES.transport, label: 'Transport', icon: Car, disabled: true },
  { to: ROUTES.emergency, label: 'Emergency', icon: AlertCircle, desktopOnly: true, danger: true },
];

// No backend for a deals/discounts concept — this is the Figma design's
// own static content (like Explore's category pills), not fabricated
// data. See docs/HANDOFF.md's "never fabricate mock data" convention.
const todaysDeals = [
  { name: 'Labadi Beach Hotel', location: 'Accra, Ghana', price: 'GHS 450', wasPrice: 'GHS 650' },
  {
    name: 'Kakum Canopy Walk',
    location: 'Cape Coast, Ghana',
    price: 'GHS 120',
    wasPrice: 'GHS 180',
  },
  { name: 'Akwaaba Lodge', location: 'Kumasi, Ghana', price: 'GHS 320', wasPrice: 'GHS 480' },
  {
    name: 'Mole Safari Tour',
    location: 'Mole National Park',
    price: 'GHS 280',
    wasPrice: 'GHS 420',
  },
];

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomePage() {
  const { user } = useAuth();
  const { data: destinationsPage, status: destinationsStatus, retry } = useApiResource(() =>
    destinationsApi.listDestinations$(1, 10),
  );
  const destinations = destinationsPage?.results ?? [];

  const firstName = user?.fullName.split(' ')[0];

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-6 lg:px-8">
      {/* Mobile keeps the compact greeting + search row exactly as before.
          Desktop gets a centred editorial hero instead — the greeting becomes
          a kicker above a real headline, with the search as the focal pill.
          Both render the same elements, only the arrangement changes. */}
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-16 md:text-center">
        <p className="hidden text-sm font-medium text-brand-600 dark:text-brand-500 md:block">
          {timeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ''} 👋
        </p>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:hidden">
          {timeOfDayGreeting()}
          {firstName ? `, ${firstName}` : ''} 👋
        </h1>
        <h1 className="hidden text-balance text-5xl font-bold leading-[1.1] tracking-tight text-ink-900 dark:text-white md:mt-3 md:block lg:text-6xl">
          Discover Ghana,
          <br />
          one real journey at a time
        </h1>
        <p className="mx-auto mt-4 hidden max-w-xl text-base text-neutral-500 dark:text-neutral-400 md:block">
          Guided tours with real departures and live seat counts — plus a day-by-day plan built
          around them.
        </p>
      </header>

      {/* Real search across destinations, tours, stays and restaurants —
          the same places the Explore map plots. */}
      <div className="px-5 md:px-0">
        <PlaceSearch className="md:mx-auto md:max-w-2xl" />
      </div>

      <section className="px-5 pt-6 md:px-0 md:pt-16">
        <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white md:mb-6 md:text-center md:text-2xl">
          Quick Access
        </h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-4 md:gap-4 lg:grid-cols-7">
          {quickAccess.map(({ to, label, icon: Icon, desktopOnly, disabled, danger }) => {
            const base = `flex flex-col items-center justify-center gap-2 rounded-card border border-neutral-100 bg-white py-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:py-8 ${
              desktopOnly ? 'hidden md:flex' : ''
            }`;
            const iconClass = `size-6 md:size-7 ${danger ? 'text-danger-500' : 'text-brand-600'}`;
            const labelClass = `text-sm font-medium ${danger ? 'text-danger-500' : 'text-ink-900 dark:text-white'}`;

            // Greyed and non-interactive: no backend to link to yet.
            if (disabled) {
              return (
                <div key={to} className={`${base} opacity-50`} aria-disabled="true">
                  <Icon className="size-6 text-neutral-400 md:size-7" />
                  <span className="text-sm font-medium text-neutral-400">{label}</span>
                  <span className="text-[10px] text-neutral-400">Coming soon</span>
                </div>
              );
            }

            return (
              <Link
                key={to}
                to={to}
                className={`${base} transition hover:border-brand-200 hover:shadow-md`}
              >
                <Icon className={iconClass} />
                <span className={labelClass}>{label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="pt-6 md:pt-16">
        <div className="mb-3 px-5 md:mb-6 md:px-0 md:text-center">
          <h2 className="text-lg font-bold text-ink-900 dark:text-white md:text-2xl">
            Featured Destinations
          </h2>
          <p className="hidden text-sm text-neutral-500 dark:text-neutral-400 md:mt-2 md:block">
            Real places with real, bookable departures across Ghana.
          </p>
        </div>
        {destinationsStatus === 'error' ? (
          <div className="ml-5 mr-20 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 md:mx-0">
            <span>Couldn't load destinations.</span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-5">
            {destinationsStatus === 'loading'
              ? // Mirrors the real card: image band on top, name and region
                // beneath — so nothing reflows when the data lands.
                Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    role="status"
                    aria-busy="true"
                    aria-label="Loading destinations"
                    className="w-40 shrink-0 overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-900 md:w-auto md:shrink"
                  >
                    <Skeleton className="h-28 rounded-none md:h-48" />
                    <div className="space-y-2 p-3">
                      <SkeletonLine className="w-3/4" />
                      <SkeletonLine className="h-3 w-1/2" />
                    </div>
                  </div>
                ))
              : destinations.map((destination) => (
                  <Link
                    key={destination.id}
                    to={ROUTES.explore}
                    className="group w-40 shrink-0 overflow-hidden rounded-card bg-neutral-100 transition hover:opacity-90 hover:shadow-md dark:bg-neutral-900 md:w-auto md:shrink"
                  >
                    <div className="flex h-28 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-900 md:h-48">
                      {destination.heroImageUrl ? (
                        <img
                          src={destination.heroImageUrl}
                          alt={destination.name}
                          className="size-full object-cover"
                        />
                      ) : (
                        <MapPin className="size-8" />
                      )}
                    </div>
                    <div className="p-3">
                      <div className="truncate font-semibold text-ink-900 dark:text-white">
                        {destination.name}
                      </div>
                      <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {destination.region}
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
        )}
      </section>

      <section className="pt-6 pb-6 md:pt-16">
        <h2 className="mb-3 px-5 text-lg font-bold text-ink-900 dark:text-white md:px-0 md:mb-6 md:text-center md:text-2xl">
          Today's Deals
        </h2>
        <div className="grid grid-cols-2 gap-3 px-5 md:px-0 md:gap-5 lg:grid-cols-4">
          {todaysDeals.map((deal) => (
            <div
              key={deal.name}
              className="overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-900"
            >
              <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-brand-100 to-brand-50 text-brand-600 dark:from-neutral-800 dark:to-neutral-900 md:h-40">
                <MapPin className="size-8" />
                <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-accent-500 px-2 py-1 text-[10px] font-bold uppercase text-white">
                  <Tag className="size-3" /> Deal
                </span>
              </div>
              <div className="p-3">
                <div className="truncate font-semibold text-ink-900 dark:text-white">
                  {deal.name}
                </div>
                <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {deal.location}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-bold text-brand-600 dark:text-brand-500">
                    {deal.price}
                  </span>
                  <span className="text-xs text-neutral-400 line-through">{deal.wasPrice}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Desktop-only closing band. Mobile already ends cleanly at the bottom
          tab bar; on desktop the page previously just stopped, leaving a large
          empty area above the fold line. These are real routes, not marketing
          filler — the two things the backend genuinely supports end-to-end. */}
      <section className="hidden px-0 pt-16 md:grid md:grid-cols-2 md:gap-5">
        <Link
          to={ROUTES.itineraries}
          className="group relative overflow-hidden rounded-card bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white transition hover:shadow-lg"
        >
          <Sparkles className="size-8" />
          <h3 className="mt-4 text-2xl font-bold">Plan your trip with AI</h3>
          <p className="mt-2 max-w-sm text-sm text-white/80">
            Get a day-by-day itinerary built around real, bookable tours — then book them straight
            from the plan.
          </p>
          <span className="mt-5 inline-block rounded-full bg-white px-5 py-2 text-sm font-semibold text-brand-700">
            Start planning
          </span>
        </Link>

        <Link
          to={ROUTES.explore}
          className="group relative overflow-hidden rounded-card border border-neutral-100 bg-neutral-50 p-8 transition hover:shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          <Compass className="size-8 text-brand-600" />
          <h3 className="mt-4 text-2xl font-bold text-ink-900 dark:text-white">
            Browse every tour
          </h3>
          <p className="mt-2 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
            Live seat counts, real departure dates, and instant booking with Paystack.
          </p>
          <span className="mt-5 inline-block rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
            Explore tours
          </span>
        </Link>
      </section>
    </div>
  );
}
