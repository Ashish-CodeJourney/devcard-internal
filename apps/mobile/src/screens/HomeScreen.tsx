import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { PLATFORMS } from '@devcard/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppText,
  Avatar,
  Button,
  EmptyState,
  Icon,
  IconName,
  Pill,
  SectionHeader,
  Sheet,
  Skeleton,
  Surface,
} from '../components/ui';
import { CardVisual, CardPreset } from '../components/CardVisual';
import { useContacts } from '../hooks/useContacts';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';

const CARD_PRESETS_KEY = 'devcard.cardPresets';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
}

interface Card {
  id: string;
  title: string;
  isDefault: boolean;
  links: PlatformLink[];
}

export default function HomeScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { contacts, refetch: refetchContacts } = useContacts();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [presets, setPresets] = useState<Record<string, CardPreset>>({});
  const [showContacts, setShowContacts] = useState(false);

  // useContacts already sorts by most recently saved first.
  const recentContacts = contacts.slice(0, 5);

  const fetchData = useCallback(async () => {
    try {
      const [cardsData, profileData, rawPresets] = await Promise.all([
        get<any[]>('/api/cards', token).catch(() => []),
        get<any>('/api/profiles/me', token).catch(() => null),
        AsyncStorage.getItem(CARD_PRESETS_KEY).catch(() => null),
      ]);
      setCards(
        (cardsData || []).map(c => ({
          id: c.id,
          title: c.title,
          isDefault: c.isDefault,
          links: c.links ?? c.cardLinks?.map((cl: any) => cl.link) ?? [],
        })),
      );
      setLinks(profileData?.platformLinks || []);
      setPresets(rawPresets ? JSON.parse(rawPresets) : {});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Keep the scanned-cards shortcut current after a scan.
      refetchContacts();
    }, [fetchData, refetchContacts]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const defaultCard = cards.find(c => c.isDefault) || cards[0] || null;

  const shareDefault = async () => {
    if (!defaultCard) return;
    try {
      await Share.share({ message: `Open my DevCard: devcard://card/${defaultCard.id}` });
    } catch {
      // cancelled
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.pad}>
          <Skeleton width={120} height={14} />
          <Skeleton width="70%" height={34} borderRadius={10} style={styles.skelMt} />
          <Skeleton width="100%" height={200} borderRadius={BORDER_RADIUS.xl} style={styles.skelMtLg} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>
        {/* ── Header: identity + scanned-cards shortcut ── */}
        <View style={styles.identity}>
          <View style={styles.identityText}>
            <AppText variant="eyebrow" tone="muted">
              WELCOME BACK
            </AppText>
            <AppText variant="h2" numberOfLines={1}>
              {user?.displayName || user?.username || 'Developer'}
            </AppText>
            <AppText variant="mono" tone="secondary" numberOfLines={1}>
              @{user?.username || 'you'}
              {user?.role ? ` · ${user.role}` : ''}
              {user?.company ? ` · ${user.company}` : ''}
            </AppText>
          </View>

          <TouchableOpacity
            onPress={() => setShowContacts(true)}
            accessibilityRole="button"
            accessibilityLabel="Recently scanned cards"
            style={[styles.contactsBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <Icon name="account-multiple-outline" size={20} color={colors.textSecondary} />
            {contacts.length > 0 ? (
              <View style={[styles.contactsBadge, { backgroundColor: colors.accent }]}>
                <AppText variant="eyebrow" color={colors.textInverse} style={styles.contactsBadgeText}>
                  {contacts.length > 9 ? '9+' : contacts.length}
                </AppText>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        {/* ── Primary card ── */}
        <SectionHeader title="Primary card" action={{ label: 'Manage', icon: 'chevron-right', onPress: () => navigation.navigate('Cards') }} />

        {defaultCard ? (
          <>
            <Pressable onPress={() => navigation.navigate('Cards')} accessibilityRole="button" accessibilityLabel={`Open ${defaultCard.title}`}>
              <CardVisual
                title={defaultCard.title}
                links={defaultCard.links}
                isDefault={defaultCard.isDefault}
                preset={presets[defaultCard.id] ?? 'signal'}
                owner={user?.username}
                height={210}
              />
            </Pressable>
            <View style={styles.heroActions}>
              <Button label="Share card" icon="share-variant-outline" onPress={shareDefault} style={styles.heroBtn} />
              <Button label="View as others" icon="eye-outline" variant="secondary" onPress={() => navigation.navigate('Cards')} style={styles.heroBtn} />
            </View>
          </>
        ) : (
          <Surface variant="outline" radius="xl" padding="lg" style={{ borderColor: colors.border }}>
            <EmptyState
              icon="card-account-details-outline"
              title="No card yet"
              description="Build your first card to start sharing a single link for everything you do."
              actionLabel="Create a card"
              onAction={() => navigation.navigate('Cards')}
            />
          </Surface>
        )}

        {/* ── Quick actions ── */}
        <SectionHeader title="Manage" style={styles.sectionSpacing} />
        <View style={styles.quickGrid}>
          <QuickAction icon="account-circle-outline" label="Profile" onPress={() => navigation.navigate('Profile')} />
          <QuickAction icon="link-variant" label="Links" badge={links.length} onPress={() => navigation.navigate('Links')} />
          <QuickAction icon="card-account-details-outline" label="Cards" badge={cards.length} onPress={() => navigation.navigate('Cards')} />
          <QuickAction icon="qrcode-scan" label="Scan" onPress={() => navigation.navigate('Scan')} />
          <QuickAction icon="chart-line" label="Views" onPress={() => navigation.navigate('Views')} />
          <QuickAction icon="nfc-variant" label="NFC" onPress={() => navigation.navigate('Nfc')} />
        </View>

        {/* ── Platform coverage ── */}
        <SectionHeader
          title={`Platforms · ${links.length}`}
          style={styles.sectionSpacing}
          action={{ label: 'Edit', icon: 'pencil-outline', onPress: () => navigation.navigate('Links') }}
        />
        {links.length === 0 ? (
          <Pressable onPress={() => navigation.navigate('Links')} accessibilityRole="button">
            <Surface variant="outline" radius="lg" padding="md" style={[styles.addLinks, { borderColor: colors.border }]}>
              <Icon name="plus" size={18} color={colors.accent} />
              <AppText variant="label" tone="secondary" style={styles.addLinksText}>
                Add your first platform link
              </AppText>
            </Surface>
          </Pressable>
        ) : (
          <View style={styles.pillWrap}>
            {links.map(l => (
              <Pill
                key={l.id}
                label={PLATFORMS[l.platform]?.name || l.platform}
                tone="neutral"
                icon={undefined}
                style={styles.pill}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Recently scanned cards ── */}
      <Sheet
        visible={showContacts}
        onClose={() => setShowContacts(false)}
        eyebrow={`RECENT · ${contacts.length}`}
        title="Scanned cards"
        scrollable
        footer={
          contacts.length > 5 ? (
            <Button
              label="View all scanned cards"
              variant="tertiary"
              icon="account-multiple-outline"
              onPress={() => {
                setShowContacts(false);
                navigation.navigate('Contacts');
              }}
            />
          ) : null
        }>
        {recentContacts.length === 0 ? (
          <EmptyState
            icon="account-multiple-outline"
            title="No scanned cards yet"
            description="Cards you scan with the Scan tab are saved here."
          />
        ) : (
          recentContacts.map(contact => (
            <Pressable
              key={contact.username}
              accessibilityRole="button"
              accessibilityLabel={`Open ${contact.displayName}`}
              onPress={() => {
                setShowContacts(false);
                navigation.navigate('DevCardView', { username: contact.username });
              }}
              style={({ pressed }) => [
                styles.contactRow,
                { borderColor: colors.border, backgroundColor: colors.bgCard, opacity: pressed ? 0.85 : 1 },
              ]}>
              <Avatar uri={contact.avatarUrl} name={contact.displayName} size={44} />
              <View style={styles.contactBody}>
                <AppText variant="title" numberOfLines={1}>
                  {contact.displayName}
                </AppText>
                <AppText variant="mono" tone="secondary" numberOfLines={1}>
                  @{contact.username}
                </AppText>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          ))
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function QuickAction({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: IconName;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quickAction,
        { backgroundColor: colors.bgCard, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.quickIcon, { backgroundColor: colors.bgElevated }]}>
        <Icon name={icon} size={20} color={colors.accent} />
      </View>
      <AppText variant="label" numberOfLines={1}>
        {label}
      </AppText>
      {typeof badge === 'number' && badge > 0 ? (
        <AppText variant="caption" tone="muted">
          {badge}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: SPACING.xxxl },
  pad: { padding: SPACING.lg },
  skelMt: { marginTop: SPACING.md },
  skelMtLg: { marginTop: SPACING.lg },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: LAYOUT.topOffset,
    paddingBottom: SPACING.lg,
  },
  identityText: { flex: 1, marginRight: SPACING.md },
  contactsBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactsBadgeText: { fontSize: 9, lineHeight: 12 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  contactBody: { flex: 1, marginLeft: SPACING.md },
  heroActions: { flexDirection: 'row', marginTop: SPACING.md, paddingHorizontal: SPACING.lg },
  heroBtn: { flex: 1, marginHorizontal: SPACING.xs },
  sectionSpacing: { marginTop: SPACING.xl, paddingHorizontal: SPACING.lg },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg - SPACING.xs,
  },
  quickAction: {
    width: '31%',
    marginHorizontal: '1.16%',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  addLinks: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg },
  addLinksText: { marginLeft: SPACING.sm },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.lg },
  pill: { marginRight: SPACING.sm, marginBottom: SPACING.sm },
});
