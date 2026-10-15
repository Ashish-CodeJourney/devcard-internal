// ─── Auth surface palette ─────────────────────────────────────────────────────
// The authentication flow deliberately uses its own light, editorial treatment
// (my reference direction) rather than the in-app accent system, so the entry
// experience reads as a branded, premium product surface.
//
// It still adapts to the app's dark mode so dark-mode users are not blinded by
// a full-white screen.

export type AuthPalette = {
  heroFrom: string;
  heroTo: string;
  heroAccent: string;
  heroInk: string;
  surface: string;
  surfaceInset: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  border: string;
  inputBg: string;
  buttonBg: string;
  buttonText: string;
  socialLight: string;
};

export function authPalette(isDark: boolean): AuthPalette {
  if (isDark) {
    return {
      heroFrom: '#0E1419',
      heroTo: '#18242F',
      heroAccent: '#4D9FFF',
      heroInk: '#F4F5F0',
      surface: '#0B0D0F',
      surfaceInset: '#14171A',
      text: '#F4F5F0',
      textSecondary: '#A1A8A3',
      textMuted: '#6E7671',
      accent: '#4D9FFF',
      accentSoft: 'rgba(77, 159, 255, 0.16)',
      border: '#232A2F',
      inputBg: '#14171A',
      // A black pill would vanish on a dark surface, so it inverts.
      buttonBg: '#F4F5F0',
      buttonText: '#0B0D0F',
      socialLight: '#14171A',
    };
  }
  return {
    heroFrom: '#EAF1FF',
    heroTo: '#CFE0FF',
    heroAccent: '#2563EB',
    heroInk: '#0B0D0F',
    surface: '#FFFFFF',
    surfaceInset: '#F6F7F9',
    text: '#0B0D0F',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    accent: '#2563EB',
    accentSoft: 'rgba(37, 99, 235, 0.10)',
    border: '#E5E7EB',
    inputBg: '#F3F4F6',
    buttonBg: '#0B0D0F',
    buttonText: '#FFFFFF',
    socialLight: '#FFFFFF',
  };
}
