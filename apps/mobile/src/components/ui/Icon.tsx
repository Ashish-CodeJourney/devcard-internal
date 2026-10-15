// ─── Icon system ──────────────────────────────────────────────────────────────
// Single icon set (MaterialCommunityIcons) so the whole app shares one visual
// language and every glyph name is guaranteed to exist in the bundled font.

import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../context/ThemeContext';
import { ICON_SIZE } from '../../theme/tokens';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: React.ComponentProps<typeof MaterialCommunityIcons>['style'];
};

export const Icon: React.FC<Props> = ({ name, size = ICON_SIZE.md, color, style }) => {
  const { colors } = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? colors.textPrimary} style={style} />;
};

// ─── Platform icons ───────────────────────────────────────────────────────────
// Prefer authentic brand glyphs where the icon set ships them; fall back to the
// closest honest generic glyph. Never emoji.

export const PLATFORM_ICONS: Record<string, IconName> = {
  github: 'github',
  linkedin: 'linkedin',
  twitter: 'twitter',
  gitlab: 'gitlab',
  devfolio: 'rocket-launch-outline',
  npm: 'npm',
  devto: 'dev-to',
  hashnode: 'hexagon-multiple-outline',
  medium: 'post-outline',
  leetcode: 'code-brackets',
  hackerrank: 'code-tags',
  stackoverflow: 'stack-overflow',
  discord: 'discord',
  telegram: 'send',
  email: 'email-outline',
  portfolio: 'web',
  custom: 'link-variant',
};

export function platformIcon(platform: string): IconName {
  return PLATFORM_ICONS[platform] ?? 'link-variant';
}

/** Shared navigation/action glyphs, so screens never invent their own names. */
export const ICONS = {
  home: 'home-variant-outline' as IconName,
  homeActive: 'home-variant' as IconName,
  contacts: 'account-multiple-outline' as IconName,
  contactsActive: 'account-multiple' as IconName,
  scan: 'qrcode-scan' as IconName,
  cards: 'card-account-details-outline' as IconName,
  cardsActive: 'card-account-details' as IconName,
  profile: 'account-circle-outline' as IconName,
  profileActive: 'account-circle' as IconName,
  close: 'close' as IconName,
  check: 'check' as IconName,
  chevronRight: 'chevron-right' as IconName,
  chevronLeft: 'chevron-left' as IconName,
  chevronDown: 'chevron-down' as IconName,
  arrowRight: 'arrow-right' as IconName,
  arrowUpRight: 'arrow-up-right' as IconName,
  search: 'magnify' as IconName,
  plus: 'plus' as IconName,
  edit: 'pencil-outline' as IconName,
  trash: 'trash-can-outline' as IconName,
  drag: 'drag-vertical' as IconName,
  refresh: 'refresh' as IconName,
  alert: 'alert-circle-outline' as IconName,
  info: 'information-outline' as IconName,
  settings: 'cog-outline' as IconName,
  logout: 'logout-variant' as IconName,
  share: 'share-variant-outline' as IconName,
  copy: 'content-copy' as IconName,
  openExternal: 'open-in-new' as IconName,
  qr: 'qrcode' as IconName,
  nfc: 'nfc-variant' as IconName,
  eye: 'eye-outline' as IconName,
  chart: 'chart-line' as IconName,
  calendar: 'calendar-blank-outline' as IconName,
  trophy: 'trophy-outline' as IconName,
  shield: 'shield-outline' as IconName,
  star: 'star-outline' as IconName,
  palette: 'palette-outline' as IconName,
  theme: 'theme-light-dark' as IconName,
  link: 'link-variant' as IconName,
  phone: 'cellphone' as IconName,
  globe: 'web' as IconName,
  camera: 'camera-outline' as IconName,
  flash: 'flash-outline' as IconName,
  lock: 'lock-outline' as IconName,
  bell: 'bell-outline' as IconName,
  help: 'help-circle-outline' as IconName,
  sparkle: 'lightning-bolt-outline' as IconName,
  grid: 'dots-grid' as IconName,
  empty: 'tray' as IconName,
};

export default Icon;
