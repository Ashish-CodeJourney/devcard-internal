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
import { SPACING } from '../theme/tokens';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList> };

export default function TeamsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [slugInput, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async () => {
    const slug = slugInput.trim().toLowerCase();
    if (!slug) { Alert.alert('Enter a slug', 'Enter the team slug.'); return; }
    setLoading(true);
    try {
      const team = await get<any>(`/api/teams/${slug}`, token);
      if (team) navigation.navigate('TeamDetail', { slug: team.slug, name: team.name });
    } catch { Alert.alert('Not Found', 'No team found with that slug.'); }
    finally { setLoading(false); setSlugInput(''); }
  };

  return (
    <Screen edges={['bottom']}>
      <View style={styles.content}>
        <SectionHeader title="Look up a team" />

        <Surface radius="xl" padding="lg" style={styles.card}>
          <AppText variant="caption" tone="secondary" style={styles.intro}>
            Enter a team slug to view members and their group DevCard.
          </AppText>
          <TextField
            label="Team slug"
            placeholder="e.g. core-builders"
            value={slugInput}
            onChangeText={setSlugInput}
            autoCapitalize="none"
            autoCorrect={false}
            monospace
            icon="magnify"
            returnKeyType="search"
            onSubmitEditing={handleLookup}
          />
          <Button label="Look up team" icon="magnify" onPress={handleLookup} loading={loading} />
        </Surface>

        <EmptyState
          icon="account-multiple-outline"
          title="Find a team"
          description="Enter a team slug to view members and their DevCards."
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: SPACING.lg },
  card: { marginBottom: SPACING.lg },
  intro: { marginBottom: SPACING.md },
});
