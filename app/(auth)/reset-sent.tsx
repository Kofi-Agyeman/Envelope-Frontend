import React, { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type ResetSentParams = {
  /** Email the reset link was sent to, when the caller passed it along. */
  email?: string;
};

export default function ResetSentScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams() as ResetSentParams;

  const handleDone = useCallback(() => {
    haptics.light();
    router.replace('/(auth)/login');
  }, [router]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(360)} style={styles.iconBlock}>
          <Icon name="envelope" size={48} color={colors.success} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(440)} style={styles.headlineBlock}>
          <Text style={styles.title} accessibilityRole="header">
            Check your Gmail
          </Text>
          <Text style={styles.subtitle}>
            We sent a password reset link to{' '}
            {email ? (
              <Text style={styles.subtitleEmail}>{email}</Text>
            ) : (
              'the email on your account'
            )}.
            Open the Gmail app, open the message from Envelope, and tap the
            reset link inside to set a new password.
          </Text>
        </Animated.View>

        <View style={styles.spacer} />

        <PrimaryButton
          label="Back to sign in"
          onPress={handleDone}
          accessibilityHint="Returns to the sign-in screen"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: layout.screenPadding,
      maxWidth: 440,
      width: '100%',
      alignSelf: 'center',
    },
    iconBlock: {
      marginTop: spacing.xxxl,
      alignItems: 'center',
    },
    headlineBlock: {
      marginTop: spacing.xxl,
      alignItems: 'center',
      textAlign: 'center',
      gap: spacing.sm,
    },
    title: {
      ...type.display,
      color: colors.text,
    },
    subtitle: {
      ...type.body,
      color: colors.textSecondary,
    },
    subtitleEmail: {
      ...type.body,
      color: colors.text,
      fontFamily: fontFamily.semibold,
    },
    spacer: {
      flex: 1,
    },
  });
