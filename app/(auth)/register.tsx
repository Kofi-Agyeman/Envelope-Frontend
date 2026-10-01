import React, { useCallback, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Field, PasswordToggle } from '@/components/Field';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';

function scorePassword(password: string): number {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  return Math.min(score, 4);
}

const PASSWORD_LABELS = ['Too short', 'Weak', 'Okay', 'Strong', 'Very strong'];
const PASSWORD_COLORS = [
  colors.error,
  colors.error,
  colors.warning,
  colors.success,
  colors.success,
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    fullName.trim().length >= 2 &&
    phone.replace(/\D/g, '').length >= 10 &&
    email.includes('@') &&
    password.length >= 6 &&
    password === confirm;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signUp({
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        confirmPassword: confirm,
      });
      haptics.success();
      // The root navigator swaps to the signed-in tree on its own once
      // `status` flips, choosing onboarding or the tabs as its initial route.
    } catch (e) {
      haptics.error();
      setError(e instanceof Error ? e.message : "We couldn't create your account.");
    } finally {
      setLoading(false);
    }
  }, [canSubmit, confirm, email, fullName, loading, password, phone, signUp]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/login'))}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Your MTN MoMo number becomes your PingPay wallet.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(90).duration(460)} style={styles.form}>
          <Field
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Kofi Agyeman"
            autoComplete="name"
            testID="register-name"
          />
          <Field
            label="MTN MoMo number"
            value={phone}
            onChangeText={setPhone}
            placeholder="024 563 4567"
            keyboardType="phone-pad"
            autoComplete="tel"
            prefix="+233"
            testID="register-phone"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            testID="register-email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry={secure}
            autoComplete="new-password"
            testID="register-password"
            accessory={
              <PasswordToggle secure={secure} onPress={() => setSecure((s) => !s)} />
            }
          />

          {password.length > 0 ? (
            <View style={styles.strengthRow}>
              <View style={styles.strengthBars}>
                {[0, 1, 2, 3].map((i) => (
                  <View
                    key={i}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor:
                          i < strength ? PASSWORD_COLORS[strength] : 'rgba(255,255,255,0.1)',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthLabel, { color: PASSWORD_COLORS[strength] }]}>
                {PASSWORD_LABELS[strength]}
              </Text>
            </View>
          ) : null}

          <Field
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            secureTextEntry={secure}
            autoComplete="new-password"
            testID="register-confirm"
          />

          {mismatch ? (
            <Animated.View entering={FadeIn.duration(180)} style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>Passwords do not match.</Text>
            </Animated.View>
          ) : null}

          {error ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          ) : null}

          <PrimaryButton
            label="CREATE ACCOUNT"
            onPress={handleSubmit}
            loading={loading}
            loadingLabel="Creating account…"
            disabled={!canSubmit}
            style={styles.submit}
          />
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={styles.footerLink}>Log in</Text>
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
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.text,
  },
  subtitle: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  form: {
    marginTop: spacing.xxxl,
    gap: spacing.lg,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    flex: 1,
    maxWidth: 180,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 3,
  },
  strengthLabel: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
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
