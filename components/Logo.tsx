import React, { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Path, Rect } from 'react-native-svg';
import { fontFamily } from '@/constants/typography';
import { useTheme } from '@/store/theme';

const FLAP = '#30363F';

/**
 * The Envelope mark: a yellow tile carrying a sealed envelope whose seal shows
 * the cedi sign. The app icon, splash and favicon in assets/ are rendered from
 * this same geometry (body 24 x 17.45, flap tip and seal at y 21.75).
 */
export function LogoMark({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  const clipId = `logoBody${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x="8" y="11.27" width="24" height="17.45" rx="3.27" />
        </ClipPath>
      </Defs>
      <Rect width="40" height="40" rx="11" fill={colors.primary} />
      <Rect x="8" y="11.27" width="24" height="17.45" rx="3.27" fill={colors.onPrimary} />
      <Path d="M6.9 10.18H33.1L20 21.75Z" fill={FLAP} clipPath={`url(#${clipId})`} />
      <Circle cx="20" cy="21.75" r="3.87" fill={colors.onPrimary} />
      <Circle cx="20" cy="21.75" r="3.27" fill={colors.primary} />
      <Path
        d="M21.18 22.8A1.58 1.58 0 1 1 21.18 20.69"
        stroke={colors.onPrimary}
        strokeWidth={0.68}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M20 19.51V23.98"
        stroke={colors.onPrimary}
        strokeWidth={0.55}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function Logo({ size = 32 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Envelope">
      <LogoMark size={size} />
      <Text
        style={[
          styles.word,
          { color: colors.text, fontSize: size * 0.56, letterSpacing: -size * 0.012 },
        ]}
      >
        Envelope
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  word: {
    fontFamily: fontFamily.bold,
  },
});

export default Logo;
