import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ACCENT_OPTIONS, BACKGROUND_OPTIONS, FONT_OPTIONS, resolveFontFamilies, SPACING, BORDER_RADIUS, ICON_SIZE } from '../theme/tokens';
import {
  AppText,
  Button,
  Icon,
  IconName,
  Screen,
  SectionHeader,
  Sheet,
  Surface,
} from '../components/ui';

const SETTINGS_KEY = 'devcard.settings';

type LocalSettings = {
  discoverableViaBle: boolean;
  inAppConnect: boolean;
};

const DEFAULT_SETTINGS: LocalSettings = {
  discoverableViaBle: true,
  inAppConnect: true,
};

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { logout } = useAuth();
  const { colors, isDark, mode, toggleTheme, accentColor, setAccentColor, backgroundColor, setBackgroundColor, fontId, setFontId } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showFonts, setShowFonts] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then(raw => setSettings(raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS))
      .catch(() => setSettings(DEFAULT_SETTINGS));
  }, []);

  const updateSettings = async (patch: Partial<LocalSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const deleteAllData = () => {
    Alert.alert('Delete all my data?', 'This clears local app data and signs you out.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.clear();
          await logout();
        },
      },
    ]);
  };

  const switchColors = {
    trackColor: { false: colors.border, true: colors.accent },
    thumbColor: colors.textPrimary,
    ios_backgroundColor: colors.border,
  };

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Account">
          <SettingRow
            icon="account-multiple-outline"
            label="Connected Platforms"
            onPress={() => navigation.navigate('ConnectPlatforms')}
          />
        </Section>

        <Section title="Privacy">
          <SettingRow
            icon="key-outline"
            label="OAuth Tokens"
            detail="View / Revoke"
            onPress={() => Alert.alert('OAuth Tokens', 'Token management will be available here.')}
          />
          <SettingRow
            icon="bluetooth"
            label="Discoverable via BLE"
            subtitle="Who can detect your DevCard nearby"
            right={
              <Switch
                value={settings.discoverableViaBle}
                onValueChange={value => updateSettings({ discoverableViaBle: value })}
                {...switchColors}
              />
            }
          />
          <SettingRow
            icon="web"
            label="In-app Connect"
            subtitle="Enable WebView platform connections"
            right={
              <Switch
                value={settings.inAppConnect}
                onValueChange={value => updateSettings({ inAppConnect: value })}
                {...switchColors}
              />
            }
          />
        </Section>

        <Section title="Appearance">
          <SettingRow
            icon="theme-light-dark"
            label="Theme"
            detail={mode === 'dark' ? 'Dark' : 'Light'}
            right={<Switch value={!isDark} onValueChange={toggleTheme} {...switchColors} />}
          />
          <SettingRow
            icon="format-font"
            label="Font"
            detail={FONT_OPTIONS.find(f => f.id === fontId)?.name ?? 'System'}
            onPress={() => setShowFonts(true)}
          />
        </Section>

        {/* ── Accent colour ── */}
        <Section title="Accent Color">
          <Surface variant="default" radius="lg" padding="md" style={styles.paletteCard}>
            <AppText variant="eyebrow" tone="muted" style={styles.paletteLabel}>
              NEUTRALS
            </AppText>
            <View style={styles.swatchRow}>
              {ACCENT_OPTIONS.filter(o => o.group === 'neutral').map(option => (
                <ColorSwatch
                  key={option.id}
                  hex={option.hex}
                  id={option.id}
                  name={option.name}
                  label={`Use ${option.name} accent`}
                  active={accentColor.toLowerCase() === option.hex.toLowerCase()}
                  borderColor={colors.border}
                  activeBorder={colors.textPrimary}
                  onPress={() => setAccentColor(option.hex)}
                />
              ))}
            </View>

            <AppText variant="eyebrow" tone="muted" style={[styles.paletteLabel, styles.paletteLabelSpaced]}>
              COLOURS
            </AppText>
            <View style={styles.swatchRow}>
              {ACCENT_OPTIONS.filter(o => o.group === 'colour').map(option => (
                <ColorSwatch
                  key={option.id}
                  hex={option.hex}
                  id={option.id}
                  name={option.name}
                  label={`Use ${option.name} accent`}
                  active={accentColor.toLowerCase() === option.hex.toLowerCase()}
                  borderColor={colors.border}
                  activeBorder={colors.textPrimary}
                  onPress={() => setAccentColor(option.hex)}
                />
              ))}
            </View>
          </Surface>
        </Section>

        {/* ── Background colour ── */}
        <Section title="Background">
          <Surface variant="default" radius="lg" padding="md" style={styles.paletteCard}>
            <AppText variant="eyebrow" tone="muted" style={styles.paletteLabel}>
              DARK
            </AppText>
            <View style={styles.swatchRow}>
              {BACKGROUND_OPTIONS.filter(o => o.group === 'dark').map(option => (
                <ColorSwatch
                  key={option.id}
                  hex={option.hex}
                  id={option.id}
                  name={option.name}
                  label={`Use ${option.name} background`}
                  active={backgroundColor.toLowerCase() === option.hex.toLowerCase()}
                  borderColor={colors.border}
                  activeBorder={colors.textPrimary}
                  onPress={() => setBackgroundColor(option.hex)}
                />
              ))}
            </View>

            <AppText variant="eyebrow" tone="muted" style={[styles.paletteLabel, styles.paletteLabelSpaced]}>
              LIGHT
            </AppText>
            <View style={styles.swatchRow}>
              {BACKGROUND_OPTIONS.filter(o => o.group === 'light').map(option => (
                <ColorSwatch
                  key={option.id}
                  hex={option.hex}
                  id={option.id}
                  name={option.name}
                  label={`Use ${option.name} background`}
                  active={backgroundColor.toLowerCase() === option.hex.toLowerCase()}
                  borderColor={colors.border}
                  activeBorder={colors.textPrimary}
                  onPress={() => setBackgroundColor(option.hex)}
                />
              ))}
            </View>
          </Surface>
        </Section>

        <Section title="Danger Zone">
          <Button
            label="Delete All My Data"
            variant="destructive"
            icon="trash-can-outline"
            onPress={deleteAllData}
          />
        </Section>

        <Button
          label="Sign Out"
          variant="secondary"
          icon="logout-variant"
          onPress={logout}
          style={styles.signOut}
        />

        <View style={styles.footer}>
          <AppText variant="caption" tone="muted" align="center">
            Self-hosting: devcard.dev/self-host
          </AppText>
          <AppText variant="caption" tone="muted" align="center">
            Docker Compose - Apache 2.0 - community-owned
          </AppText>
        </View>
      </ScrollView>

      {/* ── Font picker ── */}
      <Sheet
        visible={showFonts}
        onClose={() => setShowFonts(false)}
        eyebrow="Appearance"
        title="Choose a font"
        scrollable>
        {FONT_OPTIONS.map(option => {
          const active = option.id === fontId;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Use ${option.name}`}
              onPress={() => {
                setFontId(option.id);
                setShowFonts(false);
              }}
              style={[
                styles.fontRow,
                {
                  borderColor: active ? colors.accentBorder : colors.border,
                  backgroundColor: active ? colors.accentSoft : colors.bgCard,
                },
              ]}>
              <View style={styles.fontRowText}>
                <AppText variant="title" style={{ fontFamily: resolveFontFamilies(option.id).sans }}>
                  {option.name}
                </AppText>
                <AppText
                  variant="caption"
                  tone="muted"
                  style={{ fontFamily: resolveFontFamilies(option.id).sans }}>
                  The quick brown fox
                </AppText>
              </View>
              {active ? <Icon name="check" size={18} color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </Screen>
  );
}

function ColorSwatch({
  hex,
  label,
  active,
  borderColor,
  activeBorder,
  onPress,
}: {
  hex: string;
  id: string;
  name: string;
  label: string;
  active: boolean;
  borderColor: string;
  activeBorder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.swatch,
        { backgroundColor: hex, borderColor: active ? activeBorder : borderColor },
        active && styles.swatchActive,
      ]}
    />
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

function SettingRow({
  icon,
  label,
  detail,
  subtitle,
  right,
  onPress,
}: {
  icon: IconName;
  label: string;
  detail?: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Surface variant="default" radius="lg" padding="md" onPress={onPress} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}>
        <Icon name={icon} size={ICON_SIZE.sm} color={colors.textSecondary} />
      </View>

      <View style={styles.rowText}>
        <AppText variant="title">{label}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={styles.rowSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {detail ? (
        <AppText variant="caption" tone="secondary" style={styles.rowDetail}>
          {detail}
        </AppText>
      ) : null}

      {right ?? (onPress ? <Icon name="chevron-right" size={ICON_SIZE.md} color={colors.textMuted} /> : null)}
    </Surface>
  );
}

const styles = StyleSheet.create({
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  section: { marginBottom: SPACING.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    minHeight: 62,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, marginLeft: SPACING.md, marginRight: SPACING.sm },
  rowSubtitle: { marginTop: 2 },
  rowDetail: { marginRight: SPACING.sm },
  swatches: { flexDirection: 'row', alignItems: 'center' },
  paletteCard: { marginBottom: SPACING.sm },
  paletteLabel: { marginBottom: SPACING.sm },
  paletteLabelSpaced: { marginTop: SPACING.lg },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap' },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1.5,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  swatchActive: { borderWidth: 3 },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  fontRowText: { flex: 1 },
  signOut: { marginTop: SPACING.xs },
  footer: { alignItems: 'center', marginTop: SPACING.lg, gap: SPACING.xxs },
});
