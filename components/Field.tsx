import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoComplete?: 'tel' | 'password' | 'email' | 'name' | 'new-password';
  prefix?: string;
  /** Replaces the trailing eye toggle. */
  accessory?: React.ReactNode;
  onSubmitEditing?: () => void;
  /** Inline validation message shown under the input. */
  error?: string | null;
  hint?: string;
  autoCapitalize?: 'none' | 'words';
  testID?: string;
};

/** Labelled text input used across the auth screens. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoComplete,
  prefix,
  accessory,
  onSubmitEditing,
  error,
  hint,
  autoCapitalize = 'none',
  testID,
}: Props) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocused,
          error ? styles.inputWrapError : null,
        ]}
      >
        {prefix ? (
          <View style={styles.prefixWrap}>
            <Text style={styles.prefix}>{prefix}</Text>
          </View>
        ) : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="next"
          style={styles.input}
          accessibilityLabel={label}
        />
        {accessory}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/** Standard show/hide affordance for password inputs. */
export function PasswordToggle({
  secure,
  onPress,
}: {
  secure: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={secure ? 'Show password' : 'Hide password'}
    >
      <Icon name={secure ? 'eye' : 'eyeOff'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    field: {
      gap: 6,
    },
    fieldLabel: {
      ...type.caption,
      color: colors.text,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      height: 50,
      paddingHorizontal: spacing.md + 2,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    inputWrapFocused: {
      borderColor: colors.text,
    },
    inputWrapError: {
      borderColor: colors.error,
    },
    prefixWrap: {
      paddingRight: spacing.md,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    prefix: {
      ...type.bodyMedium,
      color: colors.textSecondary,
    },
    input: {
      flex: 1,
      ...type.body,
      fontSize: 16,
      color: colors.text,
      padding: 0,
      height: '100%',
    },
    error: {
      ...type.meta,
      color: colors.error,
    },
    hint: {
      ...type.meta,
      color: colors.textMuted,
    },
  });

export default Field;
