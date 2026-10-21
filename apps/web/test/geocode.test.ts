import { describe, it, expect, vi, afterEach } from 'vitest';
import { geocodeAddress } from '../src/lib/geocode';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetchOnce(payload: unknown, ok = true) {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => payload }) as Response));
}

describe('geocodeAddress', () => {
  it('returns coordinates for a match', async () => {
    mockFetchOnce([{ lat: '19.0760', lon: '72.8777', display_name: 'Mumbai, India' }]);
    const hit = await geocodeAddress('Moscone Center, San Francisco');
    expect(hit).toMatchObject({ lat: 19.076, lng: 72.8777 });
    expect(hit?.label).toContain('Mumbai');
  });

  it('returns null when nothing matches', async () => {
    mockFetchOnce([]);
    expect(await geocodeAddress('somewhere that does not exist xyz')).toBeNull();
  });

  it('does not fetch for short queries', async () => {
    const spy = vi.fn(async () => ({ ok: true, json: async () => [] }) as Response);
    vi.stubGlobal('fetch', spy);
    expect(await geocodeAddress('abc')).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns null on http errors and malformed numbers', async () => {
    mockFetchOnce([], false);
    expect(await geocodeAddress('Moscone Center')).toBeNull();
    mockFetchOnce([{ lat: 'nope', lon: '72.8777' }]);
    expect(await geocodeAddress('Moscone Center')).toBeNull();
  });
});
