import React, { useEffect } from 'react';
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
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
  loadingLabel?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  loadingLabel,
  icon,
  style,
  accessibilityHint,
}: Props) {
  const { gradients, colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pressed = useSharedValue(0);

  useEffect(() => {
    if (!disabled && !loading) pressed.value = withSpring(0, { damping: 16 });
  }, [disabled, loading, pressed]);

  const isPrimary = variant === 'primary';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateScale(pressed.value) }],
    opacity: disabled ? 0.45 : 1,
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: pressed.value * (isPrimary ? 0.22 : 0.08),
    backgroundColor: isPrimary ? colors.primaryDark : colors.text,
  }));

  const handlePress = () => {
    if (disabled || loading) return;
    haptics.medium();
    onPress();
  };

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        onPressIn={() => {
          pressed.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { damping: 14, stiffness: 260 });
        }}
        style={styles.pressable}
      >
        {isPrimary ? (
          <LinearGradient
            colors={gradients.primaryButton as unknown as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fill}
          />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[styles.pressTint, dimStyle]}
        />

        <View
          style={[
            styles.content,
            variant === 'secondary' && styles.secondary,
            variant === 'ghost' && styles.ghost,
          ]}
        >
          {loading ? (
            <ActivityIndicator
              color={isPrimary ? colors.onPrimary : colors.primary}
              size="small"
            />
          ) : (
            icon
          )}
          <Text
            style={[
              styles.label,
              isPrimary && styles.labelPrimary,
              variant === 'secondary' && styles.labelSecondary,
              variant === 'ghost' && styles.labelGhost,
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

function interpolateScale(pressed: number) {
  'worklet';
  return 1 - pressed * 0.025;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  pressable: {
    height: 58,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  fill: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  pressTint: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  label: {
    ...type.button,
    color: colors.onPrimary,
  },
  labelPrimary: {
    color: colors.onPrimary,
  },
  labelSecondary: {
    color: colors.text,
  },
  labelGhost: {
    color: colors.textSecondary,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.2,
  },
});

export default PrimaryButton;
