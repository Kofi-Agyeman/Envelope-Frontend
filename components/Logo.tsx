import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { fontFamily } from '@/constants/typography';
import { useTheme } from '@/store/theme';

/** The Envelope mark: a yellow tile carrying a folded envelope glyph. */
export function LogoMark({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Rect width="40" height="40" rx="11" fill={colors.primary} />
      <Rect x="9" y="12" width="22" height="16" rx="3" fill={colors.onPrimary} />
      <Path
        d="M10.5 13.6 20 20.4l9.5-6.8"
        stroke={colors.primary}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
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
