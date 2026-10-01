import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  testID,
}: Props) {
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          autoCapitalize="none"
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
    gap: spacing.sm,
  },
  fieldLabel: {
    ...type.meta,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 54,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputWrapFocused: {
    borderColor: colors.primary,
  },
  prefix: {
    ...type.bodyMedium,
    color: colors.textMuted,
  },
  input: {
    flex: 1,
    ...type.body,
    fontSize: 16,
    color: colors.text,
padding: 0,
  },
  });

export default Field;
