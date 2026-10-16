import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { get } from '../services/api';
import {
  AppText,
  Button,
  EmptyState,
  Icon,
  LoadingRows,
  Screen,
  SectionHeader,
  Surface,
  TextField,
} from '../components/ui';
import EventsMapView, { type MapEvent } from '../components/EventsMapView';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

type EventSummary = {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string | null;
  country: string | null;
  kind: string;
  startDate: string;
  endDate: string;
  latitude: number | null;
  longitude: number | null;
};

const KIND_LABELS: Record<string, string> = {
  HACKATHON: 'Hackathon',
  MEETUP: 'Meetup',
  CONFERENCE: 'Conference',
  OTHER: 'Event',
};

function formatDates(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (s.toDateString() === e.toDateString()) return s.toLocaleDateString(undefined, opts);
  return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, opts)}`;
}

function placeOf(event: EventSummary): string {
  const parts = [event.city, event.country].filter(Boolean);
  return parts.length ? parts.join(', ') : event.location;
}

export default function EventsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { colors } = useTheme();

  const [view, setView] = useState<'map' | 'list'>('map');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const [slugInput, setSlugInput] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await get<{ events: EventSummary[] }>(
        `/api/events?limit=100${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`,
        token,
      );
      setEvents(data?.events ?? []);
    } catch {
      setError(true);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [token, query]);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(load, query ? 300 : 0);
      return () => clearTimeout(timer);
    }, [load, query]),
  );

  const openEvent = (slug: string, name: string) => navigation.navigate('EventDetail', { slug, name });

  const handleLookup = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) {
      Alert.alert('Enter a code', 'Please enter the event slug or code.');
      return;
    }
    setLookingUp(true);
    try {
      const event = await get<any>(`/api/events/${slug}`, token);
      if (event) openEvent(event.slug, event.name);
    } catch {
      Alert.alert('Not found', 'No public event matches that code.');
    } finally {
      setLookingUp(false);
      setSlugInput('');
    }
  };

  const markers: MapEvent[] = events
    .filter(e => e.latitude !== null && e.longitude !== null)
    .map(e => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      latitude: e.latitude as number,
      longitude: e.longitude as number,
    }));

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow" tone="muted">
            DISCOVER
          </AppText>
          <AppText variant="h1">Events</AppText>
        </View>

        <View style={[styles.toggle, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          {(['map', 'list'] as const).map(mode => {
            const active = view === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setView(mode)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.toggleItem, active && { backgroundColor: colors.accentSoft }]}>
                <Icon
                  name={mode === 'map' ? 'map-outline' : 'format-list-bulleted'}
                  size={16}
                  color={active ? colors.accent : colors.textSecondary}
                />
                <AppText variant="label" tone={active ? 'accent' : 'secondary'} style={styles.toggleText}>
                  {mode === 'map' ? 'Map' : 'List'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.body}>
        <TextField
          placeholder="Search events, cities, countries…"
          value={query}
          onChangeText={setQuery}
          icon="magnify"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {loading ? (
          <LoadingRows rows={4} />
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Could not load events"
            description="Check your connection and try again."
            actionLabel="Retry"
            onAction={load}
          />
        ) : view === 'map' ? (
          markers.length === 0 ? (
            <EmptyState
              icon="map-marker-off-outline"
              title="No mapped events yet"
              description={
                events.length === 0
                  ? 'Approved events with a location will appear here. Submit one from the DevCard website.'
                  : 'The events that matched have no map location. Switch to List to see them.'
              }
              actionLabel={events.length > 0 ? 'Show list' : undefined}
              onAction={events.length > 0 ? () => setView('list') : undefined}
            />
          ) : (
            <Surface variant="default" radius="lg" padding="xs" style={styles.mapCard}>
              <EventsMapView events={markers} height={460} onSelect={openEvent} />
            </Surface>
          )
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar-blank-outline"
            title="No events found"
            description="Nothing matches that search. Events are submitted on the DevCard website and appear once approved."
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {events.map(event => (
              <Pressable
                key={event.id}
                onPress={() => openEvent(event.slug, event.name)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${event.name}`}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: colors.border, backgroundColor: colors.bgCard, opacity: pressed ? 0.85 : 1 },
                ]}>
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <View style={[styles.kindPill, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
                      <AppText variant="eyebrow" tone="secondary">
                        {KIND_LABELS[event.kind] ?? event.kind}
                      </AppText>
                    </View>
                    <AppText variant="caption" tone="muted" style={styles.dates}>
                      {formatDates(event.startDate, event.endDate)}
                    </AppText>
                  </View>
                  <AppText variant="title" numberOfLines={2}>
                    {event.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {placeOf(event)}
                  </AppText>
                </View>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <SectionHeader title="Have an event code?" style={styles.lookupHeader} />
        <Surface variant="default" radius="lg" padding="md">
          <AppText variant="caption" tone="secondary" style={styles.lookupHint}>
            Enter the code shared on a DevCard event page to open it directly.
          </AppText>
          <TextField
            placeholder="e.g. ethdenver-2026"
            value={slugInput}
            onChangeText={setSlugInput}
            autoCapitalize="none"
            autoCorrect={false}
            monospace
            onSubmitEditing={handleLookup}
            returnKeyType="search"
          />
          <Button label="Look up event" icon="magnify" onPress={handleLookup} loading={lookingUp} />
        </Surface>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: LAYOUT.topOffset,
    paddingBottom: SPACING.md,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    padding: 3,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  toggleText: { marginLeft: SPACING.xs },
  body: { flex: 1, paddingHorizontal: SPACING.lg },
  mapCard: { padding: 0, overflow: 'hidden' },
  list: { paddingBottom: SPACING.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rowBody: { flex: 1, marginRight: SPACING.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  kindPill: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  dates: { marginLeft: SPACING.sm },
  lookupHeader: { marginTop: SPACING.lg },
  lookupHint: { marginBottom: SPACING.sm },
});
