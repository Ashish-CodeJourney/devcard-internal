// ─── Pill / Badge / StatusDot ─────────────────────────────────────────────────
// Small status surfaces. Status is never communicated by color alone — every
// pill carries a label and/or glyph.

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, SPACING } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

export type PillTone = 'neutral' | 'accent' | 'success' | 'error' | 'warning' | 'info';

type PillProps = {
  label: string;
  tone?: PillTone;
  icon?: IconName;
  solid?: boolean;
  onPress?: () => void;
  style?: any;
};

export const Pill: React.FC<PillProps> = ({ label, tone = 'neutral', icon, solid, onPress, style }) => {
  const { colors } = useTheme();

  const map: Record<PillTone, { bg: string; border: string; fg: string }> = {
    neutral: { bg: colors.bgElevated, border: colors.border, fg: colors.textSecondary },
    accent: { bg: colors.accentSoft, border: colors.accentBorder, fg: colors.accent },
    success: { bg: colors.successSoft, border: 'transparent', fg: colors.success },
    error: { bg: colors.errorSoft, border: 'transparent', fg: colors.error },
    warning: { bg: colors.warningSoft, border: 'transparent', fg: colors.warning },
    info: { bg: colors.infoSoft, border: 'transparent', fg: colors.info },
  };
  const c = map[tone];
  const bg = solid ? (tone === 'accent' ? colors.accent : colors.bgElevated) : c.bg;
  const fg = solid ? (tone === 'accent' ? colors.textInverse : colors.textPrimary) : c.fg;

  const content = (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: solid ? 'transparent' : c.border }, style]}>
      {icon ? <Icon name={icon} size={12} color={fg} style={styles.icon} /> : null}
      <AppText variant="eyebrow" color={fg}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
        {content}
      </Pressable>
    );
  }
  return content;
};

export const StatusDot: React.FC<{ tone?: PillTone; size?: number }> = ({ tone = 'neutral', size = 8 }) => {
  const { colors } = useTheme();
  const map: Record<PillTone, string> = {
    neutral: colors.textMuted,
    accent: colors.accent,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: map[tone] }} />;
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  icon: { marginRight: SPACING.xxs + 2 },
});

export default Pill;
