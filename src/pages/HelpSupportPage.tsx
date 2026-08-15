import {
  ChevronLeft,
  Crosshair,
  Flame,
  Hospital,
  Landmark,
  Navigation,
  Phone,
  Pill,
  RefreshCw,
  Shield,
  Stethoscope,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  emergencyApi,
  type EmergencyFacility,
  type FacilityType,
} from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { Skeleton, SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';
import { ActionLink } from '@/components/ui/ActionLink';
import { UG_LEGON } from '@/lib/campus';
import { directionsUrl, useGeolocation } from '@/lib/geo';
import { ROUTES } from '@/lib/routes';

// Help & Support (SRS 2.6) — reached from Profile's last settings row.
//
// The emergency numbers are the point of this screen: Ghana's national
// lines, one tap to dial, available signed out and without asking for a
// location. Everything else on the page is secondary to that.
//
// Like PersonalInfoPage this always renders INSIDE ProfilePage, so the page
// container and padding belong there and this must not add its own.

// The facilities dataset is national, inherited from the tourism product. It
// reaches Tamale (424km) unfiltered, which is noise on a campus app.
const FACILITY_RADIUS_KM = 25;

// Embassies are in the same dataset and are consular services, not emergency
// ones — they'd otherwise top the list from Legon, ahead of every hospital.
// This section is "where to get help now", so it covers the types that
// answer that question.
const HELP_TYPES: FacilityType[] = ['HOSPITAL', 'CLINIC', 'PHARMACY', 'POLICE', 'FIRE'];

const TYPE_LABELS: Record<FacilityType, string> = {
  HOSPITAL: 'Hospital',
  CLINIC: 'Clinic',
  PHARMACY: 'Pharmacy',
  POLICE: 'Police',
  FIRE: 'Fire service',
  EMBASSY: 'Embassy',
};

const TYPE_ICONS: Record<FacilityType, ComponentType<{ className?: string }>> = {
  HOSPITAL: Hospital,
  CLINIC: Stethoscope,
  PHARMACY: Pill,
  POLICE: Shield,
  FIRE: Flame,
  EMBASSY: Landmark,
};

function FacilityRow({ facility }: { facility: EmergencyFacility }) {
  const Icon = TYPE_ICONS[facility.type];
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
        <Icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink-900 dark:text-white">{facility.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500 dark:text-neutral-400">
          <span>{TYPE_LABELS[facility.type]}</span>
          {facility.distanceKm !== undefined && (
            <span aria-label={`${facility.distanceKm} kilometres away`}>
              · {facility.distanceKm.toFixed(1)} km
            </span>
          )}
          {facility.open24h && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-700/20 dark:text-brand-500">
              Open 24h
            </span>
          )}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <ActionLink
            href={facility.phone ? `tel:${facility.phone}` : undefined}
            disabledTitle="No phone number listed for this facility"
            className="flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
          >
            <Phone className="size-3.5" /> Call
          </ActionLink>
          <ActionLink
            href={directionsUrl({ lat: facility.lat, lng: facility.lng })}
            external
            disabledTitle="No coordinates for this facility"
            className="flex items-center gap-1.5 rounded-full border border-brand-600/30 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-700/20 dark:text-brand-500 dark:hover:bg-brand-700/30"
          >
            <Navigation className="size-3.5" /> Directions
          </ActionLink>
        </div>
      </div>
    </div>
  );
}

