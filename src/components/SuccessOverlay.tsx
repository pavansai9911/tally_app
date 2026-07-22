import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Lightweight success confirmation (the "PhonePe / GPay" moment).
 *
 * A circle springs in, the tick pops, the label fades up, then it auto-dismisses. Uses the
 * built-in Animated API with useNativeDriver, so it runs on the UI thread and can't drop
 * frames on the JS thread. Deliberately short (~900ms) so it never blocks the user.
 */
export function SuccessOverlay({
  visible,
  message = 'Saved',
  onDone,
  // Long enough that the tick finishes animating (~360ms) and the user registers the
  // confirmation before it disappears. Previously 900ms, which felt cut off.
  duration = 2200,
}: {
  visible: boolean;
  message?: string;
  onDone?: () => void;
  duration?: number;
}) {
  const { colors, typography } = useTheme();
  const scale = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0);
      tick.setValue(0);
      fade.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      ]),
      Animated.timing(tick, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(2)),
        useNativeDriver: true,
      }),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onDone?.());
    }, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDone, scale, tick, fade]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => onDone?.()}>
      <Animated.View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceOverlay,
          opacity: fade,
        }}
      >
        <Animated.View
          style={{
            width: 132,
            height: 132,
            borderRadius: 66,
            backgroundColor: colors.surfaceCard,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale }],
          }}
        >
          <Animated.View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: colors.incomeTint,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: tick }],
            }}
          >
            <Feather name="check" size={34} color={colors.income} />
          </Animated.View>
          <Animated.Text
            style={{
              ...typography.bodySmallMedium,
              color: colors.neutral900,
              marginTop: 12,
              opacity: tick,
            }}
          >
            {message}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/**
 * Subtle entrance animation for cards / list content: fades in while easing up a few
 * pixels. `trigger` restarts it (e.g. when the tab or data set changes).
 */
export function FadeInView({
  children,
  trigger,
  offset = 12,
  duration = 260,
  style,
}: {
  children: React.ReactNode;
  trigger?: unknown;
  offset?: number;
  duration?: number;
  style?: any;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [trigger, duration, progress]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
