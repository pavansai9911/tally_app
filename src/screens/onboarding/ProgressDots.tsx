import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function ProgressDots({ total, current }: { total: number; current: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === current ? colors.accent500 : colors.neutral200,
          }}
        />
      ))}
    </View>
  );
}
