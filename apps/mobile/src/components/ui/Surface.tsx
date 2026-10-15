// ─── Surface ──────────────────────────────────────────────────────────────────
// The one container primitive. Keeps corner radii, borders and elevation
// consistent everywhere instead of per-screen StyleSheet copies.

import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle, ViewProps, StyleProp } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, SPACING, SHADOWS } from '../../theme/tokens';

type SurfaceVariant = 'default' | 'elevated' | 'inset' | 'accent' | 'outline';

type Props = ViewProps & {
  variant?: SurfaceVariant;
  radius?: keyof typeof BORDER_RADIUS;
  padding?: keyof typeof SPACING;
  onPress?: () => void;
  elevation?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const Surface: React.FC<Props> = ({
  variant = 'default',
  radius = 'lg',
  padding = 'md',
  onPress,
  elevation = false,
  style,
  children,
  ...rest
}) => {
  const { colors } = useTheme();

  const bg: Record<SurfaceVariant, string> = {
    default: colors.bgCard,
    elevated: colors.bgElevated,
    inset: colors.bgInset ?? colors.bgPrimary,
    accent: colors.accentSoft,
    outline: 'transparent',
  };
  const border: Record<SurfaceVariant, string> = {
    default: colors.border,
    elevated: colors.border,
    inset: colors.border,
    accent: colors.accentBorder,
    outline: colors.border,
  };

  const composed: StyleProp<ViewStyle>[] = [
    styles.base,
    {
      backgroundColor: bg[variant],
      borderColor: border[variant],
      borderRadius: BORDER_RADIUS[radius],
      padding: SPACING[padding],
    },
    elevation ? SHADOWS.card : undefined,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [...composed, pressed ? { opacity: 0.9 } : null]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View style={composed} {...rest}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: { borderWidth: 1, overflow: 'hidden' },
});

export default Surface;
