import { useState } from 'react';
import { ApiError, toursApi, type Destination, type Tour } from '@/lib/api';
import { TextField } from '@/components/ui/TextField';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { SkeletonLine } from '@/components/ui/Skeleton';

// Create or edit a tour. PATCH /tours/:id accepts the same fields except
// destinationId, which is fixed at creation -- so in edit mode the
// destination is shown as read-only text rather than a disabled select
// that looks like it might work.
export function TourForm({
  destinations,
  destinationsLoading,
  tour,
  onSaved,
  onCancel,
}: {
  destinations: Destination[];
  destinationsLoading: boolean;
  tour?: Tour;
  onSaved: (tour: Tour) => void;
  onCancel?: () => void;
}) {
  const editing = tour !== undefined;
  const [title, setTitle] = useState(tour?.title ?? '');
  const [destinationId, setDestinationId] = useState(tour?.destinationId ?? '');
  const [description, setDescription] = useState(tour?.description ?? '');
  // Priced in whole GHS in the UI; the API wants integer pesewas.
  const [price, setPrice] = useState(tour ? String(tour.priceMinor / 100) : '');
  const [durationMinutes, setDurationMinutes] = useState(
    tour ? String(tour.durationMinutes) : '',
  );
  const [heroImageUrl, setHeroImageUrl] = useState(tour?.heroImageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const priceMinor = Math.round(Number(price) * 100);
    const minutes = Number(durationMinutes);
    if (!Number.isFinite(priceMinor) || priceMinor < 0) return setError('Enter a valid price.');
    if (!Number.isInteger(minutes) || minutes < 1) return setError('Enter a duration in minutes.');
    if (!editing && !destinationId) return setError('Choose a destination.');

    setSaving(true);
    const request$ = editing
      ? toursApi.updateTour$(tour.id, {
          title,
          description,
          priceMinor,
          durationMinutes: minutes,
          heroImageUrl: heroImageUrl || undefined,
        })
      : toursApi.createTour$({
          title,
          destinationId,
          description,
          priceMinor,
          durationMinutes: minutes,
          heroImageUrl: heroImageUrl || undefined,
        });

    request$.subscribe({
      next: onSaved,
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not save the tour.');
        setSaving(false);
      },
      complete: () => setSaving(false),
    });
  }

  const destinationName = destinations.find((d) => d.id === tour?.destinationId)?.name;

  return (
    <form onSubmit={handleSubmit} className="rounded-card bg-white p-5 shadow-sm dark:bg-neutral-900">
      <h2 className="mb-4 text-lg font-bold text-ink-900 dark:text-white">
        {editing ? 'Edit tour' : 'Create a tour'}
      </h2>

      <TextField
        label="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Cape Coast Castle Heritage Tour"
        required
      />

      <div className="mb-4">
        <span className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white">
          Destination
        </span>
        {editing ? (
          <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            {destinationName ?? tour.destinationId} · can’t be changed after creation
          </p>
        ) : destinationsLoading ? (
          <SkeletonLine boxClassName="h-11" className="w-full" />
        ) : (
          <select
            value={destinationId}
            onChange={(e) => setDestinationId(e.target.value)}
            required
            className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
          >
            <option value="">Choose a destination…</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name} · {destination.region}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-4">
        <label
          htmlFor="tour-description"
          className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
        >
          Description
        </label>
        <textarea
          id="tour-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          required
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
        />
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Price (GHS)"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="80.00"
          required
        />
        <TextField
          label="Duration (minutes)"
          type="number"
          min="1"
          step="1"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          placeholder="180"
          required
        />
      </div>

      <ImageUploadField label="Hero image" value={heroImageUrl} onChange={setHeroImageUrl} />

      {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Create tour'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-5 py-3 text-sm font-medium text-neutral-500"
          >
            Cancel
          </button>
        )}
      </div>

      {!editing && (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          New tours start as a draft. Submit one for review to send it to an administrator for
          approval — only approved tours appear in Explore.
        </p>
      )}
    </form>
  );
}
