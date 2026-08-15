import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  ApiError,
  foodJointsApi,
  locationsApi,
  MAX_PAGE_LIMIT,
  type CampusLocation,
  type FoodJoint,
  type FoodJointInput,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { TextField } from '@/components/ui/TextField';
import { ImageUploadField } from '@/components/ui/ImageUploadField';

// FR-2.7 — a registered vendor creates and updates their own listing.
//
// `GET /restaurants/mine` is what makes this an edit screen rather than a
// create-only one: the console reads back the listing the vendor owns and
// PATCHes it, falling back to POST when they don't have one yet.
//
// The campus landmark is a real join (`nearestLocationId`), not free text,
// so it's a select over the location catalogue — which is also what lets
// students find this joint by searching for the hall it sits behind.
const EMPTY_FORM: FoodJointInput = {
  name: '',
  cuisine: '',
  priceTier: 2,
  description: '',
  lat: 0,
  lng: 0,
  nearestLocationId: '',
  phone: '',
  whatsapp: '',
  email: '',
  heroImageUrl: '',
  contactConsent: false,
};

export function VendorConsolePage() {
  // The listing and the landmark options load together, but a failed
  // location list must not take the form down — the vendor can still save
  // without picking a landmark.
  const { data, status, retry } = useApiResource(() =>
    forkJoin({
      mine: foodJointsApi.listMyFoodJoints$(),
      locations: locationsApi
        .listLocations$({ limit: MAX_PAGE_LIMIT })
        .pipe(catchError(() => of({ results: [] as CampusLocation[] }))),
    }),
  );

  const existing: FoodJoint | undefined = data?.mine.results[0];
  const locations = data?.locations.results ?? [];

  const [form, setForm] = useState<FoodJointInput>(EMPTY_FORM);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Seed the form once the vendor's own listing arrives. Keyed on the id so
  // a refetch of the same listing doesn't discard unsaved edits.
  const seededId = useRef<string | null>(null);
  useEffect(() => {
    if (!existing || seededId.current === existing.id) return;
    seededId.current = existing.id;
    setForm({
      name: existing.name,
      cuisine: existing.cuisine,
      priceTier: existing.priceTier,
      description: existing.description ?? '',
      lat: existing.lat,
      lng: existing.lng,
      nearestLocationId: existing.nearestLocation?.id ?? '',
      phone: existing.phone ?? '',
      whatsapp: existing.whatsapp ?? '',
      email: existing.email ?? '',
      heroImageUrl: existing.heroImageUrl ?? '',
      contactConsent: existing.contactConsent,
    });
    setLat(String(existing.lat));
    setLng(String(existing.lng));
  }, [existing]);

  function set<K extends keyof FoodJointInput>(key: K, value: FoodJointInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const latValue = Number(lat);
    const lngValue = Number(lng);
    if (!Number.isFinite(latValue) || !Number.isFinite(lngValue)) {
      return setError('Latitude and longitude are required, and must be numbers.');
    }
    // SRS §7: contact numbers are published only with the vendor's consent,
    // so the two travel together or not at all.
    if ((form.phone || form.whatsapp) && !form.contactConsent) {
      return setError('Tick the consent box to publish your contact details.');
    }

    // The API rejects unknown body fields with a 400, and empty strings are
    // not the same as "not set" — so optional fields are dropped rather than
    // sent blank.
    const payload: FoodJointInput = {
      name: form.name,
      cuisine: form.cuisine,
      priceTier: form.priceTier,
      description: form.description,
      lat: latValue,
      lng: lngValue,
      contactConsent: form.contactConsent,
      nearestLocationId: form.nearestLocationId || undefined,
      phone: form.phone || undefined,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      heroImageUrl: form.heroImageUrl || undefined,
    };

    setSaving(true);
    const request$ = existing
      ? foodJointsApi.updateFoodJoint$(existing.id, payload)
      : foodJointsApi.createFoodJoint$(payload);

    request$.subscribe({
      next: () => {
        setSaved(true);
        setSaving(false);
        retry();
      },
      error: (err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not save the listing.');
        setSaving(false);
      },
    });
  }

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-8">
      <header className="px-5 pt-6 pb-4 md:px-0 md:pt-10">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white md:text-3xl">
          My food joint
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Your listing as students see it on the Food tab.
        </p>
      </header>

      <div className="px-5 pb-6 md:px-0">
        {status === 'error' && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 md:max-w-xl">
            <span>Couldn’t load your listing.</span>
            <button
              type="button"
              onClick={retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {status === 'ready' && !existing && (
          <p className="mb-4 rounded-card border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400 md:max-w-xl">
            You don’t have a listing yet. Fill this in and it goes live on the Food tab.
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-card bg-white p-5 shadow-sm dark:bg-neutral-900 md:max-w-xl"
        >
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Auntie Muni Waakye"
            required
          />
          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="Food type"
              value={form.cuisine}
              onChange={(e) => set('cuisine', e.target.value)}
              placeholder="Local dishes"
              required
            />
            <div className="mb-4">
              <label
                htmlFor="vendor-price"
                className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
              >
                Price range
              </label>
              <select
                id="vendor-price"
                value={form.priceTier}
                onChange={(e) => set('priceTier', Number(e.target.value))}
                className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 dark:text-white"
              >
                <option value={1}>₵ — cheap</option>
                <option value={2}>₵₵ — moderate</option>
                <option value={3}>₵₵₵ — pricey</option>
                <option value={4}>₵₵₵₵ — expensive</option>
              </select>
            </div>
          </div>

          {/* FR-2.2/FR-2.3 — the landmark students will search by. */}
          <div className="mb-4">
            <label
              htmlFor="vendor-landmark"
              className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
            >
              Nearest campus landmark
            </label>
            <select
              id="vendor-landmark"
              value={form.nearestLocationId ?? ''}
              onChange={(e) => set('nearestLocationId', e.target.value)}
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 dark:text-white"
            >
              <option value="">No landmark</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-neutral-400">
              Students searching for this landmark will find your joint.
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="vendor-description"
              className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
            >
              Description
            </label>
            <textarea
              id="vendor-description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              required
              className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm text-ink-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-neutral-800 dark:text-white"
            />
          </div>

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

          <div className="grid gap-x-4 sm:grid-cols-2">
            <TextField
              label="Phone"
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+233 20 123 4567"
            />
            <TextField
              label="WhatsApp number"
              value={form.whatsapp ?? ''}
              onChange={(e) => set('whatsapp', e.target.value)}
              placeholder="233201234567"
            />
          </div>

          <ImageUploadField
            label="Photo"
            value={form.heroImageUrl ?? ''}
            onChange={(url) => set('heroImageUrl', url)}
          />

          {/* SRS §7 — legal/compliance. Untick it and the API stops sending
              the numbers to anyone, on every screen. */}
          <label className="mb-4 flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.contactConsent}
              onChange={(e) => set('contactConsent', e.target.checked)}
              className="mt-0.5 size-4 accent-brand-600"
            />
            I agree to my contact details being shown publicly on CampusPal.
          </label>

          {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}
          {saved && (
            <p className="mb-3 text-sm text-brand-600 dark:text-brand-500">Listing saved.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Create listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
