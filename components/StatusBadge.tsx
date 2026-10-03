import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { StatusKey } from '@/constants/theme';
import { useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily } from '@/constants/typography';

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
  const { statusColors } = useTheme();
  const palette = statusColors[status];

  return (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: palette.bg },
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: palette.fg }]} />
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: palette.fg }]}>
        {label ?? statusLabel[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  textSm: {
    fontSize: 11,
    lineHeight: 14,
  },
});

export default StatusBadge;