export function HelpSupportPage() {
  const contacts = useApiResource(() => emergencyApi.listEmergencyContacts$());

  // Geolocation is never requested on mount — the list works from the campus
  // centre, and sharing a position only sharpens the distances.
  const geo = useGeolocation();
  const originRef = useRef(geo.coords);
  originRef.current = geo.coords;

  const facilities = useApiResource(() => {
    const origin = originRef.current ?? UG_LEGON;
    return emergencyApi.listEmergencyFacilities$({
      lat: origin.lat,
      lng: origin.lng,
      radiusKm: FACILITY_RADIUS_KM,
    });
  });

  // Refetch once a real position arrives (the documented useApiResource
  // pattern — see src/hooks/useApiResource.ts).
  const retryRef = useRef(facilities.retry);
  retryRef.current = facilities.retry;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    retryRef.current();
  }, [geo.coords]);

  const nearby = (facilities.data ?? []).filter((f) => HELP_TYPES.includes(f.type));
  const usingRealPosition = geo.coords !== null;

  return (
    <div className="pb-10 md:max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        {/* Only needed on mobile, where this pane replaces the settings list
            full-screen. On desktop the list stays alongside. */}
        <Link
          to={ROUTES.profile}
          className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-ink-900 dark:bg-neutral-900 dark:text-white md:hidden"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-white">Help &amp; Support</h1>
      </div>

      {/* --- Emergency numbers. The reason this screen exists. --- */}
      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Emergency numbers
        </h2>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          Ghana’s national emergency lines. Tap to dial — these work without an account.
        </p>

        {contacts.status === 'error' && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load the emergency numbers.</span>
            <button
              type="button"
              onClick={contacts.retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Same two-column grid and tile shape as the real thing, so nothing
            moves when the numbers land. */}
        {contacts.status === 'loading' && (
          <SkeletonRegion label="Loading emergency numbers" className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="rounded-card border border-neutral-100 px-4 py-3 dark:border-neutral-800"
              >
                <SkeletonLine className="w-24" />
                <SkeletonLine boxClassName="h-7" className="mt-1.5 w-14" />
              </div>
            ))}
          </SkeletonRegion>
        )}

        {contacts.status === 'ready' && (
          <div className="grid grid-cols-2 gap-2">
            {(contacts.data ?? []).map((contact) => (
              <a
                key={contact.number}
                href={`tel:${contact.number}`}
                className="rounded-card border border-danger-500/20 bg-danger-500/5 px-4 py-3 transition hover:border-danger-500/40 hover:bg-danger-500/10 dark:border-danger-400/25 dark:bg-danger-400/10 dark:hover:border-danger-400/50 dark:hover:bg-danger-400/15"
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  <Phone className="size-3.5 text-danger-500 dark:text-danger-400" />
                  {contact.label}
                </span>
                <span className="mt-0.5 block text-2xl font-bold tabular-nums text-danger-500 dark:text-danger-400">
                  {contact.number}
                </span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* --- Nearest hospitals, police and pharmacies. --- */}
      <section className="mb-8">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Nearest help
          </h2>
          {!usingRealPosition && (
            <button
              type="button"
              onClick={geo.request}
              disabled={geo.status === 'locating'}
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-brand-600 disabled:opacity-60 dark:text-brand-500"
            >
              <Crosshair className="size-4" />
              {geo.status === 'locating' ? 'Locating…' : 'Use my location'}
            </button>
          )}
        </div>
        <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
          {usingRealPosition
            ? 'Hospitals, clinics, pharmacies and police, nearest to you first.'
            : 'Hospitals, clinics, pharmacies and police, nearest to the Legon campus first.'}
        </p>

        {facilities.status === 'error' && (
          <div className="flex items-center justify-between gap-3 rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
            <span>Couldn’t load nearby facilities.</span>
            <button
              type="button"
              onClick={facilities.retry}
              className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Mirrors FacilityRow — icon tile, two text lines, a button pair. */}
        {facilities.status === 'loading' && (
          <SkeletonRegion
            label="Loading nearby facilities"
            className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 px-4 py-3.5 ${
                  i !== 2 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                }`}
              >
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <SkeletonLine className="w-2/3" />
                  <SkeletonLine boxClassName="h-5" className="mt-1 w-1/3" />
                  <Skeleton className="mt-2 h-7 w-40 rounded-full" />
                </div>
              </div>
            ))}
          </SkeletonRegion>
        )}

        {facilities.status === 'ready' && nearby.length === 0 && (
          <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
            Nothing listed within {FACILITY_RADIUS_KM} km. The national numbers above still work.
          </p>
        )}

        {facilities.status === 'ready' && nearby.length > 0 && (
          <>
            <div className="divide-y divide-neutral-100 overflow-hidden rounded-card border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
              {nearby.map((facility) => (
                <FacilityRow key={facility.id} facility={facility} />
              ))}
            </div>
            {/* Honest: none of these is on campus, and the nearest is several
                kilometres away. Saying so is the difference between a useful
                list and a misleading one in an emergency. */}
            <p className="mt-2 text-xs text-neutral-400">
              These are off-campus facilities across Accra. The University Hospital and campus
              security aren’t in the directory yet, so they can’t be listed here.
            </p>
          </>
        )}
      </section>

      {/* --- The part of SRS 2.6 that isn't built. --- */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          FAQ
        </h2>
        <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          There’s no FAQ yet — it needs written content before it needs a screen. In the meantime,
          ask the assistant: it answers questions about campus locations and food joints, and can
          open or get directions to anything it finds.
        </p>
      </section>
    </div>
  );
}
