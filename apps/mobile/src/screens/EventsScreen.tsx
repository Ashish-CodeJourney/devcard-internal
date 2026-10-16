import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import {
  AppText,
  Button,
  EmptyState,
  Screen,
  SectionHeader,
  Surface,
  TextField,
} from '../components/ui';
import { SPACING, LAYOUT } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

export default function EventsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [slugInput, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) { Alert.alert('Enter a slug', 'Please enter the event slug or code.'); return; }
    setLoading(true);
    try {
      const event = await get<any>(`/api/events/${slug}`, token);
      if (event) navigation.navigate('EventDetail', { slug: event.slug, name: event.name });
    } catch { Alert.alert('Not Found', 'No event found with that code.'); }
    finally { setLoading(false); setSlugInput(''); }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant="eyebrow" tone="muted">
            DISCOVER
          </AppText>
          <AppText variant="h1">Events</AppText>
        </View>

        <SectionHeader title="Join an event" />

        <Surface radius="xl" padding="lg" style={styles.card}>
          <AppText variant="caption" tone="secondary" style={styles.intro}>
            Enter the slug or code shared by the organizer to open its DevCard event.
          </AppText>
          <TextField
            label="Event slug or code"
            placeholder="e.g. ethdenver-2026"
            value={slugInput}
            onChangeText={setSlugInput}
            autoCapitalize="none"
            autoCorrect={false}
            monospace
            icon="magnify"
            returnKeyType="search"
            onSubmitEditing={handleLookup}
          />
          <Button label="Look up event" icon="magnify" onPress={handleLookup} loading={loading} />
        </Surface>

        <EmptyState
          icon="calendar-blank-outline"
          title="Find an event"
          description="Enter an event slug above to look up and join hackathons, meetups, and conferences."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: LAYOUT.topOffset, paddingBottom: SPACING.lg },
  header: { marginBottom: SPACING.lg },
  card: { marginBottom: SPACING.lg },
  intro: { marginBottom: SPACING.md },
});
