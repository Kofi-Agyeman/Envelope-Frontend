import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Palette, StatusKey } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';

export const statusLabel: Record<StatusKey, string> = {
  waiting: 'Waiting',
  claimed: 'Claimed',
  processing: 'Processing',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Failed',
};

export const statusDescription: Record<StatusKey, string> = {
  waiting: 'Waiting for recipient',
  claimed: 'Recipient identified',
  processing: 'Payment processing',
  completed: 'Completed',
  expired: 'Expired',
  failed: 'Could not be completed',
};

type Props = {
  status: StatusKey;
  label?: string;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, label, style, size = 'md' }: Props) {
  const { statusColors, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = statusColors[status];
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 15, stiffness: 190 });
  }, [enter, status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ scale: 0.9 + enter.value * 0.1 }],
  }));

  return (
    <Animated.View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: palette.bg },
        animatedStyle,
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: palette.fg }]}>
        {label ?? statusLabel[status]}
      </Text>
    </Animated.View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 15,
  },
});

export default StatusBadge;
