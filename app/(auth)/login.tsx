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
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Field, PasswordToggle } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { demoCredentials } from '@/services/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

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
      // The root navigator swaps to the signed-in tree on its own once
      // `status` flips, choosing onboarding or the tabs as its initial route.
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
  }, [canSubmit, loading, password, phone, signIn]);

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
          { paddingTop: insets.top + spacing.huge, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
                <Animated.View entering={FadeInDown.duration(420)}>
          <Text style={styles.wordmark}>PINGPAY</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(80).duration(460)}
          style={styles.headlineBlock}
        >
          <Text style={styles.headline}>
            Money, without the awkward{'\n'}&quot;What&apos;s your number?&quot;
          </Text>
          <Text style={styles.subhead}>
            Create an Envelope, share the link, and let them choose where it lands.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(460)} style={styles.form}>
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

          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry={secure}
            autoComplete="password"
            onSubmitEditing={handleSubmit}
            testID="login-password"
            accessory={
              <PasswordToggle secure={secure} onPress={() => setSecure((s) => !s)} />
            }
          />

          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <PrimaryButton
            label="LOG IN"
            onPress={handleSubmit}
            loading={loading}
            loadingLabel="Signing in…"
            disabled={!canSubmit}
            style={styles.submit}
            accessibilityHint="Signs in to your PingPay account"
          />

          <Pressable
            onPress={useDemo}
            accessibilityRole="button"
            style={styles.demoButton}
          >
            <Text style={styles.demoText}>
              Use demo account · {demoCredentials.masked}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setError('Password reset will be available once your account is linked to MTN MoMo.')}
            accessibilityRole="button"
            style={styles.forgot}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to PingPay?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPadding,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    fontSize: 15,
    letterSpacing: 4,
    color: colors.primary,
  },
  headlineBlock: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  headline: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.9,
    color: colors.text,
  },
  subhead: {
    ...type.body,
    color: colors.textSecondary,
  },
  form: {
    marginTop: spacing.xxxl,
    gap: spacing.lg,
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
  submit: {
    marginTop: spacing.sm,
  },
  demoButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryFaint,
  },
  demoText: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  forgot: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  forgotText: {
    ...type.caption,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xxxl,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  footerText: {
    ...type.caption,
    color: colors.textMuted,
  },
  footerLink: {
    ...type.caption,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },
});
