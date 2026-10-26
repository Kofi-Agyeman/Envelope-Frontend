import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
} from 'react-native';

/**
 * ScrollView that keeps the focused TextInput above the on-screen keyboard.
 * Use it for any screen that contains a text field.
 *
 * - iOS: the native scroll view insets its content by the keyboard's height
 *   and scrolls the focused input into view (`automaticallyAdjustKeyboardInsets`).
 *   A KeyboardAvoidingView is deliberately not used: it only shrinks the
 *   scroll view, and UIScrollView does not follow the focused input, so the
 *   lower fields of a long form end up off-screen.
 * - Android: the app is edge-to-edge (`edgeToEdgeEnabled`), so the OS no
 *   longer resizes the window for the keyboard and `adjustResize` alone leaves
 *   the inputs covered. A padding KeyboardAvoidingView shrinks the scroll view
 *   instead, and Android's ScrollView scrolls the focused input back into view
 *   when its height changes.
 * - Web: the browser already scrolls focused inputs into view.
 */
export function KeyboardSafeScrollView({ style, ...props }: ScrollViewProps) {
  const scrollView = <ScrollView automaticallyAdjustKeyboardInsets {...props} style={style} />;

  if (Platform.OS !== 'android') return scrollView;

  // The padding area sits behind the keyboard; match the screen colour so the
  // keyboard's open/close animation does not flash a different background.
  const backgroundColor = StyleSheet.flatten(style)?.backgroundColor;

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.fill, { backgroundColor }]}>
      {scrollView}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});

export default KeyboardSafeScrollView;
