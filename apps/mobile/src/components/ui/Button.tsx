// ─── Button ───────────────────────────────────────────────────────────────────
// Consistent primary / accent / secondary / tertiary / destructive / ghost
// actions with shared pressed, disabled and loading behaviour.

import React from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, SPACING, LAYOUT, SHADOWS } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const HEIGHT: Record<ButtonSize, number> = { sm: 40, md: 50, lg: 56 };
const PAD_X: Record<ButtonSize, number> = { sm: SPACING.md, md: SPACING.lg, lg: SPACING.xl };

export const Button: React.FC<Props> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
}) => {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: colors.accent, fg: colors.textInverse, border: 'transparent' },
    secondary: { bg: colors.bgElevated, fg: colors.textPrimary, border: colors.border },
    tertiary: { bg: 'transparent', fg: colors.textPrimary, border: colors.border },
    destructive: { bg: 'transparent', fg: colors.error, border: colors.error },
    ghost: { bg: 'transparent', fg: colors.textSecondary, border: 'transparent' },
  }[variant];

  const fg = isDisabled ? colors.textMuted : palette.fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={label}
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PAD_X[size],
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: BORDER_RADIUS.md,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        variant === 'primary' && !isDisabled ? SHADOWS.accent : null,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={18} color={fg} style={styles.iconLeft} /> : null}
          <AppText variant={size === 'sm' ? 'label' : 'button'} color={fg} numberOfLines={1}>
            {label}
          </AppText>
          {iconRight ? <Icon name={iconRight} size={18} color={fg} style={styles.iconRight} /> : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: LAYOUT.minTouchTarget - 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: SPACING.sm },
  iconRight: { marginLeft: SPACING.sm },
});

export default Button;
