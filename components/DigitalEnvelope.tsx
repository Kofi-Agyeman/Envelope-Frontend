import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { StatusKey } from '@/constants/theme';
import { useTheme } from '@/store/theme';

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
  /** Renders the seal on the flap. */
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
 * The Envelope illustration: a flat, front-facing envelope drawn with solid
 * fills and a single outline weight, plus a status-coloured line, an optional
 * seal and a check badge. There are no gradients, glows or drop shadows, so it
 * reads as a crisp icon on any surface. All proportions derive from `size`.
 */
export function DigitalEnvelope({
  size = 168,
  state = 'idle',
  sealed = false,
  showCheck,
}: Props) {
  const { colors, statusColors } = useTheme();
  const status = STATUS_FOR_STATE[state];
  const accent = status ? statusColors[status].fg : colors.primary;

  const lift = useSharedValue(0);
  const checkScale = useSharedValue(0);

  const isCreating = state === 'creating';
  const isDone = state === 'completed';

  useEffect(() => {
    lift.value = isCreating
      ? withSequence(
          withSpring(1, { damping: 14, stiffness: 160 }),
          withSpring(0.6, { damping: 12, stiffness: 170 }),
        )
      : withSpring(0, { damping: 16, stiffness: 180 });
    return () => cancelAnimation(lift);
  }, [isCreating, lift]);

  useEffect(() => {
    const shouldShow = showCheck ?? isDone;
    checkScale.value = shouldShow
      ? withSpring(1, { damping: 13, stiffness: 190 })
      : withTiming(0, { duration: 160 });
  }, [checkScale, isDone, showCheck]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1], [0, -10]) }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: 0.5 + checkScale.value * 0.5 }],
  }));

  const w = size;
  const h = Math.round(size * 0.66);
  const stroke = Math.max(1.5, size / 110);
  const half = stroke / 2;
  const r = size * 0.06;
  const flapTip = h * 0.56;
  const sealR = size * 0.085;
  const muted = status === 'expired' || status === 'failed';

  const flap = `M ${r} ${half}
    L ${w - r} ${half}
    Q ${w - half} ${half} ${w - r * 0.5} ${r * 0.9}
    L ${w / 2 + r * 0.6} ${flapTip - r * 0.35}
    Q ${w / 2} ${flapTip + r * 0.15} ${w / 2 - r * 0.6} ${flapTip - r * 0.35}
    L ${r * 0.5} ${r * 0.9}
    Q ${half} ${half} ${r} ${half} Z`;

  return (
    <Animated.View style={[styles.wrapper, { width: w, height: h + size * 0.12 }, liftStyle]}>
      <View style={{ width: w, height: h }}>
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <Rect
            x={half}
            y={half}
            width={w - stroke}
            height={h - stroke}
            rx={r}
            fill={colors.envelopeBody}
            stroke={colors.envelopeOutline}
            strokeWidth={stroke}
          />
          {/* Lower folds, meeting under the flap. */}
          <Path
            d={`M ${r * 0.6} ${h - r * 0.6} L ${w / 2} ${h * 0.5} L ${w - r * 0.6} ${h - r * 0.6}`}
            fill="none"
            stroke={colors.envelopeOutline}
            strokeWidth={stroke}
            strokeLinejoin="round"
            opacity={0.55}
          />
          <Path
            d={flap}
            fill={colors.envelopeFlap}
            stroke={colors.envelopeOutline}
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          {sealed ? (
            <>
              <Circle cx={w / 2} cy={flapTip - sealR * 0.35} r={sealR} fill={colors.primary} />
              <Circle
                cx={w / 2}
                cy={flapTip - sealR * 0.35}
                r={sealR * 0.6}
                fill="none"
                stroke={colors.primaryDark}
                strokeWidth={Math.max(1.2, size / 140)}
              />
            </>
          ) : null}
        </Svg>

        {/* Status line along the lower edge. */}
        {status ? (
          <View
            pointerEvents="none"
            style={[
              styles.statusLine,
              {
                left: w * 0.38,
                right: w * 0.38,
                bottom: h * 0.13,
                height: Math.max(3, size * 0.018),
                backgroundColor: accent,
                opacity: muted ? 0.55 : 1,
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
            <Svg width={size * 0.13} height={size * 0.13} viewBox="0 0 24 24">
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

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  statusLine: {
    position: 'absolute',
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
