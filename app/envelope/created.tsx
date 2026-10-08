import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import { Glow } from '@/components/Glow';
import { Icon } from '@/components/Icon';
import { MoneySafetyNote } from '@/components/MoneySafetyNote';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { formatMoney } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import * as api from '@/services/api';
import { ApiError } from '@/services/http';
import type { Envelope } from '@/types';

type Phase = 'creating' | 'ready' | 'error';

export default function CreateEnvelopeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { addEnvelope } = useData();
  const params = useLocalSearchParams<{ amount?: string }>();

  const parsedAmount = Number(params.amount);
  const amount =
    Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 100;

  const [phase, setPhase] = useState<Phase>('creating');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const created = useRef<Envelope | null>(null);
  const mounted = useRef(true);

  /**
   * Guards against sending twice for one screen visit.
   *
   * Creating an envelope is not idempotent -- each POST /payments/send moves
   * real money, so a duplicate is a real duplicate charge rather than a
   * cosmetic glitch. This is set before the request and only cleared when the
   * user explicitly taps "Try again", which is the one path that is *meant* to
   * create a second transaction.
   */
  const sent = useRef(false);
  const sending = useRef(false);

  const aura = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runCreation = useCallback(async () => {
    // A send is already in flight or already succeeded for this visit.
    if (sending.current || sent.current) return;

    setPhase('creating');
    setError(null);
    created.current = null;
    checkScale.value = 0;
    aura.value = 0;

    if (!token) {
      setError('Your session expired. Please sign in again.');
      setPhase('error');
      return;
    }

    // Claim the slot *before* awaiting, so a concurrent trigger (a token
    // refresh remounting this effect, or a fast double tap) cannot slip past.
    sending.current = true;
    sent.current = true;

    try {
      const envelope = await api.createEnvelope({ amount }, token);
      if (!mounted.current) return;
      created.current = envelope;
      addEnvelope(envelope);

      await withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0.55, { duration: 300 }),
      );

      if (!mounted.current) return;
      haptics.success();
      checkScale.value = withTiming(1, {
        duration: 420,
        easing: Easing.out(Easing.back(2)),
      });
      aura.value = withTiming(0.45, { duration: 460 });
      setPhase('ready');
    } catch (e) {
      sending.current = false;
      // The send did not succeed, so allow an explicit retry to try again.
      sent.current = false;
      if (!mounted.current) return;
      haptics.error();
      setError(
        e instanceof ApiError
          ? e.message
          : "We couldn't create your Envelope. Your money has not been moved.",
      );
      setPhase('error');
    }
  }, [addEnvelope, amount, aura, checkScale, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void runCreation();
    }, 460);
    return () => clearTimeout(timer);
    // `runCreation` is deliberately not a dependency. It closes over `token`,
    // so listing it would re-arm this effect every time the access token is
    // refreshed -- which fires a second POST /payments/send and creates a
    // duplicate transaction. `attempt` is the only intended trigger, and the
    // `fired` ref below is the real guard against duplicate sends.
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = useCallback(() => {
    // Explicit retry is the only thing allowed to spend another request, so the
    // guards are cleared here and nowhere else.
    sending.current = false;
    sent.current = false;
    setAttempt((a) => a + 1);
  }, []);

  const auraScale = useDerivedValue(() => 0.8 + aura.value * 0.35, [aura]);
  const auraOpacity = useDerivedValue(() => aura.value, [aura]);

  const handleShare = useCallback(() => {
    const envelope = created.current;
    if (!envelope) return;
    haptics.light();
    router.replace(`/envelope/${envelope.id}`);
  }, [router]);

  const envelope = created.current;

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <View style={styles.center}>
        <View style={styles.envelopeStage}>
          <Glow
            size={320}
            color={phase === 'error' ? colors.error : colors.primary}
            intensity={0.5}
            opacity={auraOpacity}
            scale={auraScale}
            style={styles.aura}
          />
          <DigitalEnvelope
            size={180}
            state={phase === 'ready' ? 'completed' : phase === 'error' ? 'failed' : 'creating'}
            intensity={0.8}
            sealed={phase === 'ready'}
          />
        </View>

        {phase === 'creating' ? (
          <Animated.View entering={FadeIn.duration(240)} style={styles.copy}>
            <Text style={styles.eyebrow}>Please wait</Text>
            <Text style={styles.title}>Sealing your envelope</Text>
            <Text style={styles.subtitle}>
              Preparing a private link for {formatMoney(amount)}.
            </Text>
          </Animated.View>
        ) : null}

        {phase === 'ready' ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.copy}>
            <View style={styles.successPill}>
              <Icon name="checkCircle" size={14} color={colors.success} />
              <Text style={styles.successText}>Envelope created</Text>
            </View>
            <Text style={styles.amount}>{formatMoney(amount)}</Text>
            <Text style={styles.subtitle}>
              Share the link with anyone. They choose where the money lands.
            </Text>

            {envelope ? (
              <Animated.View entering={FadeInDown.delay(120).duration(360)} style={styles.linkCard}>
                <Icon name="link" size={16} color={colors.textMuted} />
                <Text style={styles.linkText} numberOfLines={1}>
                  {envelope.shareUrl.replace(/^https?:\/\//, '')}
                </Text>
                <Text style={styles.codeText}>{envelope.code}</Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        ) : null}

        {phase === 'error' ? (
          <Animated.View entering={FadeIn.duration(260)} style={styles.copy}>
            <Text style={[styles.eyebrow, { color: colors.error }]}>Not created</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>{error}</Text>
          </Animated.View>
        ) : null}
      </View>

      {phase === 'ready' ? (
        <Animated.View entering={FadeIn.delay(160).duration(300)} style={styles.actions}>
          <PrimaryButton
            label="Share envelope"
            onPress={handleShare}
            icon={<Icon name="share" size={18} color={colors.onPrimary} strokeWidth={2.1} />}
            accessibilityHint="Opens the envelope so you can copy or share its link"
          />
          <PrimaryButton
            label="Back to home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      ) : null}

      {phase === 'error' ? (
        <Animated.View entering={FadeIn.duration(260)} style={styles.actions}>
          <PrimaryButton label="Try again" onPress={handleRetry} />
          <PrimaryButton
            label="Back to home"
            variant="ghost"
            onPress={() => router.replace('/(tabs)')}
          />
        </Animated.View>
      ) : null}

      {phase === 'creating' ? (
        <View style={styles.actions}>
          <MoneySafetyNote />
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: layout.screenPadding,
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    envelopeStage: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.huge,
    },
    aura: {
      top: -90,
    },
    copy: {
      alignItems: 'center',
      gap: spacing.sm,
      width: '100%',
    },
    eyebrow: {
      ...type.overline,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    title: {
      ...type.title,
      color: colors.text,
      textAlign: 'center',
    },
    successPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.successMuted,
    },
    successText: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.success,
    },
    amount: {
      ...type.numeric,
      ...tabularNums,
      color: colors.text,
      marginTop: spacing.xs,
    },
    subtitle: {
      ...type.body,
      color: colors.textSecondary,
      textAlign: 'center',
      maxWidth: 320,
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'stretch',
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      height: 48,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkText: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
      flex: 1,
    },
    codeText: {
      ...type.meta,
      fontFamily: fontFamily.semibold,
      letterSpacing: 0.6,
      color: colors.text,
    },
    actions: {
      gap: spacing.xs,
    },
  });
