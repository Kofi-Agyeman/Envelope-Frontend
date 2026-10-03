import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';

type Props = {
  compact?: boolean;
};

/**
 * Standing reminder of Envelope's defining behaviour: creating an envelope
 * does not move money.
 */
export function MoneySafetyNote({ compact }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <Icon name="shield" size={16} color={colors.success} strokeWidth={2} />
      <Text style={styles.text}>
        Your money stays in your MTN MoMo wallet until the recipient claims it.
      </Text>
    </View>
  );
}

/** Card that frames the create-envelope composer. */
export function HeroShell({ children }: { children: React.ReactNode }) {
  const { shadows } = useTheme();
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.shell, shadows.card]}>{children}</View>;
}

export function HeroLabel({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return <Text style={styles.label}>{children}</Text>;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    shell: {
      borderRadius: radius.xxl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: {
      ...type.overline,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.md,
      backgroundColor: colors.successMuted,
    },
    rowCompact: {
      backgroundColor: 'transparent',
      paddingHorizontal: 0,
    },
    text: {
      ...type.meta,
      fontFamily: fontFamily.medium,
      color: colors.textSecondary,
      flexShrink: 1,
    },
  });

export default MoneySafetyNote;
