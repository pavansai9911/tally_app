import React, { useEffect, useRef } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

/**
 * Horizontally swipeable tab content.
 *
 * Each child becomes one full-width page. Swiping left/right reports the new index via
 * `onIndexChange`; changing `index` externally (i.e. tapping a tab) animates to that page,
 * so taps and swipes stay in sync.
 *
 * Implemented with a paging ScrollView rather than a native pager so no extra native
 * dependency is introduced. Because this only pages horizontally, each page is free to
 * host its own vertical ScrollView — the gestures never fight (different axes).
 */
export function SwipeTabView({
  index,
  onIndexChange,
  children,
}: {
  index: number;
  onIndexChange: (i: number) => void;
  children: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  // Tracks the page actually shown, so a programmatic scroll doesn't echo back as a change.
  const currentRef = useRef(index);

  useEffect(() => {
    if (currentRef.current !== index) {
      currentRef.current = index;
      scrollRef.current?.scrollTo({ x: index * width, animated: true });
    }
  }, [index, width]);

  const pages = React.Children.toArray(children);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
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
  );
}
