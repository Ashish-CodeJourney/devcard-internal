import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AppText, Icon } from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';

/**
 * SplashScreen — branded loading screen shown during auth token hydration.
 * Pulsing accent mark, no external dependencies.
 */
export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const { colors } = useTheme();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.04, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.92, duration: 800, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <Animated.View
        style={[
          styles.mark,
          { borderColor: colors.accentBorder, backgroundColor: colors.bgCard, opacity, transform: [{ scale }] },
        ]}>
        <Icon name="lightning-bolt" size={44} color={colors.accent} />
      </Animated.View>
      <View style={styles.wordmarkRow}>
        <AppText variant="eyebrow" tone="muted" style={styles.wordmark}>
          DEV
        </AppText>
        <AppText variant="eyebrow" tone="accent" style={styles.wordmark}>
          CARD
        </AppText>
      </View>
      <AppText variant="caption" tone="muted" style={styles.status}>
        Loading your profile
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  wordmarkRow: { flexDirection: 'row', marginTop: SPACING.lg },
  wordmark: { letterSpacing: 4, fontSize: 13 },
  status: { marginTop: SPACING.sm },
});
