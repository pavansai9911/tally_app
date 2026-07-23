import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export interface TabColor {
  /** Selected-highlight background for this tab. */
  bg: string;
  /** Selected-label colour for this tab. */
  fg: string;
}

/**
 * Segmented tabs whose highlight and label colours follow the swipe in real time.
 *
 * The pager's horizontal scroll offset drives an interpolated sliding highlight and the
 * label colours, so dragging the pages halfway shows the indicator halfway — a smooth,
 * finger-following transition rather than an instant switch. Tapping a tab animates to it.
 *
 * Pure JS (paging ScrollView), so no native pager dependency. Only pages horizontally, so
 * each page keeps its own vertical scroll without gesture conflicts.
 */
export function SwipeTabs({
  labels,
  index,
  onIndexChange,
  children,
  tabColors,
  headerStyle,
}: {
  labels: string[];
  index: number;
  onIndexChange: (i: number) => void;
  children: React.ReactNode;
  /** Optional per-tab colours (e.g. Expense red / Income green). Defaults to a dark pill. */
  tabColors?: TabColor[];
  headerStyle?: ViewStyle;
}) {
  const { colors, typography, radius } = useTheme();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const currentRef = useRef(index);
  const scrollX = useRef(new Animated.Value(index * width)).current;
  const [headerW, setHeaderW] = useState(0);

  const N = labels.length;
  const pages = React.Children.toArray(children);
  const colOf = (i: number): TabColor => tabColors?.[i] ?? { bg: colors.neutral900, fg: colors.neutral0 };

  // Keep the pager in sync when the tab is changed externally (tapped).
  useEffect(() => {
    if (currentRef.current !== index) {
      currentRef.current = index;
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    }
  }, [index, width]);

  const seg = headerW > 0 ? (headerW - 8) / N : 0;
  const position = Animated.divide(scrollX, width); // 0 .. N-1

  const highlightBg = tabColors
    ? scrollX.interpolate({
        inputRange: labels.map((_, i) => i * width),
        outputRange: labels.map((_, i) => colOf(i).bg),
        extrapolate: 'clamp',
      })
    : colors.neutral900;

  return (
    <>
      <View
        onLayout={(e) => setHeaderW(e.nativeEvent.layout.width)}
        style={[
          { flexDirection: 'row', backgroundColor: colors.neutral50, borderRadius: radius.xl, padding: 4, marginHorizontal: 24, marginBottom: 12 },
          headerStyle,
        ]}
      >
        {headerW > 0 && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: 4,
              width: seg,
              borderRadius: radius.lg,
              backgroundColor: highlightBg as unknown as string,
              transform: [{ translateX: Animated.multiply(position, seg) }],
            }}
          />
        )}
        {labels.map((label, i) => {
          const color = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [colors.neutral500, colOf(i).fg, colors.neutral500],
            extrapolate: 'clamp',
          });
          return (
            <Pressable
              key={label}
              onPress={() => onIndexChange(i)}
              accessibilityRole="tab"
              accessibilityLabel={label}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', zIndex: 1 }}
            >
              <Animated.Text style={{ ...typography.bodySmallMedium, color: color as unknown as string }}>
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        // Open on the right page when a screen mounts at a non-zero tab (e.g. editing an
        // income/transfer). Only applied on mount; later tab changes scroll via the effect.
        contentOffset={{ x: index * width, y: 0 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={(e) => {
          const next = Math.round(e.nativeEvent.contentOffset.x / width);
          if (next !== currentRef.current) {
            currentRef.current = next;
            onIndexChange(next);
          }
        }}
        style={{ flex: 1 }}
      >
        {pages.map((child, i) => (
          <View key={i} style={{ width }}>
            {child}
          </View>
        ))}
      </ScrollView>
    </>
  );
}
