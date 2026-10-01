import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SkeletonCard } from '@/components/Skeleton';
import { colors, statusColors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { dayLabel, formatTime } from '@/utils/format';
import { useData } from '@/store/data';
import type { ActivityEvent, ActivityEventType } from '@/types';

const META: Record<
  ActivityEventType,
  { icon: keyof typeof Ionicons.glyphMap; status: keyof typeof statusColors }
> = {
  envelope_created: { icon: 'mail-outline', status: 'waiting' },
  envelope_claimed: { icon: 'person-outline', status: 'claimed' },
  payment_processing: { icon: 'sync-outline', status: 'processing' },
  payment_completed: { icon: 'checkmark-circle-outline', status: 'completed' },
  envelope_expired: { icon: 'time-outline', status: 'expired' },
  payment_failed: { icon: 'alert-circle-outline', status: 'failed' },
};

type Group = { label: string; events: ActivityEvent[] };

export default function ActivityScreen() {
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
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 108 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.subtitle}>Everything that has happened on your envelopes</Text>

      {loadingActivity && activity.length === 0 ? (
        <View style={styles.list}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="pulse-outline" size={24} color={colors.textMuted} />
          <Text style={styles.emptyText}>No activity yet.</Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.label} style={styles.group}>
            <Text style={styles.groupLabel}>{group.label}</Text>
            {group.events.map((event, index) => (
              <ActivityRow
                key={event.id}
                event={event}
                index={index}
                isLast={index === group.events.length - 1}
                onPress={
                  event.envelopeId
                    ? () => router.push(`/envelope/${event.envelopeId}`)
                    : undefined
                }
              />
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function ActivityRow({
  event,
  index,
  isLast,
  onPress,
}: {
  event: ActivityEvent;
  index: number;
  isLast: boolean;
  onPress?: () => void;
}) {
  const meta = META[event.type];
  const palette = statusColors[meta.status];

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(360)}>
      <Animated.View style={styles.row}>
        <View style={styles.rail}>
          <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
            <Ionicons name={meta.icon} size={15} color={palette.fg} />
          </View>
          {!isLast ? <View style={styles.railLine} /> : null}
        </View>

        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessible={Boolean(onPress)}
          accessibilityRole={onPress ? 'button' : undefined}
          accessibilityLabel={`${event.title}, ${event.subtitle}`}
          style={styles.rowBody}
        >
          <View style={styles.rowTop}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {event.title}
            </Text>
            {event.amount !== null ? (
              <Text
                style={[
                  styles.rowAmount,
                  event.type === 'payment_completed' && styles.rowAmountPositive,
                ]}
              >
                {event.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            ) : null}
          </View>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {event.subtitle}
          </Text>
          <Text style={styles.rowTime}>{formatTime(event.createdAt)}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  group: {
    marginTop: spacing.xxl,
  },
  groupLabel: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    alignItems: 'center',
    width: 34,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railLine: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  rowBody: {
    flex: 1,
    paddingBottom: spacing.xl,
    paddingTop: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowTitle: {
    ...type.bodyMedium,
    fontSize: 15,
    color: colors.text,
    flexShrink: 1,
  },
  rowAmount: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.text,
  },
  rowAmountPositive: {
    color: colors.success,
  },
  rowSubtitle: {
    ...type.meta,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowTime: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    marginTop: spacing.xxl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...type.caption,
    color: colors.textMuted,
  },
});
