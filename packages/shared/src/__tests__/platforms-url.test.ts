import { describe, it, expect } from 'vitest';
import { detectPlatformFromUrl, getProfileUrl, getWebViewUrl, getDeepLinkUrl } from '../platforms';

// ─── getProfileUrl Tests ───

describe('getProfileUrl', () => {
  it('should return the correct GitHub profile URL', () => {
    expect(getProfileUrl('github', 'octocat')).toBe('https://github.com/octocat');
  });

  it('should return the correct LinkedIn profile URL', () => {
    expect(getProfileUrl('linkedin', 'john')).toBe('https://www.linkedin.com/in/john');
  });

  it('should return the correct Twitter profile URL', () => {
    expect(getProfileUrl('twitter', 'john')).toBe('https://x.com/john');
  });

  it('should return empty string for an unknown platform', () => {
    expect(getProfileUrl('nonexistent', 'user')).toBe('');
  });
});

// ─── getWebViewUrl Tests ───

describe('getWebViewUrl', () => {
  it('should return the correct LinkedIn webview URL', () => {
    expect(getWebViewUrl('linkedin', 'john')).toBe('https://www.linkedin.com/in/john');
  });

  it('should return the correct Twitter webview URL', () => {
    expect(getWebViewUrl('twitter', 'john')).toBe('https://x.com/john');
  });

  it('should return null for platforms without a webview URL (github)', () => {
    expect(getWebViewUrl('github', 'octocat')).toBeNull();
  });

  it('should return null for an unknown platform', () => {
    expect(getWebViewUrl('nonexistent', 'user')).toBeNull();
  });
});

// ─── getDeepLinkUrl Tests ───

describe('getDeepLinkUrl', () => {
  it('should return the correct Twitter deep link URL', () => {
    expect(getDeepLinkUrl('twitter', 'john')).toBe('twitter://user?screen_name=john');
  });

  it('should return the correct LinkedIn deep link URL', () => {
    expect(getDeepLinkUrl('linkedin', 'john')).toBe('linkedin://profile?id=john');
  });

  it('should return null for platforms without a deep link (github)', () => {
    expect(getDeepLinkUrl('github', 'octocat')).toBeNull();
  });

  it('should return null for an unknown platform', () => {
    expect(getDeepLinkUrl('nonexistent', 'user')).toBeNull();
  });
});

// ─── detectPlatformFromUrl Tests ───

describe('detectPlatformFromUrl', () => {
  it('should detect GitHub profile URLs', () => {
    const detected = detectPlatformFromUrl('https://github.com/octocat');
    expect(detected?.platform.id).toBe('github');
    expect(detected?.username).toBe('octocat');
  });

  it('should detect LinkedIn profile URLs', () => {
    const detected = detectPlatformFromUrl('https://www.linkedin.com/in/john-doe');
    expect(detected?.platform.id).toBe('linkedin');
    expect(detected?.username).toBe('john-doe');
  });

  it('should detect X profile URLs', () => {
    const detected = detectPlatformFromUrl('https://x.com/john');
    expect(detected?.platform.id).toBe('twitter');
    expect(detected?.username).toBe('john');
  });

  it('should detect npm profile URLs', () => {
    const detected = detectPlatformFromUrl('https://www.npmjs.com/~sindresorhus');
    expect(detected?.platform.id).toBe('npm');
    expect(detected?.username).toBe('sindresorhus');
  });

  it('should detect email links', () => {
    const detected = detectPlatformFromUrl('mailto:hello@example.com');
    expect(detected?.platform.id).toBe('email');
    expect(detected?.username).toBe('hello@example.com');
  });

  it('should fall back to custom for unknown links', () => {
    const detected = detectPlatformFromUrl('https://example.com/profile');
    expect(detected?.platform.id).toBe('custom');
  });
});
