import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Palette } from '@/constants/theme';
import { useThemedStyles } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, tabularNums } from '@/constants/typography';
import { AMOUNT, currency } from '@/constants/config';
import { haptics } from '@/utils/haptics';

type Props = {
  value: number;
  onSelect: (amount: number) => void;
  presets?: readonly number[];
};

/** One evenly divided row of quick amounts. */
export function PresetChips({
  value,
  onSelect,
  presets = AMOUNT.presets,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      {presets.map((preset) => {
        const active = preset === value;
        return (
          <Pressable
            key={preset}
            onPress={() => {
              haptics.light();
              onSelect(preset);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Set amount to ${currency.code} ${preset}`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && styles.chipPressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{preset}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    chip: {
      flex: 1,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    chipPressed: {
      backgroundColor: colors.backgroundSecondary,
    },
    label: {
      fontFamily: fontFamily.semibold,
      fontSize: 14,
      ...tabularNums,
      color: colors.textSecondary,
    },
    labelActive: {
      color: colors.background,
    },
  });

export default PresetChips;
