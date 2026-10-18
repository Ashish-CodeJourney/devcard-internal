import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import AuthStack from './src/navigation/AuthStack';
import MainTabs from './src/navigation/MainTabs';
import SplashScreen from './src/screens/SplashScreen';
import { DEEP_LINK_SCHEME } from './src/config';
import { post } from './src/services/api';
import { completeVerification } from './src/services/verification';

import { Linking, StyleSheet, Alert } from 'react-native';

// ── Deep Link Configuration ───────────────────────────────────────────────────

const linking: LinkingOptions<{}> = {
  prefixes: [`${DEEP_LINK_SCHEME}://`],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Scan: 'scan',
          Cards: 'card/:cardId',
        },
      },
      DevCardView: 'u/:username',
    },
  },
};

// ── App Content ───────────────────────────────────────────────────────────────

function AppContent() {
  const { isAuthenticated, isLoading, login, refreshUser, token: authToken } = useAuth();

  React.useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = new URL(event.url);

        // Platform verification that we completed on-device (PKCE) returns here.
        // The other providers still come back via the server's own callback.
        if (url.protocol === `${DEEP_LINK_SCHEME}:` && url.host === 'verify') {
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const failure =
            url.searchParams.get('error_description') || url.searchParams.get('error');

          if (failure) {
            Alert.alert('Verification failed', decodeURIComponent(failure));
            return;
          }
          if (!code || !state) {
            Alert.alert('Verification failed', 'The provider did not return a result.');
            return;
          }

          try {
            const handle = await completeVerification(code, state, authToken);
            await refreshUser();
            Alert.alert('Verified', `Your ${handle ? `@${handle}` : 'account'} is now verified.`);
          } catch (err: any) {
            Alert.alert('Verification failed', err?.message ?? 'Please try again.');
          }
          return;
        }

        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const token = url.searchParams.get('token') || hashParams.get('token');
        const code = url.searchParams.get('code') || hashParams.get('code');
        const error = url.searchParams.get('error') || hashParams.get('error');
        const verification = url.searchParams.get('verification');

        // Platform-link verification returns from the provider's browser.
        if (verification) {
          await refreshUser();
          Alert.alert('Verified', `Your ${verification} account is now verified.`);
          return;
        }

        // The backend returns sign-in failures to the app as ?error=… so the
        // user gets a readable reason instead of a dead end in the browser.
        if (error) {
          Alert.alert('Sign-in failed', decodeURIComponent(error));
          return;
        }

        if (token) {
          await login(token);
          return;
        }

        if (code) {
          const tokens = await post<{ accessToken: string; refreshToken: string }>(
            '/auth/mobile/exchange',
            { code },
          );

          if (tokens?.accessToken) {
            await login(tokens.accessToken);
          }
        }
      } catch (error) {
        console.error('Deep link parse error:', error);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [login, refreshUser, authToken]);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: { flex: 1 },
});
