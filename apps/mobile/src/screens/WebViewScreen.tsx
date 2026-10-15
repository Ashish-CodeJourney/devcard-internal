import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import { SPACING, BORDER_RADIUS, ICON_SIZE } from '../theme/tokens';
import {
  Screen,
  AppText,
  Button,
  Icon,
  Skeleton,
  Surface,
  EmptyState,
} from '../components/ui';
import { getDeepLinkUrl } from '@devcard/shared';
import { post } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/MainTabs';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WebViewConnect'>;
  route: RouteProp<RootStackParamList, 'WebViewConnect'>;
};

/**
 * WebView Connector — Layer 2 of the Hybrid Follow Engine
 *
 * Opens the platform profile in an in-app WebView so the user can
 * tap the native Follow/Connect button without leaving DevCard.
 */
export default function WebViewScreen({ navigation, route }: Props) {
  const {
    platform,
    url,
    platformName,
    username,
    linkId,
    cardOwnerUsername,
  } = route.params;

  const { colors } = useTheme();
  const { token } = useAuth();
  const platformDisplayName = platformName || platform;
  const webViewRef = useRef<WebView>(null);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [fallbackTriggered, setFallbackTriggered] = useState(false);
  const [showFallbackOverlay, setShowFallbackOverlay] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const isSuccessHandled = useRef(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the injected JS ever detected success during this session
  const successDetectedInSession = useRef(false);

  // Safety Timeout Fallback: 10 seconds
  useEffect(() => {
    if (hasLoaded || fallbackTriggered) return;

    const timer = setTimeout(() => {
      setFallbackTriggered(true);
      setShowFallbackOverlay(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [hasLoaded, fallbackTriggered]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleOpenDeepLink = () => {
    let targetUsername = username;
    if (!targetUsername && url) {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
      targetUsername = lastPart.split('?')[0];
    }

    const deepLink = targetUsername ? getDeepLinkUrl(platform, targetUsername) : null;
    if (deepLink) {
      Linking.canOpenURL(deepLink)
        .then((supported) => {
          Linking.openURL(supported ? deepLink : url);
          navigation.goBack();
        })
        .catch(() => {
          Linking.openURL(url);
          navigation.goBack();
        });
    } else {
      Linking.openURL(url);
      navigation.goBack();
    }
  };

  const handleOpenBrowser = () => {
    Linking.openURL(url);
    navigation.goBack();
  };

  const handleRetryWebView = () => {
    setHasLoaded(false);
    setFallbackTriggered(false);
    setShowFallbackOverlay(false);
    setProgress(0);
    webViewRef.current?.reload();
  };

  const handleSuccess = async () => {
    if (isSuccessHandled.current) return;
    isSuccessHandled.current = true;
    successDetectedInSession.current = true;
    setSuccessToast(`Connection request sent on ${platformDisplayName}`);

    // Asynchronously log follow to the backend
    if (token && username) {
      try {
        await post(`/api/follow/${platform}/${username}/log`, { status: 'success', layer: 'webview' }, token);
      } catch (error) {
        console.warn('Failed to log WebView follow success:', error);
      }
    }

    // Auto-dismiss after 2 seconds with success param back to parent
    successTimerRef.current = setTimeout(() => {
      navigateBackWithSuccess();
    }, 2000);
  };

  const navigateBackWithSuccess = () => {
    if (linkId) {
      navigation.navigate({
        name: 'DevCardView',
        params: { username: cardOwnerUsername, followSuccessLinkId: linkId },
        merge: true,
      });
    } else {
      navigation.goBack();
    }
  };

  // Done button: check current page state live before going back
  const handleDonePress = () => {
    // If success was already handled, navigate with success immediately
    if (successDetectedInSession.current) {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      navigateBackWithSuccess();
      return;
    }

    // Inject a one-shot check script to see if LinkedIn currently shows success
    const checkScript = `
      (function() {
        var bodyText = document.body ? document.body.innerText.toLowerCase() : '';
        var successKeywords = ['invite sent', 'invitation sent', 'request sent', 'pending'];
        var found = successKeywords.some(function(k) { return bodyText.includes(k); });
        if (!found) {
          var els = document.querySelectorAll('button, a, span, [role="button"]');
          for (var i = 0; i < els.length; i++) {
            var t = (els[i].textContent || '').toLowerCase();
            var lbl = (els[i].getAttribute('aria-label') || '').toLowerCase();
            if (successKeywords.some(function(k) { return t.includes(k) || lbl.includes(k); })) {
              found = true;
              break;
            }
          }
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({ status: found ? 'done_with_success' : 'done_without_success' }));
      })();
    `;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(checkScript);
    } else {
      navigation.goBack();
    }
  };

  const handleHttpError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView HTTP error: ', nativeEvent?.statusCode, nativeEvent?.description);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView general loading error:', nativeEvent?.description);
    if (!fallbackTriggered) {
      setFallbackTriggered(true);
      setShowFallbackOverlay(true);
    }
  };

  // JS Injection: LinkedIn-specific Connect button highlighting & event detection
  // injectedJavaScriptBeforeContentLoaded runs BEFORE any page content — sets up listeners early
  const injectedJSBeforeLoad = platform === 'linkedin' ? `
    (function() {
      // Set up the SUCCESS_KEYWORDS and postMessage bridge as early as possible
      window.__devcardSuccessKeywords = [
        'invite sent', 'invitation sent', 'request sent',
        'connection request sent', 'pending', 'withdraw'
      ];
      window.__devcardSuccessReported = false;
      window.__devcardHighlighted = false;

      window.__devcardCheck = function() {
        if (window.__devcardSuccessReported) return;
        var kws = window.__devcardSuccessKeywords;
        var bodyText = document.body ? document.body.innerText.toLowerCase() : '';
        for (var k = 0; k < kws.length; k++) {
          if (bodyText.includes(kws[k])) {
            window.__devcardSuccessReported = true;
            try { window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success' })); } catch(error){}
            return;
          }
        }
        var els = document.querySelectorAll('button, span, a, [role="button"]');
        for (var i = 0; i < els.length; i++) {
          var t = (els[i].textContent || '').toLowerCase();
          var l = (els[i].getAttribute('aria-label') || '').toLowerCase();
          for (var j = 0; j < kws.length; j++) {
            if (t.includes(kws[j]) || l.includes(kws[j])) {
              window.__devcardSuccessReported = true;
              try { window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success' })); } catch(error){}
              return;
            }
          }
        }
      };

      // Check when page becomes visible (fires after dialogs close)
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
          setTimeout(window.__devcardCheck, 200);
          setTimeout(window.__devcardCheck, 600);
        }
      });

      // Check on focus events (modal dismissal, back navigation)
      window.addEventListener('focus', function() {
        setTimeout(window.__devcardCheck, 300);
      });
    })();
  ` : undefined;

  const injectedJS = platform === 'linkedin' ? `
    (function() {
      function log(msg) {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'debug', message: msg }));
        } catch(error){}
      }

      log('LinkedIn JS Engine Started');

      // Inject pulsating highlight CSS for the Connect button
      var styleEl = document.createElement('style');
      styleEl.innerHTML = [
        '@keyframes pulse-highlight {',
        '  0%   { box-shadow: 0 0 0 0px rgba(10,102,194,0.7); border-color: #0A66C2; }',
        '  70%  { box-shadow: 0 0 0 10px rgba(10,102,194,0); border-color: #0084FF; }',
        '  100% { box-shadow: 0 0 0 0px rgba(10,102,194,0); border-color: #0A66C2; }',
        '}',
        '.devcard-highlight {',
        '  animation: pulse-highlight 2s infinite !important;',
        '  border: 3px solid #0A66C2 !important;',
        '  transform: scale(1.02) !important;',
        '}'
      ].join('');
      if (document.head) document.head.appendChild(styleEl);

      // Reuse globals set by injectedJavaScriptBeforeContentLoaded if available
      var SUCCESS_KEYWORDS = (window.__devcardSuccessKeywords) || [
        'invite sent', 'invitation sent', 'request sent',
        'connection request sent', 'pending', 'withdraw'
      ];
      var successReported = (window.__devcardSuccessReported) || false;
      var highlighted = (window.__devcardHighlighted) || false;

      function reportSuccess(reason) {
        if (successReported) return;
        successReported = true;
        if (window.__devcardSuccessReported !== undefined) window.__devcardSuccessReported = true;
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'success' })); } catch(error){}
        log('Success: ' + reason);
      }

      function checkPage() {
        if (successReported) return;

        // 1. Body text scan
        var bodyText = document.body ? document.body.innerText.toLowerCase() : '';
        for (var k = 0; k < SUCCESS_KEYWORDS.length; k++) {
          if (bodyText.includes(SUCCESS_KEYWORDS[k])) {
            reportSuccess('body:' + SUCCESS_KEYWORDS[k]);
            return;
          }
        }

        // 2. Element scan
        var allEls = document.querySelectorAll('button, a, span, [role="button"], li');
        for (var i = 0; i < allEls.length; i++) {
          var el = allEls[i];
          var text = (el.textContent || '').replace(new RegExp('\\s+', 'g'), ' ').trim().toLowerCase();
          var aria = (el.getAttribute('aria-label') || '').toLowerCase();
          var combined = text + ' ' + aria;
          for (var j = 0; j < SUCCESS_KEYWORDS.length; j++) {
            if (combined.includes(SUCCESS_KEYWORDS[j])) {
              reportSuccess('element:' + combined.substring(0, 40));
              return;
            }
          }
          // Highlight the Connect button
          if (!highlighted) {
            var isConnect = (text === 'connect' || aria === 'connect' || aria.includes('connect to'))
              && !text.includes('connections') && !text.includes('connected') && !el.disabled;
            if (isConnect) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('devcard-highlight');
              highlighted = true;
              log('Connect button highlighted');
            }
          }
        }
      }

      checkPage();

      // MutationObserver — watches childList, subtree AND characterData
      function startObserver() {
        var obs = new MutationObserver(function(mutations) { checkPage(); });
        obs.observe(document.body, {
          childList: true, subtree: true, characterData: true, attributes: true,
          attributeFilter: ['aria-label', 'class', 'disabled']
        });
        log('MutationObserver active');
      }

      if (document.body) {
        startObserver();
      } else {
        document.addEventListener('DOMContentLoaded', startObserver);
      }

      // Polling every 700ms (runs for up to 90 seconds)
      var pollCount = 0;
      var pollTimer = setInterval(function() {
        pollCount++;
        checkPage();
        if (successReported || pollCount > 128) clearInterval(pollTimer);
      }, 700);

      // Also run check on popstate (LinkedIn SPA navigation)
      window.addEventListener('popstate', function() {
        setTimeout(checkPage, 300);
        setTimeout(checkPage, 800);
      });

      log('Engine ready, polling + observer active');
    })();
  ` : undefined;

  return (
    <Screen edges={['top', 'bottom']}>
      <View>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            style={[styles.closeBtn, { borderColor: colors.border, backgroundColor: colors.bgSecondary }]}>
            <Icon name="close" size={ICON_SIZE.sm} color={colors.textPrimary} />
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <AppText variant="eyebrow" tone="muted" numberOfLines={1}>
              CONNECTING
            </AppText>
            <AppText variant="title" numberOfLines={1}>
              {platformDisplayName}
            </AppText>
          </View>
          <View style={styles.headerSpacer} />
        </View>
        {progress > 0 && progress < 1 && (
          <View style={[styles.progressBar, {
            width: `${progress * 100}%`,
            backgroundColor: platform === 'linkedin' ? colors.linkedin : colors.accent
          }]} />
        )}
      </View>

      <View style={[styles.banner, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <Icon name="information-outline" size={ICON_SIZE.sm} color={colors.textSecondary} />
        <AppText variant="caption" tone="secondary" style={styles.bannerText}>
          You are viewing this profile in <AppText variant="caption" color={colors.accent}>DevCard</AppText> — tap <AppText variant="caption" color={colors.accent}>Connect</AppText> on {platformDisplayName} to send your request
        </AppText>
      </View>

      {successToast && (
        <View style={[styles.toast, { backgroundColor: colors.successSoft, borderColor: colors.success }]}>
          <Icon name="check-circle" size={ICON_SIZE.sm} color={colors.success} />
          <AppText variant="label" tone="success" style={styles.toastText}>{successToast}</AppText>
        </View>
      )}

      {/* WebView */}
      {url ? (
        <View style={styles.webContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: url }}
            style={styles.webview}
            sharedCookiesEnabled={true}
            thirdPartyCookiesEnabled={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            injectedJavaScriptBeforeContentLoaded={injectedJSBeforeLoad}
            injectedJavaScript={injectedJS}
            startInLoadingState={true}
            onLoadProgress={({ nativeEvent }) => setProgress(nativeEvent.progress)}
            onLoadEnd={() => setHasLoaded(true)}
            onError={handleError}
            onHttpError={handleHttpError}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.status === 'success') {
                  handleSuccess();
                } else if (data.status === 'done_with_success') {
                  // Done button pressed: success found on current page
                  handleSuccess();
                } else if (data.status === 'done_without_success') {
                  // Done button pressed: no success found, just go back
                  navigation.goBack();
                } else if (data.status === 'debug') {
                  console.log('[WebView JS] ' + data.message);
                }
              } catch {}
            }}
            onNavigationStateChange={(navState) => {
              // Detect final invite-sent/shared subroutes (exclude early pages like send-invite)
              if (
                navState.url.includes('invite-sent') ||
                navState.url.includes('inviteShared') ||
                navState.url.includes('invitation-sent')
              ) {
                handleSuccess();
              }
            }}
            renderLoading={() => (
              <View style={styles.loading}>
                <Skeleton width="82%" height={18} borderRadius={10} />
                <Skeleton width="92%" height={180} borderRadius={BORDER_RADIUS.lg} style={styles.loadingBlock} />
                <Skeleton width="78%" height={16} borderRadius={10} style={styles.loadingLine} />
                <Skeleton width="64%" height={16} borderRadius={10} style={styles.loadingLine} />
                <AppText variant="body" tone="muted" style={styles.loadingText}>
                  Loading {platformDisplayName}...
                </AppText>
              </View>
            )}
          />

          {showFallbackOverlay && (
            <View style={[styles.overlayContainer, { backgroundColor: colors.overlay }]}>
              <Surface variant="elevated" radius="xl" padding="xl" style={styles.overlayCard}>
                <View style={[styles.overlayIcon, { backgroundColor: colors.warningSoft }]}>
                  <Icon name="timer-sand" size={ICON_SIZE.lg} color={colors.warning} />
                </View>
                <AppText variant="h3" align="center">
                  Profile loading is slow
                </AppText>
                <AppText variant="body" tone="secondary" align="center" style={styles.overlayDescription}>
                  {platformDisplayName} is taking longer than usual to load inside the app. Would you like to open it directly in the native app?
                </AppText>

                <Button
                  label={`Open in ${platformDisplayName} App`}
                  icon="open-in-new"
                  onPress={handleOpenDeepLink}
                  style={styles.overlayPrimaryButton}
                />
                <Button
                  label="Open in Default Browser"
                  variant="secondary"
                  icon="web"
                  onPress={handleOpenBrowser}
                  style={styles.overlaySecondaryButton}
                />

                <View style={styles.overlayRowButtons}>
                  <Button
                    label="Retry Loading"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={handleRetryWebView}
                  />
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    onPress={() => navigation.goBack()}
                  />
                </View>
              </Surface>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="link-off"
            title="Invalid profile URL"
            description="This platform didn't provide a valid link to open."
          />
        </View>
      )}

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.bgSecondary }]}>
        <Button label="Done" icon="check" onPress={handleDonePress} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, marginLeft: SPACING.sm },
  headerSpacer: { width: 40, height: 40 },
  progressBar: {
    height: 3,
    position: 'absolute',
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  bannerText: { flex: 1, marginLeft: SPACING.sm, lineHeight: 18 },
  toast: {
    position: 'absolute',
    top: 112,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 20,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: { marginLeft: SPACING.sm },
  webContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  loading: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    zIndex: 5,
  },
  loadingBlock: { marginTop: SPACING.lg },
  loadingLine: { marginTop: SPACING.md },
  loadingText: { marginTop: SPACING.lg },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  footer: {
    padding: SPACING.md,
    borderTopWidth: 1,
  },

  overlayContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    zIndex: 50,
  },
  overlayCard: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  overlayIcon: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  overlayDescription: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    maxWidth: 300,
  },
  overlayPrimaryButton: {
    marginBottom: SPACING.sm,
  },
  overlaySecondaryButton: {
    marginBottom: SPACING.lg,
  },
  overlayRowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});
