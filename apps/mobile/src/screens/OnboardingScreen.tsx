import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { authPalette } from '../theme/authTheme';
import { AuthHero } from '../components/AuthHero';
import { AppText, Icon } from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthStack';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: Props) {
  const { isDark } = useTheme();
  const p = authPalette(isDark);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Hero takes the upper ~55% of the screen, clamped so short devices keep
  // enough room for the panel and tall devices don't overflow.
  const heroHeight = Math.max(260, Math.min(Math.round(height * 0.55), 460));

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* ── Hero ── */}
      <View style={{ height: heroHeight }}>
        <AuthHero height={heroHeight} palette={p} isDark={isDark} />

        <View style={[styles.brandRow, { top: insets.top + SPACING.sm }]} pointerEvents="none">
          <View style={[styles.brandMark, { backgroundColor: p.heroInk }]}>
            <Icon name="lightning-bolt" size={14} color={isDark ? '#0B0D0F' : '#FFFFFF'} />
          </View>
          <AppText variant="eyebrow" color={p.heroInk} style={styles.brandText}>
            DEVCARD
          </AppText>
        </View>
      </View>

      {/* ── Panel ── */}
      <View
        style={[
          styles.panel,
          { backgroundColor: p.surface, borderColor: p.border, marginTop: -28 },
        ]}>
        <ScrollView
          contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + SPACING.lg }]}
          showsVerticalScrollIndicator={false}>
          <AppText variant="display" align="center" color={p.text} style={styles.headline}>
            One tap.{'\n'}
            <AppText variant="display" color={p.accent}>
              Every profile.
            </AppText>
          </AppText>

          <AppText variant="body" align="center" color={p.textSecondary} style={styles.subtitle}>
            Build one DevCard and share every platform you create on — GitHub, LinkedIn, X and more.
          </AppText>

          <View style={styles.spacer} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Get started"
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: p.buttonBg,
                opacity: pressed ? 0.88 : 1,
              },
            ]}>
            <AppText variant="button" color={p.buttonText}>
              Get Started
            </AppText>
            <Icon
              name="arrow-right"
              size={18}
              color={p.buttonText}
              style={styles.primaryBtnIcon}
            />
          </Pressable>

          <AppText variant="caption" align="center" color={p.textMuted} style={styles.footnote}>
            Privacy-first · Built for developers
          </AppText>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brandRow: {
    position: 'absolute',
    left: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { marginLeft: SPACING.sm, letterSpacing: 3 },
  panel: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  panelContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
    alignItems: 'center',
  },
  headline: {
    fontSize: 40,
    lineHeight: 46,
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  subtitle: {
    marginTop: SPACING.md,
    maxWidth: 300,
  },
  spacer: { flexGrow: 1, minHeight: SPACING.xl },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 56,
    borderRadius: BORDER_RADIUS.full,
  },
  primaryBtnIcon: { marginLeft: SPACING.sm },
  footnote: { marginTop: SPACING.md },
});
