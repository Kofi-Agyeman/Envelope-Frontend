import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AMOUNT, currency } from '@/constants/config';
import type { Palette } from '@/constants/theme';
import { useThemedStyles } from '@/store/theme';
import { radius } from '@/constants/layout';
import { type } from '@/constants/typography';
import { haptics } from '@/utils/haptics';

type Props = {
  value: number;
  onChange: (value: number) => void;
  onSlidingStart?: () => void;
  min?: number;
  max?: number;
  step?: number;
};

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 28;

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

  const thumbLeft = useDerivedValue(
    () => interpolate(progress.value, [0, 1], [0, trackWidth.value - THUMB_SIZE]),
    [trackWidth],
  );

  // The fill ends under the thumb's centre rather than its leading edge.
  const fillStyle = useAnimatedStyle(() => ({
    width: Math.max(0, thumbLeft.value + THUMB_SIZE / 2),
  }));

  const knobStyle = useAnimatedStyle(() => ({
    left: thumbLeft.value,
    transform: [
      { scale: withSpring(isDragging.value ? 1.12 : 1, { damping: 15, stiffness: 220 }) },
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
            <Animated.View style={[styles.fill, fillStyle]} />
            <Animated.View style={[styles.knob, knobStyle]}>
              <View style={styles.knobCore} />
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
      paddingVertical: 14,
      justifyContent: 'center',
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: radius.pill,
      backgroundColor: colors.backgroundSecondary,
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      left: 0,
      height: TRACK_HEIGHT,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    knob: {
      position: 'absolute',
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    knobCore: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    bounds: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    boundText: {
      ...type.meta,
      color: colors.textMuted,
    },
  });

export default AmountSlider;
