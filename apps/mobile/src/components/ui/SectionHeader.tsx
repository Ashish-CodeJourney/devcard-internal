// ─── SectionHeader / Divider ──────────────────────────────────────────────────
// Section markers use a compact uppercase eyebrow + optional trailing action,
// which is the core editorial rhythm of the design system.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';
import { Pressable } from 'react-native';

type Props = {
  title: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  style?: any;
};

export const SectionHeader: React.FC<Props> = ({ title, action, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, style]}>
      <View style={styles.titleRow}>
        <View style={[styles.tick, { backgroundColor: colors.accent }]} />
        <AppText variant="eyebrow" tone="secondary">
          {title.toUpperCase()}
        </AppText>
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={8}
          style={styles.action}>
          {action.icon ? <Icon name={action.icon} size={15} color={colors.accent} /> : null}
          <AppText variant="label" tone="accent" style={styles.actionText}>
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

export const Divider: React.FC<{ inset?: boolean; style?: any }> = ({ inset, style }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.border, marginLeft: inset ? SPACING.md : 0 },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  tick: { width: 3, height: 12, borderRadius: BORDER_RADIUS.full, marginRight: SPACING.sm },
  action: { flexDirection: 'row', alignItems: 'center' },
  actionText: { marginLeft: SPACING.xxs },
  divider: { height: StyleSheet.hairlineWidth },
});

export default SectionHeader;
