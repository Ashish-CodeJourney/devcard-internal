// ─── Screen + AppBar ──────────────────────────────────────────────────────────
// Standard page chrome: themed background, safe-area handling and a consistent
// app bar with optional back, eyebrow, title and right-hand action.

import React from 'react';
import { View, StyleSheet, Pressable, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, LAYOUT, BORDER_RADIUS } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

type ScreenProps = {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  style?: ViewStyle;
  padded?: boolean;
};

export const Screen: React.FC<ScreenProps> = ({ children, edges = ['top'], style, padded = false }) => {
  const { colors, isDark } = useTheme();
  const hasTopInset = edges.includes('top');
  return (
    <SafeAreaView
      edges={edges}
      style={[
        styles.screen,
        { backgroundColor: colors.bgPrimary },
        hasTopInset ? { paddingTop: LAYOUT.topOffset } : null,
        padded ? { paddingHorizontal: LAYOUT.screenPadding } : null,
        style,
      ]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bgPrimary}
      />
      {children}
    </SafeAreaView>
  );
};

type AppBarProps = {
  title?: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: { icon: IconName; onPress: () => void; label?: string };
  large?: boolean;
  style?: ViewStyle;
};

export const AppBar: React.FC<AppBarProps> = ({ title, eyebrow, onBack, right, large, style }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top > 0 ? SPACING.sm : SPACING.md, borderBottomColor: colors.border },
        style,
      ]}>
      <View style={styles.barRow}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <Icon name="chevron-left" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : null}
        <View style={styles.barTitleWrap}>
          {eyebrow ? (
            <AppText variant="eyebrow" tone="muted" numberOfLines={1}>
              {eyebrow.toUpperCase()}
            </AppText>
          ) : null}
          {title ? (
            <AppText variant={large ? 'h1' : 'h3'} numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
        </View>
        {right ? (
          <Pressable
            onPress={right.onPress}
            accessibilityRole="button"
            accessibilityLabel={right.label ?? 'Action'}
            hitSlop={10}
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <Icon name={right.icon} size={20} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { paddingHorizontal: LAYOUT.screenPadding, paddingBottom: SPACING.md, borderBottomWidth: 0 },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barTitleWrap: { flex: 1, marginLeft: SPACING.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Screen;
