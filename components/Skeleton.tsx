import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { Palette } from '@/constants/theme';
import { useThemedStyles } from '@/store/theme';
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
  radiusOverride = radius.sm - 2,
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
    opacity: 0.5 + shimmer.value * 0.5,
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius: radiusOverride },
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

/** Skeleton shaped like an envelope row; place inside a `ListGroup`. */
export function SkeletonCard({ style }: CardProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={40} height={40} radiusOverride={12} />
      <View style={styles.rowBody}>
        <Skeleton width={120} height={13} />
        <Skeleton width={72} height={10} />
      </View>
      <View style={styles.rowTrailing}>
        <Skeleton width={70} height={13} />
        <Skeleton width={48} height={10} />
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    base: {
      backgroundColor: colors.backgroundSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
    },
    rowBody: {
      flex: 1,
      gap: spacing.sm,
    },
    rowTrailing: {
      alignItems: 'flex-end',
      gap: spacing.sm,
    },
  });

export default Skeleton;
