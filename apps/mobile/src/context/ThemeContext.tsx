import React, { createContext, useContext, ReactNode, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COLORS,
  LIGHT_COLORS,
  DEFAULT_ACCENT,
  DEFAULT_FONT,
  deriveAccent,
  resolveFontFamilies,
} from '../theme/tokens';

const THEME_KEY = 'devcard.theme.mode';
const ACCENT_KEY = 'devcard.theme.accent';
const FONT_KEY = 'devcard.theme.font';
type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  colors: typeof COLORS;
  fonts: { sans: string; display: string; mono: string };
  isDark: boolean;
  mode: ThemeMode;
  accentColor: string;
  fontId: string;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setAccentColor: (hex: string) => Promise<void>;
  setFontId: (id: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  colors: COLORS,
  fonts: resolveFontFamilies(DEFAULT_FONT),
  isDark: true,
  mode: 'dark',
  accentColor: DEFAULT_ACCENT,
  fontId: DEFAULT_FONT,
  setMode: async () => {},
  toggleTheme: async () => {},
  setAccentColor: async () => {},
  setFontId: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accentColor, setAccentState] = useState<string>(DEFAULT_ACCENT);
  const [fontId, setFontState] = useState<string>(DEFAULT_FONT);

  useEffect(() => {
    AsyncStorage.multiGet([THEME_KEY, ACCENT_KEY, FONT_KEY])
      .then(pairs => {
        const stored = Object.fromEntries(pairs);
        if (stored[THEME_KEY] === 'light' || stored[THEME_KEY] === 'dark') {
          setModeState(stored[THEME_KEY]);
        }
        if (stored[ACCENT_KEY]) setAccentState(stored[ACCENT_KEY]);
        if (stored[FONT_KEY]) setFontState(stored[FONT_KEY]);
      })
      .catch(() => {});
  }, []);

  const setMode = async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(THEME_KEY, nextMode);
  };

  const toggleTheme = async () => {
    await setMode(mode === 'dark' ? 'light' : 'dark');
  };

  const setAccentColor = async (hex: string) => {
    setAccentState(hex);
    await AsyncStorage.setItem(ACCENT_KEY, hex);
  };

  const setFontId = async (id: string) => {
    setFontState(id);
    await AsyncStorage.setItem(FONT_KEY, id);
  };

  // The accent is applied on top of the active base palette so every derived
  // token (buttons, active tabs, borders, tints, badges) recolours together.
  const colors = useMemo(() => {
    const base = mode === 'dark' ? COLORS : LIGHT_COLORS;
    const accent = deriveAccent(accentColor, mode === 'dark');
    return {
      ...base,
      ...accent,
      // Solid accent surfaces take the contrast-appropriate ink.
      textInverse: accent.textOnAccent,
    } as typeof COLORS;
  }, [mode, accentColor]);

  const fonts = useMemo(() => resolveFontFamilies(fontId), [fontId]);

  return (
    <ThemeContext.Provider
      value={{
        colors,
        fonts,
        isDark: mode === 'dark',
        mode,
        accentColor,
        fontId,
        setMode,
        toggleTheme,
        setAccentColor,
        setFontId,
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
