import { useEffect, useState } from 'react';
import { MapPin, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import {
  ApiError,
  locationsApi,
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_LABELS,
  MAX_PAGE_LIMIT,
  type CampusLocation,
  type LocationCategory,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { TextField } from '@/components/ui/TextField';
import { ImageUploadField } from '@/components/ui/ImageUploadField';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';

// FR-1.8 — an administrator adds, edits and removes campus locations.
//
// Coordinates matter beyond bookkeeping: they are what the Explore map and
// every Directions hand-off use, so a location saved without them is
// invisible on the map and can't be navigated to. The form requires them.
//
// The API caps `limit` at MAX_PAGE_LIMIT and 400s above it, so this asks for
// one full page rather than "everything". At campus scale that is the whole
// catalogue; past 100 locations this screen needs real pagination.
export function AdminLocationsPage() {
  const { data, status, retry } = useApiResource(() =>
    locationsApi.listLocations$({ limit: MAX_PAGE_LIMIT }),
  );
  const locations = data?.results ?? [];

  const [editing, setEditing] = useState<CampusLocation | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  function handleDelete(id: string) {
    setBusyId(id);
    setListError(null);
    locationsApi.deleteLocation$(id).subscribe({
      next: () => {
        setConfirmingDelete(null);
        retry();
      },
      error: (err: unknown) => {
        setListError(err instanceof ApiError ? err.message : 'Could not delete that location.');
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
            Campus locations
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Everything Explore lists and pins. Coordinates drive the map and directions.
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
          <LocationForm
            location={editing ?? undefined}
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
          <div className="flex items-center justify-between gap-3 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load the location catalogue.</span>
            <button
              type="button"
              onClick={retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {listError && <p className="mb-3 text-sm text-danger-500">{listError}</p>}

        {/* Same row shape as the real cards below — thumbnail, name line,
            category line, coordinate line, action pair. */}
        {loading && (
          <SkeletonRegion
            label="Loading campus locations"
            className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900"
              >
                <Skeleton className="size-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {status === 'ready' && locations.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">
            No locations yet. Add the first one above.
          </p>
        )}

        {status === 'ready' && locations.length > 0 && (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 lg:grid-cols-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className="rounded-card bg-white p-4 shadow-sm dark:bg-neutral-900"
              >
                <div className="flex gap-3">
                  <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20">
                    {location.photos[0] ? (
                      <img src={location.photos[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <MapPin className="size-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-ink-900 dark:text-white">{location.name}</div>
                    <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {LOCATION_CATEGORY_LABELS[location.category]}
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(location);
                      setCreating(false);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-ink-900 dark:bg-neutral-800 dark:text-white"
                  >
                    <Pencil className="size-4" /> Edit
                  </button>
                  {confirmingDelete === location.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDelete(location.id)}
                        disabled={busyId === location.id}
                        className="rounded-full bg-danger-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {busyId === location.id ? 'Deleting…' : 'Confirm delete'}
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
                      onClick={() => setConfirmingDelete(location.id)}
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

// Kebab-case, matching what POST /locations validates against.
function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function LocationForm({
  location,
  onSaved,
  onCancel,
}: {
  location?: CampusLocation;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  // Once the slug has been edited by hand, stop deriving it from the name —
  // otherwise typing in Name would silently overwrite a deliberate choice.
  const [slugEdited, setSlugEdited] = useState(false);
  const [category, setCategory] = useState<LocationCategory>('LECTURE_HALL');
  const [description, setDescription] = useState('');
  const [buildingNotes, setBuildingNotes] = useState('');
  const [photo, setPhoto] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One form instance is reused for create and for editing any row, so the
  // fields have to re-seed when the selected location changes.
  useEffect(() => {
    setName(location?.name ?? '');
    setSlug(location?.slug ?? '');
    setSlugEdited(false);
    setCategory(location?.category ?? 'LECTURE_HALL');
    setDescription(location?.description ?? '');
    setBuildingNotes(location?.buildingNotes ?? '');
    setPhoto(location?.photos[0] ?? '');
    setLat(location ? String(location.lat) : '');
    setLng(location ? String(location.lng) : '');
    setError(null);
  }, [location]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // Unlike the tourism app's destinations, coordinates are REQUIRED here:
    // a campus location with no position can't be pinned or navigated to,
    // which is most of what this app does with one.
    const latValue = Number(lat);
    const lngValue = Number(lng);
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      return setError('Latitude and longitude are required, and must be numbers.');
    }

    const payload = {
      name,
      category,
      description: description || undefined,
      buildingNotes: buildingNotes || undefined,
      photos: photo ? [photo] : undefined,
      lat: latValue,
      lng: lngValue,
    };

    setSaving(true);
    // The slug is the location's public URL, so it is only ever set at
    // creation — an edit leaves it out of the payload rather than risking a
    // silent rename that breaks every link already shared.
    const request$ = location
      ? locationsApi.updateLocation$(location.id, payload)
      : locationsApi.createLocation$({ ...payload, slug: slug.trim() });

    request$.subscribe({
      next: onSaved,
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not save the location.');
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
        {location ? 'Edit location' : 'New location'}
      </h2>

      <TextField
        label="Name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (!location && !slugEdited) setSlug(slugify(e.target.value));
        }}
        placeholder="Balme Library"
        required
      />

      {/* The API requires a slug on create (a duplicate is a 409) and it
          becomes the public URL, so it's editable here rather than hidden —
          but it's derived from the name until an admin overrides it. */}
      {location ? (
        <div className="mb-4">
          <span className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white">
            URL slug
          </span>
          <p className="rounded-xl bg-neutral-100 px-4 py-3 font-mono text-sm text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {location.slug}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Fixed once created — changing it would break links already shared.
          </p>
        </div>
      ) : (
        <TextField
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlugEdited(true);
            setSlug(e.target.value);
          }}
          placeholder="balme-library"
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lower-case words separated by single hyphens"
          required
        />
      )}

      <div className="mb-4">
        <label
          htmlFor="location-category"
          className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
        >
          Category
        </label>
        <select
          id="location-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as LocationCategory)}
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 dark:text-white"
        >
          {LOCATION_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {LOCATION_CATEGORY_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          htmlFor="location-description"
          className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
        >
          Description
        </label>
        <textarea
          id="location-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 dark:text-white"
        />
      </div>

      <TextField
        label="Building / landmark notes"
        value={buildingNotes}
        onChange={(e) => setBuildingNotes(e.target.value)}
        placeholder="Second floor, above the Registry"
      />

      <div className="grid gap-x-4 sm:grid-cols-2">
        <TextField
          label="Latitude"
          type="number"
          step="any"
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          placeholder="5.65080"
          required
        />
        <TextField
          label="Longitude"
          type="number"
          step="any"
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          placeholder="-0.18690"
          required
        />
      </div>

      <ImageUploadField label="Photo" value={photo} onChange={setPhoto} />

      {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Saving…' : location ? 'Save changes' : 'Create location'}
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
