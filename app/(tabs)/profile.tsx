import React, { useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/constants/colors';
import { layout, radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { maskPhone } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import type { UserPreferences } from '@/types';

const SECTIONS: {
  title: string;
  rows: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    pref?: keyof UserPreferences;
  }[];
}[] = [
  {
    title: 'Account',
    rows: [
      { icon: 'person-outline', label: 'Personal information', value: 'Edit' },
      { icon: 'wallet-outline', label: 'MTN MoMo wallet', value: '•••• 4567' },
      { icon: 'lock-closed-outline', label: 'Password & security', value: '' },
    ],
  },
  {
    title: 'Security',
    rows: [
      { icon: 'finger-print-outline', label: 'Biometric authentication', pref: 'biometricsEnabled' },
    ],
  },
  {
    title: 'Preferences',
    rows: [
      { icon: 'notifications-outline', label: 'Push notifications', pref: 'pushNotifications' },
      { icon: 'eye-off-outline', label: 'Hide balance', pref: 'hideBalance' },
      { icon: 'radio-button-on-outline', label: 'Haptic feedback', pref: 'hapticFeedback' },
      { icon: 'cash-outline', label: 'Payment settings', value: '' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'help-circle-outline', label: 'Help centre', value: '' },
      { icon: 'document-text-outline', label: 'Terms & privacy', value: '' },
    ],
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, preferences, setPreference, signOut } = useAuth();
  const { envelopes } = useData();

  const handleSignOut = useCallback(() => {
    haptics.medium();
    const run = () => {
      void signOut().then(() => router.replace('/(auth)/login'));
    };

    if (typeof Alert?.alert === 'function') {
      Alert.alert('Log out', 'You will need to sign in again to send envelopes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  }, [router, signOut]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 108 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Profile</Text>

      <Animated.View entering={FadeIn.duration(400)} style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{profile?.initials ?? 'PP'}</Text>
        </View>
        <Text style={styles.name}>{profile?.fullName ?? 'Sender'}</Text>
        <Text style={styles.email}>{profile?.email ?? ''}</Text>
        <View style={styles.walletPill}>
          <View style={styles.mtnMark}>
            <Text style={styles.mtnMarkText}>MTN</Text>
          </View>
          <Text style={styles.walletText}>
            {profile ? maskPhone(profile.phone) : ''}
          </Text>
        </View>
      </Animated.View>

      <View style={styles.stats}>
        <Stat value={String(envelopes.length)} label="Envelopes" />
        <View style={styles.statDivider} />
        <Stat
          value={String(envelopes.filter((e) => e.status === 'completed').length)}
          label="Completed"
        />
        <View style={styles.statDivider} />
        <Stat
          value={String(envelopes.filter((e) => e.status === 'waiting').length)}
          label="Waiting"
        />
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <View style={styles.group}>
            {section.rows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.row,
                  index < section.rows.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={styles.rowIcon}>
                  <Ionicons name={row.icon} size={17} color={colors.textSecondary} />
                </View>

                <Text style={styles.rowLabel}>{row.label}</Text>

                {row.pref ? (
                  <Switch
                    value={preferences[row.pref]}
                    onValueChange={(value) => {
                      haptics.light();
                      setPreference(row.pref as keyof UserPreferences, value);
                    }}
                    trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(255,210,28,0.55)' }}
                    thumbColor={preferences[row.pref] ? colors.primary : '#8B8F9C'}
                    ios_backgroundColor="rgba(255,255,255,0.12)"
                    accessibilityLabel={row.label}
                  />
                ) : (
                  <View style={styles.rowTrailing}>
                    {row.value ? (
                      <Text style={styles.rowValue}>{row.value}</Text>
                    ) : null}
                    <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}

      <PrimaryButton
        label="LOG OUT"
        variant="secondary"
        onPress={handleSignOut}
        style={styles.logout}
      />

      <Text style={styles.version}>PingPay · Envelope · v1.0.0</Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  name: {
    ...type.sectionTitle,
    color: colors.text,
  },
  email: {
    ...type.caption,
    color: colors.textMuted,
  },
  walletPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mtnMark: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,210,28,0.16)',
  },
  mtnMarkText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    letterSpacing: 0.5,
    color: colors.primary,
  },
  walletText: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xxl,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    color: colors.text,
  },
  statLabel: {
    ...type.meta,
    color: colors.textMuted,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.borderStrong,
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionLabel: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  group: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 54,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 30,
    alignItems: 'center',
  },
  rowLabel: {
    ...type.bodyMedium,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowValue: {
    ...type.caption,
    color: colors.textMuted,
  },
  logout: {
    marginTop: spacing.xxxl,
  },
  version: {
    ...type.meta,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
