import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AmountSlider } from '@/components/AmountSlider';
import { AmountDisplay } from '@/components/AmountDisplay';
import { BalanceCard } from '@/components/BalanceCard';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import { EnvelopeCard } from '@/components/EnvelopeCard';
import { PresetChips } from '@/components/PresetChips';
import { PrimaryButton } from '@/components/PrimaryButton';
import { QuickAction } from '@/components/QuickAction';
import { SkeletonCard } from '@/components/Skeleton';
import { HeroLabel, HeroShell, MoneySafetyNote } from '@/components/MoneySafetyNote';
import { AMOUNT } from '@/constants/config';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { firstName, greetingForHour } from '@/utils/format';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { profile, preferences, setPreference } = useAuth();
  const { balance, envelopes, loadingBalance, loadingEnvelopes } = useData();
  const [amount, setAmount] = useState(100);

  const contentWidth = Math.min(width, 520) - layout.screenPadding * 2;
  const envelopeSize = Math.max(132, Math.min(184, contentWidth * 0.42));
  const intensity = useMemo(() => {
    const ratio = (amount - AMOUNT.min) / (AMOUNT.max - AMOUNT.min);
    return 0.18 + ratio * 0.82;
  }, [amount]);

  const recent = useMemo(() => envelopes.slice(0, 4), [envelopes]);

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
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + 108 },
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
        initials={profile?.initials ?? 'PP'}
        onAvatarPress={() => router.push('/(tabs)/profile')}
      />

      <Animated.View entering={FadeIn.delay(80).duration(460)} style={styles.heroWrap}>
        <HeroShell>
          <View style={styles.heroInner}>
            <HeroLabel>CREATE AN ENVELOPE</HeroLabel>

            <View style={styles.envelopeStage}>
              <DigitalEnvelope size={envelopeSize} state="selected" intensity={intensity} />
            </View>

            <View style={styles.amountBlock}>
              <AmountDisplay
                value={amount}
                onCommit={setAmount}
                min={AMOUNT.min}
                max={AMOUNT.max}
              />
              <Text style={styles.amountCaption}>How much are you sending?</Text>
            </View>

            <AmountSlider value={amount} onChange={setAmount} />

            <View style={styles.presetsWrap}>
              <PresetChips value={amount} onSelect={setAmount} />
            </View>

            <PrimaryButton
              label="CREATE ENVELOPE"
              onPress={handleCreate}
              accessibilityHint="Generates a private link you can share"
            />

            <View style={styles.safetyWrap}>
              <MoneySafetyNote />
            </View>
          </View>
        </HeroShell>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(160).duration(420)} style={styles.quickRow}>
        <QuickAction
          icon="mail-outline"
          label="New envelope"
          onPress={handleCreate}
        />
        <QuickAction
          icon="time-outline"
          label="View activity"
          onPress={() => router.push('/(tabs)/activity')}
        />
      </Animated.View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Envelopes</Text>
        <Text
          style={styles.sectionLink}
          onPress={() => router.push('/(tabs)/envelopes')}
          accessibilityRole="link"
        >
          See all
        </Text>
      </View>

      <View style={styles.list}>
        {loadingEnvelopes && recent.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : recent.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="mail-open-outline" size={24} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              No envelopes yet. Create your first one above.
            </Text>
          </View>
        ) : (
          recent.map((envelope, index) => (
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
  heroWrap: {
    marginTop: spacing.xxl,
  },
  heroInner: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  envelopeStage: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  amountBlock: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  amountCaption: {
    ...type.caption,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  presetsWrap: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  safetyWrap: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xxxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
  },
  sectionLink: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
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
});
