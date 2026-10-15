import React, { useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { get } from '../services/api';
import { SPACING, BORDER_RADIUS, ICON_SIZE } from '../theme/tokens';
import {
  Screen,
  AppText,
  Eyebrow,
  H2,
  Body,
  Mono,
  Icon,
  Button,
  Surface,
  Skeleton,
  EmptyState,
  ErrorState,
} from '../components/ui';
import type { NfcPayload } from '../types';

/**
 * NfcScreen — NFC tag write/read UI.
 *
 * NOTE: Actual NFC hardware interaction requires `react-native-nfc-manager`
 * which needs a dev build (not Expo Go). This screen provides the UI and
 * fetches the NDEF payload from the backend. The NFC write call is stubbed
 * with a TODO for native module integration.
 */
export default function NfcScreen() {
  const { colors } = useTheme();
  const { token } = useAuth();
  const [payload, setPayload] = useState<NfcPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [written, setWritten] = useState(false);

  const fetchPayload = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await get<NfcPayload>('/api/nfc/payload', token);
      setPayload(data);
    } catch {
      setError(true);
      Alert.alert('Error', 'Failed to fetch NFC payload from server.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleWriteTag = async () => {
    if (!payload) {
      await fetchPayload();
      return;
    }

    // TODO: Integrate react-native-nfc-manager here
    // import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
    // await NfcManager.requestTechnology(NfcTech.Ndef);
    // const bytes = Ndef.encodeMessage([Ndef.uriRecord(payload.payload)]);
    // await NfcManager.ndefHandler.writeNdefMessage(bytes);
    // await NfcManager.cancelTechnologyRequest();

    Alert.alert(
      'NFC Not Available',
      'NFC write requires a dev build with react-native-nfc-manager. The payload URL has been prepared.',
      [{ text: 'OK' }],
    );
    setWritten(false);
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.iconRing, { backgroundColor: colors.bgCard, borderColor: colors.accentBorder }]}>
            <Icon name="nfc-variant" size={ICON_SIZE.xl} color={colors.accent} />
          </View>
          <Eyebrow style={styles.eyebrow}>CONTACTLESS</Eyebrow>
          <H2 align="center">NFC Tag Writer</H2>
          <Body tone="secondary" align="center" style={styles.heroBody}>
            Write your DevCard URL to an NFC tag so anyone can tap to view your profile.
          </Body>
        </View>

        <Surface variant="outline" radius="lg" padding="md" style={styles.notice}>
          <Icon name="information-outline" size={ICON_SIZE.sm} color={colors.warning} />
          <AppText variant="caption" tone="secondary" style={styles.noticeText}>
            NFC writing requires a dev build with react-native-nfc-manager. This screen only prepares the
            payload URL.
          </AppText>
        </Surface>

        <View style={styles.dataSection}>
          {loading ? (
            <Surface variant="default" radius="lg" padding="lg">
              <Skeleton width="38%" height={14} />
              <Skeleton width="90%" height={18} style={styles.skeletonLine} />
            </Surface>
          ) : error ? (
            <ErrorState
              title="Couldn't load payload"
              message="We couldn't reach the server for your NFC payload."
              onRetry={fetchPayload}
            />
          ) : payload ? (
            <Surface variant="default" radius="lg" padding="lg">
              <View style={styles.cardRow}>
                <Icon name="link-variant" size={ICON_SIZE.sm} color={colors.textSecondary} />
                <Eyebrow style={styles.cardLabel}>PAYLOAD URL</Eyebrow>
              </View>
              <Mono color={colors.accent} selectable numberOfLines={2} style={styles.payloadUrl}>
                {payload.payload}
              </Mono>
            </Surface>
          ) : (
            <EmptyState
              icon="nfc-variant"
              title="No payload prepared"
              description="Generate your tap-to-share URL, then write it to a tag."
            />
          )}
        </View>

        <View style={styles.actions}>
          <Button
            label="Prepare Payload"
            icon="refresh"
            variant="secondary"
            onPress={fetchPayload}
            loading={loading}
          />
          <Button
            label="Write to NFC Tag"
            icon="nfc-variant"
            onPress={handleWriteTag}
            disabled={!payload}
            style={styles.writeBtn}
          />
        </View>

        {written && (
          <Surface
            variant="default"
            radius="md"
            padding="md"
            style={[styles.successBanner, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
            <Icon name="check-circle" size={ICON_SIZE.sm} color={colors.success} />
            <AppText variant="label" tone="success" style={styles.successText}>
              Tag written successfully!
            </AppText>
          </Surface>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  hero: { alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  eyebrow: { marginBottom: SPACING.xs },
  heroBody: { marginTop: SPACING.sm, maxWidth: 320 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.lg },
  noticeText: { flex: 1, marginLeft: SPACING.sm },
  dataSection: { marginBottom: SPACING.lg },
  skeletonLine: { marginTop: SPACING.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  cardLabel: { marginLeft: SPACING.sm },
  payloadUrl: { marginTop: SPACING.xxs },
  actions: { marginTop: SPACING.xxs },
  writeBtn: { marginTop: SPACING.sm },
  successBanner: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.lg },
  successText: { marginLeft: SPACING.sm },
});
