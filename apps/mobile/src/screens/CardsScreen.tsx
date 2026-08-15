import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLATFORMS } from '@devcard/shared';
import { get, post, del, put } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { Skeleton } from '../components/Skeleton';
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

export default function CardsScreen() {
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList, 'Cards'>>();
  const route = useRoute<RouteProp<MainTabsParamList, 'Cards'>>();
  const themed = React.useMemo(() => createCardsThemedStyles(colors), [colors]);
  const [cards, setCards] = useState<Card[]>([]);
  const [allLinks, setAllLinks] = useState<PlatformLink[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLinkIds, setEditLinkIds] = useState<string[]>([]);
  const [savingCard, setSavingCard] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDeepLink, setNewDeepLink] = useState('');
  const [selectedLinkIds, setSelectedLinkIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardDeepLinks, setCardDeepLinks] = useState<Record<string, string>>({});

  const loadCardDeepLinks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(CARD_DEEP_LINKS_KEY);
      setCardDeepLinks(raw ? JSON.parse(raw) : {});
    } catch {
      setCardDeepLinks({});
    }
  }, []);

  const saveCardDeepLinks = useCallback(async (next: Record<string, string>) => {
    setCardDeepLinks(next);
    await AsyncStorage.setItem(CARD_DEEP_LINKS_KEY, JSON.stringify(next));
  }, []);

  const fetchData = useCallback(async (showLoading = true) => {
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
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      loadCardDeepLinks();
    }, [fetchData, loadCardDeepLinks])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  const createCard = async () => {
    if (!newTitle.trim() || selectedLinkIds.length === 0) {
      Alert.alert('Error', 'Please enter a title and select at least one link');
      return;
    }

    const formattedDeepLink = newDeepLink.trim()
      ? (newDeepLink.includes('://') ? newDeepLink.trim() : `https://${newDeepLink.trim()}`)
      : '';

    if (formattedDeepLink) {
      const canOpen = await Linking.canOpenURL(formattedDeepLink).catch(() => false);
      if (!canOpen) {
        Alert.alert('Invalid link', 'Please enter a valid deep link or URL.');
        return;
      }
    }

    try {
      const created = await post<any>('/api/cards', {
        title: newTitle.trim(),
        linkIds: selectedLinkIds,
      }, token);

      if (formattedDeepLink && created?.id) {
        const nextLinks = { ...cardDeepLinks, [created.id]: formattedDeepLink };
        await saveCardDeepLinks(nextLinks);
      }

      setShowCreate(false);
      setNewTitle('');
      setNewDeepLink('');
      setSelectedLinkIds([]);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to create card');
    }
  };

  const deleteCard = (id: string) => {
    Alert.alert('Delete Card', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del(`/api/cards/${id}`, undefined, token);
          } catch {
            // ignore
          }
          fetchData();
        },
      },
    ]);
  };

  const setDefault = async (id: string) => {
    try {
      await put(`/api/cards/${id}/default`, undefined, token);
    } catch {
      // ignore
    }
    fetchData();
  };

  const onCardPress = (card: Card) => {
    setSelectedCard(card);
    setEditTitle(card.title);
    setEditLinkIds(card.links.map(link => link.id));
    setShowQrModal(true);
  };

  const closeQrModal = () => {
    setShowQrModal(false);
    setSelectedCard(null);
    setEditTitle('');
    setEditLinkIds([]);
    setSavingCard(false);
    navigation.setParams({ cardId: undefined });
  };

  const getCardQrUrl = useCallback((cardId: string) => `devcard://card/${cardId}`, []);

  const saveCardEdits = async () => {
    if (!selectedCard) return;
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a card title');
      return;
    }
    if (editLinkIds.length === 0) {
      Alert.alert('Error', 'Please select at least one link');
      return;
    }

    setSavingCard(true);
    try {
      await put(`/api/cards/${selectedCard.id}`, {
        title: editTitle.trim(),
        linkIds: editLinkIds,
      }, token);
      await fetchData(false);
      setSelectedCard(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        links: allLinks.filter(link => editLinkIds.includes(link.id)),
      } : prev);
      Alert.alert('Saved', 'Card updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update card');
    } finally {
      setSavingCard(false);
    }
  };

  const toggleEditLink = (linkId: string) => {
    setEditLinkIds(prev => (
      prev.includes(linkId) ? prev.filter(id => id !== linkId) : [...prev, linkId]
    ));
  };

  useEffect(() => {
    const cardId = route.params?.cardId;
    if (!cardId || showQrModal) return;

    const card = cards.find(item => item.id === cardId);
    if (card) {
      setSelectedCard(card);
      setEditTitle(card.title);
      setEditLinkIds(card.links.map(link => link.id));
      setShowQrModal(true);
    }
  }, [cards, route.params?.cardId, showQrModal]);

  const toggleLink = (linkId: string) => {
    setSelectedLinkIds(prev =>
      prev.includes(linkId)
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  const getPlatformSummary = (card: Card) => {
    const names = (card.links ?? [])
      .slice(0, 4)
      .map(link => PLATFORMS[link.platform]?.name || link.platform);
    return names.join(' · ');
  };

  if (loading) {
    return (
      <SafeAreaView style={themed.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
        <View style={styles.header}>        
          <Skeleton width={180} height={34} borderRadius={12} />
          <Skeleton width={100} height={36} borderRadius={18} />
        </View>
        <View style={styles.loadingList}>
          {[1, 2].map((item) => (
            <View key={item} style={styles.loadingCard}>
              <Skeleton width="100%" height={180} borderRadius={20} />
              <View style={styles.loadingActionRow}>
                <Skeleton width={120} height={36} borderRadius={16} />
                <Skeleton width={80} height={30} borderRadius={16} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={themed.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

      <View style={styles.header}>
        <Text style={themed.title}>My Cards</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreate(true)}>
          <Text style={styles.addButtonText}>+ New card</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cards}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={[styles.cardContainer, item.isDefault && styles.defaultCardContainer]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onCardPress(item)}
              style={[styles.cardTile, item.isDefault ? themed.cardDefault : themed.cardNormal]}>
              <View style={styles.cardTopRow}>
                {item.isDefault ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>ACTIVE</Text>
                  </View>
                ) : <View />}
                <TouchableOpacity onPress={() => setDefault(item.id)}>
                  <Text style={styles.editText}>{item.isDefault ? 'Default' : 'Set default'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cardContentRow}>
                <View style={styles.cardDetails}>
                  <Text style={[themed.cardName, item.isDefault && styles.cardNameActive]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={themed.platformSummary} numberOfLines={1}>
                    {getPlatformSummary(item)}
                  </Text>
                  <Text style={themed.platformCount}>{(item.links ?? []).length} platforms</Text>
                </View>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={getCardQrUrl(item.id)}
                    size={72}
                    color="#111827"
                    backgroundColor={COLORS.white}
                  />
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.actionRow}>
              <View />
              <TouchableOpacity onPress={() => deleteCard(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            <TouchableOpacity style={themed.createTile} onPress={() => setShowCreate(true)}>
              <Text style={themed.createTileTitle}>+ Create a new context card</Text>
              <Text style={themed.createTileSub}>e.g. "Open Source" or "Job Search"</Text>
            </TouchableOpacity>
            <View style={styles.tipCard}>
              <Text style={styles.tipText}>Tip: select active card before opening Share screen</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            emoji="💳"
            title="No cards yet"
            description="Create context cards for different situations"
          />
        }
      />

      {/* Create Card Modal */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={themed.modalContent}>
            <Text style={styles.modalTitle}>Create Card</Text>
            <TextInput
              style={themed.input}
              placeholder="Card title (e.g. Professional, Hackathon)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={themed.input}
              placeholder="Deep link or URL (e.g. devcard://u/demo or example.com)"
              placeholderTextColor={colors.textMuted}
              value={newDeepLink}
              onChangeText={setNewDeepLink}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.selectLabel}>Select platforms to include:</Text>
            {allLinks.length === 0 ? (
              <View style={styles.noLinksHint}>
                <Text style={styles.noLinksHintText}>You haven't added any links yet.</Text>
                <Text style={styles.noLinksHintSubtext}>Go to the "Links" tab to add your GitHub, LinkedIn, etc. before creating a card.</Text>
              </View>
            ) : (
              allLinks.map(link => (
                <TouchableOpacity
                  key={link.id}
                  style={[themed.linkOption, selectedLinkIds.includes(link.id) && styles.linkSelected]}
                  onPress={() => toggleLink(link.id)}>
                  <View style={[styles.dot, { backgroundColor: PLATFORMS[link.platform]?.color || COLORS.primary }]} />
                  <Text style={themed.linkOptionText}>
                    {PLATFORMS[link.platform]?.name || link.platform} — {link.username}
                  </Text>
                  {selectedLinkIds.includes(link.id) && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={styles.submitBtn} onPress={createCard}>
              <Text style={styles.submitBtnText}>Create Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setShowCreate(false); setNewTitle(''); setNewDeepLink(''); setSelectedLinkIds([]); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showQrModal} animationType="fade" transparent>
        <View style={styles.qrModalOverlay}>
          <View style={[styles.qrModal, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <View style={styles.qrModalHeader}>
              <View>
                <Text style={[styles.qrModalTitle, { color: colors.textPrimary }]}>{selectedCard?.title || 'Card'}</Text>
                <Text style={[styles.qrModalSubtitle, { color: colors.textMuted }]}>Scan to open the card and choose a profile</Text>
              </View>
              <TouchableOpacity onPress={closeQrModal} style={styles.qrCloseBtn}>
                <Text style={[styles.qrCloseText, { color: colors.textPrimary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.qrPreviewWrap}>
              <View style={styles.qrPreviewCard}>
                <QRCode
                  value={selectedCard ? getCardQrUrl(selectedCard.id) : ''}
                  size={240}
                  color="#111827"
                  backgroundColor={COLORS.white}
                />
                <Text style={[styles.qrUrl, { color: colors.textMuted }]} numberOfLines={2}>
                  {selectedCard ? getCardQrUrl(selectedCard.id) : ''}
                </Text>
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionLabel}>Edit Card</Text>
              <TextInput
                style={themed.input}
                placeholder="Card title"
                placeholderTextColor={colors.textMuted}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text style={styles.selectLabel}>Select links to include:</Text>
              <View style={styles.editLinksList}>
                {allLinks.map(link => (
                  <TouchableOpacity
                    key={link.id}
                    style={[themed.linkOption, editLinkIds.includes(link.id) && styles.linkSelected]}
                    onPress={() => toggleEditLink(link.id)}>
                    <View style={[styles.dot, { backgroundColor: PLATFORMS[link.platform]?.color || COLORS.primary }]} />
                    <Text style={themed.linkOptionText}>
                      {PLATFORMS[link.platform]?.name || link.platform} — {link.username}
                    </Text>
                    {editLinkIds.includes(link.id) && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                ))}
                {allLinks.length === 0 && (
                  <View style={styles.noLinksHint}>
                    <Text style={styles.noLinksHintText}>You haven't added any links yet.</Text>
                    <Text style={styles.noLinksHintSubtext}>Go to the "Links" tab to add GitHub, LinkedIn, etc.</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={saveCardEdits} disabled={savingCard}>
                <Text style={styles.submitBtnText}>{savingCard ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, paddingBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  addButton: {
    backgroundColor: '#1E1E1E', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
  },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: FONT_SIZE.sm },
  list: { padding: SPACING.lg, gap: SPACING.md },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textPrimary },
  emptySubtext: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  loadingList: { paddingHorizontal: SPACING.lg },
  loadingCard: {
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.bgCard,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  loadingActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  qrModalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  modalContent: {
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl, padding: SPACING.lg, maxHeight: '80%',
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.lg, textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, color: COLORS.textPrimary, fontSize: FONT_SIZE.md,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
  },
  selectLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  linkOption: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard, borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md, marginBottom: SPACING.xs,
    borderWidth: 1, borderColor: COLORS.border,
  },
  linkSelected: { borderColor: COLORS.primary, backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  linkOptionText: { flex: 1, fontSize: FONT_SIZE.sm, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  checkmark: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.md },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  cancelBtn: { marginTop: SPACING.md, padding: SPACING.md, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  noLinksHint: {
    padding: SPACING.lg,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  noLinksHintText: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.xs,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  noLinksHintSubtext: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
  // Premium Card Styles
  cardContainer: { marginBottom: SPACING.md },
  defaultCardContainer: {},
  cardTile: {
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderWidth: 1,
  },
  cardNormal: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardDefault: {
    backgroundColor: '#1D2B3A',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  activePill: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
  },
  activePillText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editText: {
    color: COLORS.primaryLight,
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  cardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  cardDetails: {
    flex: 1,
  },
  qrContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.xs,
  },
  qrModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
  },
  qrModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  qrModalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  qrModalSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  qrCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  qrCloseText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  qrPreviewWrap: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrPreviewCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  qrUrl: {
    marginTop: SPACING.sm,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    maxWidth: 260,
  },
  editSection: {
    gap: SPACING.sm,
  },
  editSectionLabel: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  editLinksList: {
    maxHeight: 240,
    gap: SPACING.xs,
  },
  cardName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardNameActive: {
    color: '#8BC4FF',
  },
  platformSummary: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.sm,
  },
  platformCount: {
    alignSelf: 'flex-start',
    color: COLORS.textMuted,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    fontSize: FONT_SIZE.xs,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  deleteBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    color: 'rgba(239, 68, 68, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  createTile: {
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
  },
  createTileTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
  },
  createTileSub: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.xs,
  },
  tipCard: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  tipText: {
    color: '#F4C27A',
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
  },
});

function createCardsThemedStyles(colors: typeof COLORS) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgPrimary },
    title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: colors.textPrimary },
    cardNormal: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardDefault: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    cardName: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    platformSummary: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.md,
      marginBottom: SPACING.sm,
    },
    platformCount: {
      alignSelf: 'flex-start',
      color: colors.textMuted,
      backgroundColor: colors.bgSecondary,
      borderRadius: 999,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 3,
      fontSize: FONT_SIZE.xs,
    },
    createTile: {
      marginTop: SPACING.sm,
      borderRadius: BORDER_RADIUS.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      backgroundColor: colors.bgSecondary,
      paddingVertical: SPACING.xl,
      alignItems: 'center',
    },
    createTileTitle: {
      color: colors.textSecondary,
      fontSize: FONT_SIZE.lg,
      fontWeight: '500',
    },
    createTileSub: {
      color: colors.textMuted,
      fontSize: FONT_SIZE.sm,
      marginTop: SPACING.xs,
    },
    modalContent: {
      backgroundColor: colors.bgSecondary,
      borderTopLeftRadius: BORDER_RADIUS.xl,
      borderTopRightRadius: BORDER_RADIUS.xl,
      padding: SPACING.lg,
      maxHeight: '80%',
    },
    input: {
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.md,
      padding: SPACING.md,
      color: colors.textPrimary,
      fontSize: FONT_SIZE.md,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: SPACING.md,
    },
    linkOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgCard,
      borderRadius: BORDER_RADIUS.sm,
      padding: SPACING.md,
      marginBottom: SPACING.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkOptionText: { flex: 1, fontSize: FONT_SIZE.sm, color: colors.textPrimary, marginLeft: SPACING.sm },
  });
}
