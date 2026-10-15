import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert, AppState, ActivityIndicator, type AppStateStatus } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PLATFORMS, getAllPlatforms } from '@devcard/shared';
import { get, post, put, del } from '../services/api';
import {
  AppText,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  LoadingRows,
  Pill,
  Sheet,
  Surface,
  TextField,
} from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { PlatformDef } from '@devcard/shared';
import DraggableFlatList, { ScaleDecorator, RenderItemParams } from 'react-native-draggable-flatlist';

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  verified?: boolean;
  checkedAt?: string | null;
  verificationStatus?: 'verified' | 'checked' | 'unverified';
}

interface Capability {
  kind: 'oauth' | 'auto' | 'existence' | 'unavailable';
  label: string;
}

export default function LinksScreen() {
  const { token } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformDef | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<PlatformLink | null>(null);
  const [removing, setRemoving] = useState(false);
  const [reorderError, setReorderError] = useState(false);
  const [capabilities, setCapabilities] = useState<Record<string, Capability>>({});
  const [verifying, setVerifying] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCapabilities = useCallback(async () => {
    const data = await get<any>('/api/verify/platforms', token).catch(() => null);
    const map: Record<string, Capability> = {};
    for (const p of data?.platforms ?? []) {
      map[p.platform] = { kind: p.kind, label: p.label };
    }
    setCapabilities(map);
  }, [token]);

  useEffect(() => {
    fetchLinks();
    fetchCapabilities();
  }, [fetchLinks, fetchCapabilities]);

  // The OAuth flow finishes in the system browser, so refresh when we come back.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') fetchLinks();
    });
    return () => sub.remove();
  }, [fetchLinks]);

  const statusOf = (link: PlatformLink): 'verified' | 'checked' | 'unverified' =>
    link.verificationStatus ?? (link.verified ? 'verified' : link.checkedAt ? 'checked' : 'unverified');

  const handleVerify = async (link: PlatformLink) => {
    const name = PLATFORMS[link.platform]?.name ?? link.platform;
    setVerifying(link.id);
    try {
      const res = await post<any>(`/api/verify/links/${link.id}/start`, undefined, token);

      if (res?.kind === 'oauth' && res.url) {
        // Result comes back through the devcard:// deep link.
        await Linking.openURL(res.url);
        return;
      }

      if (res?.kind === 'existence') {
        await post(`/api/verify/links/${link.id}/check`, undefined, token);
        await fetchLinks();
        Alert.alert(
          'Account found',
          `@${link.username} exists on ${name}. This confirms the account exists, but not that it is yours.`,
        );
      }
    } catch (err: any) {
      Alert.alert('Could not verify', err?.message || `Please try again for ${name}.`);
    } finally {
      setVerifying(null);
    }
  };

  const handleClearVerification = async (link: PlatformLink) => {
    try {
      await del(`/api/verify/links/${link.id}`, undefined, token);
    } catch {
      // ignore
    }
    fetchLinks();
  };


  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setShowAdd(true)}
          accessibilityRole="button"
          accessibilityLabel="Add platform link"
          hitSlop={8}>
          <AppText variant="label" tone="accent">
            Add
          </AppText>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const openPicker = () => {
    setSelectedPlatform(null);
    setUsernameInput('');
    setAddError(null);
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
    setSelectedPlatform(null);
    setUsernameInput('');
    setAddError(null);
  };

  const addLink = async () => {
    if (!selectedPlatform || !usernameInput.trim()) {
      setAddError('Enter your username for this platform.');
      return;
    }
    try {
      await post(
        '/api/profiles/me/links',
        { platform: selectedPlatform.id, username: usernameInput.trim() },
        token,
      );
      closeAdd();
      fetchLinks();
    } catch {
      setAddError('Could not add this link. Check the username and try again.');
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    setRemoving(true);
    try {
      await del(`/api/profiles/me/links/${deleteTarget.id}`, undefined, token);
      fetchLinks();
    } catch {
      // ignore
    }
    setRemoving(false);
    setDeleteTarget(null);
  };

  const handleReorder = async (data: PlatformLink[]) => {
    setLinks(data);
    try {
      await put(
        '/api/profiles/me/links/reorder',
        { links: data.map((link, index) => ({ id: link.id, displayOrder: index })) },
        token,
      );
      setReorderError(false);
    } catch {
      setReorderError(true);
      fetchLinks();
    }
  };

  const renderItem = ({ item, drag, isActive }: RenderItemParams<PlatformLink>) => {
    const platform = PLATFORMS[item.platform];
    const status = statusOf(item);
    const capability = capabilities[item.platform];
    const canVerify = capability?.kind === 'oauth' || capability?.kind === 'existence';

    return (
      <ScaleDecorator>
        <View
          style={[
            styles.linkItem,
            {
              backgroundColor: isActive ? colors.bgElevated : colors.bgCard,
              borderColor: isActive ? colors.accentBorder : colors.border,
            },
          ]}>
          <TouchableOpacity
            onLongPress={drag}
            disabled={isActive}
            delayLongPress={150}
            accessibilityLabel={`Reorder ${platform?.name || item.platform}`}
            hitSlop={8}
            style={styles.dragHandle}>
            <Icon name="drag-vertical" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.linkBody}>
            <AppText variant="title" numberOfLines={1}>
              {platform?.name || item.platform}
            </AppText>
            <AppText variant="mono" tone="secondary" numberOfLines={1}>
              @{item.username}
            </AppText>
          </View>

          {status === 'verified' ? (
            <TouchableOpacity
              onLongPress={() => handleClearVerification(item)}
              accessibilityRole="button"
              accessibilityLabel={`${platform?.name || item.platform} is verified. Long press to remove verification.`}
              style={[styles.badge, { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft }]}>
              <Icon name="shield-check" size={13} color={colors.accent} />
              <AppText variant="eyebrow" tone="accent" style={styles.badgeText}>
                VERIFIED
              </AppText>
            </TouchableOpacity>
          ) : status === 'checked' ? (
            <View
              accessibilityLabel={`${platform?.name || item.platform} exists, ownership not verified`}
              style={[styles.badge, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
              <Icon name="magnify" size={13} color={colors.textSecondary} />
              <AppText variant="eyebrow" tone="secondary" style={styles.badgeText}>
                CHECKED
              </AppText>
            </View>
          ) : canVerify ? (
            <TouchableOpacity
              onPress={() => handleVerify(item)}
              disabled={verifying === item.id}
              accessibilityRole="button"
              accessibilityLabel={capability?.label ?? 'Verify this account'}
              hitSlop={6}
              style={[styles.verifyBtn, { borderColor: colors.border }]}>
              {verifying === item.id ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Icon name="shield-outline" size={16} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => setDeleteTarget(item)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${platform?.name || item.platform}`}
            hitSlop={8}
            style={[styles.removeBtn, { borderColor: colors.border }]}>
            <Icon name="close" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <LoadingRows rows={4} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {links.length > 0 ? (
        <View style={styles.hintRow}>
          <Icon name="drag-vertical" size={14} color={colors.textMuted} />
          <AppText variant="caption" tone="muted" style={styles.hintText}>
            Long-press and drag to reorder how platforms appear on your card.
          </AppText>
        </View>
      ) : null}

      {reorderError ? (
        <View style={styles.errorRow}>
          <Pill label="Reorder not saved" tone="error" icon="alert-circle-outline" />
        </View>
      ) : null}

      <DraggableFlatList
        data={links}
        onDragEnd={({ data }) => handleReorder(data)}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={renderItem}
        ListEmptyComponent={
          <EmptyState
            icon="link-variant"
            title="No links yet"
            description="Add the platforms you build on so they can appear on your DevCard."
            actionLabel="Add your first link"
            onAction={openPicker}
          />
        }
      />

      {/* ── Add: platform picker → username ── */}
      <Sheet
        visible={showAdd}
        onClose={closeAdd}
        eyebrow={selectedPlatform ? selectedPlatform.name : 'New link'}
        title={selectedPlatform ? 'Enter your username' : 'Choose a platform'}
        scrollable
        footer={
          selectedPlatform ? (
            <Button label="Add link" onPress={addLink} />
          ) : (
            <Button label="Cancel" onPress={closeAdd} variant="ghost" />
          )
        }>
        {!selectedPlatform ? (
          <View style={styles.grid}>
            {getAllPlatforms()
              .filter(p => p.id !== 'custom')
              .map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.platformOption, { borderColor: colors.border, backgroundColor: colors.bgCard }]}
                  onPress={() => {
                    setSelectedPlatform(item);
                    setAddError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}>
                  <View style={[styles.platformDot, { backgroundColor: item.color }]} />
                  <AppText variant="label" numberOfLines={1} style={styles.platformOptionText}>
                    {item.name}
                  </AppText>
                </TouchableOpacity>
              ))}
          </View>
        ) : (
          <>
            <Surface variant="accent" radius="md" padding="md" style={styles.selectedCard}>
              <View style={[styles.platformDot, { backgroundColor: selectedPlatform.color }]} />
              <AppText variant="label" style={styles.platformOptionText}>
                {selectedPlatform.name}
              </AppText>
            </Surface>
            <TextField
              label="Username"
              placeholder={selectedPlatform.usernamePlaceholder}
              value={usernameInput}
              onChangeText={v => {
                setUsernameInput(v);
                setAddError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              monospace
              error={addError}
              autoFocus
            />
            <TouchableOpacity onPress={() => setSelectedPlatform(null)} accessibilityRole="button">
              <View style={styles.backRow}>
                <Icon name="arrow-left" size={15} color={colors.textSecondary} />
                <AppText variant="label" tone="secondary" style={styles.backText}>
                  Choose a different platform
                </AppText>
              </View>
            </TouchableOpacity>
          </>
        )}
      </Sheet>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Remove link?"
        message={
          deleteTarget
            ? `${PLATFORMS[deleteTarget.platform]?.name || deleteTarget.platform} will be removed and taken out of any cards using it.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  hintText: { marginLeft: SPACING.xs, flex: 1 },
  errorRow: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    marginBottom: SPACING.sm,
  },
  dragHandle: { paddingRight: SPACING.md },
  linkBody: { flex: 1 },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginRight: SPACING.sm,
  },
  badgeText: { marginLeft: 4, fontSize: 9 },
  verifyBtn: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  platformOption: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
  },
  platformDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm },
  platformOptionText: { flexShrink: 1 },
  selectedCard: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { marginLeft: SPACING.xs },
});
