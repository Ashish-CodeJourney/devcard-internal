// ─── AuthHero ─────────────────────────────────────────────────────────────────
// Locally drawn hero artwork for the authentication flow. Built with
// react-native-svg so there is no remote image dependency and nothing to break
// offline. The composition (layered cards, QR motif, orbit rings) is themed to
// the app's own identity rather than a generic stock illustration.

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  G,
} from 'react-native-svg';
import { AuthPalette } from '../theme/authTheme';

type Props = {
  height: number;
  palette: AuthPalette;
  isDark: boolean;
};

// Deterministic 7x7 QR-ish motif.
const QR: boolean[] = (() => {
  const cells: boolean[] = [];
  // prettier-ignore
  const seed = [
    1,1,1,0,1,0,1,
    1,0,1,0,0,1,1,
    1,1,1,1,0,0,1,
    0,0,0,1,1,0,0,
    1,0,1,0,1,1,0,
    1,1,0,1,0,0,1,
    1,0,1,1,0,1,1,
  ];
  for (let i = 0; i < 49; i++) cells.push(!!seed[i]);
  return cells;
})();

export const AuthHero: React.FC<Props> = ({ height, palette, isDark }) => {
  const card = isDark ? '#F4F5F0' : '#FFFFFF';
  const cardStroke = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(11,13,15,0.08)';
  const cardBack = isDark ? 'rgba(244,245,240,0.10)' : 'rgba(255,255,255,0.62)';
  const line = isDark ? 'rgba(11,13,15,0.16)' : 'rgba(11,13,15,0.14)';
  const chip = palette.heroAccent;

  return (
    <Svg width="100%" height={height} viewBox="0 0 390 360" preserveAspectRatio="xMidYMax slice">
      <Defs>
        <LinearGradient id="heroBg" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={palette.heroFrom} stopOpacity="1" />
          <Stop offset="1" stopColor={palette.heroTo} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <Rect x="0" y="0" width="390" height="360" fill="url(#heroBg)" />

      {/* Ambient shapes */}
      <Circle cx="330" cy="52" r="118" fill={palette.heroAccent} opacity={0.10} />
      <Circle cx="58" cy="112" r="56" fill="none" stroke={palette.heroAccent} strokeWidth="1.5" opacity={0.30} />
      <Circle cx="316" cy="214" r="26" fill="none" stroke={palette.heroAccent} strokeWidth="1.5" opacity={0.22} />
      <Circle cx="42" cy="248" r="4" fill={palette.heroAccent} opacity={0.5} />
      <Circle cx="352" cy="140" r="3" fill={palette.heroAccent} opacity={0.45} />

      {/* Card behind */}
      <G transform="rotate(9 195 214)">
        <Rect
          x="86"
          y="150"
          width="212"
          height="130"
          rx="22"
          fill={cardBack}
          stroke={cardStroke}
          strokeWidth="1"
        />
      </G>

      {/* Primary card */}
      <G transform="rotate(-6 195 208)">
        <Rect
          x="92"
          y="136"
          width="212"
          height="130"
          rx="22"
          fill={card}
          stroke={cardStroke}
          strokeWidth="1"
        />

        {/* chip */}
        <Rect x="118" y="164" width="36" height="26" rx="7" fill={chip} opacity={0.9} />

        {/* identity lines */}
        <Rect x="118" y="206" width="120" height="9" rx="4.5" fill={line} />
        <Rect x="118" y="224" width="76" height="9" rx="4.5" fill={line} opacity={0.7} />

        {/* QR motif */}
        <G transform="translate(248 196)">
          {QR.map((on, i) =>
            on ? (
              <Rect
                key={i}
                x={(i % 7) * 6}
                y={Math.floor(i / 7) * 6}
                width="5"
                height="5"
                rx="1.2"
                fill={isDark ? '#0B0D0F' : '#0B0D0F'}
                opacity={0.85}
              />
            ) : null,
          )}
        </G>
      </G>
    </Svg>
  );
};

export default AuthHero;
