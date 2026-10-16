import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Skeleton } from '../components/Skeleton';
import {
  AppText,
  Avatar,
  EmptyState,
  ErrorState,
  Icon,
  SectionHeader,
  Surface,
  platformIcon,
} from '../components/ui';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';
import { PLATFORMS, getProfileUrl, getWebViewUrl } from '@devcard/shared';
import { get, post, del } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useContacts } from '../hooks/useContacts';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/MainTabs';
import type { FollowStrategy } from '@devcard/shared';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DevCardView'>;
  route: RouteProp<RootStackParamList, 'DevCardView'>;
};

interface PlatformLink {
  id: string;
  platform: string;
  username: string;
  url: string;
  displayOrder: number;
  /** Ownership proven via the provider's OAuth. */
  verified?: boolean;
  /** Handle confirmed to exist via a public API (ownership not proven). */
  checkedAt?: string | null;
  verificationStatus?: 'verified' | 'checked' | 'unverified';
}

interface ProfileData {
  username: string;
  displayName: string;
  bio: string | null;
  pronouns: string | null;
  role: string | null;
  company: string | null;
  avatarUrl: string | null;
  accentColor: string;
  links: PlatformLink[];
}

// `copied` is intentionally NOT a success state — copying a handle does not
// prove the follow/connect happened, so the UI must not claim it did.
type FollowState = Record<string, 'idle' | 'loading' | 'success' | 'error' | 'copied'>;

