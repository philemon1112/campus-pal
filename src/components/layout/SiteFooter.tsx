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
    heading: 'Campus',
    links: [
      { label: 'Explore campus', to: ROUTES.explore },
      { label: 'Food joints', to: ROUTES.food },
      { label: 'Saved places', to: ROUTES.saved },
    ],
  },
  {
    heading: 'Assistant',
    links: [{ label: 'Past conversations', to: ROUTES.assistantHistory }],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Profile', to: ROUTES.profile },
      { label: 'Personal info', to: ROUTES.profilePersonalInfo },
      { label: 'Help & emergency', to: ROUTES.profileHelp },
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
            <span className="text-xl font-bold">CampusPal</span>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Find your way around University of Ghana, Legon — campus locations, directions and
              food joints, with an assistant that can do it for you.
            </p>
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
            © {new Date().getFullYear()} CampusPal · University of Ghana, Legon
          </p>
        </div>
      </div>
    </footer>
  );
}
