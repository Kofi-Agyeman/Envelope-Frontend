import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, statusColors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { formatAmountCompact, relativeTime } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { StatusBadge, statusDescription } from './StatusBadge';
import type { Envelope } from '@/types';

type Props = {
  envelope: Envelope;
  onPress?: (envelope: Envelope) => void;
  index?: number;
  compact?: boolean;
};

const iconForStatus: Record<Envelope['status'], keyof typeof Ionicons.glyphMap> = {
  waiting: 'mail-outline',
  claimed: 'person-outline',
  processing: 'sync-outline',
  completed: 'checkmark-circle-outline',
  expired: 'time-outline',
  failed: 'alert-circle-outline',
};

export function EnvelopeCard({ envelope, onPress, index = 0, compact }: Props) {
  const palette = statusColors[envelope.status];

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(380)}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress?.(envelope);
        }}
        accessibilityRole="button"
        accessibilityLabel={`${formatAmountCompact(envelope.amount)}, ${statusDescription[envelope.status]}`}
        accessibilityHint="Opens envelope details"
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          pressed && styles.cardPressed,
        ]}
      >
        <View
          style={[styles.iconWrap, { backgroundColor: palette.bg }]}
        >
          <Ionicons name={iconForStatus[envelope.status]} size={18} color={palette.fg} />
        </View>

        <View style={styles.body}>
          <Text style={styles.amount} numberOfLines={1}>
            {formatAmountCompact(envelope.amount)}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {compact
              ? statusDescription[envelope.status]
              : `Created ${relativeTime(envelope.createdAt)} · ${statusDescription[envelope.status]}`}
          </Text>
        </View>

        <View style={styles.trailing}>
          <StatusBadge status={envelope.status} size="sm" />
          <Text style={styles.code}>{envelope.code}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  cardCompact: {
    padding: spacing.lg - 2,
  },
  cardPressed: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderStrong,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  amount: {
    ...type.cardTitle,
    fontFamily: fontFamily.bold,
    color: colors.text,
  },
  meta: {
    ...type.meta,
    color: colors.textMuted,
  },
  trailing: {
    alignItems: 'flex-end',
    gap: 5,
  },
  code: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
});

export default EnvelopeCard;
