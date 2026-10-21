// ─── Forward geocoding (no API key) ────────────────────────────────────────────
// Uses OpenStreetMap Nominatim. Meant for occasional, user-initiated lookups
// (debounced by callers) — not bulk geocoding. See usage policy:
// https://operations.osmfoundation.org/policies/nominatim/

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Human-readable address of the match. */
  label: string;
}

export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (q.length < 4) return null;

  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=jsonv2&limit=1&addressdetails=0&q=${encodeURIComponent(q)}`;

  let res: Response;
  try {
    res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  } catch {
    // Network failure or abort — caller treats as "no match".
    return null;
  }
  if (!res.ok) return null;

  const data: unknown = await res.json().catch(() => null);
  const first = Array.isArray(data) ? data[0] as { lat?: unknown; lon?: unknown; display_name?: unknown } : null;
  if (!first) return null;

  const lat = typeof first.lat === 'string' ? parseFloat(first.lat) : NaN;
  const lng = typeof first.lon === 'string' ? parseFloat(first.lon) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, label: typeof first.display_name === 'string' ? first.display_name : q };
}
