import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Icon } from '@/components/Icon';
import { Skeleton } from '@/components/Skeleton';
import {
  Card,
  EmptyState,
  GroupLabel,
  ListGroup,
  ListRow,
  screenContent,
} from '@/components/ui';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import { formatDateLong, formatTime, maskPhone } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import { useAuth } from '@/store/auth';
import * as api from '@/services/api';
import { ApiError } from '@/services/http';
import type { Account } from '@/types';

type LoadState = {
  account: Account | null;
  loading: boolean;
  error: string | null;
  /** When the record on screen was actually fetched. */
  syncedAt: number | null;
};

/**
 * Everything `GET /api/users/me` returns, rendered as-is.
 *
 * The endpoint is authenticated, so the call carries the session's JWT as a
 * bearer token. `request` refreshes and replays once on a 401; a refresh that
 * also fails ends the session through the auth store, which unmounts this
 * screen. The record is read live on every visit rather than from the cached
 * profile in the auth store, so what is shown is what the backend says now.
 */
export default function AccountScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();

  const [state, setState] = useState<LoadState>({
    account: null,
    loading: true,
    error: null,
    syncedAt: null,
  });
  const mounted = useRef(true);

  // Read through a ref so a background token refresh cannot re-trigger the
  // fetch: the account on screen is already correct.
  const tokenRef = useRef<string | null>(token);
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (announce: boolean) => {
    const accessToken = tokenRef.current;
    if (!accessToken) {
      setState({
        account: null,
        loading: false,
        error: 'You need to be signed in to see your account.',
        syncedAt: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const account = await api.getAccount(accessToken);
      if (!mounted.current) return;
      // Only a deliberate refresh is worth a confirmation buzz; opening the
      // screen should not vibrate under the user's thumb.
      if (announce) haptics.success();
      setState({ account, loading: false, error: null, syncedAt: Date.now() });
    } catch (error) {
      if (!mounted.current) return;
      if (announce) haptics.error();
      setState((prev) => ({
        ...prev,
        loading: false,
        error: messageFor(error),
      }));
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace('/(tabs)/profile');

  const nav = (
    <View style={styles.navRow}>
      <Pressable
        onPress={goBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.iconButton}
      >
        <Icon name="chevronBack" size={20} color={colors.text} />
      </Pressable>
      <Text style={styles.navTitle}>Your account</Text>
      <Pressable
        onPress={() => {
          haptics.light();
          void load(true);
        }}
        hitSlop={12}
        disabled={state.loading}
        accessibilityRole="button"
        accessibilityLabel="Refresh account details"
        style={[styles.iconButton, state.loading && { opacity: 0.5 }]}
      >
        <Icon name="sync" size={18} color={colors.text} />
      </Pressable>
    </View>
  );

  const { account } = state;
  const syncedIso = state.syncedAt ? new Date(state.syncedAt).toISOString() : null;
  const syncedLabel = syncedIso
    ? `${formatDateLong(syncedIso)} · ${formatTime(syncedIso)}`
    : '—';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          screenContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.huge },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.loading && account !== null}
            onRefresh={() => void load(true)}
            tintColor={colors.textMuted}
          />
        }
      >
        {nav}

        {state.loading && !account ? (
          <LoadingState />
        ) : !account ? (
          <View style={styles.section}>
            <EmptyState
              icon="alert"
              title="Couldn't load your account"
              body={state.error ?? 'Something went wrong.'}
              actionLabel="Try again"
              onAction={() => void load(true)}
            />
          </View>
        ) : (
          <>
            {state.error ? (
              <Animated.View entering={FadeIn.duration(220)}>
                <Card style={styles.warnCard}>
                  <Icon name="alert" size={16} color={colors.warning} />
                  <Text style={styles.warnText}>
                    {state.error} Showing the last record we loaded.
                  </Text>
                </Card>
              </Animated.View>
            ) : null}

            <Animated.View entering={FadeIn.duration(320)}>
              <Card style={styles.hero}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{account.initials}</Text>
                </View>
                <Text style={styles.name} numberOfLines={2}>
                  {account.fullName || 'Your account'}
                </Text>

                <View style={styles.pillRow}>
                  <View style={styles.walletPill}>
                    <View style={styles.mtnMark}>
                      <Text style={styles.mtnMarkText}>MTN</Text>
                    </View>
                    <Text style={styles.walletText}>{maskPhone(account.phone)}</Text>
                  </View>
                  <View
                    style={[
                      styles.verifyPill,
                      {
                        backgroundColor: account.isVerified
                          ? colors.successMuted
                          : colors.warningMuted,
                      },
                    ]}
                  >
                    <Icon
                      name={account.isVerified ? 'checkCircle' : 'clock'}
                      size={12}
                      color={account.isVerified ? colors.success : colors.warning}
                    />
                    <Text
                      style={[
                        styles.verifyText,
                        { color: account.isVerified ? colors.success : colors.warning },
                      ]}
                    >
                      {account.isVerified ? 'Verified' : 'Not verified'}
                    </Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(80).duration(340)} style={styles.section}>
              <GroupLabel>Personal details</GroupLabel>
              <ListGroup>
                <ListRow icon="profile" title="Full name" value={account.fullName || '—'} />
                <ListRow icon="wallet" title="MTN MoMo number" value={account.phone || '—'} />
                <ListRow
                  icon="document"
                  title="Email"
                  subtitle={account.email ?? 'Not added'}
                />
                <ListRow
                  icon="shield"
                  title="Verification"
                  value={account.isVerified ? 'Verified' : 'Not verified'}
                />
              </ListGroup>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(140).duration(340)} style={styles.section}>
              <GroupLabel>User ID</GroupLabel>
              <Card>
                <Text style={styles.idValue} selectable>
                  {account.id}
                </Text>
                <Text style={styles.idHint}>
                  The identifier the backend uses for this account. Tap and hold to
                  copy it.
                </Text>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(200).duration(340)} style={styles.section}>
              <GroupLabel>Session</GroupLabel>
              <ListGroup>
                <ListRow
                  icon="lock"
                  title="Signed in with"
                  subtitle="This request carries your access token"
                  value={token ? 'Bearer JWT' : 'No token'}
                />
                <ListRow icon="sync" title="Last synced" value={syncedLabel} />
              </ListGroup>
              <Text style={styles.sourceNote}>
                These details are read live from GET /api/users/me with your signed-in
                token. Pull down to refresh.
              </Text>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Shown while the first record is in flight, in the shape of the real rows. */
