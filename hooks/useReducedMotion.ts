import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the system "Reduce Motion" setting.
 *
 * Used to damp decorative animation — pulsing auras, ground shadows, shimmer
 * effects — so the app stays calm for users who ask for less motion. Essential
 * interaction feedback (button press, slider tracking) is always kept.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduced,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}

/** Maps a nominal duration to 0 when the user prefers reduced motion. */
export function motionDuration(duration: number, reduced: boolean): number {
  return reduced ? 0 : duration;
}
