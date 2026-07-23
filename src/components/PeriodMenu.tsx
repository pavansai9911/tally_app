import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { PERIOD_OPTIONS, PeriodKey, periodLabel } from '@/utils/period';

/**
 * Compact period picker (This month / 3M / 6M / All time). The trigger adapts to a dark
 * surface (`onDark`, used on the Home hero) or a light one; the options open as a small
 * bottom sheet so no runtime anchor measuring is needed.
 */
export function PeriodMenu({
  value,
  onChange,
  variant = 'default',
}: {
  value: PeriodKey;
  onChange: (p: PeriodKey) => void;
  variant?: 'onDark' | 'default';
}) {
  const { colors, typography, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const onDark = variant === 'onDark';
  const fg = onDark ? '#FFFFFF' : colors.neutral900;
  const bg = onDark ? 'rgba(255,255,255,0.14)' : colors.neutral50;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Change period, currently ${periodLabel(value)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md }}
      >
        <Text style={{ ...typography.caption, fontWeight: '600', color: fg }}>{periodLabel(value)}</Text>
        <Feather name="chevron-down" size={13} color={fg} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.neutral200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Show</Text>
            {PERIOD_OPTIONS.map(opt => {
              const active = opt.key === value;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => { onChange(opt.key); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 }}
                >
                  <Text style={{ ...typography.bodyMedium, color: active ? colors.accent500 : colors.neutral900, fontWeight: active ? '600' : '400' }}>{opt.label}</Text>
                  {active && <Feather name="check" size={18} color={colors.accent500} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
