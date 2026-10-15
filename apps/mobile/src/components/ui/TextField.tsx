// ─── TextField ────────────────────────────────────────────────────────────────
// Label + input + inline error/hint. Errors render next to the affected input,
// never as a detached banner.

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BORDER_RADIUS, SPACING, FONT_FAMILY, FONT_SIZE } from '../../theme/tokens';
import { AppText } from './Text';
import { Icon, IconName } from './Icon';

type Props = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  monospace?: boolean;
  containerStyle?: any;
};

export const TextField: React.FC<Props> = ({
  label,
  error,
  hint,
  icon,
  monospace = false,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}) => {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.error : focused ? colors.accent : colors.border;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? (
        <AppText variant="eyebrow" tone="secondary" style={styles.label}>
          {label.toUpperCase()}
        </AppText>
      ) : null}

      <View
        style={[
          styles.field,
          { backgroundColor: colors.bgInset ?? colors.bgPrimary, borderColor },
        ]}>
        {icon ? <Icon name={icon} size={18} color={colors.textMuted} style={styles.icon} /> : null}
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontFamily: monospace ? FONT_FAMILY.mono : FONT_FAMILY.sans,
              fontSize: monospace ? FONT_SIZE.sm : FONT_SIZE.md,
            },
            style,
          ]}
          {...rest}
        />
      </View>

      {error ? (
        <View style={styles.msgRow}>
          <Icon name="alert-circle-outline" size={13} color={colors.error} />
          <AppText variant="caption" tone="error" style={styles.msg}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.msgOnly}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.md },
  label: { marginBottom: SPACING.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    minHeight: 52,
  },
  icon: { marginRight: SPACING.sm },
  input: { flex: 1, paddingVertical: SPACING.md },
  msgRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  msg: { marginLeft: SPACING.xxs },
  msgOnly: { marginTop: SPACING.xs },
});

export default TextField;
