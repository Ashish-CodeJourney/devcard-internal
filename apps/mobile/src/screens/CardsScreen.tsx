import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Share,
  Clipboard,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS } from '@devcard/shared';
import { get, post, del, put } from '../services/api';
import {
  AppText,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  PlatformRow,
  Sheet,
  Skeleton,
  TextField,
  Surface,
} from '../components/ui';
import { CardVisual, CARD_PRESETS, CardPreset } from '../components/CardVisual';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';
import type { MainTabsParamList } from '../navigation/MainTabs';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';

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

type ApiCard = Card & {
  cardLinks?: Array<{ link: PlatformLink }>;
};

const CARD_DEEP_LINKS_KEY = 'devcard.cardDeepLinks';
const CARD_PRESETS_KEY = 'devcard.cardPresets';

export default function CardsScreen() {
  const { token, user } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList, 'Cards'>>();
  const route = useRoute<RouteProp<MainTabsParamList, 'Cards'>>();

  const [cards, setCards] = useState<Card[]>([]);
  const [allLinks, setAllLinks] = useState<PlatformLink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLinkIds, setEditLinkIds] = useState<string[]>([]);
  const [editPreset, setEditPreset] = useState<CardPreset>('signal');
  const [savingCard, setSavingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeepLink, setNewDeepLink] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [cardDeepLinks, setCardDeepLinks] = useState<Record<string, string>>({});
  const [cardPresets, setCardPresets] = useState<Record<string, CardPreset>>({});

  const loadLocal = useCallback(async () => {
    try {
      const [rawLinks, rawPresets] = await Promise.all([
        AsyncStorage.getItem(CARD_DEEP_LINKS_KEY),
        AsyncStorage.getItem(CARD_PRESETS_KEY),
      ]);
      setCardDeepLinks(rawLinks ? JSON.parse(rawLinks) : {});
      setCardPresets(rawPresets ? JSON.parse(rawPresets) : {});
    } catch {
      setCardDeepLinks({});
      setCardPresets({});
    }
  }, []);

  const saveCardDeepLinks = useCallback(async (next: Record<string, string>) => {
    setCardDeepLinks(next);
    await AsyncStorage.setItem(CARD_DEEP_LINKS_KEY, JSON.stringify(next));
  }, []);

  const saveCardPresets = useCallback(async (next: Record<string, CardPreset>) => {
    setCardPresets(next);
    await AsyncStorage.setItem(CARD_PRESETS_KEY, JSON.stringify(next));
  }, []);

  const fetchData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      try {
        const [cardsData, profileData] = await Promise.all([
          get<ApiCard[]>('/api/cards', token).catch(() => []),
          get<any>('/api/profiles/me', token).catch(() => null),
        ]);
        const normalizedCards: Card[] = (cardsData || []).map(card => ({
          id: card.id,
          title: card.title,
          isDefault: card.isDefault,
          links: card.links ?? card.cardLinks?.map(cl => cl.link) ?? [],
        }));
        setCards(normalizedCards);
        setAllLinks(profileData?.platformLinks || []);
      } catch (error) {
        console.error('Failed to fetch:', error);
      } finally {
        setRefreshing(false);
        if (showLoading) setLoading(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
      loadLocal();
    }, [fetchData, loadLocal]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const createCard = async () => {
    if (!newTitle.trim() || selectedLinkIds.length === 0) {
      return;
    }
    const formattedDeepLink = newDeepLink.trim()
      ? newDeepLink.includes('://')
        ? newDeepLink.trim()
        : `https://${newDeepLink.trim()}`
      : '';

    try {
      const created = await post<any>(
        '/api/cards',
        { title: newTitle.trim(), linkIds: selectedLinkIds },
        token,
      );
      if (formattedDeepLink && created?.id) {
        await saveCardDeepLinks({ ...cardDeepLinks, [created.id]: formattedDeepLink });
      }
      setShowCreate(false);
      setNewTitle('');
      setNewDeepLink('');
      setSelectedLinkIds([]);
      fetchData();
    } catch {
      // surfaced via button state; keep parity with previous behaviour
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await del(`/api/cards/${deleteTarget.id}`, undefined, token);
    } catch {
      // ignore
    }
    setDeleting(false);
    setDeleteTarget(null);
    fetchData();
  };

  const setDefault = async (id: string) => {
    try {
      await put(`/api/cards/${id}/default`, undefined, token);
    } catch {
      // ignore
    }
    fetchData();
  };

  const openDetail = (card: Card) => {
    setSelectedCard(card);
    setEditTitle(card.title);
    setEditLinkIds(card.links.map(link => link.id));
    setEditPreset(cardPresets[card.id] ?? 'signal');
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedCard(null);
    setEditTitle('');
    setEditLinkIds([]);
    setSavingCard(false);
    navigation.setParams({ cardId: undefined });
  };

  const getCardQrUrl = useCallback((cardId: string) => `devcard://card/${cardId}`, []);

  const saveCardEdits = async () => {
    if (!selectedCard || !editTitle.trim() || editLinkIds.length === 0) return;
    setSavingCard(true);
    try {
      await put(`/api/cards/${selectedCard.id}`, { title: editTitle.trim(), linkIds: editLinkIds }, token);
      await saveCardPresets({ ...cardPresets, [selectedCard.id]: editPreset });
      await fetchData(false);
      setSelectedCard(prev =>
        prev
          ? { ...prev, title: editTitle.trim(), links: allLinks.filter(l => editLinkIds.includes(l.id)) }
          : prev,
      );
      closeDetail();
    } catch {
      // ignore
    } finally {
      setSavingCard(false);
    }
  };

  const toggleEditLink = (linkId: string) =>
    setEditLinkIds(prev => (prev.includes(linkId) ? prev.filter(i => i !== linkId) : [...prev, linkId]));

  const toggleLink = (linkId: string) =>
    setSelectedLinkIds(prev => (prev.includes(linkId) ? prev.filter(i => i !== linkId) : [...prev, linkId]));

  useEffect(() => {
    const cardId = route.params?.cardId;
    if (!cardId || showDetail) return;
    const card = cards.find(item => item.id === cardId);
    if (card) openDetail(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards, route.params?.cardId, showDetail]);

  const platformSummary = (card: Card) =>
    (card.links ?? [])
      .slice(0, 3)
      .map(l => PLATFORMS[l.platform]?.name || l.platform)
      .join(' · ') || 'No platforms';

  const shareCard = async (card: Card) => {
    try {
      await Share.share({ message: `Open my DevCard: ${getCardQrUrl(card.id)}` });
    } catch {
      // user cancelled
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.header}>
          <Skeleton width={140} height={34} borderRadius={10} />
          <Skeleton width={96} height={40} borderRadius={12} />
        </View>
        <View style={styles.list}>
          {[1, 2].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton width="100%" height={148} borderRadius={BORDER_RADIUS.xl} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View style={styles.header}>
        <View>
          <AppText variant="eyebrow" tone="muted">
            YOUR CARDS
          </AppText>
          <AppText variant="h1">Cards</AppText>
        </View>
        <Button label="New" icon="plus" onPress={() => setShowCreate(true)} fullWidth={false} size="sm" />
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            icon="card-account-details-outline"
            title="No cards yet"
            description="A card is a context-specific selection of your platforms — for a job search, a hackathon, or just your essentials."
            actionLabel="Create your first card"
            onAction={() => setShowCreate(true)}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.cardBlock}>
            <Pressable onPress={() => openDetail(item)} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`}>
              <CardVisual
                title={item.title}
                links={item.links}
                isDefault={item.isDefault}
                preset={cardPresets[item.id] ?? 'signal'}
                owner={user?.username}
                height={148}
              />
            </Pressable>

            <View style={styles.actionRow}>
              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.summary}>
                {platformSummary(item)}
              </AppText>
              <View style={styles.actions}>
                {item.isDefault ? (
                  <AppText variant="label" tone="muted">
                    Default
                  </AppText>
                ) : (
                  <Pressable onPress={() => setDefault(item.id)} hitSlop={8}>
                    <AppText variant="label" tone="secondary">
                      Set default
                    </AppText>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => shareCard(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Share card"
                  style={styles.iconAction}>
                  <Icon name="share-variant-outline" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => setDeleteTarget(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Delete card"
                  style={styles.iconAction}>
                  <Icon name="trash-can-outline" size={18} color={colors.error} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* ── Create ── */}
      <Sheet
        visible={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewTitle('');
          setNewDeepLink('');
          setSelectedLinkIds([]);
        }}
        eyebrow="New"
        title="Create card"
        scrollable
        footer={
          <Button
            label="Create card"
            onPress={createCard}
            disabled={!newTitle.trim() || selectedLinkIds.length === 0}
          />
        }>
        <TextField
          label="Title"
          placeholder="Professional, Hackathon, Open source…"
          value={newTitle}
          onChangeText={setNewTitle}
          maxLength={40}
        />
        <TextField
          label="Extra link (optional)"
          placeholder="devcard://u/username or example.com"
          value={newDeepLink}
          onChangeText={setNewDeepLink}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <LinkPicker
          links={allLinks}
          selectedIds={selectedLinkIds}
          onToggle={toggleLink}
        />
      </Sheet>

      {/* ── Detail (QR + edit) ── */}
      <Sheet
        visible={showDetail}
        onClose={closeDetail}
        eyebrow={`${CARD_PRESETS.find(p => p.id === editPreset)?.name ?? editPreset} preset`}
        title={selectedCard?.title || 'Card'}
        scrollable
        footer={
          <Button label={savingCard ? 'Saving…' : 'Save changes'} onPress={saveCardEdits} loading={savingCard} />
        }>
        <View style={styles.qrWrap}>
          <View style={styles.qrCard}>
            <QRCode
              value={selectedCard ? getCardQrUrl(selectedCard.id) : ''}
              size={220}
              color="#0B0D0F"
              backgroundColor="#FFFFFF"
            />
          </View>
          <AppText variant="mono" tone="muted" style={styles.qrUrl} numberOfLines={2}>
            {selectedCard ? getCardQrUrl(selectedCard.id) : ''}
          </AppText>
          <View style={styles.qrActions}>
            <Button
              label="Share"
              icon="share-variant-outline"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => selectedCard && shareCard(selectedCard)}
            />
            <Button
              label="Copy link"
              icon="content-copy"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => {
                if (selectedCard) {
                  Clipboard.setString(getCardQrUrl(selectedCard.id));
                }
              }}
              style={styles.copyBtn}
            />
          </View>
        </View>

        <AppText variant="eyebrow" tone="muted" style={styles.sectionLabel}>
          PRESET
        </AppText>
        <View style={styles.presetRow}>
          {CARD_PRESETS.map(p => {
            const active = editPreset === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setEditPreset(p.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.presetChip,
                  {
                    borderColor: active ? colors.accentBorder : colors.border,
                    backgroundColor: active ? colors.accentSoft : colors.bgCard,
                  },
                ]}>
                <AppText variant="label" tone={active ? 'accent' : 'secondary'}>
                  {p.name}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.previewWrap}>
          <CardVisual
            title={editTitle || 'Untitled'}
            links={allLinks.filter(l => editLinkIds.includes(l.id))}
            isDefault={!!selectedCard?.isDefault}
            preset={editPreset}
            owner={user?.username}
            height={170}
          />
        </View>

        <TextField
          label="Title"
          value={editTitle}
          onChangeText={setEditTitle}
          containerStyle={styles.editField}
        />
        <LinkPicker links={allLinks} selectedIds={editLinkIds} onToggle={toggleEditLink} />
      </Sheet>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete card?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function LinkPicker({
  links,
  selectedIds,
  onToggle,
}: {
  links: PlatformLink[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const { colors } = useTheme();

  if (links.length === 0) {
    return (
      <Surface variant="outline" radius="md" padding="md" style={[styles.emptyLinks, { borderColor: colors.border }]}>
        <Icon name="link-variant" size={18} color={colors.textMuted} />
        <AppText variant="caption" tone="muted" style={styles.emptyLinksText}>
          No platform links yet. Add GitHub, LinkedIn and others from your Profile first.
        </AppText>
      </Surface>
    );
  }

  return (
    <View>
      <AppText variant="eyebrow" tone="muted" style={styles.sectionLabel}>
        INCLUDE LINKS
      </AppText>
      {links.map(link => {
        const selected = selectedIds.includes(link.id);
        return (
          <Pressable
            key={link.id}
            onPress={() => onToggle(link.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            style={[
              styles.linkRow,
              {
                borderColor: selected ? colors.accentBorder : colors.border,
                backgroundColor: selected ? colors.accentSoft : colors.bgCard,
              },
            ]}>
            <View style={styles.linkRowText}>
              <PlatformRow
                platform={link.platform}
                platformName={PLATFORMS[link.platform]?.name || link.platform}
                username={link.username}
                brandColor={PLATFORMS[link.platform]?.color}
              />
            </View>
            <Icon
              name={selected ? 'check-circle' : 'circle-outline'}
              size={20}
              color={selected ? colors.accent : colors.textMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: LAYOUT.topOffset,
    paddingBottom: SPACING.md,
  },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  skeletonCard: { marginBottom: SPACING.lg },
  cardBlock: { marginBottom: SPACING.lg },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.sm },
  summary: { flex: 1, marginRight: SPACING.sm },
  actions: { flexDirection: 'row', alignItems: 'center' },
  iconAction: { marginLeft: SPACING.lg },
  qrWrap: { alignItems: 'center', marginBottom: SPACING.lg },
  qrCard: { backgroundColor: '#FFFFFF', borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
  qrUrl: { marginTop: SPACING.sm, textAlign: 'center' },
  qrActions: { flexDirection: 'row', marginTop: SPACING.md },
  copyBtn: { marginLeft: SPACING.sm },
  sectionLabel: { marginTop: SPACING.md, marginBottom: SPACING.sm },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap' },
  presetChip: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  previewWrap: { marginTop: SPACING.sm, marginBottom: SPACING.lg },
  editField: { marginTop: SPACING.sm },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  linkRowText: { flex: 1, flexShrink: 1, marginRight: SPACING.sm },
  emptyLinks: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm },
  emptyLinksText: { flex: 1, marginLeft: SPACING.sm },
});
