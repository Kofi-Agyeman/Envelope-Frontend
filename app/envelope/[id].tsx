import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import { PrimaryButton } from '@/components/PrimaryButton';
import { StatusBadge, statusDescription } from '@/components/StatusBadge';
import { Icon } from '@/components/Icon';
import { Card, EmptyState, GroupLabel, ListGroup, ListRow, screenContent } from '@/components/ui';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import {
  countdownLabel,
  formatDateLong,
  formatMoney,
  formatTime,
} from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useEnvelope } from '@/store/data';
import type { Envelope, EnvelopeStatus } from '@/types';

type Stage = {
  key: string;
  label: string;
};

const STAGES: Stage[] = [
  { key: 'created', label: 'Envelope created' },
  { key: 'waiting', label: 'Waiting for recipient' },
  { key: 'claimed', label: 'Recipient identified' },
  { key: 'processing', label: 'Payment processing' },
  { key: 'completed', label: 'Completed' },
];

const ORDER: Record<EnvelopeStatus, number> = {
  waiting: 1,
  claimed: 2,
  processing: 3,
  completed: 4,
  expired: 1,
  failed: 2,
};

function visualState(status: EnvelopeStatus) {
  switch (status) {
    case 'completed':
      return 'completed' as const;
    case 'processing':
      return 'processing' as const;
    case 'claimed':
      return 'claimed' as const;
    case 'failed':
      return 'failed' as const;
    case 'expired':
      return 'expired' as const;
    default:
      return 'waiting' as const;
  }
}

function envelopeState(envelope: Envelope) {
  return visualState(envelope.status);
}

