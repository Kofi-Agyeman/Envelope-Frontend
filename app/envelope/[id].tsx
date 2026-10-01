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
import { Icon, type IconName } from '@/components/Icon';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import {
  countdownLabel,
  formatAmountCompact,
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
  detail?: string;
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

  if (!envelope) {
    return (
      <View style={[styles.screen, styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundTitle}>Envelope not found</Text>
        <PrimaryButton
          label="BACK TO ENVELOPES"
          variant="secondary"
          onPress={() => router.replace('/(tabs)/envelopes')}
          style={styles.centeredAction}
        />
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
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.navRow}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/envelopes'))}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.iconButton}
          >
            <Icon name="chevronBack" size={20} color={colors.text} />
          </Pressable>
          <Text style={styles.navTitle}>Envelope</Text>
          <View style={styles.iconButton} />
        </View>

        <Animated.View entering={FadeIn.duration(420)} style={styles.hero}>
          <DigitalEnvelope
            size={190}
            state={envelopeState(envelope)}
            intensity={0.85}
            sealed={envelope.status === 'completed'}
          />
        </Animated.View>

        <Animated.View entering={FadeIn.delay(80).duration(400)} style={styles.summary}>
          <Text style={styles.amount}>{formatMoney(envelope.amount)}</Text>
          <StatusBadge status={envelope.status} style={styles.badge} />
          <Text style={styles.statusText}>
            {statusDescription[envelope.status]}
          </Text>
          {isLive ? (
            <View style={styles.countdownPill}>
              <Icon name="clock" size={13} color={colors.primary} />
              <Text style={styles.countdownText}>
                {countdownLabel(envelope.expiresAt)}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        {envelope.status === 'waiting' ? (
          <Animated.View entering={FadeIn.delay(140).duration(420)} style={styles.shareBlock}>
            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>
                {envelope.shareUrl.replace(/^https?:\/\//, '')}
              </Text>
              <Pressable
                onPress={handleCopy}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={copied ? 'Link copied' : 'Copy envelope link'}
                style={[styles.copyButton, copied && styles.copyButtonDone]}
              >
                <Icon
                  name={copied ? 'check' : 'copy'}
                  size={16}
                  color={copied ? colors.success : colors.primary}
                />
              </Pressable>
            </View>
            <Text style={styles.copiedLabel}>
              {copied ? '✓ Link copied' : 'Recipient claims this link in their own app'}
            </Text>

            <PrimaryButton
              label="SHARE ENVELOPE"
              onPress={handleShare}
              icon={<Icon name="share" size={18} color={colors.onPrimary} />}
              style={styles.shareButton}
            />
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeIn.delay(200).duration(420)} style={styles.timelineBlock}>
          <Text style={styles.timelineTitle}>Progress</Text>
          <View style={styles.timeline}>
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

              const dotColor = failed
                ? colors.error
                : expiredHere
                  ? colors.textMuted
                  : done
                    ? colors.success
                    : active
                      ? colors.primary
                      : colors.borderStrong;

              const labelColor = terminalBlocked
                ? colors.textMuted
                : done || active || failed || expiredHere
                  ? colors.text
                  : colors.textMuted;

              return (
                <View key={stage.key} style={styles.timelineRow}>
                  <View style={styles.timelineRail}>
                    <View
                      style={[
                        styles.timelineDot,
                        { borderColor: dotColor },
                        (done || active) && { backgroundColor: dotColor },
                        failed && { backgroundColor: colors.error },
                        expiredHere && { backgroundColor: colors.textMuted },
                      ]}
                    />
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
                    <Text style={[styles.timelineLabel, { color: labelColor }]}>
                      {stage.label}
                    </Text>
                    {active && !failed && !expiredHere ? (
                      <Text style={styles.timelineMeta}>
                        {stageIndex === 0
                          ? formatDateLong(envelope.createdAt)
                          : 'In progress'}
                      </Text>
                    ) : null}
                    {done ? (
                      <Text style={styles.timelineMeta}>
                        {stageIndex === 0
                          ? `${formatDateLong(envelope.createdAt)} · ${formatTime(envelope.createdAt)}`
                          : stage.key === 'claimed' && envelope.claimedAt
                            ? formatTime(envelope.claimedAt)
                            : stage.key === 'completed' && envelope.completedAt
                              ? formatTime(envelope.completedAt)
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
          </View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(260).duration(420)} style={styles.metaBlock}>
          <MetaRow label="Envelope code" value={envelope.code} />
          <MetaRow
            label="Created"
            value={`${formatDateLong(envelope.createdAt)} · ${formatTime(envelope.createdAt)}`}
          />
          <MetaRow
            label="Expires"
            value={`${formatDateLong(envelope.expiresAt)} · ${formatTime(envelope.expiresAt)}`}
          />
          {envelope.recipientName || envelope.recipientPhone ? (
            <MetaRow
              label="Recipient"
              value={
                envelope.recipientName ??
                (envelope.recipientPhone
                  ? envelope.recipientPhone.replace(/^(\+?\d{3})\d+/, '$1 ••••')
                  : '—')
              }
            />
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    gap: spacing.lg,
  },
  centeredAction: {
    alignSelf: 'stretch',
  },
  notFoundTitle: {
    ...type.sectionTitle,
    color: colors.text,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navTitle: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: colors.text,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  summary: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  amount: {
    ...type.numeric,
    fontSize: 40,
    lineHeight: 46,
    color: colors.text,
  },
  badge: {
    marginTop: spacing.xs,
  },
  statusText: {
    ...type.bodyMedium,
    color: colors.textSecondary,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryFaint,
  },
  countdownText: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
  shareBlock: {
    marginTop: spacing.xxl,
    padding: spacing.xl,
    borderRadius: radius.xxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  linkText: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 15,
    color: colors.text,
  },
  copyButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaint,
  },
  copyButtonDone: {
    backgroundColor: colors.success,
  },
  copiedLabel: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  shareButton: {
    marginTop: spacing.lg,
  },
  timelineBlock: {
    marginTop: spacing.xxxl,
  },
  timelineTitle: {
    ...type.sectionTitle,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  timelineRail: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 3,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  timelineLineDone: {
    backgroundColor: colors.success,
  },
  timelineCopy: {
    flex: 1,
    paddingBottom: spacing.xl,
  },
  timelineLabel: {
    ...type.bodyMedium,
    fontSize: 15,
  },
  timelineMeta: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaBlock: {
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  metaValue: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
});
