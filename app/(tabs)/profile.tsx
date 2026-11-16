import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { IconName } from '@/components/Icon';
import { Icon } from '@/components/Icon';
import {
  Card,
  GroupLabel,
  ListGroup,
  ListRow,
  ScreenHeader,
  SegmentedControl,
  screenContent,
} from '@/components/ui';
import { PrimaryButton } from '@/components/PrimaryButton';
import type { Palette, ThemeMode, TelcoSupport } from '@/constants/theme';
import { TELCO_COLORS } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { maskPhone } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import { useData } from '@/store/data';
import type { UserPreferences, AddNumPayload } from '@/types';

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

const TELCO_OPTIONS: { value: TelcoSupport; label: string; color: string }[] = [
  { value: 'MTN', label: 'MTN Mobile Money', color: TELCO_COLORS.MTN.primary },
  { value: 'Telecel', label: 'Telecel Cash', color: TELCO_COLORS.Telecel.primary },
  { value: 'AT', label: 'AirtelTigo Money', color: TELCO_COLORS.AT.primary },
];

export default function ProfileScreen() {
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, preferences, setPreference, signOut, selectedTelco, setSelectedTelco, addNumber } = useAuth();
  const { envelopes } = useData();

  const [showAddNumberModal, setShowAddNumberModal] = useState(false);
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [selectedNewTelco, setSelectedNewTelco] = useState<TelcoSupport>('MTN');
  const [addingNumber, setAddingNumber] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleSignOut = useCallback(() => {
    haptics.medium();
    const run = () => {
      void signOut().then(() => router.replace('/(auth)/login'));
    };

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

  const getPhoneForTelco = (telco: TelcoSupport): string | null => {
    switch (telco) {
      case 'MTN':
        return profile?.mtnPhone ?? null;
      case 'Telecel':
        return profile?.telecelPhone ?? null;
      case 'AT':
        return profile?.atPhone ?? null;
    }
  };

  const isTelcoActive = (telco: TelcoSupport): boolean => {
    return !!getPhoneForTelco(telco);
  };

  const handleAddNumber = useCallback(async () => {
    if (!newPhoneNumber.trim() || addingNumber) return;
    setAddingNumber(true);
    setAddError(null);
    try {
      await addNumber({ phone_number: newPhoneNumber.trim(), telco_support: selectedNewTelco });
      haptics.success();
      setShowAddNumberModal(false);
      setNewPhoneNumber('');
    } catch (e) {
      haptics.error();
      setAddError(e instanceof Error ? e.message : 'Failed to add number. Please try again.');
    } finally {
      setAddingNumber(false);
    }
  }, [newPhoneNumber, selectedNewTelco, addNumber, addingNumber]);

  const handleTelcoSelect = useCallback((telco: TelcoSupport) => {
    haptics.light();
    setSelectedTelco(telco);
  }, [setSelectedTelco]);

  const getTelcoColor = (telco: TelcoSupport) => TELCO_COLORS[telco].primary;
  const getTelcoOnColor = (telco: TelcoSupport) => TELCO_COLORS[telco].onPrimary;
  const getTelcoMuted = (telco: TelcoSupport) => TELCO_COLORS[telco].primaryMuted;

  const renderTelcoCard = (telco: TelcoSupport) => {
    const phone = getPhoneForTelco(telco);
    const isActive = isTelcoActive(telco);
    const isSelected = selectedTelco === telco;
    const telcoColor = getTelcoColor(telco);
    const telcoOnColor = getTelcoOnColor(telco);
    const telcoMuted = getTelcoMuted(telco);

    return (
      <View key={telco} style={[styles.telcoCard, { borderColor: isSelected ? telcoColor : colors.border }]}>
        <Pressable
          onPress={() => handleTelcoSelect(telco)}
          style={styles.telcoCardContent}
          android_ripple={{ color: telcoMuted }}
        >
          <View style={[{ backgroundColor: isSelected ? telcoColor : telcoMuted }, styles.telcoBadge]}>
            <Text style={[{ color: isSelected ? telcoOnColor : telcoColor }, styles.telcoBadgeText]}>
              {telco}
            </Text>
          </View>
          <View style={styles.telcoInfo}>
            <Text style={styles.telcoName}>{TELCO_OPTIONS.find(o => o.value === telco)?.label}</Text>
            <Text style={[
              styles.telcoNumber,
              { color: isActive ? colors.text : colors.textMuted }
            ]}>
              {isActive ? maskPhone(phone!) : 'Not linked'}
            </Text>
          </View>
          {isActive && isSelected && (
            <View style={[{ backgroundColor: telcoColor }, styles.activeIndicator]}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          )}
        </Pressable>
        {!isActive && (
          <PrimaryButton
            label={`Add ${telco} number`}
            variant="ghost"
            size="md"
            onPress={() => {
              setSelectedNewTelco(telco);
              setShowAddNumberModal(true);
            }}
            style={styles.addButton}
            icon={<Icon name="plus" size={16} color={telcoColor} />}
          />
        )}
      </View>
    );
  };

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
                <View style={styles.telcoMark}>
                  <Text style={styles.telcoMarkText}>
                    {selectedTelco || '—'}
                  </Text>
                </View>
                <Text style={styles.walletText}>
                  {profile && selectedTelco && getPhoneForTelco(selectedTelco)
                    ? maskPhone(getPhoneForTelco(selectedTelco)!)
                    : profile
                    ? maskPhone(profile.phone)
                    : '•••• 0000'}
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
        <GroupLabel>Phone Numbers</GroupLabel>
        <View style={styles.telcoCards}>
          {TELCO_OPTIONS.map((opt) => renderTelcoCard(opt.value))}
        </View>
      </View>

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
            icon="lock"
            title="Password"
            subtitle="Change your sign-in password"
            onPress={() => {
              haptics.light();
              void router.push('/change-password');
            }}
          />
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

      <Text style={styles.version}>Envelope · v1.0.0</Text>

      {showAddNumberModal && (
        <AddNumberModal
          visible={showAddNumberModal}
          onClose={() => {
            setShowAddNumberModal(false);
            setAddError(null);
          }}
          onSubmit={handleAddNumber}
          phoneNumber={newPhoneNumber}
          onPhoneChange={setNewPhoneNumber}
          selectedTelco={selectedNewTelco}
          onTelcoChange={setSelectedNewTelco}
          loading={addingNumber}
          error={addError}
        />
      )}
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

function AddNumberModal({
  visible,
  onClose,
  onSubmit,
  phoneNumber,
  onPhoneChange,
  selectedTelco,
  onTelcoChange,
  loading,
  error,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  phoneNumber: string;
  onPhoneChange: (v: string) => void;
  selectedTelco: TelcoSupport;
  onTelcoChange: (t: TelcoSupport) => void;
  loading: boolean;
  error: string | null;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const telcoColor = TELCO_COLORS[selectedTelco].primary;
  const telcoOnColor = TELCO_COLORS[selectedTelco].onPrimary;
  const telcoMuted = TELCO_COLORS[selectedTelco].primaryMuted;

  const cleanPhone = phoneNumber.replace(/\D/g, '');

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.modalOverlay}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.modal}>
        <View style={[{ backgroundColor: telcoColor }, styles.modalHeader]}>
          <Text style={[{ color: telcoOnColor }, styles.modalTitle]}>
            Add {TELCO_OPTIONS.find(o => o.value === selectedTelco)?.label} Number
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Text style={[{ color: telcoOnColor }, styles.closeText]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.modalContent}>
          <View style={styles.telcoSelector}>
            {TELCO_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => onTelcoChange(opt.value)}
                style={[
                  styles.telcoOption,
                  selectedTelco === opt.value && {
                    backgroundColor: opt.color,
                    borderColor: opt.color,
                  },
                ]}
                android_ripple={{ color: TELCO_COLORS[opt.value].primaryMuted }}
              >
                <Text style={[
                  styles.telcoOptionText,
                  selectedTelco === opt.value
                    ? { color: '#FFFFFF' }
                    : { color: opt.color },
                ]}>
                  {opt.value}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={[styles.textInput, { borderColor: telcoColor }]}
              value={phoneNumber}
              onChangeText={onPhoneChange}
              placeholder="024 563 4567"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={15}
              autoFocus
            />
            <Text style={styles.inputHint}>
              {cleanPhone.length} / 10 digits
            </Text>
          </View>

          {error && (
            <View style={[{ backgroundColor: colors.errorMuted, borderColor: colors.error }, styles.errorBox]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.modalActions}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={loading}
              style={styles.cancelButton}
            />
            <PrimaryButton
              label={loading ? 'Adding…' : 'Add Number'}
              onPress={onSubmit}
              disabled={loading || cleanPhone.length < 10}
              loading={loading}
              style={[{ backgroundColor: telcoColor }, styles.submitButton]}
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
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
    telcoMark: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    telcoMarkText: {
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
    telcoCards: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: spacing.md,
    },
    telcoCard: {
      flex: 1,
      minWidth: 140,
      maxWidth: 160,
      borderWidth: 2,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    telcoCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      gap: spacing.md,
    },
    telcoBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    telcoBadgeText: {
      fontFamily: fontFamily.extrabold,
      fontSize: 11,
      letterSpacing: 0.5,
    },
    telcoInfo: {
      flex: 1,
      minWidth: 0,
    },
    telcoName: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
    },
    telcoNumber: {
      ...type.meta,
      fontFamily: fontFamily.medium,
      marginTop: 2,
    },
    activeIndicator: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
    },
    activeText: {
      fontFamily: fontFamily.semibold,
      fontSize: 10,
      color: '#FFFFFF',
    },
    addButton: {
      marginTop: spacing.md,
      borderColor: 'currentColor',
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
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
      zIndex: 1000,
    },
    modal: {
      width: '100%',
      maxWidth: 400,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
    },
    modalTitle: {
      ...type.bodyMedium,
      fontFamily: fontFamily.semibold,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontSize: 18,
      fontWeight: '600' as const,
    },
    modalContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    telcoSelector: {
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'center',
    },
    telcoOption: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 2,
      alignItems: 'center',
    },
    telcoOptionText: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
    },
    inputGroup: {
      gap: spacing.xs,
    },
    inputLabel: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.text,
    },
    textInput: {
      ...type.body,
      height: 50,
      paddingHorizontal: spacing.md,
      borderWidth: 2,
      borderRadius: radius.md,
      backgroundColor: colors.background,
      color: colors.text,
    },
    inputHint: {
      ...type.meta,
      color: colors.textMuted,
      textAlign: 'right',
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    errorText: {
      ...type.caption,
      color: colors.error,
      flex: 1,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    cancelButton: {
      flex: 1,
    },
    submitButton: {
      flex: 1,
    },
  });