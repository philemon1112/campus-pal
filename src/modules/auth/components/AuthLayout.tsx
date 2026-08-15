import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

// Shared shell for Login / Register / Forgot / Reset.
//
// **Desktop (lg+)** — a two-pane split: form on the left, full-bleed
// photography on the right. The auth screens were previously a ~400px form
// stranded in the middle of a 1440px page.
//
// **Mobile** — deliberately plain: the original white page with the form on
// it, no background photograph. The image belongs to the desktop split only.
//
// The image is a remote Unsplash URL rather than a bundled asset (the repo
// ships no photography), so the pane degrades to a flat brand colour if it
// fails to load — nothing here depends on it.
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=1600&q=80&auto=format&fit=crop';

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-white lg:grid lg:min-h-screen lg:grid-cols-2 dark:bg-neutral-950">
      {/* Form pane. Mobile is a plain white page — no photo, no overlay,
          no frosted card — matching the original auth screens. */}
      <div className="px-5 pt-6 pb-10 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-md">
          <Link to={ROUTES.home} className="text-2xl font-bold text-ink-900 dark:text-white">
            Voyago
          </Link>

          <div className="mt-8 lg:mt-10">
            <h1 className="text-2xl font-bold text-ink-900 lg:text-3xl dark:text-white">{title}</h1>
            {subtitle && (
              <p className="mb-5 mt-1 text-sm text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            )}
            <div className={subtitle ? '' : 'mt-5'}>{children}</div>
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>
      </div>

      {/* Desktop image pane */}
      <div className="relative hidden lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-brand-700 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/35 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-14">
          <h2 className="max-w-md text-balance text-4xl font-bold leading-tight text-white">
            Discover Ghana, one real journey at a time
          </h2>
          <p className="mt-3 max-w-md text-white/80">
            Guided tours with real departures and live seat counts — plus a day-by-day plan built
            around them.
          </p>
        </div>
      </div>
    </div>
  );
}