export default function EnvelopeDetailScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? '';
  const envelope = useEnvelope(id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(timer);
  }, [copied]);

  const handleCopy = useCallback(async () => {
    if (!envelope) return;
    await Clipboard.setStringAsync(envelope.shareUrl);
    haptics.success();
    setCopied(true);
  }, [envelope]);

  const handleShare = useCallback(async () => {
    if (!envelope) return;
    haptics.medium();
    const message = `I've sent you an Envelope worth ${formatMoney(envelope.amount)}. Open this link to claim it:\n\n${envelope.shareUrl}`;
    try {
      await Share.share(
        Platform.OS === 'ios' ? { message, url: envelope.shareUrl } : { message },
        { dialogTitle: 'Share envelope' },
      );
    } catch {
      // User dismissed the share sheet.
    }
  }, [envelope]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/envelopes');

  const nav = (
    <View style={styles.navRow}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.iconButton}
      >
        <Icon name="chevronBack" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.navTitle}>Envelope details</Text>
      <View style={styles.navSpacer} />
    </View>
  );

  if (!envelope) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
        <View style={screenContent}>
          {nav}
          <View style={styles.notFound}>
            <EmptyState
              icon="envelope"
              title="Envelope not found"
              body="It may have been removed, or the link is no longer valid."
            />
            <PrimaryButton
              label="Back to envelopes"
              variant="secondary"
              onPress={() => router.replace('/(tabs)/envelopes')}
            />
          </View>
        </View>
      </View>
    );
  }

  const currentStage = ORDER[envelope.status];
  const isLive = envelope.status === 'waiting' || envelope.status === 'claimed';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          screenContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {nav}

        <Animated.View entering={FadeIn.duration(360)}>
          <Card style={styles.hero}>
            <DigitalEnvelope
              size={148}
              state={envelopeState(envelope)}
              intensity={0.6}
              sealed={envelope.status !== 'expired' && envelope.status !== 'failed'}
            />
            <Text style={styles.amount}>{formatMoney(envelope.amount)}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge status={envelope.status} />
              {isLive ? (
                <View style={styles.countdownPill}>
                  <Icon name="clock" size={12} color={colors.textSecondary} />
                  <Text style={styles.countdownText}>
                    {countdownLabel(envelope.expiresAt)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.statusText}>{statusDescription[envelope.status]}</Text>
          </Card>
        </Animated.View>

        {envelope.status === 'waiting' ? (
          <Animated.View entering={FadeIn.delay(80).duration(380)} style={styles.section}>
            <GroupLabel>Claim link</GroupLabel>
            <Card>
              <View style={styles.linkRow}>
                <Icon name="link" size={16} color={colors.textMuted} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {envelope.shareUrl.replace(/^https?:\/\//, '')}
                </Text>
                <Pressable
                  onPress={handleCopy}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? 'Link copied' : 'Copy envelope link'}
                  style={({ pressed }) => [
                    styles.copyButton,
                    copied && styles.copyButtonDone,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Icon
                    name={copied ? 'check' : 'copy'}
                    size={14}
                    color={copied ? colors.success : colors.text}
                  />
                  <Text style={[styles.copyText, copied && { color: colors.success }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.linkHint}>
                Anyone with this link can claim the envelope. Share it only with the person
                you are paying.
              </Text>
              <PrimaryButton
                label="Share envelope"
                onPress={handleShare}
                icon={<Icon name="share" size={18} color={colors.onPrimary} strokeWidth={2.1} />}
                style={styles.shareButton}
              />
            </Card>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(140).duration(380)} style={styles.section}>
          <GroupLabel>Progress</GroupLabel>
          <Card style={styles.timelineCard}>
            {STAGES.map((stage, index) => {
              const stageIndex = index;
              const done = stageIndex < currentStage;
              const active = stageIndex === currentStage;
              const failed =
                envelope.status === 'failed' && stageIndex === currentStage;
              const expiredHere =
                envelope.status === 'expired' && stageIndex === currentStage;
              const terminalBlocked =
                (envelope.status === 'expired' || envelope.status === 'failed') &&
                stageIndex > currentStage;
              const completedFinal = active && envelope.status === 'completed';

              const dotColor = failed
                ? colors.error
                : expiredHere
                  ? colors.textMuted
                  : done || completedFinal
                    ? colors.success
                    : active
                      ? colors.primary
                      : colors.borderStrong;

              const labelColor = terminalBlocked
                ? colors.textMuted
                : done || active || failed || expiredHere
                  ? colors.text
                  : colors.textMuted;

              const filled = done || active || failed || expiredHere;

              return (
                <View key={stage.key} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        { borderColor: dotColor },
                        filled && { backgroundColor: dotColor },
                      ]}
                    >
                      {done || completedFinal ? (
                        <Icon name="check" size={10} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </View>
                    {index < STAGES.length - 1 ? (
                      <View
                        style={[
                          styles.timelineLine,
                          stageIndex < currentStage && styles.timelineLineDone,
                        ]}
                      />
                    ) : null}
                  </View>

                  <View style={styles.timelineCopy}>
                    <Text
                      style={[
                        styles.timelineLabel,
                        { color: labelColor },
                        active && styles.timelineLabelActive,
                      ]}
                    >
                      {stage.label}
                    </Text>
                    {active && !failed && !expiredHere ? (
                      <Text style={styles.timelineMeta}>
                        {completedFinal && envelope.completedAt
                          ? `${formatDateLong(envelope.completedAt)} · ${formatTime(envelope.completedAt)}`
                          : 'In progress'}
                      </Text>
                    ) : null}
                    {done ? (
                      <Text style={styles.timelineMeta}>
                        {stageIndex === 0
                          ? `${formatDateLong(envelope.createdAt)} · ${formatTime(envelope.createdAt)}`
                          : stage.key === 'claimed' && envelope.claimedAt
                            ? formatTime(envelope.claimedAt)
                            : 'Done'}
                      </Text>
                    ) : null}
                    {failed ? (
                      <Text style={[styles.timelineMeta, { color: colors.error }]}>
                        The payment could not be completed. No money was moved.
                      </Text>
                    ) : null}
                    {expiredHere ? (
                      <Text style={styles.timelineMeta}>
                        Unclaimed before expiry. No money was moved.
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(200).duration(380)} style={styles.section}>
          <GroupLabel>Details</GroupLabel>
          <ListGroup>
            <ListRow title="Envelope code" value={envelope.code} />
            <ListRow
              title="Created"
              value={`${formatDateLong(envelope.createdAt)} · ${formatTime(envelope.createdAt)}`}
            />
            <ListRow
              title="Expires"
              value={`${formatDateLong(envelope.expiresAt)} · ${formatTime(envelope.expiresAt)}`}
            />
            {envelope.recipientName || envelope.recipientPhone ? (
              <ListRow
                title="Recipient"
                value={
                  envelope.recipientName ??
                  (envelope.recipientPhone
                    ? envelope.recipientPhone.replace(/^(\+?\d{3})\d+/, '$1 ••••')
                    : '—')
                }
              />
            ) : null}
          </ListGroup>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    notFound: {
      gap: spacing.lg,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    navTitle: {
      ...type.cardTitle,
      color: colors.text,
    },
    navSpacer: {
      width: 40,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hero: {
      alignItems: 'center',
      paddingTop: spacing.xxxl,
      paddingBottom: spacing.xxl,
    },
    amount: {
      ...type.numeric,
      ...tabularNums,
      color: colors.text,
      marginTop: spacing.xl,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    countdownPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundSecondary,
    },
    countdownText: {
      ...type.meta,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
    },
    statusText: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      marginTop: spacing.sm,
    },
    section: {
      marginTop: spacing.xxl,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: radius.md,
      paddingLeft: spacing.md,
      paddingRight: 6,
      height: 48,
    },
    linkText: {
      flex: 1,
      ...type.caption,
      fontFamily: fontFamily.medium,
      color: colors.text,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      height: 36,
      paddingHorizontal: spacing.md,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    copyButtonDone: {
      backgroundColor: colors.successMuted,
      borderColor: 'transparent',
    },
    copyText: {
      ...type.meta,
      fontFamily: fontFamily.semibold,
      color: colors.text,
    },
    linkHint: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: spacing.md,
    },
    shareButton: {
      marginTop: spacing.lg,
    },
    timelineCard: {
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
    },
    timelineRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    timelineRail: {
      alignItems: 'center',
      width: 20,
    },
    timelineDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timelineLine: {
      flex: 1,
      width: 2,
      minHeight: 18,
      backgroundColor: colors.border,
      marginVertical: 3,
    },
    timelineLineDone: {
      backgroundColor: colors.success,
    },
    timelineCopy: {
      flex: 1,
      paddingBottom: spacing.lg,
      paddingTop: 1,
    },
    timelineLabel: {
      ...type.bodyMedium,
      fontSize: 14,
      lineHeight: 18,
    },
    timelineLabelActive: {
      fontFamily: fontFamily.semibold,
    },
    timelineMeta: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: 2,
    },
  });
