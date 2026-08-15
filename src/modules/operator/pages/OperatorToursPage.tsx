import { useState } from 'react';
import { CalendarPlus, Info, Pencil, RefreshCw, Send, X } from 'lucide-react';
import { ApiError, destinationsApi, toursApi, type Tour } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/hooks/useAuth';
import { formatDuration, formatMoney } from '@/lib/format';
import { forgetTour, getRememberedTours, rememberTour } from '@/lib/operatorTourStore';
import { TourForm } from '../components/TourForm';
import { DepartureForm } from '../components/DepartureForm';
import { TourStatusBadge } from '../components/TourStatusBadge';

// Operator console: create a tour, edit it, add departures, submit it for
// review.
//
// Shaped around a real backend limitation, not a design choice. GET /tours
// and GET /tours/:slug return APPROVED tours only and there is no
// GET /tours/mine, so a freshly created DRAFT is unreadable the moment the
// create response is discarded. The list below is therefore built from the
// API's own create/update responses held in localStorage
// (src/lib/operatorTourStore.ts) and is labelled as device-local rather
// than presented as a complete catalogue. See docs/API_REQUIREMENTS.md.

export function OperatorToursPage() {
  const { user } = useAuth();
  const operatorId = user?.id ?? '';

  const { data, status, retry } = useApiResource(() => destinationsApi.listDestinations$(1, 100));
  const destinations = data?.results ?? [];

  const [tours, setTours] = useState<Tour[]>(() => getRememberedTours(operatorId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [departuresForId, setDeparturesForId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function handleSaved(tour: Tour) {
    setTours(rememberTour(operatorId, tour));
    setEditingId(null);
  }

  function handleSubmitForReview(tour: Tour) {
    setBusyId(tour.id);
    setActionError(null);
    toursApi.submitTour$(tour.id).subscribe({
      next: (updated) => setTours(rememberTour(operatorId, updated)),
      error: (err: unknown) => {
        setActionError(err instanceof ApiError ? err.message : 'Could not submit for review.');
        setBusyId(null);
      },
      complete: () => setBusyId(null),
    });
  }

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-10">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">Operator</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Publish tours, set departure dates and send them for approval.
        </p>
      </header>

      <div className="space-y-6 px-5 pb-6 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0 md:px-0">
        <div>
          {status === 'error' && (
            <div className="mb-3 flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span>Couldn’t load destinations.</span>
              <button
                type="button"
                onClick={retry}
                className="flex items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
              >
                <RefreshCw className="size-4" /> Retry
              </button>
            </div>
          )}
          <TourForm
            destinations={destinations}
            destinationsLoading={status === 'loading'}
            onSaved={handleSaved}
          />
        </div>

        <section>
          <h2 className="mb-1 text-lg font-bold text-ink-900 dark:text-white">Your tours</h2>
          <p className="mb-3 flex items-start gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              Tours you created from this device. The API has no “list my tours” endpoint yet, so
              tours created elsewhere won’t appear here.
            </span>
          </p>

          {actionError && <p className="mb-3 text-sm text-danger-500">{actionError}</p>}

          {tours.length === 0 && (
            <p className="rounded-card border border-neutral-100 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
              Nothing yet — create a tour to get started.
            </p>
          )}

          <div className="space-y-3">
            {tours.map((tour) =>
              editingId === tour.id ? (
                <TourForm
                  key={tour.id}
                  destinations={destinations}
                  destinationsLoading={status === 'loading'}
                  tour={tour}
                  onSaved={handleSaved}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={tour.id}
                  className="overflow-hidden rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-ink-900 dark:text-white">{tour.title}</div>
                      <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {formatMoney(tour.priceMinor, tour.currency)} ·{' '}
                        {formatDuration(tour.durationMinutes)}
                      </div>
                      <div className="mt-1 text-xs text-neutral-400">{tour.slug}</div>
                    </div>
                    <TourStatusBadge status={tour.status} />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(tour.id)}
                      className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-800 dark:text-white"
                    >
                      <Pencil className="size-4" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeparturesForId((current) => (current === tour.id ? null : tour.id))
                      }
                      className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-800 dark:text-white"
                    >
                      <CalendarPlus className="size-4" /> Departures
                    </button>
                    {tour.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handleSubmitForReview(tour)}
                        disabled={busyId === tour.id}
                        className="flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Send className="size-4" />
                        {busyId === tour.id ? 'Submitting…' : 'Submit for review'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setTours(forgetTour(operatorId, tour.id))}
                      title="Remove from this device’s list — the tour itself isn’t deleted"
                      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-neutral-400"
                    >
                      <X className="size-4" /> Hide
                    </button>
                  </div>

                  {departuresForId === tour.id && <DepartureForm tourId={tour.id} />}
                </div>
              ),
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
