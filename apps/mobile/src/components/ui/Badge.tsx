// ─── Badge ────────────────────────────────────────────────────────────────────
// Small identity/label badge (role, status, count). Deliberately has no
// "verified" variant — the platform verification system does not exist yet, so
// the UI must not imply it does.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, SPACING } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

type Props = {
  label: string;
  icon?: IconName;
  tone?: 'neutral' | 'accent' | 'warning';
  style?: any;
};

export const Badge: React.FC<Props> = ({ label, icon, tone = 'neutral', style }) => {
  const { colors } = useTheme();
  const fg = tone === 'accent' ? colors.accent : tone === 'warning' ? colors.warning : colors.textSecondary;
  const bg = tone === 'accent' ? colors.accentSoft : tone === 'warning' ? colors.warningSoft : colors.bgElevated;

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: colors.border }, style]}>
      {icon ? <Icon name={icon} size={11} color={fg} style={styles.icon} /> : null}
      <AppText variant="eyebrow" color={fg}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  icon: { marginRight: SPACING.xxs + 2 },
});

export default Badge;
