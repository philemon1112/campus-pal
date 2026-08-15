import { MapPin, MessageCircle, Navigation, Phone, Star, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/lib/routes';

// Module M5 — Local Transport (SRS 3.6, FR-TRANS-01 to 12). UI only,
// matching a user-supplied Figma screenshot ("find-a-driver") — the
// design's own "View Active Ride (Demo)" preview screen, not a real
// live ride (no backend/dispatch exists for this module). Map is a
// static illustration, not a real map.
export function ActiveRidePage() {
  return (
    <div className="md:mx-auto md:max-w-xl">
      <div className="relative h-72 overflow-hidden bg-gradient-to-br from-brand-100 via-accent-500/10 to-accent-500/20 md:mt-6 md:h-80 md:rounded-t-card">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          <line
            x1="22"
            y1="26"
            x2="63"
            y2="95"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            className="text-brand-600"
          />
        </svg>

        <span className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-600 ring-4 ring-white/60"
          style={{ left: '22%', top: '26%' }}
        />
        <span
          className="absolute flex size-4 -translate-x-1/2 -translate-y-full items-center justify-center"
          style={{ left: '79%', top: '73%' }}
        >
          <MapPin className="size-8 fill-accent-500 text-accent-500" />
        </span>

        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ left: '50%', top: '49%' }}
        >
          <span className="whitespace-nowrap rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 shadow">
            3 min away
          </span>
          <span className="flex size-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
            <Navigation className="size-5" />
          </span>
        </div>
      </div>

      <div className="rounded-t-card bg-white px-5 py-5 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
            <User className="size-7" />
          </span>
          <div>
            <div className="text-lg font-bold text-ink-900 dark:text-white">Kwame Mensah</div>
            <div className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400">
              <Star className="size-4 fill-accent-500 text-accent-500" /> 4.8
              <span>· GX 1234-20</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl bg-brand-50 py-3 text-sm font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-500"
          >
            <MessageCircle className="size-5" /> Chat
          </button>
          <button
            type="button"
            className="flex flex-col items-center gap-1 rounded-xl bg-brand-50 py-3 text-sm font-semibold text-brand-600 dark:bg-brand-900/30 dark:text-brand-500"
          >
            <Phone className="size-5" /> Call
          </button>
          <Link
            to={ROUTES.transport}
            className="flex flex-col items-center gap-1 rounded-xl bg-danger-500/10 py-3 text-sm font-semibold text-danger-500"
          >
            <X className="size-5" /> Cancel
          </Link>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-card bg-neutral-50 px-4 py-3 dark:bg-neutral-800">
          <MapPin className="size-5 shrink-0 text-accent-500" />
          <div>
            <div className="font-semibold text-ink-900 dark:text-white">Labadi Beach Hotel</div>
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              La Dade Kotopon, Accra
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 pr-16 dark:border-neutral-800 md:pr-0">
          <div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">Total Fare</div>
            <div className="text-lg font-bold text-brand-600 dark:text-brand-500">GHS 52</div>
          </div>
          <div className="text-lg font-bold text-ink-900 dark:text-white">14 min</div>
        </div>
      </div>
    </div>
  );
}
