// ─── Avatar ───────────────────────────────────────────────────────────────────
// Initials/image avatar with optional accent ring. Uses the accent color for the
// fallback fill so identity reads clearly against dark surfaces.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { FONT_FAMILY } from '../../theme/tokens';

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
  ring?: boolean;
  ringColor?: string;
  style?: any;
};

export const Avatar: React.FC<Props> = ({ uri, name, size = 48, ring = false, ringColor, style }) => {
  const { colors } = useTheme();
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.charAt(0))
    .join('')
    .toUpperCase();

  const box = { width: size, height: size, borderRadius: size / 2 };
  const RING_BORDER = 2;
  const RING_PAD = 2;
  // The ring wrapper must itself be circular, otherwise its border renders as a
  // square around the round avatar.
  const ringStyle = ring
    ? {
        borderWidth: RING_BORDER,
        borderColor: ringColor ?? colors.accent,
        padding: RING_PAD,
        borderRadius: (size + (RING_PAD + RING_BORDER) * 2) / 2,
      }
    : undefined;

  return (
    <View style={ringStyle}>
      {uri ? (
        <Image source={{ uri }} style={[box, style]} />
      ) : (
        <View style={[box, styles.fallback, { backgroundColor: colors.bgElevated }, style]}>
          <Text style={[styles.initials, { color: colors.accent, fontSize: Math.round(size * 0.36) }]}>
            {initials}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: FONT_FAMILY.sans, fontWeight: '800' },
});

export default Avatar;
