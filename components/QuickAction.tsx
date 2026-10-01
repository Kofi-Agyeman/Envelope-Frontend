import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Icon, type IconName } from '@/components/Icon';
import { radius, spacing } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { haptics } from '@/utils/haptics';

type Props = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

export function QuickAction({ icon, label, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const pressed = useSharedValue(0);

  useEffect(() => {
    if (pressed.value === 0) return;
    pressed.value = withSpring(0, { damping: 14, stiffness: 240 });
  }, [pressed]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.04 }],
  }));

  return (
    <Animated.View style={style}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => {
          pressed.value = withSpring(1, { damping: 14, stiffness: 240 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { damping: 14, stiffness: 240 });
        }}
        style={styles.action}
      >
        <View style={styles.iconCircle}>
          <Icon name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    action: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      backgroundColor: colors.primaryFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...type.caption,
      fontFamily: fontFamily.semibold,
      color: colors.text,
      flexShrink: 1,
    },
  });

export default QuickAction;