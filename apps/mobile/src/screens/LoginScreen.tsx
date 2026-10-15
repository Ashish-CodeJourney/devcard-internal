import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  StatusBar,
  ActivityIndicator,
  AppState,
  useWindowDimensions,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { authPalette } from '../theme/authTheme';
import { AuthHero } from '../components/AuthHero';
import { API_BASE_URL, OAUTH_REDIRECT_URI } from '../config';
import { useAuth } from '../context/AuthContext';
import { AppText, Icon, IconName } from '../components/ui';
import { SPACING, BORDER_RADIUS } from '../theme/tokens';

type Provider = 'github' | 'google';

export default function LoginScreen() {
  const { enterDemoMode } = useAuth();
  const { isDark } = useTheme();
  const p = authPalette(isDark);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const [launching, setLaunching] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef(false);

  const heroHeight = Math.max(200, Math.min(Math.round(height * 0.40), 340));

  // OAuth happens in the system browser; clear the busy state when the app
  // comes back to the foreground so the button is usable again.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        lockRef.current = false;
        setLaunching(null);
      }
    });
    return () => sub.remove();
  }, []);

  const startOAuth = useCallback(async (provider: Provider) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setError(null);
    setLaunching(provider);

    const url = `${API_BASE_URL}/auth/${provider}?state=mobile_${provider}&mobile_redirect_uri=${encodeURIComponent(
      OAUTH_REDIRECT_URI,
    )}`;

    try {
      await Linking.openURL(url);
      // Safety: release the lock if the app never backgrounds.
      setTimeout(() => {
        lockRef.current = false;
        setLaunching(prev => (prev === provider ? null : prev));
      }, 4000);
    } catch {
      lockRef.current = false;
      setLaunching(null);
      setError(`Could not open ${provider === 'github' ? 'GitHub' : 'Google'}. Please try again.`);
    }
  }, []);

  const busy = launching !== null;

  return (
    <View style={[styles.root, { backgroundColor: p.surface }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* ── Hero ── */}
      <View style={{ height: heroHeight }}>
        <AuthHero height={heroHeight} palette={p} isDark={isDark} />
      </View>

      {/* ── Panel ── */}
      <View
        style={[
          styles.panel,
          { backgroundColor: p.surface, borderColor: p.border, marginTop: -28 },
        ]}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACING.lg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <AppText variant="h1" align="center" color={p.text}>
            Login
          </AppText>
          <AppText variant="body" align="center" color={p.textSecondary} style={styles.subtitle}>
            Sign in to your DevCard account to continue.
          </AppText>

          {error ? (
            <View style={[styles.errorRow, { backgroundColor: p.surfaceInset, borderColor: p.border }]}>
              <Icon name="alert-circle-outline" size={15} color={p.accent} />
              <AppText variant="caption" color={p.text} style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Primary providers */}
          <SocialButton
            provider="github"
            label="Continue with GitHub"
            palette={p}
            variant="dark"
            loading={launching === 'github'}
            disabled={busy}
            onPress={() => startOAuth('github')}
          />
          <SocialButton
            provider="google"
            label="Continue with Google"
            palette={p}
            variant="light"
            loading={launching === 'google'}
            disabled={busy}
            onPress={() => startOAuth('google')}
            style={styles.secondProvider}
          />

          {/* Divider */}
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: p.border }]} />
            <AppText variant="caption" color={p.textMuted} style={styles.orText}>
              Or
            </AppText>
            <View style={[styles.orLine, { backgroundColor: p.border }]} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Explore in demo mode"
            disabled={busy}
            onPress={enterDemoMode}
            style={({ pressed }) => [
              styles.demoBtn,
              { borderColor: p.border, opacity: busy ? 0.5 : pressed ? 0.75 : 1 },
            ]}>
            <Icon name="flask-outline" size={17} color={p.textSecondary} />
            <AppText variant="button" color={p.textSecondary} style={styles.demoText}>
              Explore in demo mode
            </AppText>
          </Pressable>

          <AppText variant="caption" align="center" color={p.textMuted} style={styles.terms}>
            By continuing you agree to our Terms & Privacy Policy.
          </AppText>
        </ScrollView>
      </View>
    </View>
  );
}

function SocialButton({
  provider,
  label,
  palette,
  variant,
  loading,
  disabled,
  onPress,
  style,
}: {
  provider: Provider;
  label: string;
  palette: ReturnType<typeof authPalette>;
  variant: 'dark' | 'light';
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
  style?: any;
}) {
  const isDark = variant === 'dark';
  const bg = isDark ? palette.buttonBg : palette.socialLight;
  const fg = isDark ? palette.buttonText : palette.text;
  const icon = (provider === 'github' ? 'github' : 'google') as IconName;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.socialBtn,
        {
          backgroundColor: bg,
          borderColor: isDark ? 'transparent' : palette.border,
          opacity: disabled && !loading ? 0.5 : pressed ? 0.88 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Icon name={icon} size={20} color={fg} />
          <AppText variant="button" color={fg} style={styles.socialText}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  subtitle: { marginTop: SPACING.sm, marginBottom: SPACING.xl },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { marginLeft: SPACING.sm, flex: 1 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  socialText: { marginLeft: SPACING.sm },
  secondProvider: { marginTop: SPACING.md },
  orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xl },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { marginHorizontal: SPACING.md },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  demoText: { marginLeft: SPACING.sm },
  terms: { marginTop: SPACING.lg },
});
