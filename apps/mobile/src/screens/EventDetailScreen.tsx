import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { get, post, del } from '../services/api';
import {
  AppText,
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  H2,
  Icon,
  LoadingRows,
  Screen,
  SectionHeader,
  Surface,
} from '../components/ui';
import { SPACING } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

interface Attendee {
  id: string; username: string; displayName: string;
  bio: string | null; avatarUrl: string | null; accentColor: string;
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const { slug, name } = route.params;
  const { colors } = useTheme();
  const { token } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const fetchEvent = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [detail, atts] = await Promise.all([
        get<any>(`/api/events/${slug}`, token),
        get<any>(`/api/events/${slug}/attendees`, token),
      ]);
      setEvent(detail);
      setAttendees(atts?.attendees || []);
    } catch { setError(true); Alert.alert('Error', 'Failed to load event'); }
    finally { setLoading(false); }
  }, [slug, token]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      await post(`/api/events/${slug}/join`, undefined, token);
      Alert.alert('Joined!', 'You are now part of this event.');
      fetchEvent();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      Alert.alert(msg.includes('409') ? 'Already Joined' : 'Error',
        msg.includes('409') ? 'You are already part of this event.' : 'Failed to join.');
    } finally { setJoining(false); }
  };

  const performLeave = async () => {
    setConfirmLeave(false);
    try { await del(`/api/events/${slug}/leave`, undefined, token); fetchEvent(); }
    catch { Alert.alert('Error', 'Failed to leave event'); }
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  if (loading) return (
    <Screen edges={['bottom']}>
      <LoadingRows rows={5} />
    </Screen>
  );

  if (error) return (
    <Screen edges={['bottom']}>
      <ErrorState title="Couldn't load event" message="Check your connection and try again." onRetry={fetchEvent} />
    </Screen>
  );

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={attendees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Surface radius="xl" padding="lg" style={styles.infoCard}>
              <AppText variant="eyebrow" tone="muted">EVENT</AppText>
              <H2 style={styles.eventName}>{event?.name || name}</H2>
              {event?.slug ? (
                <AppText variant="mono" tone="muted" numberOfLines={1} style={styles.slug}>
                  @{event.slug}
                </AppText>
              ) : null}

              <View style={styles.metaList}>
                {event?.location ? (
                  <View style={styles.metaRow}>
                    <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
                    <AppText variant="caption" tone="secondary" style={styles.metaText}>{event.location}</AppText>
                  </View>
                ) : null}
                <View style={styles.metaRow}>
                  <Icon name="calendar-blank-outline" size={16} color={colors.textSecondary} />
                  <AppText variant="caption" tone="secondary" style={styles.metaText}>
                    {event ? `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}` : ''}
                  </AppText>
                </View>
                <View style={styles.metaRow}>
                  <Icon name="account-multiple-outline" size={16} color={colors.textSecondary} />
                  <AppText variant="caption" tone="secondary" style={styles.metaText}>
                    {event?.attendeesCount ?? attendees.length} attending
                  </AppText>
                </View>
              </View>

              {event?.description ? (
                <AppText variant="body" tone="secondary" style={styles.description}>{event.description}</AppText>
              ) : null}

              <View style={styles.actions}>
                <Button
                  label={joining ? 'Joining…' : 'Join event'}
                  icon="plus"
                  onPress={handleJoin}
                  loading={joining}
                  fullWidth={false}
                  style={styles.joinBtn}
                />
                <Button
                  label="Leave"
                  variant="destructive"
                  onPress={() => setConfirmLeave(true)}
                  fullWidth={false}
                  style={styles.leaveBtn}
                />
              </View>
            </Surface>

            <SectionHeader title={`Attendees (${event?.attendeesCount || attendees.length})`} style={styles.sectionHeader} />
          </View>
        }
        renderItem={({ item }) => (
          <Surface
            radius="lg"
            padding="md"
            onPress={() => navigation.navigate('DevCardView', { username: item.username })}
            style={styles.attendeeRow}>
            <Avatar uri={item.avatarUrl ?? undefined} name={item.displayName} size={44} />
            <View style={styles.attendeeInfo}>
              <AppText variant="title" numberOfLines={1}>{item.displayName}</AppText>
              <AppText variant="mono" tone="muted" numberOfLines={1} style={styles.attendeeUser}>
                @{item.username}
              </AppText>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textMuted} />
          </Surface>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="account-multiple-outline"
            title="No attendees yet"
            description="Be the first to join this event!"
          />
        }
      />

      <ConfirmDialog
        visible={confirmLeave}
        title="Leave event?"
        message="You'll be removed from the attendee list for this event."
        confirmLabel="Leave"
        destructive
        onConfirm={performLeave}
        onCancel={() => setConfirmLeave(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  infoCard: { marginBottom: SPACING.lg },
  eventName: { marginTop: SPACING.xs },
  slug: { marginTop: SPACING.xxs },
  metaList: { marginTop: SPACING.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  metaText: { marginLeft: SPACING.sm, flex: 1 },
  description: { marginTop: SPACING.sm },
  actions: { flexDirection: 'row', marginTop: SPACING.lg },
  joinBtn: { flex: 1, marginRight: SPACING.sm },
  leaveBtn: { flex: 1 },
  sectionHeader: { marginTop: SPACING.xs, marginBottom: SPACING.md },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  attendeeInfo: { flex: 1, marginLeft: SPACING.md },
  attendeeUser: { marginTop: 1 },
});
