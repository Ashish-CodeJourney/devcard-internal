import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { get } from '../services/api';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import { PLATFORMS } from '@devcard/shared';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function HomeScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const themed = React.useMemo(() => createThemedStyles(colors), [colors]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cardsData] = await Promise.all([
        get<any[]>('/api/cards', token).catch(() => []),
        get<any>('/api/profiles/me', token).catch(() => null),
      ]);
      setCards(cardsData || []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null;

  const defaultCardLinkSummary = defaultCard?.links?.slice(0, 4).map((link: any) => PLATFORMS[link.platform]?.name || link.platform).join(' · ') || '';

  if (loading) {
    return (
      <SafeAreaView style={themed.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
        <View style={themed.loadingRoot} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }>
        <Text style={themed.pageTitle}>Dashboard</Text>

        {defaultCard ? (
          <View style={themed.defaultCardWrap}>
            <TouchableOpacity
              style={themed.defaultCard}
              activeOpacity={0.9}
              onPress={() => (navigation as any).navigate('Cards')}>
              <View style={styles.cardTopRow}>
                <Text style={themed.cardEyebrow}>DEFAULT CARD</Text>
                <Text style={themed.defaultBadge}>Active</Text>
              </View>
              <Text style={themed.cardTitle}>{defaultCard.title}</Text>
              <Text style={themed.cardSubtitle}>{defaultCardLinkSummary || 'No platform links yet'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={themed.homeActionBtn} onPress={() => (navigation as any).navigate('Cards')}>
              <Text style={themed.homeActionText}>Manage Cards</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={themed.emptyCardCta}
            activeOpacity={0.9}
            onPress={() => (navigation as any).navigate('Cards')}>
              <View style={themed.cardSilhouette}>
                <View style={themed.cardChip} />
                <View style={themed.cardLine} />
              <View style={[themed.cardLine, styles.cardLineShort]} />
              </View>
            <Text style={themed.emptyTitle}>No cards yet</Text>
            <Text style={themed.emptySubtitle}>Tap to create your first DevCard</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardLineShort: { width: '55%' },
});

function createThemedStyles(colors: typeof COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    loadingRoot: {
      flex: 1,
      padding: SPACING.lg,
      backgroundColor: colors.bgPrimary,
    },
    pageTitle: {
      color: colors.textPrimary,
      fontSize: FONT_SIZE.xxl,
      fontWeight: '800',
      marginBottom: SPACING.lg,
    },
    emptyCardCta: {
      minHeight: 360,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.lg,
    },
    cardSilhouette: {
      width: 230,
      height: 150,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSecondary,
      padding: SPACING.md,
      justifyContent: 'center',
      marginBottom: SPACING.lg,
    },
    cardChip: {
      width: 42,
      height: 26,
      borderRadius: 8,
      backgroundColor: colors.bgElevated,
      marginBottom: SPACING.md,
    },
    cardLine: {
      height: 14,
      width: '80%',
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: SPACING.sm,
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: FONT_SIZE.xl,
      fontWeight: '800',
      marginBottom: SPACING.xs,
    },
    emptySubtitle: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.md,
    },
    defaultCardWrap: {
      gap: SPACING.md,
    },
    defaultCard: {
      minHeight: 320,
      borderRadius: BORDER_RADIUS.xl,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.bgCard,
      padding: SPACING.lg,
    },
    cardEyebrow: {
      color: colors.primaryLight,
      fontSize: FONT_SIZE.xs,
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 30,
      fontWeight: '800',
      marginBottom: SPACING.xs,
    },
    cardSubtitle: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.md,
      lineHeight: 22,
    },
    defaultBadge: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.xs,
      fontWeight: '700',
    },
    homeActionBtn: {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: BORDER_RADIUS.md,
      paddingVertical: SPACING.md,
      alignItems: 'center',
    },
    homeActionText: {
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      fontWeight: '700',
    },
  });
}
