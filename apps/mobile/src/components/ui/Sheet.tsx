// ─── Sheet + ConfirmDialog ────────────────────────────────────────────────────
// Built on React Native's Modal so they remain reliable regardless of the
// reanimated/worklets version in play. Both are themed and accessible.

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../../theme/tokens';
import { AppText } from './Text';
import { Button } from './Button';
import { Icon } from './Icon';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
};

export const Sheet: React.FC<SheetProps> = ({
  visible,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  scrollable = false,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // The sheet is pinned to the bottom of the screen, so without this the
  // keyboard would cover the input the user is typing into.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event: KeyboardEvent) =>
      setKeyboardHeight(event.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);

  const keyboardVisible = keyboardHeight > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.border,
            // Lift the whole sheet above the keyboard.
            bottom: keyboardHeight,
            maxHeight: keyboardVisible ? '62%' : '88%',
            // The keyboard already covers the home indicator area.
            paddingBottom: keyboardVisible ? SPACING.lg : insets.bottom + SPACING.lg,
          },
        ]}>
        <View style={[styles.grabber, { backgroundColor: colors.borderLight }]} />
        {title ? (
          <View style={styles.header}>
            <View style={styles.headerText}>
              {eyebrow ? (
                <AppText variant="eyebrow" tone="muted">
                  {eyebrow.toUpperCase()}
                </AppText>
              ) : null}
              <AppText variant="h3">{title}</AppText>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={10} style={[styles.closeBtn, { borderColor: colors.border }]}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ) : null}
        {scrollable ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={styles.body}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
};

type ConfirmProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export const ConfirmDialog: React.FC<ConfirmProps> = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={[styles.backdropCenter, { backgroundColor: colors.overlay }]} onPress={onCancel} />
      <View style={styles.dialogWrap} pointerEvents="box-none">
        <View style={[styles.dialog, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}>
          {destructive ? (
            <View style={[styles.dialogIcon, { backgroundColor: colors.errorSoft }]}>
              <Icon name="alert-circle-outline" size={24} color={colors.error} />
            </View>
          ) : null}
          <AppText variant="h3" align="center">
            {title}
          </AppText>
          {message ? (
            <AppText variant="body" tone="secondary" align="center" style={styles.dialogMsg}>
              {message}
            </AppText>
          ) : null}
          <View style={styles.dialogActions}>
            <Button
              label={cancelLabel}
              onPress={onCancel}
              variant="tertiary"
              disabled={loading}
              style={styles.dialogBtn}
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'destructive' : 'primary'}
              loading={loading}
              style={styles.dialogBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    paddingHorizontal: LAYOUT.screenPadding,
    paddingTop: SPACING.sm,
    maxHeight: '88%',
  },
  grabber: { width: 40, height: 4, borderRadius: 999, alignSelf: 'center', marginBottom: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  headerText: { flex: 1 },
  closeBtn: { width: 34, height: 34, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingBottom: SPACING.sm },
  body: { },
  footer: { marginTop: SPACING.lg },
  backdropCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dialogWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  dialog: { width: '100%', maxWidth: 380, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg },
  dialogIcon: { width: 52, height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.md },
  dialogMsg: { marginTop: SPACING.sm },
  dialogActions: { flexDirection: 'row', marginTop: SPACING.lg },
  dialogBtn: { flex: 1, marginHorizontal: SPACING.xs },
});

export default Sheet;
