import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '@/components/Icon';
import { SkeletonCard } from '@/components/Skeleton';
import {
  EmptyState,
  GroupLabel,
  IconTile,
  ListGroup,
  ScreenHeader,
  screenContent,
} from '@/components/ui';
import type { Palette, StatusKey } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { spacing } from '@/constants/layout';
import { tabularNums, type } from '@/constants/typography';
import { dayLabel, formatMoney, formatTime } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useData } from '@/store/data';
import type { ActivityEvent, ActivityEventType } from '@/types';

const META: Record<
  ActivityEventType,
  { icon: IconName; status: StatusKey }
> = {
  envelope_created: { icon: 'envelope', status: 'waiting' },
  envelope_claimed: { icon: 'profile', status: 'claimed' },
  payment_processing: { icon: 'sync', status: 'processing' },
  payment_completed: { icon: 'checkCircle', status: 'completed' },
  envelope_expired: { icon: 'clock', status: 'expired' },
  payment_failed: { icon: 'alert', status: 'failed' },
};

type Group = { label: string; events: ActivityEvent[] };

export default function ActivityScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activity, loadingActivity } = useData();

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const event of activity) {
      const key = dayLabel(event.createdAt);
      const existing = map.get(key);
      if (existing) existing.push(event);
      else map.set(key, [event]);
    }
    return Array.from(map.entries()).map(([label, events]) => ({ label, events }));
  }, [activity]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        screenContent,
        { paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Activity"
        subtitle="A timeline of everything that happened to your envelopes."
      />

      {loadingActivity && activity.length === 0 ? (
        <ListGroup>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ListGroup>
      ) : groups.length === 0 ? (
        <EmptyState
          icon="activity"
          title="No activity yet"
          body="When a recipient claims an envelope or a payment completes, it shows up here."
        />
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <GroupLabel>{group.label}</GroupLabel>
            <ListGroup>
              {group.events.map((event) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  onPress={
                    event.envelopeId
                      ? () => router.push(`/envelope/${event.envelopeId}`)
                      : undefined
                  }
                />
              ))}
            </ListGroup>
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ActivityRow({
  event,
  onPress,
}: {
  event: ActivityEvent;
  onPress?: () => void;
}) {
  const { statusColors, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const meta = META[event.type];
  const palette = statusColors[meta.status];
  const positive = event.type === 'payment_completed';

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptics.light();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${event.title}, ${event.subtitle}`}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <IconTile icon={meta.icon} size={40} color={palette.fg} background={palette.bg} />

      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {event.subtitle}
        </Text>
      </View>

      <View style={styles.rowTrailing}>
        {event.amount !== null ? (
          <Text style={[styles.rowAmount, positive && { color: colors.success }]}>
            {formatMoney(event.amount)}
          </Text>
        ) : null}
        <Text style={styles.rowTime}>{formatTime(event.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    group: {
      marginBottom: spacing.xl,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
    },
    rowPressed: {
      backgroundColor: colors.surfaceMuted,
    },
    rowBody: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...type.cardTitle,
      color: colors.text,
    },
    rowSubtitle: {
      ...type.meta,
      color: colors.textMuted,
    },
    rowTrailing: {
      alignItems: 'flex-end',
      gap: 2,
    },
    rowAmount: {
      ...type.cardTitle,
      ...tabularNums,
      color: colors.text,
    },
    rowTime: {
      ...type.meta,
      color: colors.textMuted,
    },
  });
