// ─── Typography ───────────────────────────────────────────────────────────────
// The single way text is rendered. Pulls from the TYPOGRAPHY scale so the
// hierarchy stays consistent and adjustable from one place.

import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, TypographyVariant, COLORS } from '../../theme/tokens';

type Tone = 'primary' | 'secondary' | 'muted' | 'accent' | 'inverse' | 'success' | 'error' | 'warning' | 'info';

type Props = RNTextProps & {
  variant?: TypographyVariant;
  tone?: Tone;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center';
};

export const AppText: React.FC<Props> = ({
  variant = 'body',
  tone = 'primary',
  color,
  align,
  style,
  children,
  ...rest
}) => {
  const { colors, fonts } = useTheme();
  const tones: Record<Tone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    accent: colors.accent,
    inverse: colors.textInverse,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };

  // Monospaced variants always stay monospaced; everything else follows the
  // user's chosen font family from Settings.
  const isMono = variant === 'mono' || variant === 'monoLarge';
  const family = isMono ? fonts.mono : variant === 'display' ? fonts.display : fonts.sans;

  return (
    <RNText
      style={[
        TYPOGRAPHY[variant] as any,
        { fontFamily: family, color: color ?? tones[tone] },
        align ? { textAlign: align } : null,
        style,
      ]}
      {...rest}>
      {children}
    </RNText>
  );
};

/** Convenience for the dominant page headline used across screens. */
export const Display: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="display" {...props} />;
export const H1: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="h1" {...props} />;
export const H2: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="h2" {...props} />;
export const H3: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="h3" {...props} />;
export const Title: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="title" {...props} />;
export const Body: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="body" {...props} />;
export const Label: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="label" {...props} />;
export const Caption: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="caption" {...props} />;
export const Eyebrow: React.FC<Omit<Props, 'variant'>> = props => (
  <AppText variant="eyebrow" tone="secondary" {...props} />
);
/** Monospaced — for handles, IDs, QR payloads and technical metadata. */
export const Mono: React.FC<Omit<Props, 'variant'>> = props => <AppText variant="mono" {...props} />;

export const typographyTokens = { TYPOGRAPHY, COLORS };
export default AppText;
