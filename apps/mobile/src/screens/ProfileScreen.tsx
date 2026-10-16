import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { del, get, post, put } from '../services/api';
import { PLATFORMS } from '@devcard/shared';
import {
  AppText,
  Avatar,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  PlatformRow,
  SectionHeader,
  Sheet,
  Surface,
  TextField,
} from '../components/ui';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';

type PlatformLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  verified?: boolean;
  checkedAt?: string | null;
  verificationStatus?: 'verified' | 'checked' | 'unverified';
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, token, refreshUser } = useAuth();
  const { colors } = useTheme();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [platformNameInput, setPlatformNameInput] = useState('');
  const [profileLinkInput, setProfileLinkInput] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PlatformLink | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setUsername(user?.username || '');
    setAvatarUrl(user?.avatarUrl || '');
    setBio(user?.bio || '');
    setPronouns(user?.pronouns || '');
  }, [user]);

  const loadLinks = useCallback(async () => {
    const data = await get<any>('/api/profiles/me', token).catch(() => null);
    setLinks(data?.platformLinks || []);
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadLinks();
    }, [loadLinks]),
  );

  const openAdd = () => {
    setPlatformNameInput('');
    setProfileLinkInput('');
    setAddError(null);
    setShowAdd(true);
  };

  const normalizeProfileLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const handleAddLink = async () => {
    if (!platformNameInput.trim() || !profileLinkInput.trim()) {
      setAddError('Enter both a platform name and a profile link.');
      return;
    }
    setAddingLink(true);
    setAddError(null);
    try {
      await post(
        '/api/profiles/me/links',
        { platform: platformNameInput.trim(), url: normalizeProfileLink(profileLinkInput) },
        token,
      );
      setShowAdd(false);
      await loadLinks();
    } catch {
      setAddError('Could not add that link. Check the URL and try again.');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!deleteTarget) return;
    setRemoving(true);
    try {
      await del(`/api/profiles/me/links/${deleteTarget.id}`, undefined, token);
      await loadLinks();
    } catch {
      // ignore
    }
    setRemoving(false);
    setDeleteTarget(null);
  };

  const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
  const isDataImage = (v: string) => /^data:image\//i.test(v);

  // Opens the system photo picker. The image is downscaled on-device and stored
  // as a compact base64 data URI so it works without any file-storage service.
  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        maxWidth: 320,
        maxHeight: 320,
        quality: 0.7,
        includeBase64: true,
        selectionLimit: 1,
      });
      if (result.didCancel || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.base64) {
        const mime = asset.type || 'image/jpeg';
        setAvatarUrl(`data:${mime};base64,${asset.base64}`);
      } else if (asset.uri) {
        setAvatarUrl(asset.uri);
      }
      setSaveError(null);
      setSavedAt(null);
    } catch {
      setSaveError('Could not open your photo library.');
    }
  };

  const handleSave = async () => {
    const nextUsername = username.trim().toLowerCase();
    const nextDisplayName = displayName.trim();
    const nextAvatar = avatarUrl.trim();

    if (!nextDisplayName) {
      setSaveError('Display name cannot be empty.');
      return;
    }
    if (nextUsername.length < 3 || !USERNAME_RE.test(nextUsername)) {
      setSaveError('Handle must be 3+ characters: letters, numbers, - or _ only.');
      return;
    }
    if (nextAvatar && !isDataImage(nextAvatar) && !/^https?:\/\/\S+$/i.test(nextAvatar)) {
      setSaveError('Use "Upload photo", or paste a valid http(s) image link.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      await put(
        '/api/profiles/me',
        {
          displayName: nextDisplayName,
          username: nextUsername,
          avatarUrl: nextAvatar || null,
          bio: bio.trim() || null,
          pronouns: pronouns.trim() || null,
        },
        token,
      );
      await refreshUser();
      setSavedAt(Date.now());
    } catch (err: any) {
      const msg = String(err?.message || '');
      setSaveError(
        msg.includes('409') || msg.toLowerCase().includes('taken')
          ? `@${nextUsername} is already taken.`
          : 'Could not save your profile. Check your connection and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.displayName || user?.username || 'Dev';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <AppText variant="eyebrow" tone="muted">
              YOUR IDENTITY
            </AppText>
            <AppText variant="h1">Profile</AppText>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <Icon name="cog-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Identity card ── */}
        <Surface variant="default" radius="xl" padding="lg" style={styles.identityCard}>
          <View style={styles.identityTop}>
            <Avatar uri={avatarUrl || user?.avatarUrl} name={initials} size={64} ring />
            <View style={styles.identityText}>
              <AppText variant="h3" numberOfLines={1}>
                {displayName || user?.username || 'Developer'}
              </AppText>
              <AppText variant="mono" tone="secondary" numberOfLines={1}>
                @{username || 'you'}
              </AppText>
              {user?.company || user?.role ? (
                <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.identityMeta}>
                  {[user?.role, user?.company].filter(Boolean).join(' · ')}
                </AppText>
              ) : null}
            </View>
          </View>
        </Surface>

        {/* ── Editable details ── */}
        <SectionHeader title="Details" style={styles.sectionSpacing} />
        <TextField label="Display name" value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
        <TextField
          label="Handle"
          value={username}
          onChangeText={v => setUsername(v.replace(/[^a-zA-Z0-9_-]/g, ''))}
          placeholder="your-handle"
          autoCapitalize="none"
          autoCorrect={false}
          monospace
          hint="Your public @handle. Letters, numbers, - and _ only."
        />
        <AppText variant="eyebrow" tone="muted" style={styles.fieldLabel}>
          PROFILE PICTURE
        </AppText>
        <View style={styles.photoRow}>
          <Avatar uri={avatarUrl || user?.avatarUrl} name={initials} size={62} ring />
          <View style={styles.photoActions}>
            <Button
              label={avatarUrl || user?.avatarUrl ? 'Change photo' : 'Upload photo'}
              icon="image-outline"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={handlePickPhoto}
            />
            {avatarUrl ? (
              <Button
                label="Remove"
                icon="close"
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => setAvatarUrl('')}
                style={styles.photoRemove}
              />
            ) : null}
          </View>
        </View>
        <AppText variant="caption" tone="muted" style={styles.photoHint}>
          Pick an image from your gallery — no link needed.
        </AppText>

        <TextField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="One line about what you build"
          multiline
        />
        <TextField label="Pronouns" value={pronouns} onChangeText={setPronouns} placeholder="Optional" />

        {saveError ? (
          <View style={styles.errorRow}>
            <Icon name="alert-circle-outline" size={14} color={colors.error} />
            <AppText variant="caption" tone="error" style={styles.errorText}>
              {saveError}
            </AppText>
          </View>
        ) : null}

        <View style={styles.saveRow}>
          <Button
            label={saving ? 'Saving…' : 'Save profile'}
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
          {savedAt && !saveError ? (
            <View style={styles.savedHint}>
              <Icon name="check" size={14} color={colors.success} />
              <AppText variant="caption" tone="success" style={styles.savedHintText}>
                Saved
              </AppText>
            </View>
          ) : null}
        </View>

        {/* ── Platform links ── */}
        <SectionHeader
          title={`Platforms · ${links.length}`}
          style={styles.sectionSpacing}
          action={{ label: 'Browse all', icon: 'dots-grid', onPress: () => navigation.navigate('Links') }}
        />

        {links.length === 0 ? (
          <Surface variant="outline" radius="xl" padding="lg" style={{ borderColor: colors.border }}>
            <EmptyState
              icon="link-variant"
              title="No platforms yet"
              description="Add the places you build — GitHub, LinkedIn, npm and more."
              actionLabel="Add a link"
              onAction={openAdd}
            />
          </Surface>
        ) : (
          <Surface variant="default" radius="lg" padding="sm" style={styles.linksCard}>
            {links.map((link, i) => (
              <View key={link.id}>
                {i > 0 ? <View style={[styles.rowDivider, { backgroundColor: colors.border }]} /> : null}
                <View style={styles.linkRowPad}>
                  <PlatformRow
                    platform={link.platform}
                    platformName={PLATFORMS[link.platform]?.name || link.platform}
                    username={link.username}
                    brandColor={PLATFORMS[link.platform]?.color}
                    actions={[
                      {
                        icon: 'trash-can-outline',
                        label: `Remove ${PLATFORMS[link.platform]?.name || link.platform}`,
                        tone: 'danger',
                        onPress: () => setDeleteTarget(link),
                      },
                    ]}
                    right={
                      link.verified ? (
                        <Icon name="shield-check" size={16} color={colors.accent} />
                      ) : link.checkedAt ? (
                        <Icon name="magnify" size={16} color={colors.textSecondary} />
                      ) : null
                    }
                  />
                </View>
              </View>
            ))}
          </Surface>
        )}

        <Button
          label="Add platform link"
          icon="plus"
          variant="tertiary"
          onPress={openAdd}
          style={styles.addBtn}
        />
      </ScrollView>

      {/* ── Add link ── */}
      <Sheet
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        eyebrow="New"
        title="Add platform link"
        footer={<Button label="Add link" onPress={handleAddLink} loading={addingLink} />}>
        <TextField
          label="Platform"
          placeholder="GitHub"
          value={platformNameInput}
          onChangeText={v => {
            setPlatformNameInput(v);
            setAddError(null);
          }}
          autoCapitalize="words"
          error={addError && !platformNameInput.trim() ? addError : null}
        />
        <TextField
          label="Profile link"
          placeholder="https://github.com/yourname"
          value={profileLinkInput}
          onChangeText={v => {
            setProfileLinkInput(v);
            setAddError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          monospace
          error={addError && platformNameInput.trim() ? addError : null}
          hint="Paste your full profile URL."
        />
        <Pressable onPress={() => navigation.navigate('Links')} accessibilityRole="button">
          <View style={styles.browseRow}>
            <AppText variant="label" tone="accent">
              Browse known platforms instead
            </AppText>
            <Icon name="arrow-right" size={15} color={colors.accent} style={styles.browseIcon} />
          </View>
        </Pressable>
      </Sheet>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Remove link?"
        message={
          deleteTarget
            ? `${PLATFORMS[deleteTarget.platform]?.name || deleteTarget.platform} will be removed from your profile and any cards using it.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removing}
        onConfirm={handleDeleteLink}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.lg, paddingTop: LAYOUT.topOffset, paddingBottom: SPACING.xxxl },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: SPACING.lg },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityCard: { marginBottom: SPACING.xs },
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  identityText: { flex: 1, marginLeft: SPACING.md },
  identityMeta: { marginTop: 2 },
  sectionSpacing: { marginTop: SPACING.xl },
  saveRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs },
  fieldLabel: { marginBottom: SPACING.sm },
  photoRow: { flexDirection: 'row', alignItems: 'center' },
  photoActions: { flex: 1, marginLeft: SPACING.md, alignItems: 'flex-start' },
  photoRemove: { marginTop: SPACING.xs },
  photoHint: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  errorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  errorText: { marginLeft: SPACING.xs, flex: 1 },
  saveBtn: { flex: 1 },
  savedHint: { flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.md },
  savedHintText: { marginLeft: SPACING.xs },
  linksCard: { marginTop: SPACING.xs },
  linkRowPad: { paddingHorizontal: SPACING.xs },
  rowDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: SPACING.sm },
  addBtn: { marginTop: SPACING.md },
  browseRow: { flexDirection: 'row', alignItems: 'center' },
  browseIcon: { marginLeft: SPACING.xs },
});