export default function DevCardViewScreen({ navigation, route }: Props) {
  const { username } = route.params;
  const { token } = useAuth();
  const { colors } = useTheme();
  const { isContactSaved, saveContact, removeContact } = useContacts();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [followStates, setFollowStates] = useState<FollowState>({});

  const isSaved = isContactSaved(username);

  const handleSaveContact = async () => {
    if (!profile) return;
    if (isSaved) {
      await removeContact(username);
    } else {
      await saveContact({
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accentColor: profile.accentColor || colors.accent,
        bio: profile.bio,
        role: profile.role,
        company: profile.company,
        metAt: 'DevCard App',
        note: null,
      });
    }
  };

  const fetchProfile = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const data = await get<ProfileData>(`/api/u/${username}`, token);
      if (data) {
        setProfile(data);
        const initialFollowStates: FollowState = {};
        if (data.links) {
          data.links.forEach((link: any) => {
            if (link.followed) initialFollowStates[link.id] = 'success';
          });
        }
        setFollowStates(initialFollowStates);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [token, username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const successLinkId = route.params?.followSuccessLinkId;
  useEffect(() => {
    if (successLinkId) {
      setFollowStates(prev => ({ ...prev, [successLinkId]: 'success' }));
      navigation.setParams({ followSuccessLinkId: undefined } as any);
    }
  }, [navigation, successLinkId]);

  // ─── Hybrid Follow Engine (behaviour preserved) ───

  const handlePlatformAction = async (link: PlatformLink) => {
    const platform = PLATFORMS[link.platform];
    if (!platform) return;

    const strategy: FollowStrategy = platform.followStrategy;

    switch (strategy) {
      case 'api':
        await handleApiFollow(link);
        break;

      case 'webview':
        setFollowStates(prev => ({ ...prev, [link.id]: 'loading' }));
        try {
          const data = await post<any>(`/api/follow/${link.platform}/${link.username}`, undefined, token);
          setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
          if (data?.strategy === 'webview') {
            handleWebViewConnect(link, data.url);
          } else {
            setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
          }
        } catch {
          setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
          handleWebViewConnect(link);
        }
        break;

      case 'copy':
        Clipboard.setString(link.username);
        setFollowStates(prev => ({ ...prev, [link.id]: 'copied' }));
        setTimeout(() => {
          setFollowStates(prev => (prev[link.id] === 'copied' ? { ...prev, [link.id]: 'idle' } : prev));
        }, 1800);
        break;

      case 'link':
      default: {
        const url = link.url || getProfileUrl(link.platform, link.username);
        if (url) {
          Linking.openURL(url).catch(() => {
            setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
          });
        }
        break;
      }
    }
  };

  // Layer 1: API-based follow
  const handleApiFollow = async (link: PlatformLink) => {
    setFollowStates(prev => ({ ...prev, [link.id]: 'loading' }));
    try {
      await post<any>(`/api/follow/${link.platform}/${link.username}`, undefined, token);
      setFollowStates(prev => ({ ...prev, [link.id]: 'success' }));
    } catch (err: any) {
      const msg = (err && err.message) || '';
      if (msg.includes('requiresAuth')) {
        setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
        const webViewUrl = getWebViewUrl(link.platform, link.username);
        if (webViewUrl) {
          handleWebViewConnect(link);
        } else {
          const profileUrl = link.url || getProfileUrl(link.platform, link.username);
          if (profileUrl) {
            Linking.openURL(profileUrl).catch(() =>
              setFollowStates(prev => ({ ...prev, [link.id]: 'error' })),
            );
          }
        }
      } else {
        setFollowStates(prev => ({ ...prev, [link.id]: 'error' }));
      }
    }
  };

  const handleResetFollowState = async (link: PlatformLink) => {
    try {
      await del(`/api/follow/${link.platform}/${link.username}/log`, undefined, token);
    } catch {
      // ignore
    }
    setFollowStates(prev => ({ ...prev, [link.id]: 'idle' }));
  };

  // Layer 2: WebView-based connect
  const handleWebViewConnect = (link: PlatformLink, resolvedUrl?: string) => {
    const webViewUrl = getWebViewUrl(link.platform, link.username);
    const profileUrl = link.url || getProfileUrl(link.platform, link.username);
    const url = resolvedUrl || webViewUrl || profileUrl;

    if (url) {
      navigation.navigate('WebViewConnect', {
        platform: link.platform,
        url,
        platformName: PLATFORMS[link.platform]?.name || link.platform,
        username: link.username,
        linkId: link.id,
        cardOwnerUsername: username,
      });
    }
  };

  const getButtonLabel = (link: PlatformLink): string => {
    const state = followStates[link.id];
    if (state === 'loading') return '';
    if (state === 'success') return 'Done';
    if (state === 'error') return 'Retry';
    if (state === 'copied') return 'Copied';

    const platform = PLATFORMS[link.platform];
    switch (platform?.followStrategy) {
      case 'api':
        return 'Follow';
      case 'webview':
        return 'Connect';
      case 'copy':
        return 'Copy';
      case 'link':
        return 'View';
      default:
        return 'Open';
    }
  };

  const actionTone = (state: string) => {
    switch (state) {
      case 'success':
        return { bg: colors.successSoft, fg: colors.success, icon: 'check' as const };
      case 'error':
        return { bg: colors.errorSoft, fg: colors.error, icon: 'refresh' as const };
      case 'copied':
        return { bg: colors.accentSoft, fg: colors.accent, icon: 'content-copy' as const };
      default:
        return { bg: colors.bgElevated, fg: colors.textPrimary, icon: undefined };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.pad}>
          <Skeleton width="100%" height={190} borderRadius={BORDER_RADIUS.xl} />
          <Skeleton width={140} height={14} style={styles.skelMtLg} />
          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.skelRow, { borderColor: colors.border, backgroundColor: colors.bgCard }]}>
              <Skeleton width={44} height={44} borderRadius={BORDER_RADIUS.md} />
              <View style={styles.skelRowText}>
                <Skeleton width="50%" height={15} />
                <Skeleton width="30%" height={12} style={styles.skelMt} />
              </View>
              <Skeleton width={76} height={34} borderRadius={BORDER_RADIUS.sm} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Modal chrome */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={10}
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
          <Icon name="close" size={20} color={colors.textPrimary} />
        </Pressable>

        {profile ? (
          <Pressable
            onPress={handleSaveContact}
            accessibilityRole="button"
            accessibilityLabel={isSaved ? 'Remove from contacts' : 'Save to contacts'}
            style={[
              styles.saveBtn,
              {
                borderColor: isSaved ? colors.accentBorder : colors.border,
                backgroundColor: isSaved ? colors.accentSoft : colors.bgSecondary,
              },
            ]}>
            <Icon
              name={isSaved ? 'account-check' : 'account-plus-outline'}
              size={16}
              color={isSaved ? colors.accent : colors.textSecondary}
            />
            <AppText variant="label" tone={isSaved ? 'accent' : 'secondary'} style={styles.saveBtnText}>
              {isSaved ? 'Saved' : 'Save'}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {loadError && !profile ? (
        <ErrorState
          title="Couldn't load this card"
          message="Check your connection and try again."
          onRetry={fetchProfile}
        />
      ) : !profile ? (
        <EmptyState
          icon="account-search-outline"
          title="Profile not found"
          description={`No developer profile exists for @${username}.`}
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Identity header ── */}
          <Surface variant="default" radius="xl" padding="lg" style={styles.identity}>
            <View style={styles.identityTop}>
              <Avatar uri={profile.avatarUrl} name={profile.displayName} size={68} ring />
              <View style={styles.identityText}>
                <AppText variant="h2" numberOfLines={1}>
                  {profile.displayName}
                </AppText>
                <AppText variant="mono" tone="secondary" numberOfLines={1}>
                  @{profile.username}
                </AppText>
              </View>
            </View>

            {profile.role || profile.company ? (
              <View style={styles.metaRow}>
                <Icon name="briefcase-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" tone="secondary" style={styles.metaText} numberOfLines={2}>
                  {profile.role}
                  {profile.company ? ` @ ${profile.company}` : ''}
                </AppText>
              </View>
            ) : null}

            {profile.pronouns ? (
              <View style={styles.metaRow}>
                <Icon name="account-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" tone="muted" style={styles.metaText}>
                  {profile.pronouns}
                </AppText>
              </View>
            ) : null}

            {profile.bio ? (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <AppText variant="body" tone="secondary" numberOfLines={3}>
                  {profile.bio}
                </AppText>
              </>
            ) : null}
          </Surface>

          {/* ── Platforms ── */}
          <SectionHeader
            title={`Platforms · ${profile.links.length}`}
            style={styles.sectionSpacing}
            action={profile.links.length > 1 ? undefined : undefined}
          />

          {profile.links.length === 0 ? (
            <Surface variant="outline" radius="xl" padding="lg" style={{ borderColor: colors.border }}>
              <EmptyState
                icon="link-variant"
                title="No links shared"
                description="This developer hasn't added any platform links yet."
              />
            </Surface>
          ) : (
            profile.links.map(link => {
              const platform = PLATFORMS[link.platform];
              const state = followStates[link.id] || 'idle';
              const tone = actionTone(state);
              const isDone = state === 'success';
              const brand = platform?.color || colors.textPrimary;

              return (
                <Pressable
                  key={link.id}
                  onPress={() => handlePlatformAction(link)}
                  onLongPress={() => {
                    if (isDone) {
                      handleResetFollowState(link);
                    }
                  }}
                  disabled={state === 'loading'}
                  accessibilityRole="button"
                  accessibilityLabel={`${getButtonLabel(link) || 'Working'} ${platform?.name || link.platform}`}
                  style={({ pressed }) => [
                    styles.tile,
                    {
                      backgroundColor: colors.bgCard,
                      borderColor: isDone ? colors.success : colors.border,
                      opacity: pressed ? 0.9 : 1,
                    },
                  ]}>
                  <View
                    style={[
                      styles.tileIcon,
                      {
                        backgroundColor: isDone ? colors.successSoft : colors.bgElevated,
                        borderColor: isDone ? colors.success : colors.border,
                      },
                    ]}>
                    <Icon name={platformIcon(link.platform)} size={20} color={isDone ? colors.success : brand} />
                  </View>

                  <View style={styles.tileInfo}>
                    <View style={styles.tileNameRow}>
                      <AppText variant="title" numberOfLines={1} style={styles.tileName}>
                        {platform?.name || link.platform}
                      </AppText>
                      {(link.verificationStatus ?? (link.verified ? 'verified' : link.checkedAt ? 'checked' : 'unverified')) === 'verified' ? (
                        <View style={[styles.verifyBadge, { borderColor: colors.accentBorder, backgroundColor: colors.accentSoft }]}>
                          <Icon name="shield-check" size={11} color={colors.accent} />
                          <AppText variant="eyebrow" tone="accent" style={styles.verifyBadgeText}>
                            VERIFIED
                          </AppText>
                        </View>
                      ) : (link.verificationStatus ?? 'unverified') === 'checked' ? (
                        <View style={[styles.verifyBadge, { borderColor: colors.border, backgroundColor: colors.bgElevated }]}>
                          <Icon name="magnify" size={11} color={colors.textSecondary} />
                          <AppText variant="eyebrow" tone="secondary" style={styles.verifyBadgeText}>
                            CHECKED
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <AppText variant="mono" tone="secondary" numberOfLines={1}>
                      @{link.username}
                    </AppText>
                  </View>

                  <View style={[styles.tileAction, { backgroundColor: tone.bg }]}>
                    {state === 'loading' ? (
                      <ActivityIndicator size="small" color={colors.accent} />
                    ) : (
                      <>
                        {tone.icon ? (
                          <Icon name={tone.icon} size={14} color={tone.fg} style={styles.tileActionIcon} />
                        ) : null}
                        <AppText variant="label" color={tone.fg}>
                          {getButtonLabel(link)}
                        </AppText>
                      </>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}

          {/* ── Footnote ── */}
          <View style={styles.footer}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.footerRow}>
              <Icon name="lightning-bolt" size={13} color={colors.textMuted} />
              <AppText variant="caption" tone="muted" style={styles.footerText}>
                Powered by DevCard
              </AppText>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pad: { padding: SPACING.lg },
  skelMt: { marginTop: SPACING.sm },
  skelMtLg: { marginTop: SPACING.lg, marginBottom: SPACING.md },
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  skelRowText: { flex: 1, marginLeft: SPACING.md },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: LAYOUT.topOffset,
    paddingBottom: SPACING.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 40,
  },
  saveBtnText: { marginLeft: SPACING.xs },
  scroll: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl },
  identity: {},
  identityTop: { flexDirection: 'row', alignItems: 'center' },
  identityText: { flex: 1, marginLeft: SPACING.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md },
  metaText: { marginLeft: SPACING.sm, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: SPACING.md },
  sectionSpacing: { marginTop: SPACING.xl },
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileInfo: { flex: 1, marginLeft: SPACING.md },
  tileNameRow: { flexDirection: 'row', alignItems: 'center' },
  tileName: { flexShrink: 1 },
  verifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: SPACING.sm,
  },
  verifyBadgeText: { marginLeft: 3, fontSize: 8 },
  tileAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    minWidth: 84,
    height: 34,
  },
  tileActionIcon: { marginRight: SPACING.xs },
  footer: { marginTop: SPACING.xl },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  footerText: { marginLeft: SPACING.xs },
});
