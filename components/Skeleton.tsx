import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
  radiusOverride?: number;
};

/** Shimmering placeholder used instead of generic spinners. */
export function Skeleton({
  width = '100%',
  height = 14,
  style,
  radiusOverride = radius.sm,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const shimmer = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = withTiming(0.5, { duration: 120 });
      return;
    }
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 780 }),
        withTiming(0, { duration: 780 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(shimmer);
  }, [reduceMotion, shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + shimmer.value * 0.45,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radiusOverride,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

type CardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Skeleton shaped like an envelope row. */
export function SkeletonCard({ style }: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={40} height={40} radiusOverride={radius.md} />
      <View style={styles.cardBody}>
        <Skeleton width={72} height={15} />
        <Skeleton width={128} height={11} style={styles.cardMeta} />
      </View>
      <Skeleton width={64} height={20} radiusOverride={radius.pill} />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardBody: {
    flex: 1,
    gap: spacing.sm,
  },
  cardMeta: {
    marginTop: 0,
  },
});

export default Skeleton;
