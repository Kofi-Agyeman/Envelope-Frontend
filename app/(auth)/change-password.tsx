import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Field } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { LogoMark } from '@/components/Logo';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';

/** Lenient address-shape check: local part, `@`, and a dot-separated domain. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ChangePasswordScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const emailValid = EMAIL_REGEX.test(email.trim());

  const handleSubmit = useCallback(async () => {
    if (!emailValid || loading || sent) return;
    setLoading(true);
    setError(null);
    try {
      await forgotPassword({ email: email.trim() });
      haptics.success();
      setSent(true);
      router.push(
        `/(auth)/reset-sent?email=${encodeURIComponent(email.trim())}`,
      );
    } catch (e) {
      haptics.error();
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't send the reset link. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [email, emailValid, forgotPassword, loading, router, sent]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.nav}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <Icon name="chevronBack" size={20} color={colors.text} />
          </Pressable>
          <LogoMark size={30} />
          <View style={styles.navSpacer} />
        </View>

        {sent ? (
          <Animated.View entering={FadeIn.duration(360)} style={styles.headlineBlock}>
            <Text style={styles.title} accessibilityRole="header">
              Reset link sent
            </Text>
            <Text style={styles.subtitle}>
              Check your Gmail inbox — open the email and tap the link inside to
              set a new password.
            </Text>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeIn.duration(360)} style={styles.headlineBlock}>
              <Text style={styles.title} accessibilityRole="header">
                Change your password
              </Text>
              <Text style={styles.subtitle}>
                Enter the email on your Envelope account and we will send a
                reset link to it.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(80).duration(440)} style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                error={email.length > 0 && !emailValid ? 'Enter a valid email address.' : null}
                testID="change-password-email"
              />

              {error ? (
                <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
                  <Icon name="alert" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              <PrimaryButton
                label="Send reset link"
                onPress={handleSubmit}
                loading={loading}
                loadingLabel="Sending…"
                disabled={!emailValid || loading}
                accessibilityHint="Sends a password reset link to your email"
              />
            </Animated.View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remembered your password?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
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
    nav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    navSpacer: {
      width: 40,
    },
    back: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headlineBlock: {
      marginTop: spacing.xxxl,
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
    form: {
      marginTop: spacing.xxxl,
      gap: spacing.xl,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.errorMuted,
    },
    errorText: {
      ...type.caption,
      color: colors.error,
      flexShrink: 1,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: spacing.huge,
      gap: spacing.lg,
      alignItems: 'center',
    },
    footerText: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
    },
    footerLink: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.text,
      textDecorationLine: 'underline',
    },
  });
