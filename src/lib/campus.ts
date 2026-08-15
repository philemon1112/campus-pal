import type { LatLng } from '@/lib/geo';

// University of Ghana, Legon — roughly the Balme Library forecourt, which is
// the centre of the main campus. Used only as the map's pre-load framing;
// once locations arrive, MapView's `fitToMarkers` takes over.
export const UG_LEGON: LatLng = { lat: 5.6508, lng: -0.1869 };

// Tight enough to read building labels rather than the whole of Accra.
export const CAMPUS_ZOOM = 15;
