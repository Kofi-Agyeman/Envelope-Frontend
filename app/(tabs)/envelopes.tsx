import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EnvelopeCard } from '@/components/EnvelopeCard';
import { SkeletonCard } from '@/components/Skeleton';
import { Icon } from '@/components/Icon';
import {
  Card,
  EmptyState,
  ListGroup,
  ScreenHeader,
  SegmentedControl,
  screenContent,
} from '@/components/ui';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { formatMoney } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useData } from '@/store/data';
import type { Envelope } from '@/types';

type Filter = 'all' | 'active' | 'completed';

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

  const goCreate = () => router.push('/(tabs)');

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
        title="Envelopes"
        subtitle="Every link you have shared and where it stands."
        trailing={
          <Pressable
            onPress={() => {
              haptics.light();
              goCreate();
            }}
            accessibilityRole="button"
            accessibilityLabel="Create an envelope"
            style={({ pressed }) => [styles.newButton, pressed && { opacity: 0.85 }]}
          >
            <Icon name="plus" size={18} color={colors.onPrimary} strokeWidth={2.4} />
          </Pressable>
        }
      />

      <Card style={styles.summary}>
        <Text style={styles.summaryLabel}>Outstanding</Text>
        <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(totals.activeValue)}
        </Text>
        <Text style={styles.summaryMeta}>
          {totals.activeCount > 0
            ? 'Still in your wallet until each envelope is claimed.'
            : 'Nothing waiting to be claimed.'}
        </Text>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <SummaryStat label="Active" value={totals.activeCount} dot={colors.primary} />
          <SummaryStat label="Completed" value={totals.completedCount} dot={colors.success} />
          <SummaryStat label="Total" value={envelopes.length} dot={colors.textMuted} />
        </View>
      </Card>

      <SegmentedControl<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'All' },
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
        ]}
        style={styles.filters}
      />

      {loadingEnvelopes && envelopes.length === 0 ? (
        <ListGroup>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ListGroup>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="envelope"
          title={filter === 'all' ? 'No envelopes yet' : `No ${filter} envelopes`}
          body={
            filter === 'all'
              ? 'Create an envelope and share its link. The money only moves once someone claims it.'
              : 'Envelopes will show up here as their status changes.'
          }
          actionLabel="Create an envelope"
          onAction={goCreate}
        />
      ) : (
        <ListGroup>
          {filtered.map((envelope) => (
            <EnvelopeCard
              key={envelope.id}
              envelope={envelope}
              onPress={() => router.push(`/envelope/${envelope.id}`)}
            />
          ))}
        </ListGroup>
      )}
    </ScrollView>
  );
}

function SummaryStat({ label, value, dot }: { label: string; value: number; dot: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.summaryStat}>
      <View style={styles.summaryStatHead}>
        <View style={[styles.summaryDot, { backgroundColor: dot }]} />
        <Text style={styles.summaryStatLabel}>{label}</Text>
      </View>
      <Text style={styles.summaryStatValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    newButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    summary: {
      padding: spacing.xl,
    },
    summaryLabel: {
      ...type.caption,
      color: colors.textSecondary,
    },
    summaryValue: {
      ...type.amount,
      ...tabularNums,
      color: colors.text,
      marginTop: spacing.xs,
    },
    summaryMeta: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    summaryDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.lg,
    },
    summaryRow: {
      flexDirection: 'row',
    },
    summaryStat: {
      flex: 1,
      gap: 2,
    },
    summaryStatHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    summaryDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    summaryStatLabel: {
      ...type.meta,
      color: colors.textMuted,
    },
    summaryStatValue: {
      ...type.sectionTitle,
      ...tabularNums,
      fontFamily: fontFamily.bold,
      color: colors.text,
    },
    filters: {
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
  });
