import React, { useState } from 'react';
import { Modal, Pressable, Text, View, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { mapIcon } from '@/utils/iconMap';

export interface AccountOption {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/**
 * Compact account picker for the Home hero ("All accounts" + each account). Mirrors PeriodMenu:
 * a small pill trigger (adapts to a dark surface) that opens a bottom-sheet list.
 */
export function AccountMenu({
  accounts,
  value,
  onChange,
  variant = 'default',
}: {
  accounts: AccountOption[];
  value: string | null; // null = All accounts
  onChange: (id: string | null) => void;
  variant?: 'onDark' | 'default';
}) {
  const { colors, typography, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const onDark = variant === 'onDark';
  const fg = onDark ? '#FFFFFF' : colors.neutral900;
  const bg = onDark ? 'rgba(255,255,255,0.14)' : colors.neutral50;

  const selected = value ? accounts.find(a => a.id === value) : null;
  const label = selected ? selected.name : 'All accounts';

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter by account, currently ${label}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.md, flexShrink: 1, minWidth: 0 }}
      >
        <Feather name="credit-card" size={12} color={fg} />
        <Text numberOfLines={1} ellipsizeMode="tail" style={{ ...typography.caption, fontWeight: '600', color: fg, flexShrink: 1, minWidth: 0 }}>{label}</Text>
        <Feather name="chevron-down" size={13} color={fg} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.45)', justifyContent: 'flex-end' }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, maxHeight: '70%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.neutral200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 }}>Account</Text>
            <ScrollView>
              <AccountRow name="All accounts" active={value === null} onPress={() => { onChange(null); setOpen(false); }} colors={colors} typography={typography} />
              {accounts.map(a => (
                <AccountRow
                  key={a.id}
                  name={a.name}
                  icon={a.icon}
                  color={a.color}
                  active={value === a.id}
                  onPress={() => { onChange(a.id); setOpen(false); }}
                  colors={colors}
                  typography={typography}
                />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function AccountRow({ name, icon, color, active, onPress, colors, typography }: {
  name: string; icon?: string; color?: string; active: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; typography: ReturnType<typeof useTheme>['typography'];
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: (color ?? colors.neutral400) + '22', alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon ? mapIcon(icon) : 'layers'} size={16} color={color ?? colors.neutral500} />
      </View>
      <Text style={{ flex: 1, ...typography.bodyMedium, color: active ? colors.accent500 : colors.neutral900, fontWeight: active ? '600' : '400' }} numberOfLines={1}>{name}</Text>
      {active && <Feather name="check" size={18} color={colors.accent500} />}
    </Pressable>
  );
}
