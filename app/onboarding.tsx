import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DigitalEnvelope } from '@/components/DigitalEnvelope';
import type { EnvelopeVisualState } from '@/components/DigitalEnvelope';
import { Icon, type IconName } from '@/components/Icon';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';

type Slide = {
  step: string;
  title: string;
  body: string;
  state: EnvelopeVisualState;
  intensity: number;
  sealed: boolean;
  points: { icon: IconName; text: string }[];
};

const SLIDES: Slide[] = [
  {
    step: 'Welcome to Envelope',
    title: 'Send money without asking for their number',
    body: 'No awkward requests. You decide how much, and we handle the rest.',
    state: 'idle',
    intensity: 0.3,
    sealed: false,
    points: [
      { icon: 'shield', text: 'Works with your MTN MoMo wallet' },
      { icon: 'lock', text: 'Your recipient’s number stays private' },
    ],
  },
  {
    step: 'Create an envelope',
    title: 'Choose an amount and get a private link',
    body: 'Each envelope is sealed with exactly the amount you picked.',
    state: 'waiting',
    intensity: 0.6,
    sealed: true,
    points: [
      { icon: 'link', text: 'Share the link on WhatsApp, SMS or anywhere' },
      { icon: 'clock', text: 'Unclaimed envelopes expire after 72 hours' },
    ],
  },
  {
    step: 'They claim it',
    title: 'Money moves only when it is claimed',
    body: 'The recipient enters their MoMo number, and only then is the payment sent.',
    state: 'completed',
    intensity: 0.8,
    sealed: true,
    points: [
      { icon: 'wallet', text: 'Funds stay in your wallet until then' },
      { icon: 'bell', text: 'You are notified the moment it lands' },
    ],
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { completeOnboarding } = useAuth();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;
  const envelopeSize = Math.min(200, width * 0.48, height * 0.22);

  const finish = useCallback(() => {
    completeOnboarding();
    haptics.success();
    router.replace('/(tabs)');
  }, [completeOnboarding, router]);

  const next = useCallback(() => {
    haptics.light();
    if (isLast) {
      finish();
      return;
    }
    setIndex((i) => i + 1);
  }, [finish, isLast]);

  const back = useCallback(() => {
    haptics.light();
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.progress}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.progressTrack, i <= index && styles.progressActive]} />
          ))}
        </View>
        {!isLast ? (
          <Pressable
            onPress={finish}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.stage}>
        <View
          style={[
            styles.backdrop,
            { width: envelopeSize * 1.7, height: envelopeSize * 1.7, borderRadius: envelopeSize },
          ]}
        />
        <DigitalEnvelope
          key={index}
          size={envelopeSize}
          state={slide.state}
          intensity={slide.intensity}
          sealed={slide.sealed}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.step}>
          Step {index + 1} of {SLIDES.length} · {slide.step}
        </Text>
        <Text style={styles.title} accessibilityRole="header">
          {slide.title}
        </Text>
        <Text style={styles.body}>{slide.body}</Text>

        <View style={styles.points}>
          {slide.points.map((point) => (
            <View key={point.text} style={styles.point}>
              <View style={styles.pointIcon}>
                <Icon name={point.icon} size={15} color={colors.text} />
              </View>
              <Text style={styles.pointText}>{point.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {index > 0 ? (
          <PrimaryButton label="Back" variant="secondary" onPress={back} style={styles.backButton} />
        ) : null}
        <PrimaryButton
          label={isLast ? 'Get started' : 'Continue'}
          onPress={next}
          style={styles.nextButton}
        />
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
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    progress: {
      flex: 1,
      flexDirection: 'row',
      gap: 6,
    },
    progressTrack: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
    },
    progressActive: {
      backgroundColor: colors.text,
    },
    skip: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
    },
    stage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 200,
    },
    backdrop: {
      position: 'absolute',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    copy: {
      gap: spacing.sm,
      marginBottom: spacing.xxl,
    },
    step: {
      ...type.overline,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    title: {
      ...type.title,
      color: colors.text,
    },
    body: {
      ...type.body,
      color: colors.textSecondary,
    },
    points: {
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    point: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    pointIcon: {
      width: 30,
      height: 30,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    pointText: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.text,
      flexShrink: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    backButton: {
      flex: 1,
    },
    nextButton: {
      flex: 2,
    },
  });
