import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  AppText,
  Avatar,
  EmptyState,
  H1,
  Icon,
  ICONS,
  LoadingRows,
  Pill,
  Screen,
  Surface,
  TextField,
} from '../components/ui';
import { useContacts } from '../hooks/useContacts';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import { useTheme } from '../context/ThemeContext';
import type { SavedContact } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

type ContactFilter = 'all' | 'week' | 'osd';

export default function ContactsScreen({ navigation }: Props) {
  const { contacts, loading, removeContact, refetch } = useContacts();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ContactFilter>('all');

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handlePress = (contact: SavedContact) => {
    navigation.navigate('DevCardView', { username: contact.username });
  };

  const handleRemove = (contact: SavedContact) => {
    Alert.alert(
      'Remove Contact',
      `Remove ${contact.displayName} from saved contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeContact(contact.username),
        },
      ],
    );
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) return '1 week ago';
    return `${weeks} weeks ago`;
  };

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      const haystack = [c.displayName, c.username, c.role, c.company, c.metAt, c.bio]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesQuery = q.length === 0 || haystack.includes(q);
      if (!matchesQuery) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'week') {
        const days = Math.floor((Date.now() - new Date(c.savedAt).getTime()) / (1000 * 60 * 60 * 24));
        return days <= 7;
      }
      return [c.metAt, c.company, c.bio].filter(Boolean).join(' ').toLowerCase().includes('osd');
    });
  }, [contacts, query, activeFilter]);

  const getTag = (contact: SavedContact) => {
    const source = `${contact.bio || ''} ${contact.company || ''}`.toLowerCase();
    if (source.includes('github')) return 'GitHub';
    if (source.includes('linkedin')) return 'LinkedIn';
    if (source.includes('devfolio')) return 'Devfolio';
    if (source.includes('twitter') || source.includes('x.com')) return 'Twitter';
    return contact.company || contact.role || 'Saved';
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="eyebrow" tone="muted">
              CONTACTS
            </AppText>
            <H1>Saved Cards</H1>
          </View>
        </View>
        <View style={styles.loadingWrap}>
          <LoadingRows rows={5} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="eyebrow" tone="muted">
            CONTACTS
          </AppText>
          <H1>Saved Cards</H1>
          <AppText variant="caption" tone="muted" style={styles.headerSub}>
            {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} saved
          </AppText>
        </View>
        <View style={[styles.headerIcon, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <Icon name={ICONS.contacts} size={22} color={colors.accent} />
        </View>
      </View>

      <View style={styles.searchWrap}>
        <TextField
          icon={ICONS.search}
          placeholder="Search contacts..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          containerStyle={styles.searchField}
        />
      </View>

      <View style={styles.filtersRow}>
        <FilterChip label="All" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} />
        <FilterChip label="This week" active={activeFilter === 'week'} onPress={() => setActiveFilter('week')} />
        <FilterChip label="OSD 2026" active={activeFilter === 'osd'} onPress={() => setActiveFilter('osd')} />
      </View>

      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.username}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handlePress(item)}
            onLongPress={() => handleRemove(item)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.displayName}`}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
            <Surface radius="lg" padding="md" style={styles.contactItem}>
              <Avatar uri={item.avatarUrl ?? undefined} name={item.displayName} size={48} />
              <View style={styles.info}>
                <AppText variant="title" numberOfLines={1}>
                  {item.displayName}
                </AppText>
                <AppText variant="mono" tone="secondary" numberOfLines={1} style={styles.handle}>
                  @{item.username}
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.detail}>
                  {[item.metAt || item.company || item.role || 'Event', formatDate(item.savedAt)].join(' · ')}
                </AppText>
                <View style={styles.tagRow}>
                  <Pill label={getTag(item)} tone="neutral" />
                </View>
              </View>
              <Pressable
                onPress={() => handleRemove(item)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.displayName}`}
                style={[styles.removeBtn, { borderColor: colors.border }]}>
                <Icon name={ICONS.trash} size={18} color={colors.error} />
              </Pressable>
              <Icon name={ICONS.chevronRight} size={20} color={colors.textMuted} style={styles.chevron} />
            </Surface>
          </Pressable>
        )}
        ListFooterComponent={
          filteredContacts.length > 0 ? (
            <Surface variant="inset" radius="lg" padding="md" style={styles.footerNote}>
              <Icon name={ICONS.info} size={16} color={colors.textMuted} />
              <View style={styles.footerText}>
                <AppText variant="caption" tone="secondary">
                  Tap a contact to open their DevCard.
                </AppText>
                <AppText variant="caption" tone="muted">
                  Long-press or use the trash icon to remove.
                </AppText>
              </View>
            </Surface>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={ICONS.contacts}
            title="No saved contacts"
            description="When you view someone's DevCard, tap 'Save Contact' to add them here."
          />
        }
      />
    </Screen>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={6}
      style={styles.chip}>
      <Pill label={label} tone={active ? 'accent' : 'neutral'} solid={active} icon={active ? ICONS.check : undefined} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerText: { flex: 1 },
  headerSub: { marginTop: SPACING.xs },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
  },
  searchWrap: { paddingHorizontal: SPACING.lg },
  searchField: { marginBottom: 0 },
  filtersRow: {
    paddingHorizontal: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  chip: { minHeight: 44, justifyContent: 'center' },
  loadingWrap: { paddingHorizontal: SPACING.lg },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  info: { flex: 1, marginLeft: SPACING.md },
  handle: { marginTop: 1 },
  detail: { marginTop: SPACING.xxs },
  tagRow: { flexDirection: 'row', marginTop: SPACING.sm },
  removeBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.sm,
  },
  chevron: { marginLeft: SPACING.xs },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  footerText: { flex: 1, marginLeft: SPACING.sm },
});
