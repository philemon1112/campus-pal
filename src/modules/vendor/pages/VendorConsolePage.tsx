import { useState } from 'react';
import { ApiError, foodJointsApi, type FoodJointInput } from '@/lib/api';
import { TextField } from '@/components/ui/TextField';
import { ImageUploadField } from '@/components/ui/ImageUploadField';

// FR-2.7 — a registered vendor creates and updates their own listing.
//
// The write endpoints don't exist (POST/PATCH /restaurants — see
// docs/API_REQUIREMENTS.md §B), and there is no "my listing" read endpoint
// either, so this screen cannot pre-fill an existing listing. It is
// therefore a create form only, and it says so, rather than pretending to
// load a listing it has no way to fetch.
export function VendorConsolePage() {
  const [form, setForm] = useState<FoodJointInput>({
    name: '',
    cuisine: '',
    priceTier: 2,
    lat: 0,
    lng: 0,
    description: '',
    campusArea: '',
    phone: '',
    whatsapp: '',
    heroImageUrl: '',
    contactConsent: false,
  });
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof FoodJointInput>(key: K, value: FoodJointInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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

    setSaving(true);
    foodJointsApi
      .createFoodJoint$({ ...form, lat: latValue, lng: lngValue })
      .subscribe({
        next: () => {
          setSaved(true);
          setSaving(false);
        },
        error: (err: unknown) => {
          setError(
            err instanceof ApiError && err.code === 404
              ? 'Vendor listings aren’t built on the backend yet (POST /restaurants).'
              : err instanceof ApiError
                ? err.message
                : 'Could not save the listing.',
          );
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
        <p className="mb-4 rounded-card border border-dashed border-neutral-300 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          There’s no endpoint to read back an existing listing yet, so this form always creates a
          new one and can’t show what you already have. See docs/API_REQUIREMENTS.md §B.
        </p>

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

          <TextField
            label="Where on campus"
            value={form.campusArea ?? ''}
            onChange={(e) => set('campusArea', e.target.value)}
            placeholder="Behind Commonwealth Hall"
          />

          <div className="mb-4">
            <label
              htmlFor="vendor-description"
              className="mb-1.5 block text-sm font-medium text-ink-900 dark:text-white"
            >
              Description
            </label>
            <textarea
              id="vendor-description"
              value={form.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
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

          {/* SRS §7 — legal/compliance. */}
          <label className="mb-4 flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.contactConsent ?? false}
              onChange={(e) => set('contactConsent', e.target.checked)}
              className="mt-0.5 size-4 accent-brand-600"
            />
            I agree to my contact details being shown publicly on CampusPal.
          </label>

          {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}
          {saved && (
            <p className="mb-3 text-sm text-brand-600 dark:text-brand-500">Listing submitted.</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save listing'}
          </button>
        </form>
      </div>
    </div>
  );
}
