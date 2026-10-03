import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountSlider } from '@/components/AmountSlider';
import { AmountDisplay } from '@/components/AmountDisplay';
import { BalanceCard } from '@/components/BalanceCard';
import { EnvelopeCard } from '@/components/EnvelopeCard';
import { PresetChips } from '@/components/PresetChips';
import { PrimaryButton } from '@/components/PrimaryButton';
import { SkeletonCard } from '@/components/Skeleton';
import { HeroShell, MoneySafetyNote } from '@/components/MoneySafetyNote';
import { Icon } from '@/components/Icon';
import {
  Card,
  EmptyState,
  IconTile,
  ListGroup,
  SectionHeader,
  screenContent,
} from '@/components/ui';
import { AMOUNT } from '@/constants/config';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { firstName, formatMoney, greetingForHour } from '@/utils/format';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import type { Envelope } from '@/types';

const OPEN_STATUSES: Envelope['status'][] = ['waiting', 'claimed', 'processing'];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { profile, preferences, setPreference } = useAuth();
  const { balance, envelopes, loadingBalance, loadingEnvelopes } = useData();
  const [amount, setAmount] = useState(100);

  const recent = useMemo(() => envelopes.slice(0, 4), [envelopes]);

  const summary = useMemo(() => {
    const open = envelopes.filter((e) => OPEN_STATUSES.includes(e.status));
    const completed = envelopes.filter((e) => e.status === 'completed');
    return {
      openCount: open.length,
      openValue: open.reduce((sum, e) => sum + e.amount, 0),
      completedCount: completed.length,
      completedValue: completed.reduce((sum, e) => sum + e.amount, 0),
    };
  }, [envelopes]);

  const handleCreate = useCallback(() => {
    router.push({ pathname: '/envelope/created', params: { amount: String(amount) } });
  }, [amount]);

  const toggleHidden = useCallback(() => {
    setPreference('hideBalance', !preferences.hideBalance);
  }, [preferences.hideBalance, setPreference]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        screenContent,
        { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <BalanceCard
        balance={balance}
        loading={loadingBalance}
        hidden={preferences.hideBalance}
        onToggleHidden={toggleHidden}
        greeting={greetingForHour()}
        name={profile ? firstName(profile.fullName) : ''}
        initials={profile?.initials ?? 'EN'}
        onAvatarPress={() => router.push('/(tabs)/profile')}
      />

      <Animated.View entering={FadeIn.delay(100).duration(360)} style={styles.statsRow}>
        <Card style={styles.stat}>
          <IconTile icon="clock" size={32} color={colors.accent} background={colors.primaryMuted} />
          <Text style={styles.statLabel}>Awaiting claim</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(summary.openValue)}
          </Text>
          <Text style={styles.statMeta}>
            {summary.openCount} {summary.openCount === 1 ? 'envelope' : 'envelopes'}
          </Text>
        </Card>
        <Card style={styles.stat}>
          <IconTile icon="checkCircle" size={32} color={colors.success} background={colors.successMuted} />
          <Text style={styles.statLabel}>Delivered</Text>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(summary.completedValue)}
          </Text>
          <Text style={styles.statMeta}>
            {summary.completedCount} {summary.completedCount === 1 ? 'envelope' : 'envelopes'}
          </Text>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(160).duration(380)} style={styles.composerWrap}>
        <HeroShell>
          <View style={styles.composerHeader}>
            <View style={styles.flex}>
              <Text style={styles.composerTitle}>New envelope</Text>
              <Text style={styles.composerSubtitle}>
                Pick an amount, then share a private claim link.
              </Text>
            </View>
            <IconTile icon="send" size={36} color={colors.onPrimary} background={colors.primary} />
          </View>

          <View style={styles.composerBody}>
            <AmountDisplay
              value={amount}
              onCommit={setAmount}
              min={AMOUNT.min}
              max={AMOUNT.max}
            />

            <View style={styles.sliderWrap}>
              <AmountSlider value={amount} onChange={setAmount} />
            </View>

            <PresetChips value={amount} onSelect={setAmount} />

            <PrimaryButton
              label={`Create ${formatMoney(amount, { decimals: amount % 1 !== 0 })} envelope`}
              onPress={handleCreate}
              icon={<Icon name="link" size={18} color={colors.onPrimary} strokeWidth={2.1} />}
              accessibilityHint="Generates a private link you can share"
              style={styles.cta}
            />

            <MoneySafetyNote />
          </View>
        </HeroShell>
      </Animated.View>

      <SectionHeader
        title="Recent envelopes"
        actionLabel={envelopes.length > 0 ? 'See all' : undefined}
        onAction={() => router.push('/(tabs)/envelopes')}
        style={styles.sectionHeader}
      />

      {loadingEnvelopes && recent.length === 0 ? (
        <ListGroup>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ListGroup>
      ) : recent.length === 0 ? (
        <EmptyState
          icon="envelope"
          title="No envelopes yet"
          body="Envelopes you create will appear here, with their status in real time."
        />
      ) : (
        <ListGroup>
          {recent.map((envelope) => (
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

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: { flex: 1 },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    stat: {
      flex: 1,
      gap: 2,
    },
    statLabel: {
      ...type.meta,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    statValue: {
      ...type.sectionTitle,
      ...tabularNums,
      fontFamily: fontFamily.bold,
      color: colors.text,
    },
    statMeta: {
      ...type.meta,
      color: colors.textMuted,
    },
    composerWrap: {
      marginTop: spacing.lg,
    },
    composerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    composerTitle: {
      ...type.sectionTitle,
      color: colors.text,
    },
    composerSubtitle: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 2,
    },
    composerBody: {
      padding: spacing.xl,
      paddingTop: spacing.xxl,
      gap: spacing.lg,
    },
    sliderWrap: {
      marginTop: -spacing.xs,
    },
    cta: {
      marginTop: spacing.xs,
    },
    sectionHeader: {
      marginTop: spacing.xxxl,
    },
  });
