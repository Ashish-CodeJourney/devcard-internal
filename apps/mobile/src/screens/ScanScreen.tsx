import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  Platform,
  PermissionsAndroid,
  Linking,
  AppState,
  ScrollView,
  type AppStateStatus,
  NativeModules,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'react-native-camera-kit';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../theme/tokens';
import { useContacts } from '../hooks/useContacts';
import { get } from '../services/api';
import { PLATFORMS } from '@devcard/shared';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { PublicCard } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ScanScreen({ navigation }: Props) {
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

  const handleScannedUrl = useCallback(async (url: string) => {
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
  }, [navigation, openScannedCard, parseCardIdFromUrl, parseDevCardUsername]);

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
      accentColor: scannedCard.owner.accentColor || COLORS.primary,
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
            Alert.alert('Camera Access Required', 'Please enable camera access in your device settings to scan QR codes.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => Linking.openURL('app-settings:') },
            ]);
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgPrimary} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan QR</Text>
          <Text style={styles.subtitle}>Point your camera at a DevCard QR code.</Text>
        </View>

        <View style={styles.cameraArea}>
          {hasPermission ? (
            <Camera
              style={StyleSheet.absoluteFill}
              scanBarcode
              onReadCode={(event: any) => handleCameraRead(event.nativeEvent.codeStringValue)}
              showFrame={false}
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <Text style={styles.cameraEmoji}>📷</Text>
              <Text style={styles.cameraText}>Camera Permission Required</Text>
              <TouchableOpacity style={styles.reqPermBtn} onPress={requestCameraPermission}>
                <Text style={styles.reqPermBtnText}>Grant Permission</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>

      <Modal visible={scannedCardVisible} transparent animationType="fade" onRequestClose={closeCardModal}>
        <View style={styles.cardModalOverlay}>
          <View style={styles.cardModal}>
            <View style={styles.cardModalHeader}>
              <View style={styles.cardModalTitleWrap}>
                <Text style={styles.cardModalTitle}>{scannedCard?.title || 'Card'}</Text>
                <Text style={styles.cardModalSubtitle}>{scannedCard?.owner.displayName || 'Loading card'}</Text>
              </View>
              <TouchableOpacity style={styles.cardModalCloseBtn} onPress={closeCardModal}>
                <Text style={styles.cardModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {scannedCardLoading ? (
              <View style={styles.cardModalLoading}>
                <Text style={styles.cardModalLoadingText}>Loading card...</Text>
              </View>
            ) : scannedCard ? (
              <>
                <TouchableOpacity style={styles.saveContactBtn} onPress={handleSaveScannedContact}>
                  <Text style={styles.saveContactBtnText}>
                    {isContactSaved(scannedCard.owner.username) ? 'Remove from Contacts' : 'Save to Contacts'}
                  </Text>
                </TouchableOpacity>

                <ScrollView style={styles.linkList} contentContainerStyle={styles.linkListContent}>
                  {scannedCard.links.map((link) => {
                    const platform = PLATFORMS[link.platform];
                    return (
                      <View key={link.id} style={styles.linkRow}>
                        <View style={styles.linkMeta}>
                          <View style={[styles.linkDot, { backgroundColor: platform?.color || COLORS.primary }]} />
                          <View>
                            <Text style={styles.linkPlatform}>{platform?.name || link.platform}</Text>
                            <Text style={styles.linkUsername}>@{link.username}</Text>
                          </View>
                        </View>
                        <TouchableOpacity style={styles.navigateBtn} onPress={() => Linking.openURL(link.url)}>
                          <Text style={styles.navigateBtnText}>Navigate</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {scannedCard.links.length === 0 && (
                    <Text style={styles.emptyLinksText}>No platforms linked to this card.</Text>
                  )}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.emptyLinksText}>No card loaded.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  content: { flex: 1, padding: SPACING.lg },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  title: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  cameraArea: {
    flex: 1,
    maxHeight: 520,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraEmoji: { fontSize: 48, marginBottom: SPACING.md },
  cameraText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textPrimary },
  reqPermBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
  },
  reqPermBtnText: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  topLeft: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  cardModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  cardModal: {
    width: '100%',
    maxWidth: 440,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  cardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardModalTitleWrap: { flex: 1 },
  cardModalTitle: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  cardModalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    marginTop: 4,
  },
  cardModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  cardModalCloseText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
  },
  cardModalLoading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardModalLoadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.md,
  },
  saveContactBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  saveContactBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
  },
  linkList: { maxHeight: 340 },
  linkListContent: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    backgroundColor: COLORS.bgCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  linkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  linkDot: { width: 10, height: 10, borderRadius: 5 },
  linkPlatform: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  linkUsername: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },
  navigateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  navigateBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
  },
  emptyLinksText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
