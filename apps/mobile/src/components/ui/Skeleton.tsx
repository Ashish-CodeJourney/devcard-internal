// ─── Skeleton ─────────────────────────────────────────────────────────────────
// Themed shimmer block used for all loading states.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS } from '../../theme/tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width, height, borderRadius = BORDER_RADIUS.sm, style }) => {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.skeleton, { width, height, borderRadius, opacity, backgroundColor: colors.bgElevated }, style]}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: { overflow: 'hidden' },
});

export default Skeleton;
