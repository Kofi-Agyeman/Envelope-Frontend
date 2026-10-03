import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { currency } from '@/constants/config';
import { spacing } from '@/constants/layout';
import { fontFamily, tabularNums, type } from '@/constants/typography';
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
      <View style={styles.row}>
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
          <Text
            style={styles.value}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatted}
          </Text>
        )}
      </View>

      <Text style={styles.hintText}>
        {editing ? 'Press return to confirm' : 'Tap amount to edit'}
      </Text>
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
      gap: 6,
      minHeight: 56,
    },
    currency: {
      fontFamily: fontFamily.semibold,
      fontSize: 20,
      lineHeight: 24,
      color: colors.textMuted,
      marginTop: 9,
    },
    value: {
      ...type.heroAmount,
      ...tabularNums,
      color: colors.text,
    },
    input: {
      ...type.heroAmount,
      ...tabularNums,
      color: colors.text,
      padding: 0,
      paddingVertical: 0,
      minWidth: 110,
      maxWidth: 200,
      textAlign: 'center',
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    hintText: {
      ...type.meta,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
  });

export default AmountDisplay;
