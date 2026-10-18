import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORS,
  LIGHT_COLORS,
  DEFAULT_ACCENT,
  DEFAULT_BACKGROUND,
  DEFAULT_FONT,
  deriveAccent,
  deriveSurfaces,
  isDarkColor,
  resolveFontFamilies,
} from '../theme/tokens';

const THEME_KEY = 'devcard.theme.mode';
const ACCENT_KEY = 'devcard.theme.accent';
const FONT_KEY = 'devcard.theme.font';
const BACKGROUND_KEY = 'devcard.theme.background';
type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  colors: typeof COLORS;
  fonts: { sans: string; display: string; mono: string };
  isDark: boolean;
  mode: ThemeMode;
  accentColor: string;
  backgroundColor: string;
  fontId: string;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setAccentColor: (hex: string) => Promise<void>;
  setBackgroundColor: (hex: string) => Promise<void>;
  setFontId: (id: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  fonts: resolveFontFamilies(DEFAULT_FONT),
  isDark: true,
  mode: 'dark',
  accentColor: DEFAULT_ACCENT,
  backgroundColor: DEFAULT_BACKGROUND,
  fontId: DEFAULT_FONT,
  setMode: async () => {},
  toggleTheme: async () => {},
  setAccentColor: async () => {},
  setBackgroundColor: async () => {},
  setFontId: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [backgroundColor, setBackgroundState] = useState<string>(DEFAULT_BACKGROUND);
  const [fontId, setFontState] = useState<string>(DEFAULT_FONT);

  useEffect(() => {
    AsyncStorage.multiGet([THEME_KEY, ACCENT_KEY, FONT_KEY, BACKGROUND_KEY])
      .then(pairs => {
        const stored = Object.fromEntries(pairs);
        if (stored[BACKGROUND_KEY]) {
          setBackgroundState(stored[BACKGROUND_KEY]);
        } else if (stored[THEME_KEY] === 'light') {
          // Migrate installs that only ever stored the dark/light mode.
          setBackgroundState(LIGHT_COLORS.bgPrimary);
        }
        if (stored[ACCENT_KEY]) setAccentState(stored[ACCENT_KEY]);
        if (stored[FONT_KEY]) setFontState(stored[FONT_KEY]);
      })
      .catch(() => {});
  }, []);

  // The canvas determines light/dark, so the mode is derived rather than stored
  // separately — choosing a background and flipping the theme can never diverge.
  const isDark = useMemo(() => isDarkColor(backgroundColor), [backgroundColor]);
  const mode: ThemeMode = isDark ? 'dark' : 'light';

  const setMode = async (nextMode: ThemeMode) => {
    const next = nextMode === 'dark' ? COLORS.bgPrimary : LIGHT_COLORS.bgPrimary;
    setBackgroundState(next);
    await AsyncStorage.multiSet([[THEME_KEY, nextMode], [BACKGROUND_KEY, next]]);
  };

  const toggleTheme = async () => {
    await setMode(isDark ? 'light' : 'dark');
  };

  const setAccentColor = async (hex: string) => {
    setAccentState(hex);
    await AsyncStorage.setItem(ACCENT_KEY, hex);
  };

  const setBackgroundColor = async (hex: string) => {
    setBackgroundState(hex);
    await AsyncStorage.multiSet([
      [BACKGROUND_KEY, hex],
      [THEME_KEY, isDarkColor(hex) ? 'dark' : 'light'],
    ]);
  };

  const setFontId = async (id: string) => {
    setFontState(id);
    await AsyncStorage.setItem(FONT_KEY, id);
  };

  // The accent and the canvas are applied on top of the active base palette so
  // every derived token (buttons, active tabs, borders, tints, badges, surfaces)
  // recolours together.
  const colors = useMemo(() => {
    const dark = isDarkColor(backgroundColor);
    const base = dark ? COLORS : LIGHT_COLORS;
    const accent = deriveAccent(accentColor, dark);
    return {
      ...base,
      ...deriveSurfaces(backgroundColor, dark),
      ...accent,
      // Solid accent surfaces take the contrast-appropriate ink.
      textInverse: accent.textOnAccent,
    } as typeof COLORS;
  }, [backgroundColor, accentColor]);

  const fonts = useMemo(() => resolveFontFamilies(fontId), [fontId]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        fonts,
        isDark,
        mode,
        accentColor,
        backgroundColor,
        fontId,
        setMode,
        toggleTheme,
        setAccentColor,
        setBackgroundColor,
        setFontId,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
