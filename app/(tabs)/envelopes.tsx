import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { EnvelopeCard } from '@/components/EnvelopeCard';
import { SkeletonCard } from '@/components/Skeleton';
import { Icon, type IconName } from '@/components/Icon';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { formatMoney } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useData } from '@/store/data';
import type { Envelope } from '@/types';

type Filter = 'all' | 'active' | 'completed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const ACTIVE_STATUSES: Envelope['status'][] = [
  'waiting',
  'claimed',
  'processing',
];

export default function EnvelopesScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { envelopes, loadingEnvelopes } = useData();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'active') {
      return envelopes.filter((e) => ACTIVE_STATUSES.includes(e.status));
    }
    if (filter === 'completed') {
      return envelopes.filter((e) => e.status === 'completed');
    }
    return envelopes;
  }, [envelopes, filter]);

  const totals = useMemo(() => {
    const active = envelopes.filter((e) => ACTIVE_STATUSES.includes(e.status));
    return {
      activeCount: active.length,
      activeValue: active.reduce((sum, e) => sum + e.amount, 0),
      completedCount: envelopes.filter((e) => e.status === 'completed').length,
    };
  }, [envelopes]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 108 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>My Envelopes</Text>
      <Text style={styles.subtitle}>
        {totals.activeCount > 0
          ? `${formatMoney(totals.activeValue)} waiting to be claimed`
          : 'Everything has been claimed'}
      </Text>

      <View style={styles.filters}>
        {FILTERS.map((item) => {
          const active = filter === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                haptics.light();
                setFilter(item.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.pill, active && styles.pillActive]}
            >
              {active ? (
                <Animated.View entering={FadeIn.duration(160)} style={styles.pillLabelWrap}>
                  <Text style={styles.pillLabelActive}>{item.label}</Text>
                </Animated.View>
              ) : (
                <Text style={styles.pillLabel}>{item.label}</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.list}>
        {loadingEnvelopes && envelopes.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="envelope" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'You have not created any envelopes yet.'
                : `No ${filter} envelopes right now.`}
            </Text>
            <Pressable
              onPress={() => router.push('/(tabs)')}
              accessibilityRole="button"
              style={styles.emptyCta}
            >
              <Text style={styles.emptyCtaText}>Create an envelope</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map((envelope, index) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
              index={index}
              onPress={() => router.push(`/envelope/${envelope.id}`)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
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
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  pill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillLabelWrap: {
    alignItems: 'center',
  },
  pillLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  pillLabelActive: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onPrimary,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryFaint,
  },
  emptyCtaText: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
});
