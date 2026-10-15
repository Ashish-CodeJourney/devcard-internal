// ─── DevCard Design Tokens ────────────────────────────────────────────────────
// Dark-first, editorial, premium. Electric chartreuse is the single accent and
// is used deliberately (primary actions, active states, key highlights) — not
// across the whole interface.
//
// Every screen/component must source color from the theme (useTheme().colors)
// rather than hardcoding literals. These tokens are the single source of truth.

import { Platform } from 'react-native';

// ─── Core palette (dark — primary art direction) ───

export const COLORS = {
  // Accent — electric chartreuse. `primary` is kept as an alias so existing
  // call sites keep working, but semantically this is the accent color.
  accent: '#C9FF45',
  accentLight: '#DAFF7A',
  accentDark: '#9FCC22',
  accentSoft: 'rgba(201, 255, 69, 0.12)',
  accentBorder: 'rgba(201, 255, 69, 0.35)',

  primary: '#C9FF45',
  primaryLight: '#DAFF7A',
  primaryDark: '#9FCC22',

  // Backgrounds
  bgPrimary: '#0B0D0F',
  bgSecondary: '#14171A',
  bgCard: '#14171A',
  bgCardGlass: 'rgba(20, 23, 26, 0.88)',
  bgElevated: '#1C2024',
  bgInset: '#08090B',

  // Text
  textPrimary: '#F4F5F0',
  textSecondary: '#A1A8A3',
  textMuted: '#6E7671',
  textInverse: '#0B0D0F',

  // Status — legible on dark surfaces
  success: '#4ADE80',
  successSoft: 'rgba(74, 222, 128, 0.14)',
  error: '#FF6B6B',
  errorSoft: 'rgba(255, 107, 107, 0.14)',
  warning: '#FFC24B',
  warningSoft: 'rgba(255, 194, 75, 0.14)',
  info: '#7DD3FC',
  infoSoft: 'rgba(125, 211, 252, 0.14)',

  // Borders
  border: '#232A2F',
  borderLight: '#333D44',
  borderStrong: '#46525B',

  // Platform brand colors (from shared package)
  github: '#181717',
  linkedin: '#0A66C2',
  twitter: '#000000',
  gitlab: '#FC6D26',
  devfolio: '#3770FF',
  npm: '#CB3837',
  devto: '#0A0A0A',
  hashnode: '#2962FF',
  medium: '#000000',
  leetcode: '#FFA116',
  hackerrank: '#00EA64',
  discord: '#5865F2',
  telegram: '#26A5E4',
  email: '#EA4335',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

// ─── Light mode (secondary art direction — kept fully functional) ───

export const LIGHT_COLORS: typeof COLORS = {
  ...COLORS,
  accent: '#C9FF45',
  accentLight: '#B8F52E',
  accentDark: '#8FB800',
  accentSoft: 'rgba(143, 184, 0, 0.14)',
  accentBorder: 'rgba(124, 160, 0, 0.4)',

  // On light surfaces chartreuse has insufficient contrast, so the action color
  // shifts to a deep olive while chartreuse remains the fill for solid buttons.
  primary: '#3D5A00',
  primaryLight: '#4C7000',
  primaryDark: '#2E4400',

  bgPrimary: '#F6F7F4',
  bgSecondary: '#FFFFFF',
  bgCard: '#FFFFFF',
  bgCardGlass: 'rgba(255, 255, 255, 0.9)',
  bgElevated: '#ECEEE8',
  bgInset: '#EDEFEA',

  textPrimary: '#14171A',
  textSecondary: '#5B636A',
  textMuted: '#8A9298',
  textInverse: '#0B0D0F',

  success: '#15803D',
  successSoft: 'rgba(21, 128, 61, 0.12)',
  error: '#DC2626',
  errorSoft: 'rgba(220, 38, 38, 0.12)',
  warning: '#B45309',
  warningSoft: 'rgba(180, 83, 9, 0.12)',
  info: '#0369A1',
  infoSoft: 'rgba(3, 105, 161, 0.12)',

  border: '#DDE1DA',
  borderLight: '#C9CFC6',
  borderStrong: '#AEB6AC',
  overlay: 'rgba(15, 23, 42, 0.4)',
};

// ─── Accent system ────────────────────────────────────────────────────────────
// The chosen accent drives every accent-derived token at runtime, so switching
// it recolours buttons, active states, highlights, borders and tints app-wide.

export type AccentOption = {
  id: string;
  name: string;
  hex: string;
  group: 'neutral' | 'colour';
};

// Neutrals (shades of black/grey/white) + a full colour range. The text/icon
// colour placed on a filled accent surface is derived from luminance, so dark
// accents (ink, graphite) automatically get light foregrounds.
export const ACCENT_OPTIONS: AccentOption[] = [
  { id: 'chartreuse', name: 'Chartreuse', hex: '#C9FF45', group: 'colour' },
  { id: 'white', name: 'White', hex: '#FFFFFF', group: 'neutral' },
  { id: 'silver', name: 'Silver', hex: '#D4D8DC', group: 'neutral' },
  { id: 'slate', name: 'Slate', hex: '#8B94A0', group: 'neutral' },
  { id: 'graphite', name: 'Graphite', hex: '#5A626B', group: 'neutral' },
  { id: 'ink', name: 'Ink', hex: '#2A2F35', group: 'neutral' },
  { id: 'lime', name: 'Lime', hex: '#7CFF6B', group: 'colour' },
  { id: 'green', name: 'Green', hex: '#3DDC84', group: 'colour' },
  { id: 'teal', name: 'Teal', hex: '#2DD4BF', group: 'colour' },
  { id: 'cyan', name: 'Cyan', hex: '#45E0FF', group: 'colour' },
  { id: 'blue', name: 'Blue', hex: '#4D9FFF', group: 'colour' },
  { id: 'violet', name: 'Violet', hex: '#A78BFA', group: 'colour' },
  { id: 'magenta', name: 'Magenta', hex: '#FF5CC8', group: 'colour' },
  { id: 'pink', name: 'Pink', hex: '#FF7AB6', group: 'colour' },
  { id: 'red', name: 'Red', hex: '#FF5C5C', group: 'colour' },
  { id: 'orange', name: 'Orange', hex: '#FF8A3D', group: 'colour' },
  { id: 'amber', name: 'Amber', hex: '#FFB547', group: 'colour' },
  { id: 'yellow', name: 'Yellow', hex: '#FFE24B', group: 'colour' },
];

export const DEFAULT_ACCENT = ACCENT_OPTIONS[0].hex;

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** rgba() string from a hex colour. */
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Linear blend: t=0 → a, t=1 → b. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = parseHex(a);
  const [r2, g2, b2] = parseHex(b);
  const to = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${to(r1, r2)}${to(g1, g2)}${to(b1, b2)}`;
}

/** Pick dark or light foreground text for a given background, by luminance. */
export function onColorFor(hex: string): string {
  const [r, g, b] = parseHex(hex).map(v => v / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? '#0B0D0F' : '#F4F5F0';
}

/**
 * Derive the full accent token set for a given accent + mode.
 * Dark keeps the vivid hue; light darkens `primary` so accent *text* stays
 * legible on light backgrounds while surfaces keep the vivid fill.
 */
export function deriveAccent(hex: string, isDark: boolean): {
  accent: string;
  accentLight: string;
  accentDark: string;
  accentSoft: string;
  accentBorder: string;
  primary: string;
  primaryLight: string;
  primaryDark: string;
  textOnAccent: string;
} {
  const onAccent = onColorFor(hex);
  return {
    accent: hex,
    accentLight: mix(hex, '#FFFFFF', isDark ? 0.18 : 0.1),
    accentDark: mix(hex, '#000000', 0.22),
    accentSoft: withAlpha(hex, isDark ? 0.12 : 0.16),
    accentBorder: withAlpha(hex, isDark ? 0.35 : 0.5),
    primary: isDark ? hex : mix(hex, '#000000', 0.45),
    primaryLight: isDark ? mix(hex, '#FFFFFF', 0.18) : mix(hex, '#000000', 0.35),
    primaryDark: mix(hex, '#000000', 0.22),
    textOnAccent: onAccent,
  };
}

// ─── Font families ────────────────────────────────────────────────────────────
// Uses families that ship with each platform (no remote/bundled font files).

export type FontOption = {
  id: string;
  name: string;
  android: string;
  ios: string;
};

export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', name: 'System', android: 'sans-serif', ios: 'System' },
  { id: 'medium', name: 'Medium', android: 'sans-serif-medium', ios: 'Avenir Next' },
  { id: 'condensed', name: 'Condensed', android: 'sans-serif-condensed', ios: 'Avenir Next Condensed' },
  { id: 'light', name: 'Light', android: 'sans-serif-light', ios: 'Helvetica Neue' },
  { id: 'thin', name: 'Thin', android: 'sans-serif-thin', ios: 'Helvetica Neue' },
  { id: 'black', name: 'Bold Display', android: 'sans-serif-black', ios: 'Helvetica Neue' },
  { id: 'smallcaps', name: 'Small Caps', android: 'sans-serif-smallcaps', ios: 'Copperplate' },
  { id: 'serif', name: 'Serif', android: 'serif', ios: 'Georgia' },
  { id: 'georgia', name: 'Georgia', android: 'serif', ios: 'Georgia' },
  { id: 'notoserif', name: 'Noto Serif', android: 'serif', ios: 'Times New Roman' },
  { id: 'casual', name: 'Casual', android: 'casual', ios: 'Snell Roundhand' },
  { id: 'cursive', name: 'Cursive', android: 'cursive', ios: 'Snell Roundhand' },
  { id: 'mono', name: 'Monospace', android: 'monospace', ios: 'Menlo' },
  { id: 'courier', name: 'Courier', android: 'monospace', ios: 'Courier New' },
  { id: 'helvetica', name: 'Helvetica', android: 'sans-serif', ios: 'Helvetica Neue' },
  { id: 'trebuchet', name: 'Trebuchet', android: 'sans-serif-condensed', ios: 'Trebuchet MS' },
  { id: 'verdana', name: 'Verdana', android: 'sans-serif-condensed', ios: 'Verdana' },
  { id: 'palatino', name: 'Palatino', android: 'serif', ios: 'Palatino' },
];

export const DEFAULT_FONT = FONT_OPTIONS[0].id;

export function resolveFontFamilies(fontId: string): { sans: string; display: string; mono: string } {
  const option = FONT_OPTIONS.find(f => f.id === fontId) ?? FONT_OPTIONS[0];
  const family = Platform.select({ ios: option.ios, android: option.android, default: option.android }) as string;
  const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string;
  return { sans: family, display: family, mono };
}

// ─── Spacing scale ───

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ─── Radii ───

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

// Alias — preferred name for new code.
export const RADIUS = BORDER_RADIUS;

// ─── Font sizes (legacy scale — preserved for existing call sites) ───

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
};

// ─── Typography ───

const SANS = Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' });
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const FONT_FAMILY = {
  sans: SANS,
  mono: MONO,
  // Heavier system weights for display headlines.
  display: SANS,
} as const;

type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600' | '700' | '800' | '900';
  letterSpacing: number;
  lineHeight: number;
};

export const TYPOGRAPHY = {
  /** Oversized editorial page headline. */
  display: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.4,
    lineHeight: 53,
  },
  h1: {
    fontFamily: SANS,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 42,
  },
  h2: {
    fontFamily: SANS,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 35,
  },
  h3: {
    fontFamily: SANS,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  title: {
    fontFamily: SANS,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 26,
  },
  body: {
    fontFamily: SANS,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 23,
  },
  bodyStrong: {
    fontFamily: SANS,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 23,
  },
  label: {
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  /** Compact uppercase section marker. */
  eyebrow: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    lineHeight: 15,
  },
  caption: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
    lineHeight: 17,
  },
  /** Monospaced handle / technical identifier. */
  mono: {
    fontFamily: MONO,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0,
    lineHeight: 19,
  },
  monoLarge: {
    fontFamily: MONO,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 23,
  },
  button: {
    fontFamily: SANS,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 21,
  },
} satisfies Record<string, TypeStyle>;

export type TypographyVariant = keyof typeof TYPOGRAPHY;

// ─── Icon sizes ───

export const ICON_SIZE = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 28,
  xl: 36,
  hero: 48,
};

// ─── Elevation ───

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  button: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  /** Soft chartreuse halo for the primary action. Used sparingly. */
  accent: {
    shadowColor: '#C9FF45',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const ELEVATION = SHADOWS;

// ─── Layout constants ───

export const LAYOUT = {
  screenPadding: SPACING.lg,
  maxContentWidth: 640,
  /** Minimum accessible touch target. */
  minTouchTarget: 48,
  tabBarHeight: 64,
  /** Extra top breathing room below the safe area on every screen. */
  topOffset: 15,
};
