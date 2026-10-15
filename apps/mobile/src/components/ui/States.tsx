// ─── States: Empty / Error / Loading rows ─────────────────────────────────────
// One vocabulary for the non-happy paths so no screen invents its own.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../../theme/tokens';
import { AppText } from './Text';
import { Button } from './Button';
import { Icon, IconName } from './Icon';
import { Skeleton } from './Skeleton';

type EmptyStateProps = {
  icon?: IconName;
  /** @deprecated use `icon` — emoji are no longer used as UI icons. */
  emoji?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'tray',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconRing, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Icon name={icon} size={30} color={colors.textSecondary} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" tone="secondary" align="center" style={styles.desc}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} style={styles.action} />
      ) : null}
    </View>
  );
};

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconRing, styles.iconRingError, { backgroundColor: colors.errorSoft }]}>
        <Icon name="alert-circle-outline" size={30} color={colors.error} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" tone="secondary" align="center" style={styles.desc}>
          {message}
        </AppText>
      ) : null}
      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          icon="refresh"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

/** List-row loading placeholder (avatar + two lines). */
export const LoadingRows: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.rows}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[styles.row, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Skeleton width={48} height={48} borderRadius={BORDER_RADIUS.md} />
          <View style={styles.rowText}>
            <Skeleton width="62%" height={14} />
            <Skeleton width="40%" height={12} style={styles.rowSecond} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.lg },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  iconRingError: { borderColor: 'transparent' },
  title: { marginBottom: SPACING.xs },
  desc: { maxWidth: 300 },
  action: { marginTop: SPACING.lg },
  rows: { paddingVertical: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowText: { flex: 1, marginLeft: SPACING.md },
  rowSecond: { marginTop: SPACING.sm },
});

export default EmptyState;
