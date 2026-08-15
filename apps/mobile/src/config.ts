// ── DevCard API Configuration ─────────────────────────────────────────────────
// Use localhost consistently with adb reverse on Android emulators.

export const API_BASE_URL: string = __DEV__
  ? 'http://localhost:3000'
  : 'https://api.devcard.dev';

export const APP_URL: string = __DEV__
  ? 'http://localhost:5173'
  : 'https://devcard.dev';

// Deep link scheme — must match android/app/build.gradle and ios/Info.plist
export const DEEP_LINK_SCHEME = 'devcard';

export const OAUTH_REDIRECT_URI = `${DEEP_LINK_SCHEME}://oauth/callback`;
