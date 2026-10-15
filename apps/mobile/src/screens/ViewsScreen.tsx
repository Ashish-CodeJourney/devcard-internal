import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import {
  AppText,
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  ICONS,
  LoadingRows,
  Pill,
  Screen,
  SectionHeader,
  Surface,
} from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'Views'>;

export const ViewsScreen: React.FC<Props> = () => {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setError(false);
    try {
      const [viewsData, overviewData] = await Promise.all([
        get<any>('/api/analytics/views', token).catch(() => null),
        get<any>('/api/analytics/overview', token).catch(() => null),
      ]);
      setViews(viewsData?.data || []);
      setOverview(overviewData);
      setError(viewsData === null && overviewData === null);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'qr': return 'qrcode';
      case 'link': return 'link-variant';
      case 'web': return 'web';
      default: return 'eye';
    }
  };

  // Generate simple bar chart data for last 7 days
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toLocaleDateString('en-US', { weekday: 'short' }), count: 0 };
    });

    views.forEach(v => {
      const d = new Date(v.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      const day = last7Days.find(x => x.date === d);
      if (day) day.count++;
    });

    const max = Math.max(...last7Days.map(d => d.count), 1); // prevent division by zero
    return { data: last7Days, max };
  }, [views]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.statsRow}>
        <Surface radius="lg" padding="lg" style={styles.statCard}>
          <AppText variant="h1" tone="accent">
            {overview?.totalViews || 0}
          </AppText>
          <AppText variant="eyebrow" tone="muted" style={styles.statLabel}>
            TOTAL VIEWS
          </AppText>
        </Surface>
        <Surface radius="lg" padding="lg" style={styles.statCard}>
          <AppText variant="h1">{overview?.followsCount || 0}</AppText>
          <AppText variant="eyebrow" tone="muted" style={styles.statLabel}>
            CONNECTIONS
          </AppText>
        </Surface>
      </View>

      <Surface radius="lg" padding="lg" style={styles.chartCard}>
        <AppText variant="eyebrow" tone="muted">
          LAST 7 DAYS
        </AppText>
        <AppText variant="title" style={styles.chartTitle}>
          Views
        </AppText>
        <View style={styles.chartContainer}>
          {chartData.data.map((item, idx) => {
            const heightPerc = (item.count / chartData.max) * 100;
            return (
              <View key={idx} style={styles.barWrapper}>
                <AppText variant="caption" tone="accent" style={styles.barLabelTop}>
                  {item.count > 0 ? item.count : ''}
                </AppText>
                <View style={[styles.barTrack, { backgroundColor: colors.bgInset, borderColor: colors.border }]}>
                  <View style={[styles.barFill, { height: `${heightPerc}%`, backgroundColor: colors.accent }]} />
                </View>
                <AppText variant="caption" tone="muted" style={styles.barLabel}>
                  {item.date}
                </AppText>
              </View>
            );
          })}
        </View>
      </Surface>

      <SectionHeader title="Recent Activity" style={styles.sectionTitle} />
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isAnonymous = !item.viewer;

    return (
      <Surface radius="lg" padding="md" style={styles.viewItem}>
        <View style={styles.avatarContainer}>
          {isAnonymous ? (
            <View style={[styles.anonymousAvatar, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
              <Icon name="incognito" size={24} color={colors.textSecondary} />
            </View>
          ) : item.viewer.avatarUrl ? (
            <Avatar uri={item.viewer.avatarUrl} name={item.viewer.displayName} size={48} />
          ) : (
            <Avatar name={item.viewer.displayName} size={48} />
          )}
        </View>

        <View style={styles.infoContainer}>
          <AppText variant="title" numberOfLines={1}>
            {isAnonymous ? 'Anonymous Viewer' : item.viewer.displayName}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.viewTarget}>
            {item.cardId ? `Viewed Card: ${item.card?.title || 'Unknown'}` : 'Viewed Main Profile'}
          </AppText>
          <AppText variant="caption" tone="muted" style={styles.timestamp}>
            {formatDate(item.createdAt)}
          </AppText>
        </View>

        <Pill label={item.source || 'view'} icon={getSourceIcon(item.source)} tone="neutral" />
      </Surface>
    );
  };

  if (loading) {
    return (
      <Screen edges={['bottom']}>
        <View style={styles.listContainer}>
          <LoadingRows rows={4} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      {error && views.length === 0 ? (
        <ErrorState
          title="Couldn't load views"
          message="We couldn't reach the analytics service. Check your connection and try again."
          onRetry={fetchData}
        />
      ) : views.length === 0 ? (
        <EmptyState
          icon={ICONS.chart}
          title="No views yet"
          description="Share your card or QR code to start collecting analytics."
        />
      ) : (
        <FlatList
          data={views}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  headerContainer: {
    paddingBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    marginTop: SPACING.xs,
  },
  chartCard: {
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    marginTop: SPACING.xxs,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: SPACING.lg,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 24,
    height: 100,
    borderRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: BORDER_RADIUS.xs,
  },
  barLabel: {
    marginTop: SPACING.sm,
  },
  barLabelTop: {
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  viewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  avatarContainer: {
    marginRight: SPACING.md,
  },
  anonymousAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  viewTarget: {
    marginTop: SPACING.xxs,
  },
  timestamp: {
    marginTop: SPACING.xs,
  },
});
