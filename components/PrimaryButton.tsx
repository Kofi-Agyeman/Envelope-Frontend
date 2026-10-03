import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  loadingLabel?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

/**
 * The one button used for every call to action. Solid fills, sentence-case
 * labels and a small press scale; no gradients, so it reads as a control
 * rather than a decoration.
 */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'lg',
  loadingLabel,
  icon,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pressed = useSharedValue(0);
  const inactive = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
  }));

  const handlePress = () => {
    if (inactive) return;
    haptics.medium();
    onPress();
  };

  const spinnerColor = variant === 'primary' ? colors.onPrimary : colors.text;

  return (
    <Animated.View style={[styles.wrap, animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        onPressIn={() => {
          pressed.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { damping: 16, stiffness: 320 });
        }}
        style={({ pressed: isPressed }) => [
          styles.base,
          size === 'md' && styles.baseMd,
          variant === 'primary' && styles.primary,
          variant === 'secondary' && styles.secondary,
          variant === 'ghost' && styles.ghost,
          isPressed && variant === 'primary' && styles.primaryPressed,
          isPressed && variant !== 'primary' && styles.neutralPressed,
          disabled && !loading && variant === 'primary' && styles.primaryDisabled,
          disabled && !loading && variant !== 'primary' && styles.neutralDisabled,
        ]}
      >
        <View style={styles.content}>
          {loading ? <ActivityIndicator color={spinnerColor} size="small" /> : icon}
          <Text
            style={[
              styles.label,
              size === 'md' && styles.labelMd,
              variant === 'primary' && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
              disabled && !loading && variant === 'primary' && styles.labelDisabled,
            ]}
            numberOfLines={1}
          >
            {loading && loadingLabel ? loadingLabel : label}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    wrap: {
      alignSelf: 'stretch',
    },
    base: {
      height: 54,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    baseMd: {
      height: 46,
      borderRadius: radius.md,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    primaryPressed: {
      backgroundColor: colors.primaryDark,
    },
    primaryDisabled: {
      backgroundColor: colors.backgroundSecondary,
    },
    secondary: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    neutralPressed: {
      backgroundColor: colors.backgroundSecondary,
    },
    neutralDisabled: {
      opacity: 0.5,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    label: {
      ...type.button,
      color: colors.onPrimary,
    },
    labelMd: {
      fontSize: 15,
    },
    labelPrimary: {
      color: colors.onPrimary,
    },
    labelSecondary: {
      color: colors.text,
    },
    labelGhost: {
      color: colors.textSecondary,
      fontFamily: fontFamily.medium,
    },
    labelDisabled: {
      color: colors.textMuted,
    },
  });

export default PrimaryButton;
