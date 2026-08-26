import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { del, get, post, put } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PLATFORMS } from '@devcard/shared';

type PlatformLink = {
  id: string;
  platform: string;
  username: string;
  url: string;
  logoUrl?: string | null;
};

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, token, refreshUser } = useAuth();
  const { colors, isDark } = useTheme();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLink, setSelectedLink] = useState<PlatformLink | null>(null);
  const [platformNameInput, setPlatformNameInput] = useState('');
  const [profileLinkInput, setProfileLinkInput] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBio(user?.bio || '');
    setPronouns(user?.pronouns || '');
  }, [user]);

  useEffect(() => {
    const loadProfile = async () => {
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
    };
    loadProfile();
  }, [token]);

  const shownLinks = useMemo(() => links, [links]);

  const openAddLinkModal = () => {
    setPlatformNameInput('');
    setProfileLinkInput('');
    setShowAddModal(true);
  };

  const closeAddLinkModal = () => {
    setShowAddModal(false);
    setPlatformNameInput('');
    setProfileLinkInput('');
  };

  const normalizeProfileLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const openDeleteModal = (link: PlatformLink) => {
    setSelectedLink(link);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedLink(null);
  };

  const handleDeleteLink = async () => {
    if (!selectedLink) return;

    try {
      await del(`/api/profiles/me/links/${selectedLink.id}`, undefined, token);
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
      closeDeleteModal();
    } catch {
      Alert.alert('Error', 'Failed to remove link');
    }
  };

  const handleAddLink = async () => {
    if (!platformNameInput.trim() || !profileLinkInput.trim()) {
      Alert.alert('Missing information', 'Please enter the platform name and profile link.');
      return;
    }

    setAddingLink(true);
    try {
      await post('/api/profiles/me/links', {
        platform: platformNameInput.trim(),
        url: normalizeProfileLink(profileLinkInput),
      }, token);

      closeAddLinkModal();
      const data = await get<any>('/api/profiles/me', token).catch(() => null);
      setLinks(data?.platformLinks || []);
    } catch {
      Alert.alert('Error', 'Failed to add link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await put('/api/profiles/me', {
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || null,
        pronouns: pronouns.trim() || null,
      }, token);
      await refreshUser();
      Alert.alert('Saved', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Unable to save profile right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            accessibilityLabel="Open settings"
            accessibilityRole="button"
            style={[styles.settingsButton, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={[styles.settingsIcon, { color: colors.textSecondary }]}>⚙</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
          <TouchableOpacity disabled={saving} onPress={handleSave} style={styles.saveButtonInline}>
            <Text style={[styles.saveText, { color: colors.primaryLight }]}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.avatarCircle, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.avatarIcon, { color: colors.textSecondary }]}>Photo</Text>
          <Text style={[styles.avatarHint, { color: colors.textMuted }]}>tap to upload</Text>
        </View>

        <Field label="Display Name" value={displayName} onChangeText={setDisplayName} />
        <Field label="One-line Bio" value={bio} onChangeText={setBio} />
        <Field label="Pronouns (optional)" value={pronouns} onChangeText={setPronouns} />

        <View style={styles.platformHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connected Platforms</Text>
          <TouchableOpacity onPress={openAddLinkModal}>
            <Text style={[styles.addText, { color: colors.primaryLight }]}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {shownLinks.map(link => {
          const platform = PLATFORMS[link.platform];
          return (
            <View key={link.id} style={styles.platformCard}>
              {link.logoUrl ? (
                <Image source={{ uri: link.logoUrl }} style={styles.platformLogo} />
              ) : (
                <View style={[styles.platformDot, { backgroundColor: platform?.color || COLORS.primary }]} />
              )}
              <View style={styles.platformBody}>
                <Text style={styles.platformName}>{platform?.name || link.platform}</Text>
                <Text style={styles.platformHandle}>@{link.username}</Text>
              </View>
              <TouchableOpacity onPress={() => openDeleteModal(link)} style={styles.deleteBtn}>
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity style={[styles.addMoreCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]} onPress={openAddLinkModal}>
          <Text style={[styles.addMoreText, { color: colors.textMuted }]}>
            + Add a platform link
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Add Platform Link</Text>

            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Platform name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="GitHub"
                placeholderTextColor={colors.textMuted}
                value={platformNameInput}
                onChangeText={setPlatformNameInput}
                autoCapitalize="words"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Profile link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="https://github.com/yourname"
                placeholderTextColor={colors.textMuted}
                value={profileLinkInput}
                onChangeText={setProfileLinkInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={[styles.submitButton, addingLink && styles.submitButtonDisabled]}
                onPress={handleAddLink}
                disabled={addingLink}>
                <Text style={styles.submitButtonText}>{addingLink ? 'Adding...' : 'Add Link'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancelButton} onPress={closeAddLinkModal}>
              <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.textPrimary }]}>Remove Link</Text>
            <Text style={[styles.confirmBody, { color: colors.textSecondary }]}>Remove {PLATFORMS[selectedLink?.platform || '']?.name || selectedLink?.platform || 'this'} from your profile?</Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmCancelBtn, { borderColor: colors.border }]} onPress={closeDeleteModal}>
                <Text style={[styles.confirmCancelText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, styles.confirmRemoveBtn]} onPress={handleDeleteLink}>
                <Text style={styles.confirmRemoveText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  settingsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsIcon: {
    fontSize: 20,
    lineHeight: 24,
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  saveButtonInline: { minWidth: 38, alignItems: 'flex-end' },
  saveText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.md, fontWeight: '600' },
  avatarCircle: {
    alignSelf: 'center',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  avatarIcon: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  avatarHint: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  fieldWrap: { marginBottom: SPACING.md },
  fieldLabel: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  fieldInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.bgCard,
    fontSize: FONT_SIZE.md,
  },
  platformHeader: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  addText: { color: COLORS.primaryLight, fontSize: FONT_SIZE.md, fontWeight: '600' },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5E8C3D',
    backgroundColor: '#223322',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  platformDot: { width: 20, height: 20, borderRadius: 6, marginRight: SPACING.sm },
  platformLogo: { width: 20, height: 20, borderRadius: 4, marginRight: SPACING.sm },
  platformBody: { flex: 1 },
  platformName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: '500' },
  platformHandle: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  deleteBtn: { paddingVertical: 6, paddingHorizontal: 10 },
  deleteBtnText: { color: '#FCA5A5', fontSize: FONT_SIZE.sm, fontWeight: '700' },
  addMoreCard: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgSecondary,
  },
  addMoreText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  confirmCard: {
    margin: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
  },
  confirmTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  confirmBody: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  confirmBtn: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  confirmCancelBtn: {
    backgroundColor: COLORS.bgCard,
  },
  confirmCancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  confirmRemoveBtn: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  confirmRemoveText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  inputSection: {
    gap: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
  },
  cancelButton: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.md,
  },
});
