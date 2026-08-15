import { useCallback, useState } from 'react';

export interface LatLng {
  lat: number;
  lng: number;
}

// Deep-link into whatever maps app the device has. On iOS and Android this
// hands off to Apple/Google Maps; on desktop it opens Google Maps in a tab.
// The SRS asks for turn-by-turn navigation to a POI (FR-POI-05); there's no
// routing service in the backend, so handing off to one the user already
// has is the honest version of that.
export function directionsUrl(point: LatLng): string {
  const params = new URLSearchParams({ api: '1', destination: `${point.lat},${point.lng}` });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Great-circle distance. Used only for "sort by nearest", where a few
// hundred metres of error is irrelevant, so the simple spherical model is
// plenty — no need for an ellipsoidal formula.
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

type GeolocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported';

// Browser geolocation, requested only when the user asks for it. Never call
// this on mount: an unprompted permission dialog on page load is hostile,
// and Chrome ignores it on insecure origins anyway.
export function useGeolocation() {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const request = useCallback(() => {
    if (!navigator.geolocation) return setStatus('unsupported');

    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus('ready');
      },
      // Denial and timeout are both "we don't have a location" as far as
      // the UI is concerned — it just stops offering to sort by distance.
      () => setStatus('denied'),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { status, coords, request };
}
