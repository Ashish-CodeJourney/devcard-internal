import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, AppState, type AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { get, del } from '../services/api';
import {
  AppText,
  Button,
  ConfirmDialog,
  Icon,
  IconName,
  LoadingRows,
  Pill,
  SectionHeader,
  Surface,
} from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = NativeStackScreenProps<RootStackParamList, 'ConnectPlatforms'>;

interface ConnectedPlatform {
  platform: string;
  connectedAt: string;
  scopes: string;
}

type Integration = {
  id: string;
  name: string;
  icon: IconName;
  description: string;
  /** null = connectable; a string explains the real, external blocker. */
  blockedReason: string | null;
};

// Only GitHub is genuinely connectable today. The other two are blocked by
// provider-side requirements, and the UI states that plainly instead of
// presenting a button that cannot work.
const INTEGRATIONS: Integration[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: 'github',
    description: 'Follow developers silently, without leaving DevCard.',
    blockedReason: null,
  },
  {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'twitter',
    description: 'Follow profiles automatically from the card you are viewing.',
    blockedReason: 'Unavailable — write access requires a paid X API tier.',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    description: 'Send connection requests directly from a scanned card.',
    blockedReason: 'Unavailable — connection requests require LinkedIn partner access.',
  },
];

export const ConnectPlatformsScreen: React.FC<Props> = () => {
  const { token } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<Integration | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await get<any>('/api/connect/status', token).catch(() => null);
      setConnectedPlatforms(data?.connectedPlatforms || []);
    } catch (error) {
      console.error('Failed to fetch connected platforms', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // The OAuth hand-off returns to the app from the browser; refresh on resume.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        setConnecting(null);
        fetchConnections();
      }
    });
    return () => sub.remove();
  }, [fetchConnections]);

  const handleConnect = async (integration: Integration) => {
    if (!token) {
      setConnectError('Please sign in again to connect platforms.');
      return;
    }
    if (integration.blockedReason) return;

    setConnectError(null);
    setConnecting(integration.id);
    try {
      const { Linking } = await import('react-native');
      await Linking.openURL(`${API_BASE_URL}/api/connect/${integration.id}`);
      // Best-effort refresh; the AppState listener also refreshes on return.
      setTimeout(fetchConnections, 5000);
    } catch {
      setConnecting(null);
      setConnectError('Could not open the connection page. Check your connection.');
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget || !token) return;
    setDisconnecting(true);
    try {
      await del(`/api/connect/${disconnectTarget.id}`, undefined, token);
      await fetchConnections();
    } catch {
      setConnectError('Failed to disconnect. Please try again.');
    }
    setDisconnecting(false);
    setDisconnectTarget(null);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <LoadingRows rows={3} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Surface variant="inset" radius="lg" padding="md" style={styles.intro}>
          <Icon name="information-outline" size={16} color={colors.textSecondary} />
          <AppText variant="caption" tone="secondary" style={styles.introText}>
            Connecting an account lets DevCard act on your behalf — like following a developer — using the
            provider's official API. Scopes are requested only when you connect.
          </AppText>
        </Surface>

        {connectError ? (
          <Surface variant="outline" radius="md" padding="md" style={[styles.errorCard, { borderColor: colors.error }]}>
            <Icon name="alert-circle-outline" size={16} color={colors.error} />
            <AppText variant="caption" tone="error" style={styles.introText}>
              {connectError}
            </AppText>
          </Surface>
        ) : null}

        <SectionHeader title="Integrations" style={styles.sectionSpacing} />

        {INTEGRATIONS.map(item => {
          const isConnected = connectedPlatforms.some(p => p.platform === item.id);
          const isConnecting = connecting === item.id;
          const blocked = !!item.blockedReason;

          return (
            <Surface
              key={item.id}
              variant="default"
              radius="lg"
              padding="lg"
              style={[styles.card, isConnected ? { borderColor: colors.accentBorder } : null]}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
                  <Icon name={item.icon} size={22} color={blocked ? colors.textMuted : colors.textPrimary} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.nameRow}>
                    <AppText variant="title">{item.name}</AppText>
                    {isConnected ? <Pill label="Connected" tone="accent" icon="check" style={styles.connectedPill} /> : null}
                  </View>
                  <AppText variant="caption" tone={blocked ? 'muted' : 'secondary'} style={styles.cardDesc}>
                    {item.description}
                  </AppText>
                </View>
              </View>

              {blocked ? (
                <View style={[styles.blockedRow, { borderColor: colors.border }]}>
                  <Icon name="lock-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption" tone="muted" style={styles.blockedText}>
                    {item.blockedReason}
                  </AppText>
                </View>
              ) : isConnected ? (
                <View style={[styles.connectedRow, { borderColor: colors.border }]}>
                  <Button
                    label="Disconnect"
                    variant="destructive"
                    size="sm"
                    onPress={() => setDisconnectTarget(item)}
                    fullWidth={false}
                  />
                </View>
              ) : (
                <Button
                  label={isConnecting ? 'Waiting for browser…' : `Connect ${item.name}`}
                  onPress={() => handleConnect(item)}
                  loading={isConnecting}
                  variant="primary"
                  size="sm"
                  style={styles.connectBtn}
                />
              )}
            </Surface>
          );
        })}

        <AppText variant="caption" tone="muted" align="center" style={styles.footnote}>
          Disconnecting revokes DevCard's stored access. You can reconnect at any time.
        </AppText>
      </ScrollView>

      <ConfirmDialog
        visible={!!disconnectTarget}
        title={`Disconnect ${disconnectTarget?.name ?? ''}?`}
        message="Silent follow and connect actions for this platform will stop working."
        confirmLabel="Disconnect"
        destructive
        loading={disconnecting}
        onConfirm={confirmDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  intro: { flexDirection: 'row', alignItems: 'flex-start' },
  introText: { flex: 1, marginLeft: SPACING.sm, lineHeight: 18 },
  errorCard: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  sectionSpacing: { marginTop: SPACING.xl },
  card: { marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1, marginLeft: SPACING.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  connectedPill: { marginLeft: SPACING.sm },
  cardDesc: { marginTop: 2 },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  blockedText: { flex: 1, marginLeft: SPACING.sm },
  connectedRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  connectBtn: { marginTop: SPACING.md },
  footnote: { marginTop: SPACING.lg },
});
