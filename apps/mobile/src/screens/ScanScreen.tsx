import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  PermissionsAndroid,
  Linking,
  AppState,
  NativeModules,
  ActivityIndicator,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'react-native-camera-kit';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';
import { useContacts } from '../hooks/useContacts';
import { get } from '../services/api';
import { PLATFORMS } from '@devcard/shared';
import {
  AppText,
  Button,
  EmptyState,
  Icon,
  PlatformRow,
  Sheet,
} from '../components/ui';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { PublicCard } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ScanScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { saveContact, removeContact, isContactSaved } = useContacts();
  const [hasPermission, setHasPermission] = useState(false);
  const [scannedCard, setScannedCard] = useState<PublicCard | null>(null);
  const [scannedCardLoading, setScannedCardLoading] = useState(false);
  const [scannedCardVisible, setScannedCardVisible] = useState(false);
  const scanLockRef = useRef<string | null>(null);

  const parseCardIdFromUrl = useCallback((url: string): string | null => {
    const match = url.match(/\/devcard\/([a-zA-Z0-9_-]+)/) || url.match(/\/card\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, []);

  const parseDevCardUsername = useCallback((url: string): string | null => {
    const match = url.match(/\/u\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }, []);

  const closeCardModal = () => {
    setScannedCardVisible(false);
    setScannedCard(null);
    scanLockRef.current = null;
  };

  const openScannedCard = useCallback(async (cardId: string) => {
    setScannedCardVisible(true);
    setScannedCardLoading(true);
    setScannedCard(null);
    try {
      const card = await get<PublicCard>(`/api/u/card/${cardId}`);
      setScannedCard(card);
    } catch {
      Alert.alert('Card not found', 'That card could not be loaded.');
      closeCardModal();
    } finally {
      setScannedCardLoading(false);
    }
  }, []);

  const handleScannedUrl = useCallback(
    async (url: string) => {
      const normalized = url.trim();
      const cardId = parseCardIdFromUrl(normalized);
      if (cardId) {
        if (scanLockRef.current === normalized) return;
        scanLockRef.current = normalized;
        await openScannedCard(cardId);
        return;
      }

      const username = parseDevCardUsername(normalized);
      if (username) {
        navigation.navigate('DevCardView', { username });
      }
    },
    [navigation, openScannedCard, parseCardIdFromUrl, parseDevCardUsername],
  );

  const handleCameraRead = (url: string) => {
    handleScannedUrl(url).catch(() => null);
  };

  const handleSaveScannedContact = async () => {
    if (!scannedCard) return;

    const username = scannedCard.owner.username;
    if (isContactSaved(username)) {
      await removeContact(username);
      return;
    }

    await saveContact({
      username,
      displayName: scannedCard.owner.displayName,
      avatarUrl: scannedCard.owner.avatarUrl,
      accentColor: scannedCard.owner.accentColor || colors.accent,
      bio: scannedCard.owner.bio,
      role: null,
      company: null,
      metAt: `Scanned card: ${scannedCard.title}`,
      note: 'Saved from a scanned DevCard',
    });
  };

  const checkInitialCameraPermission = useCallback(async () => {
    if (Platform.OS === 'android') {
      const hasPerm = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      setHasPermission(hasPerm);
    } else if (Platform.OS === 'ios') {
      try {
        const RNCameraKitModule = NativeModules.RNCameraKitModule;
        if (RNCameraKitModule) {
          const status = await RNCameraKitModule.checkDeviceCameraAuthorizationStatus();
          if (status === true) {
            setHasPermission(true);
          } else if (status === -1) {
            const granted = await RNCameraKitModule.requestDeviceCameraAuthorization();
            setHasPermission(granted === true);
          } else {
            setHasPermission(false);
          }
        } else {
          setHasPermission(true);
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    }
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera Permission',
          message: 'DevCard needs camera access to scan QR codes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.warn(err);
      }
    } else if (Platform.OS === 'ios') {
      try {
        const RNCameraKitModule = NativeModules.RNCameraKitModule;
        if (RNCameraKitModule) {
          const status = await RNCameraKitModule.checkDeviceCameraAuthorizationStatus();
          if (status === true) {
            setHasPermission(true);
          } else if (status === -1) {
            const granted = await RNCameraKitModule.requestDeviceCameraAuthorization();
            setHasPermission(granted === true);
          } else {
            setHasPermission(false);
            Alert.alert(
              'Camera Access Required',
              'Please enable camera access in your device settings to scan QR codes.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Settings', onPress: () => Linking.openURL('app-settings:') },
              ],
            );
          }
        } else {
          setHasPermission(true);
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      checkInitialCameraPermission();
    }, [checkInitialCameraPermission]),
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkInitialCameraPermission();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [checkInitialCameraPermission]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Camera fills the tab */}
      {hasPermission ? (
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={(event: any) => handleCameraRead(event.nativeEvent.codeStringValue)}
          showFrame={false}
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={[styles.permIcon, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
            <Icon name="camera-outline" size={28} color={colors.textSecondary} />
          </View>
          <AppText variant="h3" align="center">
            Camera access needed
          </AppText>
          <AppText variant="body" tone="secondary" align="center" style={styles.permBody}>
            DevCard uses the camera to read QR codes. Nothing is uploaded.
          </AppText>
          <Button label="Grant permission" onPress={requestCameraPermission} variant="primary" fullWidth={false} />
        </View>
      )}

      {/* Scan frame overlay */}
      {hasPermission ? (
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.overlayTop} pointerEvents="none">
            <AppText variant="eyebrow" tone="accent">
              SCAN
            </AppText>
            <AppText variant="h2" align="center" style={styles.overlayTitle}>
              Point at a DevCard QR
            </AppText>
            <AppText variant="caption" tone="secondary" align="center">
              We'll open the card instantly.
            </AppText>
          </View>

          <View style={styles.frameWrap} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.cornerBase, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.cornerBase, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.cornerBase, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.cornerBase, styles.bottomRight, { borderColor: colors.accent }]} />
            </View>
          </View>

          <View style={styles.overlayBottom} pointerEvents="none">
            <View style={[styles.hintPill, { backgroundColor: colors.bgCardGlass, borderColor: colors.border }]}>
              <Icon name="qrcode-scan" size={15} color={colors.textSecondary} />
              <AppText variant="caption" tone="secondary" style={styles.hintText}>
                Works with cards shared from this app
              </AppText>
            </View>
          </View>
        </SafeAreaView>
      ) : null}

      {/* ── Scanned card ── */}
      <Sheet
        visible={scannedCardVisible}
        onClose={closeCardModal}
        eyebrow={scannedCard ? 'SCANNED CARD' : 'LOADING'}
        title={scannedCard?.title || 'Card'}
        scrollable
        footer={
          scannedCard ? (
            <Button
              label={isContactSaved(scannedCard.owner.username) ? 'Remove from contacts' : 'Save to contacts'}
              onPress={handleSaveScannedContact}
              variant={isContactSaved(scannedCard.owner.username) ? 'tertiary' : 'primary'}
              icon={isContactSaved(scannedCard.owner.username) ? 'account-remove-outline' : 'account-plus-outline'}
            />
          ) : null
        }>
        {scannedCardLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.accent} />
            <AppText variant="caption" tone="muted" style={styles.loadingText}>
              Loading card…
            </AppText>
          </View>
        ) : scannedCard ? (
          <>
            <AppText variant="mono" tone="secondary" style={styles.owner}>
              {scannedCard.owner.displayName} · @{scannedCard.owner.username}
            </AppText>

            {scannedCard.links.length === 0 ? (
              <EmptyState
                icon="link-variant"
                title="No platforms"
                description="This card has no platform links attached."
              />
            ) : (
              scannedCard.links.map(link => (
                <View
                  key={link.id}
                  style={[styles.linkCard, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
                  <PlatformRow
                    platform={link.platform}
                    platformName={PLATFORMS[link.platform]?.name || link.platform}
                    username={link.username}
                    brandColor={PLATFORMS[link.platform]?.color}
                    actions={[
                      {
                        icon: 'open-in-new',
                        label: `Open ${PLATFORMS[link.platform]?.name || link.platform}`,
                        tone: 'accent',
                        onPress: () => {
                          if (link.url) Linking.openURL(link.url).catch(() => {});
                        },
                      },
                    ]}
                  />
                </View>
              ))
            )}
          </>
        ) : (
          <EmptyState icon="card-account-details-outline" title="No card loaded" />
        )}
      </Sheet>
    </View>
  );
}

const CORNER = 34;

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  permIcon: {
    width: 88,
    height: 88,
    borderRadius: BORDER_RADIUS.xxl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  permBody: { marginTop: SPACING.sm, marginBottom: SPACING.lg, maxWidth: 280 },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between' },
  overlayTop: { paddingTop: SPACING.lg, paddingHorizontal: SPACING.lg, alignItems: 'center' },
  overlayTitle: { marginTop: SPACING.xs },
  frameWrap: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: 250, height: 250 },
  cornerBase: { position: 'absolute', width: CORNER, height: CORNER, borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: BORDER_RADIUS.md },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: BORDER_RADIUS.md },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: BORDER_RADIUS.md },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: BORDER_RADIUS.md },
  overlayBottom: { paddingBottom: SPACING.xxl, alignItems: 'center' },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  hintText: { marginLeft: SPACING.sm },

  loadingWrap: { alignItems: 'center', paddingVertical: SPACING.xl },
  loadingText: { marginTop: SPACING.md },
  owner: { marginBottom: SPACING.md },
  linkCard: { borderWidth: 1, borderRadius: BORDER_RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
});
