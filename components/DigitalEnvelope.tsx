import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Glow } from '@/components/Glow';
import type { Palette, StatusKey } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type EnvelopeVisualState =
  | 'idle'
  | 'selected'
  | 'creating'
  | EnvelopeVisualStatus;

export type EnvelopeVisualStatus =
  | 'waiting'
  | 'claimed'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired';

type Props = {
  size?: number;
  state?: EnvelopeVisualState;
  /** 0..1 — drives scale, glow intensity and accent weight. */
  intensity?: number;
  /** Renders the wax seal. */
  sealed?: boolean;
  /** Renders the checkmark badge for completed envelopes. */
  showCheck?: boolean;
};

const STATUS_FOR_STATE: Partial<Record<EnvelopeVisualState, StatusKey>> = {
  waiting: 'waiting',
  claimed: 'claimed',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  expired: 'expired',
};

export function DigitalEnvelope({
  size = 168,
  state = 'idle',
  intensity = 0.4,
  sealed = false,
  showCheck,
}: Props) {
  const { colors, statusColors, gradients } = useTheme();
  const styles = useThemedStyles(createStyles);
  const status = STATUS_FOR_STATE[state];
  const accent = status ? statusColors[status].fg : colors.primary;

  const lift = useSharedValue(0);
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0.25 + intensity * 0.35);
  const checkScale = useSharedValue(0);

  const isCreating = state === 'creating';
  const isDone = state === 'completed';
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isCreating) {
      lift.value = withSequence(
        withSpring(1, { damping: 14, stiffness: 160 }),
        withSpring(1.22, { damping: 10, stiffness: 200 }),
        withSpring(1.12, { damping: 12, stiffness: 170 }),
      );
      if (reduceMotion) {
        glow.value = withTiming(0.8, { duration: 200 });
      } else {
        glow.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) }),
            withTiming(0.4, { duration: 420, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          true,
        );
      }
    } else {
      lift.value = withSpring(0, { damping: 16, stiffness: 180 });
      glow.value = 0.25 + intensity * 0.35;
    }
    return () => {
      cancelAnimation(lift);
      cancelAnimation(glow);
    };
  }, [glow, intensity, isCreating, lift, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      pulse.value = withTiming(0, { duration: 120 });
      return;
    }
    if (status === 'processing' || status === 'claimed') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      pulse.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion, status]);

  useEffect(() => {
    const shouldShow = showCheck ?? isDone;
    if (shouldShow) {
      checkScale.value = withSpring(1, { damping: 13, stiffness: 190 });
    } else {
      checkScale.value = withTiming(0, { duration: 160 });
    }
  }, [checkScale, isDone, showCheck]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1.22], [0, -14]) }],
  }));

  const auraOpacity = useDerivedValue(
    () => Math.min(1, glow.value * 0.85 + pulse.value * 0.35),
    [glow, pulse],
  );

  const auraScale = useDerivedValue(
    () => 0.78 + glow.value * 0.3 + pulse.value * 0.16,
    [glow, pulse],
  );

  const pulseRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 0]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.75, 1.35]) }],
  }));

  const sealStyle = useAnimatedStyle(() => {
    const progress = sealed ? 1 : 0;
    return {
      opacity: progress,
      transform: [{ scale: 0.4 + progress * 0.6 }],
    };
  });

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: 0.5 + checkScale.value * 0.5 }],
  }));

  const flapStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(lift.value, [0, 1.2], [0, -size * 0.045]),
      },
    ],
  }));

  const intensityScale = 1 + intensity * 0.05;
  const bodyWidth = size;
  const bodyHeight = size * 0.68;

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: intensityScale * (1 + lift.value * 0.06) },
    ],
  }));

  const glowSize = size * 1.9;
  const glowTop = (size * 0.92 - glowSize) / 2;

  return (
    <Animated.View
      style={[styles.wrapper, { width: size, height: size * 0.92 }, containerStyle]}
    >
      <Glow
        size={glowSize}
        color={accent}
        intensity={0.62}
        opacity={auraOpacity}
        scale={auraScale}
        style={[styles.aura, { top: glowTop }]}
      />

      {status === 'processing' || status === 'claimed' ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulseRing,
            {
              width: size * 1.1,
              height: size * 0.85,
              borderRadius: size,
              borderColor: accent,
            },
            pulseRingStyle,
          ]}
        />
      ) : null}

