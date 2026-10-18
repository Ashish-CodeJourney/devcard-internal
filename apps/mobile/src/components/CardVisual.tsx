// ─── CardVisual ───────────────────────────────────────────────────────────────
// The signature surface of the app. Three coherent presets are rendered from the
// SAME card data (title, links, default flag) — no backend fields are invented.
//
//   signal   — bold typography, chartreuse accent, high contrast
//   terminal — technical, monospaced, fine grid rules, compact metadata
//   orbit    — expressive, restrained gradient, asymmetric balance
//
// The preset choice is a local display preference (persisted in AsyncStorage by
// the caller), not part of the card API contract.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { AppText } from './ui/Text';
import { Icon, platformIcon } from './ui/Icon';
import { BORDER_RADIUS, SPACING, FONT_FAMILY } from '../theme/tokens';

export type CardPreset = 'signal' | 'terminal' | 'orbit';

export const CARD_PRESETS: { id: CardPreset; name: string; blurb: string }[] = [
  { id: 'signal', name: 'Signal', blurb: 'Bold type, chartreuse accent' },
  { id: 'terminal', name: 'Terminal', blurb: 'Monospace, technical grid' },
  { id: 'orbit', name: 'Orbit', blurb: 'Expressive, asymmetric' },
];

type Link = { id: string; platform: string; username: string };

type Props = {
  title: string;
  links: Link[];
  isDefault?: boolean;
  preset?: CardPreset;
  owner?: string;
  height?: number;
};

export const CardVisual: React.FC<Props> = ({
  title,
  links,
  isDefault = false,
  preset = 'signal',
  owner,
  height = 200,
}) => {
  const { colors } = useTheme();

  // Short tiles (the cards list) get a single-line title so nothing wraps
  // into the tight vertical space; taller previews keep two lines.
  const titleLines = height <= 160 ? 1 : 2;

  const iconRow = (count: number, size = 18) => (
    <View style={styles.icons}>
      {links.slice(0, count).map(l => (
        <Icon
          key={l.id}
          name={platformIcon(l.platform)}
          size={size}
          color={colors.textSecondary}
          style={styles.iconGap}
        />
      ))}
      {links.length > count ? (
        <AppText variant="eyebrow" tone="muted" style={styles.iconGap}>
          +{links.length - count}
        </AppText>
      ) : null}
    </View>
  );

  // ─── Signal ───
  if (preset === 'signal') {
    return (
      <View
        style={[
          styles.base,
          { height, backgroundColor: colors.bgCard, borderColor: isDefault ? colors.accentBorder : colors.border },
        ]}>
        <View style={[styles.signalBar, { backgroundColor: colors.accent }]} />
        <View style={styles.signalBody}>
          <View style={styles.rowBetween}>
            <AppText variant="eyebrow" tone="muted">
              SIGNAL
            </AppText>
            {isDefault ? (
              <View style={[styles.defaultChip, { backgroundColor: colors.accent }]}>
                <AppText variant="eyebrow" color={colors.textInverse}>
                  ACTIVE
                </AppText>
              </View>
            ) : null}
          </View>

          <AppText variant="display" numberOfLines={titleLines} style={styles.signalTitle}>
            {title}
          </AppText>

          <View style={styles.signalFooter}>
            {owner ? (
              <AppText variant="mono" tone="secondary" numberOfLines={1} style={styles.owner}>
                @{owner}
              </AppText>
            ) : null}
            {iconRow(4)}
          </View>
        </View>
      </View>
    );
  }

  // ─── Terminal ───
  if (preset === 'terminal') {
    return (
      <View style={[styles.base, { height, backgroundColor: colors.bgInset ?? colors.bgPrimary, borderColor: colors.border }]}>
        {/* fine technical grid */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {[0.25, 0.5, 0.75].map(f => (
            <View key={f} style={[styles.gridLine, { top: `${f * 100}%`, backgroundColor: colors.border }]} />
          ))}
        </View>

        <View style={styles.termBody}>
          <View style={styles.rowBetween}>
            <AppText variant="mono" tone="accent">
              ~/devcard
            </AppText>
            <AppText variant="mono" tone="muted">
              {isDefault ? '[default]' : '[card]'}
            </AppText>
          </View>

          <AppText
            variant="h2"
            numberOfLines={titleLines}
            style={[styles.termTitle, { fontFamily: FONT_FAMILY.mono }]}>
            {title}
          </AppText>

          <View style={styles.termMeta}>
            <AppText variant="mono" tone="muted">
              links: {links.length}
            </AppText>
            {owner ? (
              <AppText variant="mono" tone="secondary">
                user: @{owner}
              </AppText>
            ) : (
              <AppText variant="mono" tone="secondary">
                user: —
              </AppText>
            )}
          </View>

          {iconRow(6, 16)}
        </View>
      </View>
    );
  }

  // ─── Orbit ───
  return (
    <View style={[styles.base, { height, backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="orbitGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.bgElevated} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.bgPrimary} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#orbitGrad)" />
      </Svg>

      {/* offset ring — asymmetric focal point */}
      <View
        pointerEvents="none"
        style={[styles.orbitRing, { borderColor: colors.accentBorder }]}
      />
      <View
        pointerEvents="none"
        style={[styles.orbitDot, { backgroundColor: colors.accent }]}
      />

      <View style={styles.orbitBody}>
        <AppText variant="eyebrow" tone="muted">
          ORBIT
        </AppText>
        <View style={styles.orbitSpacer} />
        <AppText variant="h1" numberOfLines={titleLines} style={styles.orbitTitle}>
          {title}
        </AppText>
        <View style={styles.signalFooter}>
          {owner ? (
            <AppText variant="mono" tone="secondary" numberOfLines={1} style={styles.owner}>
              @{owner}
            </AppText>
          ) : null}
          {isDefault ? (
            <View style={[styles.defaultChip, styles.defaultChipOrbit, { backgroundColor: colors.accentSoft, borderColor: colors.accentBorder }]}>
              <AppText variant="eyebrow" tone="accent">
                ACTIVE
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // signal
  signalBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  signalBody: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, justifyContent: 'space-between', paddingLeft: SPACING.lg + 4 },
  signalTitle: { fontSize: 30, lineHeight: 34 },
  signalFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  owner: { flex: 1, marginRight: SPACING.sm },

  // terminal
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, opacity: 0.6 },
  termBody: { flex: 1, padding: SPACING.lg, justifyContent: 'space-between' },
  termTitle: { fontSize: 24, lineHeight: 28 },
  termMeta: { flexDirection: 'row', justifyContent: 'space-between' },

  // orbit
  orbitRing: {
    position: 'absolute',
    right: -60,
    top: -50,
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
  },
  orbitDot: { position: 'absolute', right: 30, top: 40, width: 8, height: 8, borderRadius: 4 },
  orbitBody: { flex: 1, padding: SPACING.lg, justifyContent: 'flex-start' },
  orbitSpacer: { flex: 1 },
  orbitTitle: { fontSize: 30, lineHeight: 34, marginBottom: SPACING.md },

  // shared
  icons: { flexDirection: 'row', alignItems: 'center' },
  iconGap: { marginRight: SPACING.sm },
  defaultChip: { borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  defaultChipOrbit: { borderWidth: 1 },
});

export default CardVisual;
