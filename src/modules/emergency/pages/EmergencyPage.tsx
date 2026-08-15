import {
  Ambulance,
  Building2,
  Landmark,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { emergencyApi, type EmergencyContact, type Facility, type FacilityType } from '@/lib/api';
import { useApiResource } from '@/hooks/useApiResource';
import { SkeletonLine, SkeletonRegion } from '@/components/ui/Skeleton';

// Module M6 — Emergency Medical Assistance (SRS 3.7, FR-EMRG-01 to 11).
//
// Now backed by real endpoints: GET /emergency/facilities and
// /emergency/contacts. Both are **public** — no token required — which is
// deliberate on the backend's side and matters here: someone in trouble may
// have an expired session, so this page must work signed out (FR-EMRG-08).
//
// Accra is the fallback centre when the browser won't give us a position
// (denied, insecure origin, or still deciding). Distances are then measured
// from the city centre rather than the user — honest and still useful,
// rather than showing nothing or blocking on a permission prompt.
const ACCRA = { lat: 5.6037, lng: -0.187 };

const facilityIcon: Record<FacilityType, typeof Phone> = {
  HOSPITAL: Building2,
  CLINIC: Building2,
  PHARMACY: Building2,
  POLICE: ShieldAlert,
  FIRE: TriangleAlert,
  EMBASSY: Landmark,
};

function directionsUrl(facility: Facility): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${facility.lat},${facility.lng}`;
}

function FacilityCard({ facility }: { facility: Facility }) {
  const Icon = facilityIcon[facility.type] ?? Building2;
  return (
    <article className="rounded-card border border-neutral-100 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink-900 dark:text-white">{facility.name}</h3>
          <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
            {facility.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            {facility.distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400">
                <MapPin className="size-4" /> {facility.distanceKm.toFixed(1)} km
              </span>
            )}
            {facility.open24h && (
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-700/20 dark:text-brand-500">
                Open 24h
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {/* Call is the primary action (solid brand); Directions is the
            secondary (tinted brand). Red is reserved for the SOS trigger and
            the national lines, so it still reads as "this is the urgent one"
            rather than colouring every button on the page. */}
        <a
          href={`tel:${facility.phone}`}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          <Phone className="size-4" /> Call
        </a>
        <a
          href={directionsUrl(facility)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-600/30 bg-brand-50 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-700/20 dark:text-brand-500 dark:hover:bg-brand-700/30"
        >
          <Navigation className="size-4" /> Directions
        </a>
      </div>
    </article>
  );
}

export function EmergencyPage() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const centre = coords ?? ACCRA;

  // Read through a ref so the fetcher closure always sees the latest centre
  // without useApiResource needing a dependency array.
  const centreRef = useRef(centre);
  centreRef.current = centre;

  const { data, status, retry } = useApiResource(() =>
    forkJoin({
      facilities: emergencyApi
        .listFacilities$({ lat: centreRef.current.lat, lng: centreRef.current.lng, radiusKm: 50 })
        .pipe(catchError(() => of([] as Facility[]))),
      // Contacts must survive a facilities failure — the phone numbers are
      // the single most important thing on this page.
      contacts: emergencyApi
        .listEmergencyContacts$()
        .pipe(catchError(() => of([] as EmergencyContact[]))),
    }),
  );

  // Refetch once a real position arrives (the documented pattern for
  // useApiResource). Held in a ref because `retry` is a fresh closure every render.
  const retryRef = useRef(retry);
  retryRef.current = retry;
  useEffect(() => {
    if (!coords) return;
    retryRef.current();
  }, [coords]);

  // Memoised off `data` itself — `data?.x ?? []` produces a new array every
  // render, which would defeat the memo entirely.
  const facilities = useMemo(() => data?.facilities ?? [], [data]);
  const contacts = useMemo(() => data?.contacts ?? [], [data]);

  const ambulance = useMemo(
    () => contacts.find((c) => /ambulance/i.test(c.label)) ?? contacts[0],
    [contacts],
  );
  const nearestHospital = useMemo(
    () => facilities.find((f) => f.type === 'HOSPITAL' || f.type === 'CLINIC'),
    [facilities],
  );
  const embassy = useMemo(() => facilities.find((f) => f.type === 'EMBASSY'), [facilities]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      // Denied or unavailable: keep the Accra fallback silently.
      () => setLocating(false),
      { timeout: 8000 },
    );
  }

  return (
    <div className="md:mx-auto md:max-w-7xl md:px-6 lg:px-8">
      <header className="bg-danger-500 px-5 pt-6 pb-6 md:mt-8 md:rounded-card md:px-10 md:py-10">
        <div className="md:flex md:items-center md:justify-between md:gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white md:text-4xl">Emergency</h1>
            <p className="mt-1 hidden max-w-lg text-white/80 md:block">
              Verified facilities near you and Ghana's national emergency lines. This page works
              without signing in.
            </p>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-3 flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60 md:mt-0 md:shrink-0"
          >
            <Navigation className={`size-4 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Locating…' : coords ? 'Using your location' : 'Use my location'}
          </button>
        </div>
      </header>

      {/* Desktop splits into SOS + actions on the left, facilities on the
          right; mobile keeps the original single stacked column. */}
      <div className="md:mt-8 md:grid md:grid-cols-[380px_1fr] md:items-start md:gap-8">
        <div className="md:sticky md:top-24">
          <div className="px-5 pt-5 md:px-0 md:pt-0">
            <a
              href={ambulance ? `tel:${ambulance.number}` : undefined}
              className="flex w-full flex-col items-center gap-3 rounded-card bg-danger-500 px-6 py-8 text-white shadow-sm transition hover:bg-danger-600"
            >
              <Ambulance className="size-12" strokeWidth={1.5} />
              <span className="text-lg font-bold tracking-wide">TRIGGER SOS ALERT</span>
              {ambulance && (
                <span className="text-sm text-white/80">
                  Calls {ambulance.label} · {ambulance.number}
                </span>
              )}
            </a>
          </div>

          <section className="px-5 pt-6 md:px-0">
            <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={ambulance ? `tel:${ambulance.number}` : undefined}
                className="rounded-card border border-neutral-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-danger-500 text-white">
                  <Phone className="size-5" />
                </span>
                <span className="mt-3 block font-semibold text-ink-900 dark:text-white">
                  Call Ambulance
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {ambulance?.number ?? '—'}
                </span>
              </a>

              <a
                href={nearestHospital ? directionsUrl(nearestHospital) : undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-card border border-neutral-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-600 text-white">
                  <MapPin className="size-5" />
                </span>
                <span className="mt-3 block font-semibold text-ink-900 dark:text-white">
                  Nearest Hospital
                </span>
                <span className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {nearestHospital
                    ? `${nearestHospital.distanceKm?.toFixed(1) ?? '—'}km · ${nearestHospital.name}`
                    : '—'}
                </span>
              </a>

              <a
                href={embassy ? `tel:${embassy.phone}` : undefined}
                className="rounded-card border border-neutral-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent-500 text-white">
                  <Landmark className="size-5" />
                </span>
                <span className="mt-3 block font-semibold text-ink-900 dark:text-white">
                  My Embassy
                </span>
                <span className="line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {embassy?.name ?? 'None listed nearby'}
                </span>
              </a>

              {/* No advisories endpoint exists yet, so this stays inert
                  rather than linking somewhere invented. */}
              <div className="rounded-card border border-neutral-100 bg-white p-4 opacity-60 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="flex size-10 items-center justify-center rounded-xl bg-neutral-400 text-white dark:bg-neutral-600">
                  <TriangleAlert className="size-5" />
                </span>
                <span className="mt-3 block font-semibold text-ink-900 dark:text-white">
                  Travel Advisory
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">Coming soon</span>
              </div>
            </div>
          </section>

          {contacts.length > 0 && (
            <section className="px-5 pt-6 md:px-0">
              <h2 className="mb-3 text-lg font-bold text-ink-900 dark:text-white">
                National Emergency Lines
              </h2>
              <div className="overflow-hidden rounded-card border border-neutral-100 dark:border-neutral-800">
                {contacts.map((contact, i) => (
                  <a
                    key={contact.number}
                    href={`tel:${contact.number}`}
                    className={`flex items-center justify-between px-4 py-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                      i !== contacts.length - 1
                        ? 'border-b border-neutral-100 dark:border-neutral-800'
                        : ''
                    }`}
                  >
                    <span className="font-medium text-ink-900 dark:text-white">{contact.label}</span>
                    <span className="flex items-center gap-1.5 font-bold text-danger-500">
                      <Phone className="size-4" /> {contact.number}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <section className="px-5 pt-6 pb-6 md:px-0 md:pt-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-ink-900 dark:text-white md:text-2xl">
              Nearest Medical Facilities
            </h2>
            {status === 'ready' && facilities.length > 0 && (
              <span className="text-sm text-neutral-400">{facilities.length} nearby</span>
            )}
          </div>

          {status === 'loading' && (
            <SkeletonRegion
              label="Loading facilities"
              className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"
            >
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-card border border-neutral-100 p-4 dark:border-neutral-800"
                >
                  <div className="flex gap-3">
                    <SkeletonLine boxClassName="h-10" className="w-10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <SkeletonLine className="w-2/3" />
                      <SkeletonLine className="w-1/2" />
                    </div>
                  </div>
                  <SkeletonLine boxClassName="h-10" className="mt-3 w-full" />
                </div>
              ))}
            </SkeletonRegion>
          )}

          {status === 'error' && (
            <div className="flex items-center justify-between rounded-card border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span>Couldn't load nearby facilities. The phone numbers above still work.</span>
              <button
                type="button"
                onClick={retry}
                className="flex shrink-0 items-center gap-1 font-medium text-brand-600 dark:text-brand-500"
              >
                <RefreshCw className="size-4" /> Retry
              </button>
            </div>
          )}

          {status === 'ready' && facilities.length === 0 && (
            <p className="rounded-card border border-dashed border-neutral-200 px-4 py-6 text-center text-sm text-neutral-400 dark:border-neutral-800">
              No facilities listed within 50km.
            </p>
          )}

          {status === 'ready' && facilities.length > 0 && (
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
              {facilities.map((facility) => (
                <FacilityCard key={facility.id} facility={facility} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
