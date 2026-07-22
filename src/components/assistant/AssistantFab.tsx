import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeProvider';
import { haptic } from '@/utils/haptics';

/** Sparkle/assistant glyph — deliberately not a "+" so it reads as AI, not "add". */
function AssistantGlyph({ size = 26, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Large four-point sparkle */}
      <Path
        d="M12 3.2l1.5 4.4a4 4 0 0 0 2.5 2.5l4.4 1.5-4.4 1.5a4 4 0 0 0-2.5 2.5L12 20l-1.5-4.4a4 4 0 0 0-2.5-2.5L3.6 11.6l4.4-1.5a4 4 0 0 0 2.5-2.5L12 3.2z"
        fill={color}
      />
      {/* Small accent sparkles */}
      <Circle cx="18.6" cy="5.6" r="1.5" fill={color} opacity={0.9} />
      <Circle cx="5.6" cy="18.2" r="1.1" fill={color} opacity={0.75} />
    </Svg>
  );
}

/**
 * Home-screen assistant FAB. Sits above the bottom tab bar so it never covers content or
 * the navigation bar, and gently pulses once on mount to invite discovery.
 */
export function AssistantFab({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 600, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [pulse]);

  return (
    <View style={{ position: 'absolute', right: 20, bottom: 20 }} pointerEvents="box-none">
      {/* Halo */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -8, top: -8, right: -8, bottom: -8,
          borderRadius: 40,
          backgroundColor: colors.accent500,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.22] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }],
        }}
      />
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }) }] }}>
        <Pressable
          onPressIn={() => Animated.timing(press, { toValue: 1, duration: 90, useNativeDriver: true }).start()}
          onPressOut={() => Animated.timing(press, { toValue: 0, duration: 120, useNativeDriver: true }).start()}
          onPress={() => { haptic('impactLight'); onPress(); }}
          accessibilityRole="button"
          accessibilityLabel="Open Tally Assistant"
          style={{
            width: 58, height: 58, borderRadius: 29,
            backgroundColor: colors.accent500,
            alignItems: 'center', justifyContent: 'center',
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 }, elevation: 7,
          }}
        >
          <AssistantGlyph />
        </Pressable>
      </Animated.View>
    </View>
  );
}
