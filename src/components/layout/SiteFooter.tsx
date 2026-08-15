import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

// Desktop-only site footer (md+). Mobile ends at the bottom tab bar, which
// is the whole navigation surface there — a footer under it would be dead
// weight, so this is hidden below md.
//
// Every link points at a route that actually exists (see src/lib/routes.ts).
// No "Careers"/"Press"/social placeholders: the project convention is to
// never render a link to a page we don't have.
const columns: { heading: string; links: { label: string; to: string }[] }[] = [
  {
    heading: 'Discover',
    links: [
      { label: 'Explore tours', to: ROUTES.explore },
      { label: 'Plan a trip with AI', to: ROUTES.itineraries },
      { label: 'Hotels', to: ROUTES.hotels },
      { label: 'Food & drinks', to: ROUTES.food },
    ],
  },
  {
    heading: 'Travel',
    links: [
      { label: 'Flights', to: ROUTES.flights },
      { label: 'Local transport', to: ROUTES.transport },
      { label: 'My trips', to: ROUTES.trips },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Profile', to: ROUTES.profile },
      { label: 'Personal info', to: ROUTES.profilePersonalInfo },
      { label: 'Log in', to: ROUTES.auth.login },
      { label: 'Create account', to: ROUTES.auth.register },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="hidden bg-ink-900 text-white md:block">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <span className="text-xl font-bold">Voyago</span>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Discover Ghana — guided tours, real departures, and a day-by-day plan built around
              them.
            </p>
            <Link
              to={ROUTES.emergency}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-danger-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-danger-600"
            >
              Emergency help
            </Link>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h2 className="text-sm font-semibold text-white">{column.heading}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.to + link.label}>
                    <Link to={link.to} className="text-sm text-white/70 transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} Voyago · Tourism Management System
          </p>
        </div>
      </div>
    </footer>
  );
}