<Animated.View style={[styles.bodyWrap, { width: bodyWidth }, bodyStyle]}>
        {/* Base body — a single flat SVG layer. */}
        <Svg
          width={bodyWidth}
          height={bodyHeight + size * 0.09}
          viewBox={`0 0 ${bodyWidth} ${bodyHeight + size * 0.09}`}
        >
          <Defs>
            <SvgLinearGradient id="envBody" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradients.envelopeBody[0]} />
              <Stop offset="1" stopColor={gradients.envelopeBody[1]} />
            </SvgLinearGradient>
          </Defs>

          <Rect
            x={2}
            y={6}
            width={bodyWidth - 4}
            height={bodyHeight}
            rx={size * 0.07}
            ry={size * 0.07}
            fill="url(#envBody)"
            stroke={colors.borderStrong}
            strokeWidth={1}
          />
        </Svg>

        {/* Flap — animates independently of the body, so it is a sibling layer. */}
        <Animated.View style={[styles.flap, flapStyle]} pointerEvents="none">
          <Svg
            width={bodyWidth}
            height={bodyHeight}
            viewBox={`0 0 ${bodyWidth} ${bodyHeight}`}
          >
            <Defs>
              <SvgLinearGradient id="envFlap" x1="0.5" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor={gradients.envelopeFlap[0]} />
                <Stop offset="1" stopColor={gradients.envelopeFlap[1]} />
              </SvgLinearGradient>
            </Defs>

            <Path
              d={`M ${size * 0.06} ${bodyHeight + 2}
                  L ${bodyWidth / 2} ${bodyHeight * 0.28}
                  L ${bodyWidth - size * 0.06} ${bodyHeight + 2} Z`}
              fill="url(#envFlap)"
              stroke={colors.borderStrong}
              strokeWidth={1}
            />
            <Path
              d={`M ${size * 0.1} ${bodyHeight + 1}
                  L ${bodyWidth / 2} ${bodyHeight * 0.4}`}
              stroke={colors.border}
              strokeWidth={1}
            />
            <Path
              d={`M ${bodyWidth - size * 0.1} ${bodyHeight + 1}
                  L ${bodyWidth / 2} ${bodyHeight * 0.4}`}
              stroke={colors.border}
              strokeWidth={1}
            />
          </Svg>
        </Animated.View>

        {/* Accent rule — weight tracks the selected amount. */}
        <View
          pointerEvents="none"
          style={[styles.accentRule, { top: bodyHeight * 0.62 }]}
        >
          <View
            style={{
              width: bodyWidth * (0.24 + intensity * 0.2),
              height: 3,
              borderRadius: 3,
              overflow: 'hidden',
              opacity: 0.3 + intensity * 0.5,
            }}
          >
            <LinearGradient
              colors={[accent + '00', accent, accent + '00']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.accentRuleGradient}
            />
          </View>
        </View>

        {sealed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.seal,
              {
                width: size * 0.19,
                height: size * 0.19,
                borderRadius: size,
                top: bodyHeight * 0.42 - size * 0.095,
                left: bodyWidth / 2 - size * 0.095,
                backgroundColor: gradients.envelopeSeal[0],
              },
              sealStyle,
            ]}
          />
        ) : null}

        {isDone || showCheck ? (
          <Animated.View
            style={[
              styles.check,
              {
                width: size * 0.3,
                height: size * 0.3,
                borderRadius: size,
                right: -size * 0.04,
                bottom: bodyHeight * 0.02,
                backgroundColor: colors.success,
              },
              checkStyle,
            ]}
          >
            <Svg width={size * 0.3} height={size * 0.3} viewBox="0 0 24 24">
              <Path
                d="M5 12.5 L10 17.5 L19 7.5"
                stroke="#06210F"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>

      <View
        pointerEvents="none"
        style={[
          styles.groundShadow,
          {
            width: bodyWidth * 0.72,
            height: size * 0.05,
            borderRadius: size,
            opacity: 0.5 - intensity * 0.18,
          },
        ]}
      />
    </Animated.View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
    alignSelf: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  bodyWrap: {
    alignItems: 'center',
  },
  flap: {
    position: 'absolute',
    top: 6,
    left: 0,
  },
  accentRule: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  accentRuleGradient: {
    flex: 1,
    borderRadius: 3,
  },
  seal: {
    position: 'absolute',
    shadowColor: colors.primary,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  check: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.success,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  groundShadow: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#000',
  },
});

export default DigitalEnvelope;
