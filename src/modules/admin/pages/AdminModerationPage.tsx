import { useState } from 'react';
import { CheckCircle2, Info, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ApiError, toursApi, type Tour } from '@/lib/api';
import { TourStatusBadge } from '@/modules/operator/components/TourStatusBadge';
import { formatDuration, formatMoney } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// Admin moderation: approve a PENDING_REVIEW tour, or suspend a live one.
//
// There is no endpoint that lists tours awaiting review -- GET /tours is
// APPROVED-only and takes no status filter (see docs/API_REQUIREMENTS.md).
// So rather than fake a queue, this works on a tour id the admin pastes in,
// which is what the operator hands over today. The moment the backend ships
// a moderation listing, this page grows a real list above the same actions.
export function AdminModerationPage() {
  const [tourId, setTourId] = useState('');
  const [acted, setActed] = useState<Tour[]>([]);
  const [busy, setBusy] = useState<'approve' | 'suspend' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function act(kind: 'approve' | 'suspend') {
    const id = tourId.trim();
    if (!id) return setError('Paste a tour id first.');

    setBusy(kind);
    setError(null);
    const request$ = kind === 'approve' ? toursApi.approveTour$(id) : toursApi.suspendTour$(id);
    request$.subscribe({
      next: (tour) => {
        setActed((current) => [tour, ...current.filter((t) => t.id !== tour.id)]);
        setTourId('');
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : `Could not ${kind} that tour.`);
        setBusy(null);
      },
      complete: () => setBusy(null),
    });
  }

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-10">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Approve tours submitted for review, or suspend a live one.
        </p>
        <Link
          to={ROUTES.adminDestinations}
          className="mt-3 inline-block rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-900 dark:text-white"
        >
          Manage destinations
        </Link>
      </header>

      <div className="px-5 pb-6 md:px-0">
        <section className="rounded-card bg-white p-5 shadow-sm dark:bg-neutral-900 md:max-w-xl">
          <h2 className="mb-1 text-lg font-bold text-ink-900 dark:text-white">Moderate a tour</h2>
          <p className="mb-4 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              The API has no “tours awaiting review” endpoint yet, so there’s no queue to show —
              paste the tour id the operator gave you.
            </span>
          </p>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-ink-900 dark:text-white">Tour id</span>
            <input
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              placeholder="e.g. 46155a38-5cda-49ba-a4f3-cf2e9acb847e"
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
            />
          </label>

          {error && <p className="mt-2 text-sm text-danger-500">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => act('approve')}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <CheckCircle2 className="size-4" />
              {busy === 'approve' ? 'Approving…' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => act('suspend')}
              disabled={busy !== null}
              className="flex items-center gap-1.5 rounded-full bg-danger-500/10 px-5 py-2.5 text-sm font-semibold text-danger-500 disabled:opacity-50"
            >
              <Ban className="size-4" />
              {busy === 'suspend' ? 'Suspending…' : 'Suspend'}
            </button>
          </div>
        </section>

        {acted.length > 0 && (
          <section className="mt-6 md:max-w-xl">
            <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white">
              Changed in this session
            </h2>
            <div className="space-y-3">
              {acted.map((tour) => (
                <div
                  key={tour.id}
                  className="flex items-start justify-between gap-3 rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-ink-900 dark:text-white">{tour.title}</div>
                    <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {formatMoney(tour.priceMinor, tour.currency)} ·{' '}
                      {formatDuration(tour.durationMinutes)}
                    </div>
                    {tour.status === 'APPROVED' && (
                      <Link
                        to={`${ROUTES.explore}/${tour.slug}`}
                        className="mt-1 inline-block text-sm font-medium text-brand-600 dark:text-brand-500"
                      >
                        View in Explore
                      </Link>
                    )}
                  </div>
                  <TourStatusBadge status={tour.status} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
