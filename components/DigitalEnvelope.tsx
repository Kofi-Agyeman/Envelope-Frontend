import React, { useEffect, useId } from 'react';
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
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
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
  /** 0..1 — drives glow intensity. */
  intensity?: number;
  /** Renders the wax seal on the flap. */
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

/**
 * The Envelope illustration. A flat, front-facing envelope: body, V-shaped
 * top flap, side folds and an optional seal, with a soft status-coloured
 * halo behind it. All proportions derive from `size` so it scales cleanly.
 */
export function DigitalEnvelope({
  size = 168,
  state = 'idle',
  intensity = 0.4,
  sealed = false,
  showCheck,
}: Props) {
  const { colors, statusColors, gradients, scheme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const ids = useId().replace(/:/g, '');
  const status = STATUS_FOR_STATE[state];
  const accent = status ? statusColors[status].fg : colors.primary;

  const lift = useSharedValue(0);
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0.2 + intensity * 0.3);
  const checkScale = useSharedValue(0);

  const isCreating = state === 'creating';
  const isDone = state === 'completed';
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (isCreating) {
      lift.value = withSequence(
        withSpring(1, { damping: 14, stiffness: 160 }),
        withSpring(1.2, { damping: 10, stiffness: 200 }),
        withSpring(1.1, { damping: 12, stiffness: 170 }),
      );
      if (reduceMotion) {
        glow.value = withTiming(0.7, { duration: 200 });
      } else {
        glow.value = withRepeat(
          withSequence(
            withTiming(0.9, { duration: 420, easing: Easing.out(Easing.quad) }),
            withTiming(0.35, { duration: 460, easing: Easing.in(Easing.quad) }),
          ),
          -1,
          true,
        );
      }
    } else {
      lift.value = withSpring(0, { damping: 16, stiffness: 180 });
      glow.value = withTiming(0.2 + intensity * 0.3, { duration: 240 });
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
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.quad) }),
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
    checkScale.value = shouldShow
      ? withSpring(1, { damping: 13, stiffness: 190 })
      : withTiming(0, { duration: 160 });
  }, [checkScale, isDone, showCheck]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1.2], [0, -10]) }],
  }));

  const auraOpacity = useDerivedValue(
    () => Math.min(1, glow.value * 0.9 + pulse.value * 0.3),
    [glow, pulse],
  );

  const auraScale = useDerivedValue(
    () => 0.8 + glow.value * 0.25 + pulse.value * 0.12,
    [glow, pulse],
  );

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: 0.5 + checkScale.value * 0.5 }],
  }));

  const flapStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1.2], [0, -size * 0.02]) }],
  }));

  const w = size;
  const h = size * 0.66;
  const r = size * 0.06;
  const inset = 1;
  const flapTip = h * 0.56;
  const stroke = scheme === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(18,21,28,0.10)';
  const fold = scheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(18,21,28,0.06)';
  const sealR = size * 0.085;
  const glowSize = size * 1.8;
  const muted = status === 'expired' || status === 'failed';

  return (
    <Animated.View
      style={[styles.wrapper, { width: w, height: h + size * 0.12 }, containerStyle]}
    >
      <Glow
        size={glowSize}
        color={accent}
        intensity={muted ? 0.25 : 0.45}
        opacity={auraOpacity}
        scale={auraScale}
        style={[styles.aura, { top: (h - glowSize) / 2 }]}
      />

      <View
        style={[
          styles.body,
          { width: w, height: h, borderRadius: r },
          scheme === 'dark' ? styles.bodyShadowDark : styles.bodyShadowLight,
        ]}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Defs>
            <SvgLinearGradient id={`b${ids}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={gradients.envelopeBody[0]} />
              <Stop offset="1" stopColor={gradients.envelopeBody[1]} />
            </SvgLinearGradient>
          </Defs>
          <Rect
            x={inset / 2}
            y={inset / 2}
            width={w - inset}
            height={h - inset}
            rx={r}
            fill={`url(#b${ids})`}
            stroke={stroke}
            strokeWidth={inset}
          />
          {/* Lower folds meeting under the flap. */}
          <Path d={`M ${r * 0.6} ${h - r * 0.6} L ${w / 2} ${h * 0.5}`} stroke={fold} strokeWidth={1.2} />
          <Path d={`M ${w - r * 0.6} ${h - r * 0.6} L ${w / 2} ${h * 0.5}`} stroke={fold} strokeWidth={1.2} />
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFill, flapStyle]} pointerEvents="none">
          <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Defs>
              <SvgLinearGradient id={`f${ids}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={gradients.envelopeFlap[0]} />
                <Stop offset="1" stopColor={gradients.envelopeFlap[1]} />
              </SvgLinearGradient>
            </Defs>
            <Path
              d={`M ${r} ${inset}
                  L ${w - r} ${inset}
                  Q ${w - inset} ${inset} ${w - r * 0.5} ${r * 0.9}
                  L ${w / 2 + r * 0.6} ${flapTip - r * 0.35}
                  Q ${w / 2} ${flapTip + r * 0.15} ${w / 2 - r * 0.6} ${flapTip - r * 0.35}
                  L ${r * 0.5} ${r * 0.9}
                  Q ${inset} ${inset} ${r} ${inset} Z`}
              fill={`url(#f${ids})`}
              stroke={stroke}
              strokeWidth={1}
              strokeLinejoin="round"
            />
            {sealed ? (
              <>
                <Circle cx={w / 2} cy={flapTip - sealR * 0.35} r={sealR} fill={colors.primary} />
                <Circle
                  cx={w / 2}
                  cy={flapTip - sealR * 0.35}
                  r={sealR * 0.62}
                  fill="none"
                  stroke={colors.primaryDark}
                  strokeWidth={1.2}
                />
              </>
            ) : null}
          </Svg>
        </Animated.View>

        {/* Status line along the bottom edge. */}
        {status ? (
          <View
            pointerEvents="none"
            style={[
              styles.statusLine,
              {
                left: w * 0.36,
                right: w * 0.36,
                bottom: h * 0.12,
                backgroundColor: accent,
                opacity: muted ? 0.5 : 0.9,
              },
            ]}
          />
        ) : null}

        {isDone || showCheck ? (
          <Animated.View
            style={[
              styles.check,
              {
                width: size * 0.24,
                height: size * 0.24,
                borderRadius: size,
                right: -size * 0.05,
                bottom: -size * 0.05,
                backgroundColor: colors.success,
                borderColor: colors.background,
              },
              checkStyle,
            ]}
          >
            <Svg width={size * 0.14} height={size * 0.14} viewBox="0 0 24 24">
              <Path
                d="M5 12.5 L10 17.5 L19 7.5"
                stroke="#FFFFFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const createStyles = (_colors: Palette) =>
  StyleSheet.create({
    wrapper: {
      alignItems: 'center',
    },
    aura: {
      position: 'absolute',
      alignSelf: 'center',
    },
    body: {
      overflow: 'visible',
    },
    bodyShadowLight: {
      shadowColor: '#12151C',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 6,
    },
    bodyShadowDark: {
      shadowColor: '#000',
      shadowOpacity: 0.5,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
    statusLine: {
      position: 'absolute',
      height: 3,
      borderRadius: 2,
    },
    check: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
    },
  });

export default DigitalEnvelope;
