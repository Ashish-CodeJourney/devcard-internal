import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  COLORS,
  LIGHT_COLORS,
  DEFAULT_ACCENT,
  DEFAULT_BACKGROUND,
  DEFAULT_FONT,
  deriveAccent,
  deriveSurfaces,
  isDarkColor,
  resolveFont,
  withAlpha,
} from '../theme/tokens';

type Theme = 'light' | 'dark';

const ACCENT_KEY = 'devcard.theme.accent';
const BACKGROUND_KEY = 'devcard.theme.background';
const FONT_KEY = 'devcard.theme.font';
const MODE_KEY = 'devcard.theme.mode';
const LEGACY_KEY = 'devcard-theme';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setMode: (mode: Theme) => void;
  isDark: boolean;
  mode: Theme;
  accentColor: string;
  backgroundColor: string;
  fontId: string;
  setAccentColor: (hex: string) => void;
  setBackgroundColor: (hex: string) => void;
  setFontId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): { accent: string; background: string; font: string } {
  if (typeof window === 'undefined') {
    return { accent: DEFAULT_ACCENT, background: DEFAULT_BACKGROUND, font: DEFAULT_FONT };
  }
  const get = (k: string) => {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  };
  let background = get(BACKGROUND_KEY);
  if (!background) {
    // Migrate installs that only ever stored the dark/light mode; otherwise
    // follow the mobile default (dark obsidian canvas).
    const legacy = get(LEGACY_KEY);
    const dark = legacy ? legacy === 'dark' : true;
    background = dark ? COLORS.bgPrimary : LIGHT_COLORS.bgPrimary;
  }
  return {
    accent: get(ACCENT_KEY) ?? DEFAULT_ACCENT,
    background,
    font: get(FONT_KEY) ?? DEFAULT_FONT,
  };
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode — theme just won't persist.
  }
}

function applyCssVars(accentColor: string, backgroundColor: string, fontId: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark = isDarkColor(backgroundColor);
  const base = dark ? COLORS : LIGHT_COLORS;
  const accent = deriveAccent(accentColor, dark);
  const surfaces = deriveSurfaces(backgroundColor, dark);
  const font = resolveFont(fontId);

  const set = (name: string, value: string) => root.style.setProperty(name, value);

  set('--accent', accent.accent);
  set('--accent-soft', accent.accentSoft);
  set('--accent-border', accent.accentBorder);
  set('--primary', accent.primary);
  set('--primary-glow', withAlpha(accentColor, 0.4));
  set('--on-accent', accent.onAccent);

  set('--bg-primary', backgroundColor);
  set('--bg-page', backgroundColor);
  set('--bg-secondary', surfaces.bgSecondary);
  set('--bg-card', surfaces.bgCard);
  set('--bg-glass', surfaces.bgCard);
  set('--bg-elevated', surfaces.bgElevated);

  set('--text-primary', dark ? base.textPrimary : base.textPrimary);
  set('--text-secondary', surfaces.textSecondary);
  set('--text-muted', surfaces.textMuted);

  set('--border', surfaces.border);
  set('--border-glass', surfaces.border);

  set('--font-sans', font.sans);
  set('--font-display', font.display);
  set('--font-mono', font.mono);

  if (dark) root.classList.add('dark');
  else root.classList.remove('dark');
  persist(MODE_KEY, dark ? 'dark' : 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(readStored);
  const [accentColor, setAccentState] = useState<string>(initial.accent);
  const [backgroundColor, setBackgroundState] = useState<string>(initial.background);
  const [fontId, setFontState] = useState<string>(initial.font);

  const isDark = useMemo(() => isDarkColor(backgroundColor), [backgroundColor]);
  const mode: Theme = isDark ? 'dark' : 'light';

  useEffect(() => {
    applyCssVars(accentColor, backgroundColor, fontId);
  }, [accentColor, backgroundColor, fontId]);

  const setMode = (next: Theme) => {
    setBackgroundState(next === 'dark' ? COLORS.bgPrimary : LIGHT_COLORS.bgPrimary);
  };

  const toggleTheme = () => {
    setMode(isDark ? 'light' : 'dark');
  };

  const setAccentColor = (hex: string) => {
    setAccentState(hex);
    persist(ACCENT_KEY, hex);
  };

  const setBackgroundColor = (hex: string) => {
    setBackgroundState(hex);
    persist(BACKGROUND_KEY, hex);
  };

  const setFontId = (id: string) => {
    setFontState(id);
    persist(FONT_KEY, id);
  };

  // Persist canvas selections (accent/font persist in their setters).
  useEffect(() => {
    persist(BACKGROUND_KEY, backgroundColor);
  }, [backgroundColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme: mode,
        toggleTheme,
        setMode,
        isDark,
        mode,
        accentColor,
        backgroundColor,
        fontId,
        setAccentColor,
        setBackgroundColor,
        setFontId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
