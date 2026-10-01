import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { layout, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import type { EnvelopeVisualState } from '@/components/DigitalEnvelope';

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  state: EnvelopeVisualState;
  intensity: number;
};

const SLIDES: Slide[] = [
  {
    eyebrow: 'MEET PINGPAY',
    title: 'Send money without asking for a MoMo number first.',
    body: 'No number, no awkward request. You decide how much, we handle the rest.',
    state: 'idle',
    intensity: 0.3,
  },
  {
    eyebrow: 'CREATE AN ENVELOPE',
    title: 'Choose an amount and get a private link.',
    body: 'Your envelope is sealed and waiting with exactly the amount you picked.',
    state: 'waiting',
    intensity: 0.65,
  },
  {
    eyebrow: 'THEY CLAIM IT',
    title: 'The recipient enters their MoMo number. Only then is the money sent.',
    body: 'Your money stays in your account right up until someone claims it.',
    state: 'completed',
    intensity: 0.9,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const slideIndex = useSharedValue(0);
  const slide = SLIDES[index];

  const finish = useCallback(() => {
    completeOnboarding();
    haptics.success();
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  const next = useCallback(() => {
    haptics.light();
    if (index === SLIDES.length - 1) {
      finish();
      return;
    }
    slideIndex.value = withTiming(index + 1, { duration: 260 });
    setIndex((i) => i + 1);
  }, [finish, index, slideIndex]);

  const envelopeStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 300 }),
  }));

  const dots = (
    <View style={styles.dots}>
      {SLIDES.map((_, i) => (
        <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
      ))}
    </View>
  );

  const dotsRow = (
    <View style={styles.dotsRow}>
      {dots}
      <Pressable
        onPress={() => setIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Next slide"
      >
        <Text style={styles.skip}>Skip</Text>
      </Pressable>
    </View>
  );

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      {dotsRow}

      <View style={styles.stage}>
        <Animated.View style={envelopeStyle} key={index}>
          <DigitalEnvelope
            size={Math.min(220, Dimensions.get('window').width * 0.5)}
            state={slide.state}
            intensity={slide.intensity}
            sealed={index === 1}
          />
        </Animated.View>
      </View>

      <Animated.View
        key={`copy-${index}`}
        entering={FadeInDown.duration(420)}
        style={styles.copy}
      >
        <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>

      <View style={styles.actions}>
        <PrimaryButton
          label={index === SLIDES.length - 1 ? 'GET STARTED' : 'CONTINUE'}
          onPress={next}
        />
        {index > 0 ? (
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            style={styles.backLink}
          >
            <Text style={styles.backText}>Back to sign in</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  skip: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.md,
    marginBottom: spacing.xxxl,
  },
  eyebrow: {
    ...type.heroLabel,
    color: colors.primary,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 27,
    lineHeight: 35,
    letterSpacing: -0.8,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  actions: {
    gap: spacing.md,
  },
  backLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  backText: {
    ...type.caption,
    color: colors.textMuted,
  },
});
