import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconTile } from '@/components/ui';
import type { IconName } from '@/components/Icon';
import { spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { formatMoney, relativeTime } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { statusDescription, statusLabel } from './StatusBadge';
import type { Envelope } from '@/types';

type Props = {
  envelope: Envelope;
  onPress?: (envelope: Envelope) => void;
  /** Kept for API compatibility; rows no longer stagger in. */
  index?: number;
  compact?: boolean;
};

const iconForStatus: Record<Envelope['status'], IconName> = {
  waiting: 'envelope',
  claimed: 'profile',
  processing: 'sync',
  completed: 'checkCircle',
  expired: 'clock',
  failed: 'alert',
};

/**
 * A transaction-style row: status icon, envelope code and age on the left,
 * amount and status on the right. Designed to sit inside a `ListGroup`.
 */
export function EnvelopeCard({ envelope, onPress, compact }: Props) {
  const { statusColors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = statusColors[envelope.status];
  const muted = envelope.status === 'expired' || envelope.status === 'failed';

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress?.(envelope);
      }}
      accessibilityRole="button"
      accessibilityLabel={`${formatMoney(envelope.amount)}, ${statusDescription[envelope.status]}`}
      accessibilityHint="Opens envelope details"
      style={({ pressed }) => [styles.row, compact && styles.rowCompact, pressed && styles.rowPressed]}
    >
      <IconTile
        icon={iconForStatus[envelope.status]}
        size={40}
        color={palette.fg}
        background={palette.bg}
      />

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          Envelope <Text style={styles.code}>· {envelope.code}</Text>
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {envelope.recipientName
            ? `To ${envelope.recipientName} · ${relativeTime(envelope.createdAt)}`
            : relativeTime(envelope.createdAt)}
        </Text>
      </View>

      <View style={styles.trailing}>
        <Text style={[styles.amount, muted && styles.amountMuted]} numberOfLines={1}>
          {formatMoney(envelope.amount)}
        </Text>
        <Text style={[styles.status, { color: palette.fg }]}>
          {statusLabel[envelope.status]}
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
    },
    rowCompact: {
      paddingVertical: spacing.md,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...type.cardTitle,
      color: colors.text,
    },
    code: {
      fontFamily: fontFamily.medium,
      color: colors.textMuted,
      letterSpacing: 0.4,
    },
    meta: {
      ...type.meta,
      color: colors.textMuted,
    },
    trailing: {
      alignItems: 'flex-end',
      gap: 2,
    },
    amount: {
      ...type.cardTitle,
      ...tabularNums,
      color: colors.text,
    },
    amountMuted: {
      color: colors.textMuted,
      textDecorationLine: 'line-through',
    },
    status: {
      fontFamily: fontFamily.medium,
      fontSize: 12,
      lineHeight: 16,
    },
  });

export default EnvelopeCard;
