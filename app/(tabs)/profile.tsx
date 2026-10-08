import React, { useCallback } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { IconName } from '@/components/Icon';
import {
  Card,
  GroupLabel,
  ListGroup,
  ListRow,
  ScreenHeader,
  SegmentedControl,
  screenContent,
} from '@/components/ui';
import type { Palette, ThemeMode } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { maskPhone } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import type { UserPreferences } from '@/types';

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'Auto', icon: 'system' },
];

type PrefRow = { icon: IconName; label: string; subtitle: string; pref: keyof UserPreferences };

const SECURITY_ROWS: PrefRow[] = [
  {
    icon: 'fingerprint',
    label: 'Biometric sign-in',
    subtitle: 'Use Face ID or fingerprint',
    pref: 'biometricsEnabled',
  },
  {
    icon: 'eyeOff',
    label: 'Hide balance',
    subtitle: 'Mask your balance on Home',
    pref: 'hideBalance',
  },
];

const PREFERENCE_ROWS: PrefRow[] = [
  {
    icon: 'bell',
    label: 'Push notifications',
    subtitle: 'Claims and completed payments',
    pref: 'pushNotifications',
  },
  {
    icon: 'haptics',
    label: 'Haptic feedback',
    subtitle: 'Vibrate on taps and confirmations',
    pref: 'hapticFeedback',
  },
];

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, preferences, setPreference, signOut } = useAuth();
  const { envelopes } = useData();

  const handleSignOut = useCallback(() => {
    haptics.medium();
    const run = () => {
      void signOut().then(() => router.replace('/(auth)/login'));
    };

    // react-native-web ships Alert.alert as a no-op, so the web needs its own
    // confirmation or log out silently does nothing.
    if (Platform.OS === 'web') {
      if (window.confirm('Log out? You will need to sign in again to send envelopes.')) run();
    } else if (typeof Alert?.alert === 'function') {
      Alert.alert('Log out', 'You will need to sign in again to send envelopes.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  }, [router, signOut]);

  const renderSwitch = (row: PrefRow) => (
    <ListRow
      key={row.pref}
      icon={row.icon}
      title={row.label}
      subtitle={row.subtitle}
      trailing={
        <Switch
          value={preferences[row.pref]}
          onValueChange={(value) => {
            haptics.light();
            setPreference(row.pref, value);
          }}
          trackColor={{ false: colors.borderStrong, true: colors.success }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={colors.borderStrong}
          accessibilityLabel={row.label}
        />
      }
    />
  );

  const completed = envelopes.filter((e) => e.status === 'completed').length;
  const waiting = envelopes.filter((e) => e.status === 'waiting').length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        screenContent,
        { paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Profile" />

      <Animated.View entering={FadeIn.duration(320)}>
        <Card style={styles.identityCard}>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.initials ?? 'EN'}</Text>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {profile?.fullName ?? 'Sender'}
              </Text>
              {profile?.email ? (
                <Text style={styles.email} numberOfLines={1}>
                  {profile.email}
                </Text>
              ) : null}
              <View style={styles.walletPill}>
                <View style={styles.mtnMark}>
                  <Text style={styles.mtnMarkText}>MTN</Text>
                </View>
                <Text style={styles.walletText}>
                  {profile ? maskPhone(profile.phone) : '•••• 0000'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.stats}>
            <Stat value={envelopes.length} label="Envelopes" />
            <View style={styles.statDivider} />
            <Stat value={completed} label="Completed" />
            <View style={styles.statDivider} />
            <Stat value={waiting} label="Waiting" />
          </View>
        </Card>
      </Animated.View>

      <View style={styles.section}>
        <GroupLabel>Account</GroupLabel>
        <ListGroup>
          <ListRow
            icon="profile"
            title="Personal information"
            subtitle={profile?.fullName}
            value={profile?.isVerified ? 'Verified' : undefined}
            onPress={() => router.push('/account')}
          />
          <ListRow
            icon="wallet"
            title="MTN MoMo wallet"
            value={profile ? maskPhone(profile.phone) : undefined}
          />
          <ListRow icon="lock" title="Password" subtitle="Change your sign-in password" />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <GroupLabel>Security & privacy</GroupLabel>
        <ListGroup>{SECURITY_ROWS.map(renderSwitch)}</ListGroup>
      </View>

      <View style={styles.section}>
        <GroupLabel>Preferences</GroupLabel>
        <ListGroup>
          {PREFERENCE_ROWS.map(renderSwitch)}
          <View style={styles.themeRow}>
            <Text style={styles.themeLabel}>Appearance</Text>
            <SegmentedControl<ThemeMode>
              value={mode}
              onChange={setMode}
              options={THEME_OPTIONS}
            />
          </View>
        </ListGroup>
      </View>

      <View style={styles.section}>
        <GroupLabel>Support</GroupLabel>
        <ListGroup>
          <ListRow icon="help" title="Help centre" />
          <ListRow icon="document" title="Terms & privacy" />
        </ListGroup>
      </View>

      <View style={styles.section}>
        <ListGroup>
          <ListRow icon="logout" title="Log out" destructive onPress={handleSignOut} />
        </ListGroup>
      </View>

      <Text style={styles.version}>Envelope for MTN MoMo · v1.0.0</Text>
    </ScrollView>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    identityCard: {
      padding: 0,
    },
    identity: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
      padding: spacing.xl,
    },
    identityText: {
      flex: 1,
      gap: 2,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: fontFamily.semibold,
      fontSize: 22,
      color: colors.primary,
    },
    name: {
      ...type.sectionTitle,
      color: colors.text,
    },
    email: {
      ...type.caption,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
    },
    walletPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.sm,
      paddingLeft: 4,
      paddingRight: spacing.md,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundSecondary,
    },
    mtnMark: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    mtnMarkText: {
      fontFamily: fontFamily.extrabold,
      fontSize: 9,
      letterSpacing: 0.4,
      color: colors.onPrimary,
    },
    walletText: {
      ...type.meta,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
      letterSpacing: 0.5,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      ...type.sectionTitle,
      ...tabularNums,
      fontFamily: fontFamily.bold,
      color: colors.text,
    },
    statLabel: {
      ...type.meta,
      color: colors.textMuted,
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      height: 28,
      backgroundColor: colors.border,
    },
    section: {
      marginTop: spacing.xxl,
    },
    themeRow: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    themeLabel: {
      ...type.bodyMedium,
      color: colors.text,
    },
    version: {
      ...type.meta,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing.xxl,
    },
  });
