import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import {
  AppText,
  Avatar,
  EmptyState,
  ErrorState,
  H2,
  Icon,
  LoadingRows,
  Pill,
  Screen,
  SectionHeader,
  Surface,
} from '../components/ui';
import type { PillTone } from '../components/ui';
import { SPACING } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { TeamMember } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'TeamDetail'>;

export default function TeamDetailScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { colors } = useTheme();
  const { token } = useAuth();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await get<any>(`/api/teams/${slug}`, token);
      setTeam(data);
    } catch { setError(true); Alert.alert('Error', 'Failed to load team'); }
    finally { setLoading(false); }
  }, [slug, token]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const getRoleBadge = (role: string): { label: string; tone: PillTone } => {
    switch (role) {
      case 'OWNER': return { label: 'Owner', tone: 'warning' };
      case 'ADMIN': return { label: 'Admin', tone: 'info' };
      default: return { label: 'Member', tone: 'neutral' };
    }
  };

  if (loading) return (
    <Screen edges={['bottom']}>
      <LoadingRows rows={5} />
    </Screen>
  );

  if (error) return (
    <Screen edges={['bottom']}>
      <ErrorState title="Couldn't load team" message="Check your connection and try again." onRetry={fetchTeam} />
    </Screen>
  );

  const members: TeamMember[] = team?.members || [];

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Surface radius="xl" padding="lg" style={styles.infoCard}>
              <AppText variant="eyebrow" tone="muted">TEAM</AppText>
              <H2 style={styles.teamName}>{team?.name || name}</H2>
              {team?.slug ? (
                <AppText variant="mono" tone="muted" numberOfLines={1} style={styles.slug}>
                  @{team.slug}
                </AppText>
              ) : null}
              {team?.description ? (
                <AppText variant="body" tone="secondary" style={styles.description}>{team.description}</AppText>
              ) : null}
              <View style={styles.countRow}>
                <Icon name="account-multiple-outline" size={16} color={colors.accent} />
                <AppText variant="label" tone="accent" style={styles.countText}>
                  {members.length} member{members.length !== 1 ? 's' : ''}
                </AppText>
              </View>
            </Surface>

            <SectionHeader title="Members" style={styles.sectionHeader} />
          </View>
        }
        renderItem={({ item }) => {
          const badge = getRoleBadge(item.teamRole);
          return (
            <Surface
              radius="lg"
              padding="md"
              onPress={() => navigation.navigate('DevCardView', { username: item.username })}
              style={styles.memberRow}>
              <Avatar uri={item.avatarUrl ?? undefined} name={item.displayName} size={44} />
              <View style={styles.memberInfo}>
                <AppText variant="title" numberOfLines={1}>{item.displayName}</AppText>
                {item.role ? (
                  <AppText variant="mono" tone="muted" numberOfLines={1} style={styles.memberRole}>
                    {item.role}
                  </AppText>
                ) : (
                  <AppText variant="mono" tone="muted" numberOfLines={1} style={styles.memberRole}>
                    @{item.username}
                  </AppText>
                )}
              </View>
              <Pill label={badge.label} tone={badge.tone} icon="shield-outline" />
            </Surface>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="account-multiple-outline"
            title="No members"
            description="This team has no members yet."
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  infoCard: { marginBottom: SPACING.lg },
  teamName: { marginTop: SPACING.xs },
  slug: { marginTop: SPACING.xxs },
  description: { marginTop: SPACING.sm },
  countRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  countText: { marginLeft: SPACING.sm },
  sectionHeader: { marginTop: SPACING.xs, marginBottom: SPACING.md },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  memberInfo: { flex: 1, marginLeft: SPACING.md, marginRight: SPACING.sm },
  memberRole: { marginTop: 1 },
});
