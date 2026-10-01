import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AMOUNT, currency } from '@/constants/config';
import type { Palette } from '@/constants/theme';
import { useThemedStyles, useTheme } from '@/store/theme';
import { radius } from '@/constants/layout';
import { fontFamily, type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type Props = {
  value: number;
  onChange: (value: number) => void;
  onSlidingStart?: () => void;
  min?: number;
  max?: number;
  step?: number;
};

const TRACK_HEIGHT = 12;
const THUMB_SIZE = 40;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function snap(value: number, min: number, max: number, step: number) {
  'worklet';
  const stepped = Math.round((value - min) / step) * step + min;
  return clamp(stepped, min, max);
}

/** Normalised position of an amount within the range, 0..1. */
export function amountToRatio(amount: number, min: number, max: number) {
  'worklet';
  if (max === min) return 0;
  return clamp((amount - min) / (max - min), 0, 1);
}

export function AmountSlider({
  value,
  onChange,
  onSlidingStart,
  min = AMOUNT.min,
  max = AMOUNT.max,
  step = AMOUNT.step,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(amountToRatio(value, min, max));
  const isDragging = useSharedValue(0);
  const lastStepIndex = useRef(Math.round((value - min) / step));
  const dragging = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Keeps the thumb in sync when the amount changes from presets or typing.
  // Skipped mid-drag, where the gesture already owns the thumb position.
  useEffect(() => {
    if (dragging.current) return;
    const ratio = amountToRatio(value, min, max);
    if (progress.value !== ratio) {
      progress.value = withSpring(ratio, { damping: 20, stiffness: 180 });
    }
    // Re-baseline the haptics counter so the next drag ticks from where we are.
    lastStepIndex.current = Math.round((value - min) / step);
  }, [max, min, progress, step, value]);

  const emit = useCallback(
    (amount: number) => {
      if (!mounted.current) return;
      const index = Math.round((amount - min) / step);
      if (index !== lastStepIndex.current) {
        lastStepIndex.current = index;
        haptics.tick();
      }
      onChange(amount);
    },
    [min, onChange, step],
  );

  const beginDrag = useCallback(() => {
    dragging.current = true;
    haptics.light();
    onSlidingStart?.();
  }, [onSlidingStart]);

  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
          isDragging.value = withTiming(1, { duration: 120 });
          runOnJS(beginDrag)();
        })
        .onUpdate((event) => {
          const width = trackWidth.value || 1;
          const ratio = clamp(event.x / width, 0, 1);
          progress.value = ratio;
          const raw = min + ratio * (max - min);
          const snapped = snap(raw, min, max, step);
          runOnJS(emit)(snapped);
        })
        .onFinalize(() => {
          isDragging.value = withTiming(0, { duration: 180 });
          runOnJS(endDrag)();
        }),
    [beginDrag, emit, endDrag, isDragging, max, min, progress, step, trackWidth],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(400)
        .onEnd((event) => {
          const width = trackWidth.value || 1;
          const ratio = clamp(event.x / width, 0, 1);
          progress.value = withSpring(ratio, { damping: 20, stiffness: 180 });
          const raw = min + ratio * (max - min);
          runOnJS(emit)(snap(raw, min, max, step));
        }),
    [emit, max, min, progress, step, trackWidth],
  );

  const gesture = useMemo(
    () => Gesture.Exclusive(pan, tapGesture),
    [pan, tapGesture],
  );

  const fillWidth = useDerivedValue(
    () => interpolate(progress.value, [0, 1], [0, trackWidth.value]),
    [trackWidth],
  );

  const thumbLeft = useDerivedValue(
    () => interpolate(progress.value, [0, 1], [0, trackWidth.value - THUMB_SIZE]),
    [trackWidth],
  );

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.15, 1], [0.2, 0.5, 0.9]),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.primaryDark, colors.primary],
    ),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.7, 1.15]) }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  const knobStyle = useAnimatedStyle(() => ({
    left: thumbLeft.value,
    transform: [
      { scale: withSpring(isDragging.value ? 1.18 : 1, { damping: 15, stiffness: 220 }) },
    ],
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(isDragging.value ? 1.25 : 1, { damping: 15, stiffness: 220 }) },
    ],
  }));

  const accessibilityValue = {
    min: min,
    max: max,
    now: value,
    text: `${currency.code} ${value}`,
  };

  return (
    <View style={styles.wrapper}>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.hitArea}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Amount to send"
          accessibilityHint="Swipe up or down to change the amount"
          accessibilityValue={accessibilityValue}
          onLayout={(e) => {
            trackWidth.value = e.nativeEvent.layout.width;
          }}
          onAccessibilityAction={(e) => {
            const delta =
              e.nativeEvent.actionName === 'increment' ? step : -step;
            const next = clamp(value + delta, min, max);
            if (next !== value) {
              haptics.tick();
              onChange(next);
            }
          }}
          accessibilityActions={[
            { name: 'increment', label: 'Increase amount' },
            { name: 'decrement', label: 'Decrease amount' },
          ]}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.glow, glowStyle]} />

            <Animated.View style={[styles.fill, fillStyle]}>
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.fillGradient}
              />
            </Animated.View>

            <Animated.View style={[styles.knob, knobStyle]}>
              <Animated.View style={[styles.knobCore, coreStyle]} />
            </Animated.View>
          </View>
        </Animated.View>
      </GestureDetector>

      <View style={styles.bounds}>
        <Text style={styles.boundText}>{`${currency.code} ${min}`}</Text>
        <Text style={styles.boundText}>{`${currency.code} ${max}`}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  hitArea: {
    paddingVertical: 18,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    left: -6,
    top: -7,
    height: TRACK_HEIGHT + 14,
    borderRadius: radius.pill,
    opacity: 0.4,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fillGradient: {
    flex: 1,
    borderRadius: radius.pill,
  },
  knob: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobCore: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    opacity: 0.85,
  },
  bounds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  boundText: {
    ...type.meta,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
});

export default AmountSlider;
