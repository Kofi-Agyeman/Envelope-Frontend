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
import { Field, PasswordToggle } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Icon } from '@/components/Icon';
import { Logo } from '@/components/Logo';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { demoCredentials } from '@/services/auth';
import { USE_MOCKS } from '@/constants/config';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { signIn, preferences } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phone.trim().length >= 10 && password.length >= 4;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signIn({ phone: phone.trim(), password });
      haptics.success();
      // Move the router explicitly. The root navigator also redirects, but
      // leaving an authenticated screen still mounted for a frame is what made
      // the transition feel like it required a restart.
      router.replace(
        preferences.hasSeenOnboarding ? '/(tabs)' : '/onboarding',
      );
    } catch (e) {
      haptics.error();
      setError(
        e instanceof Error
          ? e.message
          : "We couldn't sign you in. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [canSubmit, loading, password, phone, preferences.hasSeenOnboarding, router, signIn]);

  const useDemo = useCallback(() => {
    setPhone(demoCredentials.phone);
    setPassword(demoCredentials.password);
    setError(null);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(360)}>
          <Logo size={34} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(420)} style={styles.headlineBlock}>
          <Text style={styles.headline} accessibilityRole="header">
            Welcome back
          </Text>
          <Text style={styles.subhead}>
            Sign in to send money with a link. No recipient number needed.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(440)} style={styles.form}>
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="024 563 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            prefix="+233"
            testID="login-phone"
          />

          <View>
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry={secure}
              autoComplete="password"
              onSubmitEditing={handleSubmit}
              testID="login-password"
              accessory={
                <PasswordToggle secure={secure} onPress={() => setSecure((s) => !s)} />
              }
            />
            <Pressable
              onPress={() => setError('Password reset will be available once your account is linked to MTN MoMo.')}
              accessibilityRole="button"
              hitSlop={8}
              style={styles.forgot}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          </View>

          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
              <Icon name="alert" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <PrimaryButton
            label="Log in"
            onPress={handleSubmit}
            loading={loading}
            loadingLabel="Signing in…"
            disabled={!canSubmit}
            accessibilityHint="Signs in to your Envelope account"
          />

          {USE_MOCKS ? (
            <Pressable
              onPress={useDemo}
              accessibilityRole="button"
              style={({ pressed }) => [styles.demoButton, pressed && { opacity: 0.8 }]}
            >
              <Icon name="spark" size={14} color={colors.accent} />
              <Text style={styles.demoText}>
                Use demo account · {demoCredentials.masked}
              </Text>
            </Pressable>
          ) : null}
        </Animated.View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to Envelope?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable accessibilityRole="link" hitSlop={8}>
                <Text style={styles.footerLink}>Create an account</Text>
              </Pressable>
            </Link>
          </View>
          <View style={styles.trust}>
            <Icon name="shield" size={14} color={colors.textMuted} />
            <Text style={styles.trustText}>
              Payments are settled through MTN Mobile Money.
            </Text>
          </View>
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
    headlineBlock: {
      marginTop: spacing.huge,
      gap: spacing.sm,
    },
    headline: {
      ...type.display,
      color: colors.text,
    },
    subhead: {
      ...type.body,
      color: colors.textSecondary,
    },
    form: {
      marginTop: spacing.xxxl,
      gap: spacing.xl,
    },
    forgot: {
      alignSelf: 'flex-end',
      marginTop: spacing.sm,
    },
    forgotText: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
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
    demoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      marginTop: -spacing.sm,
    },
    demoText: {
      ...type.caption,
      color: colors.textSecondary,
    },
    footer: {
      marginTop: 'auto',
      paddingTop: spacing.huge,
      gap: spacing.lg,
      alignItems: 'center',
    },
    footerRow: {
      flexDirection: 'row',
      gap: spacing.xs + 2,
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
    trust: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    trustText: {
      ...type.meta,
      color: colors.textMuted,
    },
  });
