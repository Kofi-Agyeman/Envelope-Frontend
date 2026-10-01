import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeIn,
  useDerivedValue,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import { Glow } from '@/components/Glow';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { formatAmountCompact } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import * as api from '@/services/api';
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

  const aura = useSharedValue(0);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const runCreation = useCallback(async () => {
    setPhase('creating');
    setError(null);
    created.current = null;
    checkScale.value = 0;
    aura.value = 0;

    try {
      // The endpoint is authenticated, so bail out early rather than firing a
      // request that can only come back 401.
      if (!token) {
        throw new Error('Your session expired. Please sign in again.');
      }
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
      aura.value = withTiming(0.6, { duration: 460 });
      setPhase('ready');
    } catch (e) {
      if (!mounted.current) return;
      haptics.error();
      setError(
        e instanceof api.ApiError
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
  }, [attempt, runCreation]);

  const auraScale = useDerivedValue(
    () => 0.8 + aura.value * 0.35,
    [aura],
  );

  const auraOpacity = useDerivedValue(
    () => aura.value,
    [aura],
  );

  const handleShare = useCallback(() => {
    const envelope = created.current;
    if (!envelope) return;
    haptics.light();
    router.replace(`/envelope/${envelope.id}`);
  }, [router]);

  return (
    <View
      style={[
        styles.screen,
        {
          paddingTop: insets.top + spacing.xxxl,
          paddingBottom: insets.bottom + spacing.xxl,
        },
      ]}
    >
      <View style={styles.center}>
        <View style={styles.envelopeStage}>
          <Glow
            size={340}
            color={colors.primary}
            intensity={0.7}
            opacity={auraOpacity}
            scale={auraScale}
            style={styles.aura}
          />
          <DigitalEnvelope
            size={200}
            state={phase === 'ready' ? 'completed' : 'creating'}
            intensity={0.92}
            sealed={phase === 'ready'}
          />
        </View>

        {phase === 'creating' ? (
          <Animated.View entering={FadeIn.duration(240)} style={styles.copy}>
            <Text style={styles.title}>Creating your Envelope</Text>
            <Text style={styles.subtitle}>
              Sealing {formatAmountCompact(amount)} so it is ready to share.
            </Text>
          </Animated.View>
        ) : null}

        {phase === 'ready' ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.copy}>
            <Text style={styles.title}>Envelope created</Text>
            <Text style={styles.amount}>{formatAmountCompact(amount)}</Text>
            <Text style={styles.subtitle}>Ready to share.</Text>
            <View style={styles.actionWrap}>
              <PrimaryButton
                label="SHARE ENVELOPE"
                onPress={handleShare}
                accessibilityHint="Opens the envelope so you can copy or share its link"
              />
            </View>
          </Animated.View>
        ) : null}

        {phase === 'error' ? (
          <Animated.View entering={FadeIn.duration(260)} style={styles.copy}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>{error}</Text>
            <View style={styles.actionWrap}>
              <PrimaryButton
                label="TRY AGAIN"
                onPress={() => setAttempt((a) => a + 1)}
              />
              <PrimaryButton
                label="Back to home"
                variant="ghost"
                onPress={() => router.replace('/(tabs)')}
              />
            </View>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    maxWidth: 520,
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
    marginBottom: spacing.xxxl,
  },
  aura: {
    top: -70,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
  },
  title: {
    ...type.sectionTitle,
    color: colors.text,
    textAlign: 'center',
  },
  amount: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.primary,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionWrap: {
    alignSelf: 'stretch',
    marginTop: spacing.xxxl,
    gap: spacing.sm,
  },
});
