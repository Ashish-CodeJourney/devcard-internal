import { useEffect, useRef } from 'react';

// Leaflet is loaded from a CDN in index.html, so it is not a typed dependency.
type LeafletAny = any;

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  onClick?: () => void;
}

interface Props {
  markers?: MapMarker[];
  height?: number;
  center?: [number, number];
  zoom?: number;
  /** Click-to-place mode (used by the submission form). */
  pickable?: boolean;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  /** When set to new coordinates, the map flies there (e.g. after geocoding). */
  focus?: [number, number] | null;
  focusZoom?: number;
}

const DEFAULT_CENTER: [number, number] = [20, 0];

function leaflet(): LeafletAny | null {
  return (window as unknown as { L?: LeafletAny }).L ?? null;
}

export default function EventsMap({
  markers = [],
  height = 380,
  center = DEFAULT_CENTER,
  zoom = 2,
  pickable = false,
  picked = null,
  onPick,
  focus = null,
  focusZoom = 13,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletAny | null>(null);
  const markerLayerRef = useRef<LeafletAny | null>(null);
  const pickMarkerRef = useRef<LeafletAny | null>(null);
  // Keep the latest onPick without re-creating the map.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // ─── Create the map once ───
  useEffect(() => {
    const L = leaflet();
    if (!L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
      worldCopyJump: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    if (pickable) {
      map.on('click', (e: LeafletAny) => {
        onPickRef.current?.(e.latlng.lat, e.latlng.lng);
      });
    }

    // Leaflet measures its container on mount; nudge it after layout settles.
    const t = window.setTimeout(() => map.invalidateSize(), 250);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      pickMarkerRef.current = null;
    };
    // Intentionally created once — subsequent changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Event markers ───
  useEffect(() => {
    const L = leaflet();
    const layer = markerLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    markers.forEach(marker => {
      if (marker.lat == null || marker.lng == null) return;

      // A styled div avoids depending on Leaflet's bundled marker images.
      const icon = L.divIcon({
        className: 'devcard-map-pin',
        html: '<span></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const m = L.marker([marker.lat, marker.lng], { icon, title: marker.label }).addTo(layer);
      m.bindTooltip(marker.label, { direction: 'top', offset: [0, -8] });
      if (marker.onClick) m.on('click', marker.onClick);
    });
  }, [markers]);

  // ─── Fly to a focused location (e.g. an address the user just typed) ───
  const prevFocusKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    const key = `${focus[0]},${focus[1]}`;
    if (prevFocusKeyRef.current === key) return;
    prevFocusKeyRef.current = key;
    if (typeof map.flyTo === 'function') map.flyTo(focus, focusZoom);
    else map.setView(focus, focusZoom);
  }, [focus, focusZoom]);

  // ─── Picked location ───
  useEffect(() => {
    const L = leaflet();
    const map = mapRef.current;
    if (!L || !map) return;

    if (pickMarkerRef.current) {
      map.removeLayer(pickMarkerRef.current);
      pickMarkerRef.current = null;
    }

    if (picked) {
      const icon = L.divIcon({
        className: 'devcard-map-pin devcard-map-pin-picked',
        html: '<span></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      pickMarkerRef.current = L.marker(picked, { icon }).addTo(map);
    }
  }, [picked]);

  return <div ref={containerRef} className="events-map" style={{ height }} />;
}
