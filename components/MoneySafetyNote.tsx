import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';

type Props = {
  compact?: boolean;
};

/**
 * Standing reminder of PingPay's defining behaviour: creating an envelope
 * does not move money.
 */
export function MoneySafetyNote({ compact }: Props) {
  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Ionicons
        name="lock-closed-outline"
        size={13}
        color={colors.textMuted}
      />
      <Text style={styles.text}>
        Your money stays in your MTN MoMo account until the recipient is
        identified.
      </Text>
    </View>
  );
}

export function HeroShell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={gradients.hero}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.shellGradient}
      />
      <View style={styles.shellBorder} pointerEvents="none" />
      {children}
    </View>
  );
}

export function HeroLabel({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.labelRow}>
      <View style={styles.labelDot} />
      <Text style={styles.label}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  shellGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  shellBorder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
  },
  labelDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  label: {
    ...type.heroLabel,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  rowCompact: {
    paddingHorizontal: 0,
  },
  text: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    flexShrink: 1,
    textAlign: 'center',
  },
});

export default MoneySafetyNote;
