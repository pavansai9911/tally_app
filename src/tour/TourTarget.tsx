import React, { useEffect, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTour } from './TourProvider';

/**
 * Wrap any element to make it spotlight-able by the product tour.
 *
 * Position is measured at runtime with measureInWindow, so highlights stay correct on any
 * screen size, density or orientation — nothing is hard-coded.
 */
export function TourTarget({
  id,
  children,
  style,
}: {
  id: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { registerTarget, unregisterTarget } = useTour();
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTarget(id, {
      measure: (cb) => {
        const node = ref.current;
        if (!node) { cb(null); return; }
        node.measureInWindow((x, y, width, height) => {
          if (width === 0 && height === 0) cb(null);
          else cb({ x, y, width, height });
        });
      },
    });
    return () => unregisterTarget(id);
  }, [id, registerTarget, unregisterTarget]);

  // collapsable={false} keeps the view in the native hierarchy so it can be measured.
  return (
    <View ref={ref} collapsable={false} style={style}>
      {children}
    </View>
  );
}
