import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

export interface MapEvent {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
}

type Props = {
  events: MapEvent[];
  height: number;
  onSelect: (slug: string, name: string) => void;
};

/**
 * Leaflet + OpenStreetMap inside a WebView.
 *
 * Chosen over react-native-maps because it needs no Google Maps API key and no
 * new native module (react-native-webview is already a dependency), so it ships
 * without a native rebuild.
 */
function buildHtml(events: MapEvent[], accent: string, surface: string, fallbackCenter: [number, number]): string {
  // JSON.stringify handles escaping of names/slugs safely.
  const data = JSON.stringify(events);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: ${surface}; }
  .devcard-pin span {
    display: block; width: 100%; height: 100%;
    border-radius: 50%;
    background: ${accent};
    border: 2px solid #ffffff;
    box-shadow: 0 0 0 2px ${accent}66;
  }
  .leaflet-container { background: ${surface}; }
  .leaflet-tooltip {
    background: ${surface}; color: #f4f5f0; border: 1px solid #333; font-size: 12px;
  }
  .leaflet-tooltip:before { border-top-color: #333; }
  #err {
    display: none; position: absolute; inset: 0; padding: 24px;
    color: #a1a8a3; font-family: -apple-system, system-ui, sans-serif; font-size: 14px;
    align-items: center; justify-content: center; text-align: center;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="err">The map could not load. Check your connection and try again.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  (function () {
    if (typeof L === 'undefined') {
      document.getElementById('err').style.display = 'flex';
      return;
    }
    var events = ${data};
    var map = L.map('map', { zoomControl: true, attributionControl: false })
      .setView([${fallbackCenter[0]}, ${fallbackCenter[1]}], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    var pin = L.divIcon({
      className: 'devcard-pin',
      html: '<span></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    var bounds = [];
    events.forEach(function (e) {
      var marker = L.marker([e.latitude, e.longitude], { icon: pin, title: e.name }).addTo(map);
      marker.bindTooltip(e.name, { direction: 'top', offset: [0, -8] });
      marker.on('click', function () {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ slug: e.slug, name: e.name }));
        } catch (err) {}
      });
      bounds.push([e.latitude, e.longitude]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 11);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    setTimeout(function () { map.invalidateSize(); }, 250);
  })();
</script>
</body>
</html>`;
}

export default function EventsMapView({ events, height, onSelect }: Props) {
  const { colors } = useTheme();

  const html = useMemo(
    () => buildHtml(events, colors.accent, colors.bgPrimary, [20, 0]),
    [events, colors.accent, colors.bgPrimary],
  );

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={{ height, backgroundColor: colors.bgPrimary }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onMessage={event => {
        try {
          const payload = JSON.parse(event.nativeEvent.data) as { slug?: string; name?: string };
          if (payload?.slug) onSelect(payload.slug, payload.name ?? payload.slug);
        } catch {
          // ignore malformed messages
        }
      }}
    />
  );
}
