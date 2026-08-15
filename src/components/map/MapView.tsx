import { useEffect, useRef, useState } from 'react';
// maplibre-gl v6 ships named exports only -- there is no default export.
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, Popup } from 'maplibre-gl';
// Imported here rather than in main.tsx so it's code-split into the same
// lazy chunk as the library, instead of the entry stylesheet.
import 'maplibre-gl/dist/maplibre-gl.css';
import { Skeleton } from '@/components/ui/Skeleton';
import type { LatLng } from '@/lib/geo';

// Tile source: OpenFreeMap's Liberty style. Keyless, unmetered, real
// street-level detail.
//
// Deliberately NOT demotiles.maplibre.org, which most MapLibre examples
// default to -- that style is country outlines only and renders as a blank
// green shape at the zoom levels this app uses. If OpenFreeMap ever goes
// away, the swap is a raster style pointing at OSM tiles; the rest of this
// component is unaffected.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
}

interface MapViewProps {
  center: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  selectedId?: string | null;
  onMarkerSelect?: (id: string) => void;
  // Frame every marker instead of using `center`/`zoom`. Delegated to
  // MapLibre's fitBounds because it accounts for the container's real
  // aspect ratio -- a short, wide map needs a much lower zoom to fit the
  // same latitude span, and computing that by hand puts pins off-screen.
  fitToMarkers?: boolean;
  interactive?: boolean;
  className?: string;
  ariaLabel?: string;
}

// A thin wrapper over the MapLibre imperative API -- no react-map-gl, to
// match the repo's minimal-dependency style.
//
// Two rules from docs/UI_CONVENTIONS.md shape this:
//   - the frame is static and owns its height, so the page never reflows
//     when tiles arrive; a Skeleton fills it until the `load` event;
//   - a tile server that's down degrades to a quiet inline message and
//     never blanks the page. Same governing rule as sockets: an
//     enhancement, never a dependency.
export function MapView({
  center,
  zoom = 11,
  markers = [],
  selectedId,
  onMarkerSelect,
  fitToMarkers = false,
  interactive = true,
  className = '',
  ariaLabel = 'Map',
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onMarkerSelect);
  onSelectRef.current = onMarkerSelect;

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // Mirrors `loaded` for the MapLibre event handlers, which close over the
  // state value from the render that registered them.
  const loadedRef = useRef(false);

  // Create once. `center`/`zoom` are read here only as the initial camera;
  // later changes are applied by the effect below rather than by rebuilding
  // the map, which would flash and lose user panning.
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: [center.lng, center.lat],
      zoom,
      interactive,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Reveal on `styledata` -- the style is parsed and the map is painting.
    //
    // Deliberately NOT `load`, the obvious choice: `load` additionally waits
    // for every initially-visible tile, so a stalled tile source leaves it
    // pending forever. That was observed against a real tile server, and it
    // pinned the skeleton over a perfectly good map *and* blocked the camera
    // effect below, which waits on the same flag. `load` is kept as a
    // belt-and-braces second trigger; whichever arrives first wins.
    const markReady = () => {
      loadedRef.current = true;
      setLoaded(true);
    };
    map.on('styledata', markReady);
    map.on('load', markReady);

    // Only an error *before* the style is up means there's no map to show.
    // After that, errors are individual tiles failing -- covering a working
    // map with "Map unavailable" because one tile 404'd would be worse than
    // the gap it leaves. MapLibre logs the detail to the console either way.
    map.on('error', () => {
      if (!loadedRef.current) setFailed(true);
    });

    if (interactive) {
      map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    }

    return () => {
      map.remove();
      mapRef.current = null;
      loadedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive]);

  // Move the camera: either frame all the pins, or go where the caller
  // asked (a selected destination, or the user's own location).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    if (fitToMarkers && markers.length > 1) {
      const bounds = new LngLatBounds();
      for (const point of markers) bounds.extend([point.lng, point.lat]);
      // maxZoom keeps two nearby pins from slamming into street level.
      map.fitBounds(bounds, { padding: 48, maxZoom: 11, duration: 600 });
      return;
    }

    map.easeTo({ center: [center.lng, center.lat], zoom, duration: 600 });
  }, [center.lat, center.lng, zoom, loaded, fitToMarkers, markers]);

  // Diff markers separately from map creation so a re-render swaps pins
  // without tearing down the map underneath them.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current) marker.remove();
    markersRef.current = markers.map((point) => {
      const marker = new Marker({
        // brand-700 / brand-500 from index.css. MapLibre's Marker takes a
        // colour string, not a CSS variable, so these are the one place
        // brand hexes are duplicated outside the @theme block.
        color: point.id === selectedId ? '#9a3412' : '#f97316',
      })
        .setLngLat([point.lng, point.lat])
        .setPopup(new Popup({ offset: 24 }).setText(point.label))
        .addTo(map);

      marker.getElement().style.cursor = 'pointer';
      marker.getElement().addEventListener('click', () => onSelectRef.current?.(point.id));
      return marker;
    });

    return () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
    };
  }, [markers, selectedId]);

  return (
    <div className={`relative overflow-hidden rounded-card bg-neutral-100 dark:bg-neutral-900 ${className}`}>
      <div ref={containerRef} aria-label={ariaLabel} role="application" className="size-full" />

      {!loaded && !failed && (
        <Skeleton className="pointer-events-none absolute inset-0 rounded-none" />
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 text-sm text-neutral-400 dark:bg-neutral-900">
          Map unavailable
        </div>
      )}
    </div>
  );
}
