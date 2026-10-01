import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { AMOUNT, currency } from '@/constants/config';
import { haptics } from '@/utils/haptics';

type Props = {
  value: number;
  onSelect: (amount: number) => void;
  presets?: readonly number[];
};

export function PresetChips({
  value,
  onSelect,
  presets = AMOUNT.presets,
}: Props) {
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
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
                !active && styles.labelIdle,
              ]}
            >
              {`${currency.code}${preset}`}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg - 2,
    paddingVertical: spacing.sm + 1,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipPressed: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  label: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  labelActive: {
    color: '#141621',
  },
  labelIdle: {
    color: colors.textSecondary,
  },
});

export default PresetChips;
