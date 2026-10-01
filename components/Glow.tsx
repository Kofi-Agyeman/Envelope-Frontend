import React, { useId } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  /** Diameter of the glow in points. */
  size: number;
  color: string;
  /** Peak opacity at the centre, 0..1. */
  intensity?: number;
  style?: StyleProp<ViewStyle>;
  /** Optional driven scale, e.g. the envelope's pulse value. */
  scale?: SharedValue<number>;
  opacity?: SharedValue<number>;
};

/**
 * Soft radial halo used behind the envelope.
 *
 * A flat translucent circle reads as a solid disc on a dark background; a real
 * radial falloff reads as light. This keeps the glow reading as light at every
 * intensity the envelope is driven to.
 */
export function Glow({
  size,
  color,
  intensity = 0.5,
  style,
  scale,
  opacity,
}: Props) {
  const gradientId = `glow${useId().replace(/:/g, '')}`;
  const radius = size / 2;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity ? opacity.value : 1,
    transform: [{ scale: scale ? scale.value : 1 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.base, { width: size, height: size }, style, animatedStyle]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={intensity} />
            <Stop offset="40%" stopColor={color} stopOpacity={intensity * 0.45} />
            <Stop offset="70%" stopColor={color} stopOpacity={intensity * 0.12} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={radius} cy={radius} r={radius} fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Glow;