function LoadingState() {
  const styles = useThemedStyles(createStyles);
  return (
    <>
      <Card style={styles.hero}>
        <Skeleton width={72} height={72} radiusOverride={36} />
        <Skeleton width={160} height={17} style={{ marginTop: spacing.lg }} />
        <Skeleton width={120} height={12} style={{ marginTop: spacing.md }} />
      </Card>
      <View style={styles.section}>
        <Skeleton width={110} height={11} />
        <ListGroup style={{ marginTop: spacing.sm }}>
          {[0, 1, 2, 3].map((row) => (
            <View key={row} style={styles.skeletonRow}>
              <Skeleton width={34} height={34} radiusOverride={10} />
              <View style={styles.skeletonBody}>
                <Skeleton width={96} height={13} />
                <Skeleton width={148} height={11} style={{ marginTop: spacing.sm }} />
              </View>
            </View>
          ))}
        </ListGroup>
      </View>
    </>
  );
}

/** Turns an ApiError into a sentence worth showing a user. */
function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.isNetworkError) {
      return "We couldn't reach Envelope. Check your connection.";
    }
    return error.message;
  }
  return "We couldn't load your account. Please try again.";
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    navTitle: {
      ...type.cardTitle,
      color: colors.text,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    section: {
      marginTop: spacing.xxl,
    },
    hero: {
      alignItems: 'center',
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxl,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: fontFamily.semibold,
      fontSize: 26,
      color: colors.primary,
    },
    name: {
      ...type.sectionTitle,
      color: colors.text,
      marginTop: spacing.lg,
      textAlign: 'center',
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    walletPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingLeft: 4,
      paddingRight: spacing.md,
      paddingVertical: 5,
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
    verifyPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    verifyText: {
      ...type.meta,
      fontFamily: fontFamily.semibold,
    },
    warnCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warningMuted,
      borderColor: 'transparent',
    },
    warnText: {
      ...type.meta,
      color: colors.warning,
      flex: 1,
    },
    sourceNote: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: spacing.md,
      marginLeft: spacing.xs,
    },
    idValue: {
      ...type.caption,
      ...tabularNums,
      fontFamily: fontFamily.medium,
      color: colors.text,
    },
    idHint: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    skeletonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    skeletonBody: {
      flex: 1,
    },
  });
