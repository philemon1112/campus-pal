import { useEffect, useState } from 'react';
import { MapPin, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { ApiError, destinationsApi, type Destination } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { TextField } from '@/components/ui/TextField';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';

// Destinations CRUD. Unlike tours, the read endpoints here are unfiltered,
// so an admin genuinely sees the whole catalogue and this screen is fully
// functional rather than working around a listing gap.
//
// lat/lng matter beyond bookkeeping: they're the only real coordinates in
// the API, and they're what the Explore and Tour Detail maps pin.
export function AdminDestinationsPage() {
  const { data, status, retry } = useApiResource(() => destinationsApi.listDestinations$(1, 100));
  const destinations = data?.results ?? [];

  const [editing, setEditing] = useState<Destination | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function handleDelete(id: string) {
    setBusyId(id);
    setListError(null);
    destinationsApi.deleteDestination$(id).subscribe({
      next: () => {
        setConfirmingDelete(null);
        retry();
      },
      error: (err: unknown) => {
        setListError(err instanceof ApiError ? err.message : 'Could not delete that destination.');
        setBusyId(null);
      },
      complete: () => setBusyId(null),
    });
  }

  const loading = status === 'loading';

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-8">
      <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4 md:px-0 md:pt-10">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">
            Destinations
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            The places tours are attached to. Coordinates drive the maps in Explore.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Add
        </button>
      </header>

      <div className="px-5 pb-6 md:px-0">
        {(creating || editing) && (
          <DestinationForm
            destination={editing ?? undefined}
            onSaved={() => {
              setCreating(false);
              setEditing(null);
              retry();
            }}
            onCancel={() => {
              setCreating(false);
              setEditing(null);
            }}
          />
        )}

        {status === 'error' && (
          <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
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

        {listError && <p className="mb-3 text-sm text-danger-500">{listError}</p>}

        {/* Same row shape as the real cards below — thumbnail, name line,
            region line, action pair — so nothing jumps when data lands. */}
        {loading && (
          <SkeletonRegion
            label="Loading destinations"
            className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3 rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900">
                <Skeleton className="size-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {destinations.map((destination) => (
              <div
                key={destination.id}
                className="rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900"
              >
                <div className="flex gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                    {destination.heroImageUrl ? (
                      <img src={destination.heroImageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <MapPin className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink-900 dark:text-white">{destination.name}</div>
                    <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {destination.region} · {destination.country}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {destination.lat !== undefined && destination.lng !== undefined
                        ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                        : 'No coordinates — won’t appear on the map'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(destination);
                      setCreating(false);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-800 dark:text-white"
                  >
                    <Pencil className="size-4" /> Edit
                  </button>
                  {confirmingDelete === destination.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(destination.id)}
                        disabled={busyId === destination.id}
                        className="rounded-full bg-danger-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === destination.id ? 'Deleting…' : 'Confirm delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(null)}
                        className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-neutral-500"
                      >
                        <X className="size-4" /> Keep
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(destination.id)}
                      className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-danger-500"
                    >
                      <Trash2 className="size-4" /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DestinationForm({
  destination,
  onSaved,
  onCancel,
}: {
  destination?: Destination;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('Ghana');
  const [description, setDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One form instance is reused for create and for editing any row, so the
  // fields have to re-seed when the selected destination changes.
  useEffect(() => {
    setName(destination?.name ?? '');
    setRegion(destination?.region ?? '');
    setCountry(destination?.country ?? 'Ghana');
    setDescription(destination?.description ?? '');
    setHeroImageUrl(destination?.heroImageUrl ?? '');
    setLat(destination?.lat !== undefined ? String(destination.lat) : '');
    setLng(destination?.lng !== undefined ? String(destination.lng) : '');
    setError(null);
  }, [destination]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Coordinates are optional on the API. Send them only when both are
    // present and numeric — half a coordinate pair is worse than none.
    const latValue = lat.trim() === '' ? undefined : Number(lat);
    const lngValue = lng.trim() === '' ? undefined : Number(lng);
    if ((latValue === undefined) !== (lngValue === undefined)) {
      return setError('Enter both latitude and longitude, or neither.');
    }
    if (latValue !== undefined && (!Number.isFinite(latValue) || !Number.isFinite(lngValue!))) {
      return setError('Coordinates must be numbers.');
    }

    const payload = {
      name,
      region,
      country: country || undefined,
      description,
      heroImageUrl: heroImageUrl || undefined,
      lat: latValue,
      lng: lngValue,
    };

    setSaving(true);
    const request$ = destination
      ? destinationsApi.updateDestination$(destination.id, payload)
      : destinationsApi.createDestination$(payload);

    request$.subscribe({
      next: onSaved,
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not save the destination.');
        setSaving(false);
      },
      complete: () => setSaving(false),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-card bg-white p-5 shadow-sm dark:bg-neutral-900 md:max-w-xl"
    >
      <h2 className="mb-4 text-lg font-bold text-ink-900 dark:text-white">
        {destination ? 'Edit destination' : 'New destination'}
      </h2>

      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Cape Coast"
        required
      />
      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Central Region"
          required
        />
        <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div className="mb-4">
        <label
          htmlFor="destination-description"
          className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
        >
          Description
        </label>
        <textarea
          id="destination-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          required
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-900 dark:text-white"
        />
      </div>

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Latitude"
          type="number"
          step="any"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="5.1060"
        />
        <TextField
          label="Longitude"
          type="number"
          step="any"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="-1.2460"
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
          {saving ? 'Saving…' : destination ? 'Save changes' : 'Create destination'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-5 py-3 text-sm font-medium text-neutral-500"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
