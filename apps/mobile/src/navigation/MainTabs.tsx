import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Icon, ICONS, IconName } from '../components/ui';
import { SPACING, BORDER_RADIUS, LAYOUT } from '../theme/tokens';

import HomeScreen from '../screens/HomeScreen';
import LinksScreen from '../screens/LinksScreen';
import CardsScreen from '../screens/CardsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ScanScreen from '../screens/ScanScreen';
import DevCardViewScreen from '../screens/DevCardViewScreen';
import WebViewScreen from '../screens/WebViewScreen';
import ContactsScreen from '../screens/ContactsScreen';
import EventsScreen from '../screens/EventsScreen';
import EventDetailScreen from '../screens/EventDetailScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import NfcScreen from '../screens/NfcScreen';

import { ConnectPlatformsScreen } from '../screens/ConnectPlatformsScreen';
import { ViewsScreen } from '../screens/ViewsScreen';

// ─── Types ───

export type MainTabsParamList = {
  Home: undefined;
  Contacts: undefined;
  Scan: undefined;
  Cards: { cardId?: string } | undefined;
  Profile: undefined;
};

// Standalone type for WebViewConnect route params — exported for reuse in
// WebViewScreen, DevCardViewScreen, or any future screen that navigates here.
export type WebViewConnectParams = {
  platform: string;
  url: string;
  platformName: string;
  username?: string;
  linkId?: string;
  cardOwnerUsername: string;
};

export type RootStackParamList = {
  MainTabs: undefined;
  DevCardView: { username: string; followSuccessLinkId?: string };
  WebViewConnect: WebViewConnectParams;
  ConnectPlatforms: undefined;
  Views: undefined;
  Links: undefined;
  Events: undefined;
  EventDetail: { slug: string; name: string };
  Teams: undefined;
  TeamDetail: { slug: string; name: string };
  Nfc: undefined;
  Settings: undefined;
};

// ─── Tab Bar Icons (real icon set — never emoji) ───

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  Home: { active: ICONS.homeActive, inactive: ICONS.home },
  Contacts: { active: ICONS.contactsActive, inactive: ICONS.contacts },
  Cards: { active: ICONS.cardsActive, inactive: ICONS.cards },
  Profile: { active: ICONS.profileActive, inactive: ICONS.profile },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const { colors } = useTheme();
  const set = TAB_ICONS[name];
  if (!set) {
    return <Icon name="circle-small" size={22} color={colors.textMuted} />;
  }
  return <Icon name={focused ? set.active : set.inactive} size={24} color={focused ? colors.accent : colors.textMuted} />;
}

// Elevates the scan action out of the bar as the primary capture affordance.
function ScanButton({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.scanButton, { backgroundColor: focused ? colors.accentLight : colors.accent }]}>
      <Icon name={ICONS.scan} size={26} color={colors.textInverse} />
    </View>
  );
}

// ─── Tab Navigator ───

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabNavigator() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.bgPrimary, borderTopColor: colors.border },
        ],
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabel: route.name.toUpperCase(),
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <ScanButton focused={focused} />,
        }}
      />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Root Stack (Tabs + Modals) ───

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainTabs() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.bgPrimary },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bgPrimary },
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="DevCardView"
        component={DevCardViewScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WebViewConnect"
        component={WebViewScreen}
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="ConnectPlatforms"
        component={ConnectPlatformsScreen}
        options={{ title: 'Connected Platforms', headerShown: true }}
      />
      <Stack.Screen
        name="Views"
        component={ViewsScreen}
        options={{ title: 'Card Views', headerShown: true }}
      />
      <Stack.Screen name="Links" component={LinksScreen} options={{ headerShown: true, title: 'Platform Links' }} />
      <Stack.Screen name="Events" component={EventsScreen} options={{ headerShown: true, title: 'Events' }} />
      <Stack.Screen name="EventDetail" component={EventDetailScreen} options={{ headerShown: true, title: 'Event' }} />
      <Stack.Screen name="Teams" component={TeamsScreen} options={{ headerShown: true, title: 'Teams' }} />
      <Stack.Screen name="TeamDetail" component={TeamDetailScreen} options={{ headerShown: true, title: 'Team' }} />
      <Stack.Screen name="Nfc" component={NfcScreen} options={{ headerShown: true, title: 'NFC' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: true, title: 'Settings' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: LAYOUT.tabBarHeight + 14,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  // flex:1 on every item gives each icon an identical share of the full width,
  // so icon-to-icon spacing matches the spacing to each screen edge.
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: SPACING.xs,
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.8, marginTop: 2 },
  scanButton: {
    width: 54,
    height: 54,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
});
