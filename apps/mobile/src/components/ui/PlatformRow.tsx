// ─── PlatformRow ──────────────────────────────────────────────────────────────
// The canonical row for a platform link. Used by profile, links and card views
// so the same entity always looks the same everywhere.

import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName, platformIcon } from './Icon';

type Action = {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'default' | 'accent' | 'danger';
};

type Props = {
  platform: string;
  platformName: string;
  username: string;
  brandColor?: string;
  onPress?: () => void;
  actions?: Action[];
  right?: React.ReactNode;
  disabled?: boolean;
};

export const PlatformRow: React.FC<Props> = ({
  platform,
  platformName,
  username,
  brandColor,
  onPress,
  actions,
  right,
  disabled,
}) => {
  const { colors } = useTheme();

  const body = (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Icon name={platformIcon(platform)} size={20} color={brandColor ?? colors.textPrimary} />
      </View>

      <View style={styles.text}>
        <AppText variant="title" numberOfLines={1}>
          {platformName}
        </AppText>
        <AppText variant="mono" tone="secondary" numberOfLines={1} style={styles.handle}>
          @{username}
        </AppText>
      </View>

      {actions?.length ? (
        <View style={styles.actions}>
          {actions.map(a => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              hitSlop={6}
              style={[
                styles.actionBtn,
                { borderColor: colors.border, backgroundColor: colors.bgSecondary },
                a.tone === 'accent' ? { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft } : null,
              ]}>
              <Icon
                name={a.icon}
                size={17}
                color={a.tone === 'danger' ? colors.error : a.tone === 'accent' ? colors.accent : colors.textSecondary}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {right}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {body}
      </Pressable>
    );
  }
  return body;
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.sm },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, marginLeft: SPACING.md },
  handle: { marginTop: 1 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
});

export default PlatformRow;
