import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { formatMoney } from '@/utils/format';
import { haptics } from '@/utils/haptics';
import type { Balance } from '@/types';

type Props = {
  balance: Balance | null;
  loading?: boolean;
  hidden: boolean;
  onToggleHidden: () => void;
  greeting?: string;
  name?: string;
  onAvatarPress?: () => void;
  initials?: string;
};

export function BalanceCard({
  balance,
  loading = false,
  hidden,
  onToggleHidden,
  greeting,
  name,
  onAvatarPress,
  initials = 'PP',
}: Props) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withSpring(1, { damping: 18, stiffness: 140 });
  }, [enter]);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 14 }],
  }));

  const balanceStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, enter.value * 1.4 - 0.4)),
    transform: [{ scale: 0.97 + enter.value * 0.03 }],
  }));

  const valueStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hidden ? 0.35 : 1, { duration: 200 }),
  }));

  return (
    <View>
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.headerText}>
          {greeting && name ? (
            <Text style={styles.greeting} numberOfLines={1}>
              {greeting}, <Text style={styles.greetingName}>{name}</Text>
            </Text>
          ) : null}
          {greeting ? (
            <Text style={styles.subGreeting}>Ready to send something?</Text>
          ) : null}
        </View>

        <Pressable
          onPress={() => {
            haptics.light();
            onAvatarPress?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={10}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[styles.balanceBlock, balanceStyle]}>
        <View style={styles.balanceLabelRow}>
          <Text style={styles.balanceLabel}>Available balance</Text>
          <Pressable
            onPress={() => {
              haptics.light();
              onToggleHidden();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            style={styles.eyeButton}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={17}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        <Animated.View style={valueStyle}>
          {loading ? (
            <View style={styles.skeletonValue} />
          ) : (
            <Text style={styles.balanceValue} numberOfLines={1} adjustsFontSizeToFit>
              {hidden ? 'GH₵ ••••••' : formatMoney(balance?.available ?? 0)}
            </Text>
          )}
        </Animated.View>

        <View style={styles.walletRow}>
          <View style={styles.mtnMark}>
            <Text style={styles.mtnMarkText}>MTN</Text>
          </View>
          <Text style={styles.walletText}>
            {balance?.walletLabel ?? 'MTN MoMo'}
          </Text>
          <View style={styles.walletDot} />
          <Text style={styles.walletText}>
            {balance?.maskedPhone ?? '•••• 0000'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxl,
  },
  headerText: {
    flex: 1,
    paddingRight: spacing.lg,
  },
  greeting: {
    ...type.greeting,
    color: colors.textSecondary,
  },
  greetingName: {
    color: colors.text,
    fontFamily: fontFamily.semibold,
  },
  subGreeting: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    letterSpacing: 0.4,
    color: colors.primary,
  },
  balanceBlock: {
    paddingLeft: 2,
  },
  balanceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceLabel: {
    ...type.balanceLabel,
    color: colors.textMuted,
  },
  eyeButton: {
    marginLeft: spacing.sm,
    paddingVertical: 2,
  },
  balanceValue: {
    ...type.balanceValue,
    color: colors.text,
    marginTop: 2,
  },
  skeletonValue: {
    height: 40,
    width: '62%',
    borderRadius: radius.md,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  mtnMark: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,210,28,0.16)',
  },
  mtnMarkText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: colors.primary,
  },
  walletText: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textSecondary,
  },
  walletDot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
});

export default BalanceCard;
