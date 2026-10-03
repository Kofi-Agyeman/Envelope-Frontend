import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { IconTile } from '@/components/ui';
import type { IconName } from '@/components/Icon';
import { radius, spacing } from '@/constants/layout';
import { fontFamily } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { haptics } from '@/utils/haptics';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
  highlighted?: boolean;
};

/** Icon-over-label shortcut, laid out in an evenly divided row. */
export function QuickAction({ icon, label, onPress, highlighted }: Props) {
  const { colors, shadows } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, shadows.card, pressed && styles.pressed]}
    >
      <IconTile
        icon={icon}
        size={40}
        color={highlighted ? colors.onPrimary : colors.text}
        background={highlighted ? colors.primary : colors.backgroundSecondary}
      />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    action: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xs,
      borderRadius: radius.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      backgroundColor: colors.surfaceMuted,
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.text,
    },
  });

export default QuickAction;
