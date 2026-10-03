import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Icon } from '@/components/Icon';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
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

/**
 * Greeting row plus the wallet card. The card is always the dark brand
 * surface, in both themes, so the balance reads like a physical card.
 */
export function BalanceCard({
  balance,
  loading = false,
  hidden,
  onToggleHidden,
  greeting,
  name,
  onAvatarPress,
  initials = 'EN',
}: Props) {
  const { colors, gradients, shadows } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      <Animated.View entering={FadeIn.duration(320)} style={styles.header}>
        <Pressable
          onPress={() => {
            haptics.light();
            onAvatarPress?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={8}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
        <View style={styles.headerText}>
          {greeting ? <Text style={styles.subGreeting}>{greeting}</Text> : null}
          {name ? (
            <Text style={styles.greeting} numberOfLines={1}>
              {name}
            </Text>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(60).duration(360)} style={[styles.card, shadows.soft]}>
        <LinearGradient
          colors={gradients.walletCard as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Concentric rings give the card texture without competing with the numbers. */}
        <Svg width={220} height={220} style={styles.rings} pointerEvents="none">
          <Circle cx={160} cy={60} r={60} stroke="rgba(255,255,255,0.06)" strokeWidth={1} fill="none" />
          <Circle cx={160} cy={60} r={95} stroke="rgba(255,255,255,0.05)" strokeWidth={1} fill="none" />
          <Circle cx={160} cy={60} r={130} stroke="rgba(255,255,255,0.04)" strokeWidth={1} fill="none" />
        </Svg>

        <View style={styles.cardTop}>
          <View style={styles.walletBrand}>
            <View style={styles.mtnMark}>
              <Text style={styles.mtnMarkText}>MTN</Text>
            </View>
            <Text style={styles.walletLabel}>{balance?.walletLabel ?? 'MTN MoMo'}</Text>
          </View>
          <Pressable
            onPress={() => {
              haptics.light();
              onToggleHidden();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show balance' : 'Hide balance'}
            style={styles.eyeButton}
          >
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={16} color="rgba(255,255,255,0.75)" />
          </Pressable>
        </View>

        <Text style={styles.balanceLabel}>Available balance</Text>
        {loading ? (
          <View style={styles.skeletonValue} />
        ) : (
          <Text
            style={styles.balanceValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityLabel={hidden ? 'Balance hidden' : undefined}
          >
            {hidden ? 'GH₵ ••••••' : formatMoney(balance?.available ?? 0)}
          </Text>
        )}

        <View style={styles.cardBottom}>
          <Text style={styles.cardNumber}>{balance?.maskedPhone ?? '•••• 0000'}</Text>
          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={styles.statusText}>Linked</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    headerText: {
      flex: 1,
    },
    subGreeting: {
      ...type.meta,
      color: colors.textMuted,
    },
    greeting: {
      ...type.greeting,
      color: colors.text,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: fontFamily.semibold,
      fontSize: 14,
      color: colors.primary,
    },
    card: {
      borderRadius: radius.xxl,
      overflow: 'hidden',
      padding: spacing.xl,
      minHeight: 188,
      backgroundColor: colors.ink,
    },
    rings: {
      position: 'absolute',
      right: -40,
      top: -30,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    walletBrand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    mtnMark: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    mtnMarkText: {
      fontFamily: fontFamily.extrabold,
      fontSize: 10,
      letterSpacing: 0.4,
      color: colors.onPrimary,
    },
    walletLabel: {
      ...type.caption,
      color: 'rgba(255,255,255,0.85)',
    },
    eyeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    balanceLabel: {
      ...type.balanceLabel,
      color: 'rgba(255,255,255,0.6)',
    },
    balanceValue: {
      ...type.balanceValue,
      ...tabularNums,
      color: '#FFFFFF',
      marginTop: 2,
    },
    skeletonValue: {
      height: 32,
      width: '60%',
      borderRadius: radius.sm,
      marginTop: 6,
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    cardBottom: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xl,
    },
    cardNumber: {
      fontFamily: fontFamily.medium,
      fontSize: 14,
      letterSpacing: 1.5,
      color: 'rgba(255,255,255,0.7)',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      ...type.meta,
      fontFamily: fontFamily.medium,
      color: 'rgba(255,255,255,0.8)',
    },
  });

export default BalanceCard;
