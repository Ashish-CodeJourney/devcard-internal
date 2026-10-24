// ─── DevCard web design tokens ────────────────────────────────────────────────
// Ported from the mobile theme (apps/mobile/src/theme/tokens.ts): dark-first
// editorial canvas, one vivid accent used sparingly, user-selectable accent /
// background / font. Helpers are identical so both clients derive colors the
// same way.

export const COLORS = {
  // Accent — electric chartreuse. `primary` is the action color (legible text
  // on light surfaces); `accent` is the vivid fill.
  accent: '#C9FF45',
  accentLight: '#DAFF7A',
  accentDark: '#9FCC22',
  accentSoft: 'rgba(201, 255, 69, 0.12)',
  accentBorder: 'rgba(201, 255, 69, 0.35)',

  primary: '#C9FF45',
  primaryLight: '#DAFF7A',
  primaryDark: '#9FCC22',

  bgPrimary: '#0B0D0F',
  bgSecondary: '#14171A',
  bgCard: '#14171A',
  bgCardGlass: 'rgba(20, 23, 26, 0.88)',
  bgElevated: '#1C2024',
  bgInset: '#08090B',

  textPrimary: '#F4F5F0',
  textSecondary: '#A1A8A3',
  textMuted: '#6E7671',
  textInverse: '#0B0D0F',

  success: '#4ADE80',
  error: '#FF6B6B',
  warning: '#FFC24B',
  info: '#7DD3FC',

  border: '#232A2F',
  borderLight: '#333D44',
  borderStrong: '#46525B',
};

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
  error: '#DC2626',
  warning: '#B45309',
  info: '#0369A1',

  border: '#DDE1DA',
  borderLight: '#C9CFC6',
  borderStrong: '#AEB6AC',
};

// ─── Accent system ────────────────────────────────────────────────────────────

export interface AccentOption {
  id: string;
  name: string;
  hex: string;
  group: 'neutral' | 'colour';
}

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

/** True when a colour is perceptually dark (mirrors onColorFor's threshold). */
export function isDarkColor(hex: string): boolean {
  const [r, g, b] = parseHex(hex).map(v => v / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) <= 0.45;
}

export interface DerivedAccent {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  primary: string;
  onAccent: string;
}

/**
 * Derive the action tokens for a given accent + mode.
 * Dark keeps the vivid hue; light darkens `primary` so accent *text* stays
 * legible on light backgrounds while surfaces keep the vivid fill.
 */
export function deriveAccent(hex: string, isDark: boolean): DerivedAccent {
  return {
    accent: hex,
    accentSoft: withAlpha(hex, isDark ? 0.12 : 0.16),
    accentBorder: withAlpha(hex, isDark ? 0.35 : 0.5),
    primary: isDark ? hex : mix(hex, '#000000', 0.45),
    onAccent: onColorFor(hex),
  };
}

// ─── Background system ──────────────────────────────────────────────────────

export interface BackgroundOption {
  id: string;
  name: string;
  hex: string;
  group: 'dark' | 'light';
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: 'obsidian', name: 'Obsidian', hex: '#0B0D0F', group: 'dark' },
  { id: 'black', name: 'Pure Black', hex: '#000000', group: 'dark' },
  { id: 'charcoal', name: 'Charcoal', hex: '#16191D', group: 'dark' },
  { id: 'graphite', name: 'Graphite', hex: '#22272D', group: 'dark' },
  { id: 'midnight', name: 'Midnight', hex: '#0A1220', group: 'dark' },
  { id: 'navy', name: 'Navy', hex: '#0C1826', group: 'dark' },
  { id: 'plum', name: 'Plum', hex: '#160B1D', group: 'dark' },
  { id: 'vine', name: 'Vine', hex: '#0A150F', group: 'dark' },
  { id: 'wine', name: 'Wine', hex: '#1A0D12', group: 'dark' },
  { id: 'espresso', name: 'Espresso', hex: '#170F0A', group: 'dark' },
  { id: 'canvas', name: 'Canvas', hex: '#F6F7F4', group: 'light' },
  { id: 'paper', name: 'Paper', hex: '#FFFFFF', group: 'light' },
  { id: 'fog', name: 'Fog', hex: '#E7EAE5', group: 'light' },
  { id: 'sand', name: 'Sand', hex: '#F5EFE3', group: 'light' },
  { id: 'mist', name: 'Mist', hex: '#EAF0F6', group: 'light' },
  { id: 'blush', name: 'Blush', hex: '#F8ECEF', group: 'light' },
];

export const DEFAULT_BACKGROUND = COLORS.bgPrimary;

export interface DerivedSurfaces {
  bgSecondary: string;
  bgCard: string;
  bgElevated: string;
  textSecondary: string;
  textMuted: string;
  border: string;
}

/**
 * Derive the neutral ramp for a canvas colour. Returns {} for the built-in
 * palettes so the default look is unchanged.
 */
export function deriveSurfaces(baseHex: string, isDark: boolean): DerivedSurfaces {
  const builtin = isDark ? COLORS : LIGHT_COLORS;
  if (baseHex.toLowerCase() === builtin.bgPrimary.toLowerCase()) {
    return {
      bgSecondary: builtin.bgSecondary,
      bgCard: builtin.bgCard,
      bgElevated: builtin.bgElevated,
      textSecondary: builtin.textSecondary,
      textMuted: builtin.textMuted,
      border: builtin.border,
    };
  }

  const up = (t: number) => mix(baseHex, '#FFFFFF', t);
  const down = (t: number) => mix(baseHex, '#000000', t);
  const card = isDark ? up(0.04) : '#FFFFFF';

  return {
    bgSecondary: card,
    bgCard: card,
    bgElevated: isDark ? up(0.08) : down(0.05),
    textSecondary: isDark ? mix(baseHex, '#FFFFFF', 0.62) : mix(baseHex, '#000000', 0.6),
    textMuted: isDark ? mix(baseHex, '#FFFFFF', 0.42) : mix(baseHex, '#000000', 0.45),
    border: isDark ? up(0.12) : down(0.12),
  };
}

// ─── Font families (web stacks) ─────────────────────────────────────────────

export interface FontOption {
  id: string;
  name: string;
  sans: string;
  display: string;
  mono: string;
}

const SYSTEM_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const SYSTEM_MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

export const FONT_OPTIONS: FontOption[] = [
  { id: 'system', name: 'System', sans: SYSTEM_SANS, display: SYSTEM_SANS, mono: SYSTEM_MONO },
  { id: 'inter', name: 'Inter', sans: "'Inter', system-ui, sans-serif", display: "'Inter', system-ui, sans-serif", mono: SYSTEM_MONO },
  { id: 'outfit', name: 'Outfit', sans: "'Inter', system-ui, sans-serif", display: "'Outfit', system-ui, sans-serif", mono: SYSTEM_MONO },
  { id: 'serif', name: 'Serif', sans: 'Georgia, serif', display: 'Georgia, serif', mono: SYSTEM_MONO },
  { id: 'mono', name: 'Monospace', sans: SYSTEM_MONO, display: SYSTEM_MONO, mono: SYSTEM_MONO },
];

export const DEFAULT_FONT = FONT_OPTIONS[0].id;

export function resolveFont(id: string): FontOption {
  return FONT_OPTIONS.find(f => f.id === id) ?? FONT_OPTIONS[0];
}

// ─── Spacing / radii (mirror the mobile scale) ───────────────────────────────

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

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};
