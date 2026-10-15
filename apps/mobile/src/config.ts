// ── DevCard API Configuration ─────────────────────────────────────────────────
// Use the hosted backend for development and release builds.

export const API_BASE_URL: string = 'https://devcard-internal-backend.onrender.com';

export const APP_URL: string = __DEV__
  ? 'http://localhost:5173'
  : 'https://devcard.dev';

// Deep link scheme — must match android/app/build.gradle and ios/Info.plist
export const DEEP_LINK_SCHEME = 'devcard';

export const OAUTH_REDIRECT_URI = `${DEEP_LINK_SCHEME}://oauth/callback`;
