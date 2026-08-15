import { useState } from 'react';
import { ApiError, toursApi, type Departure } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/format';

// POST /tours/:id/departures. The API wants an ISO instant; <input
// type="datetime-local"> gives a local wall-clock string with no zone, so
// new Date() interprets it in the operator's own timezone before we
// serialise — which is what they mean when they type a departure time.
export function DepartureForm({ tourId }: { tourId: string }) {
  const [departsAt, setDepartsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Departure[]>([]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const seats = Number(capacity);
    if (!Number.isInteger(seats) || seats < 1) return setError('Capacity must be at least 1.');
    const when = new Date(departsAt);
    if (Number.isNaN(when.getTime())) return setError('Choose a departure date and time.');

    setSaving(true);
    toursApi.createDeparture$(tourId, { departsAt: when.toISOString(), capacity: seats }).subscribe({
      next: (departure) => {
        setCreated((current) => [departure, ...current]);
        setDepartsAt('');
        setCapacity('');
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not add the departure.');
        setSaving(false);
      },
      complete: () => setSaving(false),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-ink-900 dark:text-white">Departs at</span>
          <input
            type="datetime-local"
            value={departsAt}
            onChange={(e) => setDepartsAt(e.target.value)}
            required
            className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          />
        </label>
        <label className="w-28 text-sm">
          <span className="mb-1 block font-medium text-ink-900 dark:text-white">Capacity</span>
          <input
            type="number"
            min="1"
            step="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
            className="w-full rounded-xl bg-neutral-100 px-3 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Adding…' : 'Add departure'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-danger-500">{error}</p>}

      {created.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-neutral-500 dark:text-neutral-400">
          {created.map((departure) => (
            <li key={departure.id}>
              Added {formatDate(departure.departsAt)} · {formatTime(departure.departsAt)} ·{' '}
              {departure.seatsLeft}/{departure.capacity} seats
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
