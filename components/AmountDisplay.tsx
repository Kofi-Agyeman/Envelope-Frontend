import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { currency } from '@/constants/config';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type Props = {
  value: number;
  onCommit: (value: number) => void;
  min: number;
  max: number;
};

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, '');
  if (cleaned === '' || cleaned === '.') return null;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

/**
 * Large amount readout. Tapping swaps the display for a numeric field so the
 * amount can be typed directly instead of dragged.
 */
export function AmountDisplay({ value, onCommit, min, max }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!editing) setDraft('');
  }, [editing]);

  const beginEdit = useCallback(() => {
    haptics.light();
    setDraft(value % 1 === 0 ? String(value) : value.toFixed(2));
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [value]);

  const commit = useCallback(() => {
    const parsed = parseAmount(draft);
    setEditing(false);
    if (parsed === null) return;
    const clamped = Math.min(max, Math.max(min, parsed));
    const rounded = Math.round(clamped * 100) / 100;
    if (rounded !== value) {
      haptics.tick();
      onCommit(rounded);
    }
  }, [draft, max, min, onCommit, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatted = value % 1 === 0 ? value.toLocaleString('en-US') : value.toFixed(2);

  return (
    <Pressable
      onPress={editing ? undefined : beginEdit}
      accessibilityRole="button"
      accessibilityLabel={`Amount to send, ${currency.code} ${formatted}`}
      accessibilityHint="Double tap to type an exact amount"
      hitSlop={8}
      style={styles.pressable}
    >
      <Animated.View style={[styles.row, animatedStyle]}>
        <Text style={styles.currency}>{currency.code}</Text>

        {editing ? (
          <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)}>
            <TextInput
              ref={inputRef}
              value={draft}
              onChangeText={setDraft}
              onBlur={commit}
              onSubmitEditing={commit}
              keyboardType="decimal-pad"
              returnKeyType="done"
              selectTextOnFocus
              maxLength={7}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              accessibilityLabel="Enter amount"
            />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
            <RNAnimated.Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatted}
            </RNAnimated.Text>
          </Animated.View>
        )}
      </Animated.View>

      <View style={styles.hintRow}>
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>
            {editing ? 'Tap done to confirm' : 'Tap the amount to type'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  pressable: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 66,
  },
  currency: {
    ...type.heroAmount,
    color: colors.primary,
    marginTop: 8,
  },
  value: {
    ...type.heroAmount,
    color: colors.text,
  },
  input: {
    ...type.heroAmount,
    color: colors.text,
    padding: 0,
    paddingVertical: 0,
    minWidth: 120,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  hintRow: {
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  hintPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  hintText: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
});

export default AmountDisplay;
