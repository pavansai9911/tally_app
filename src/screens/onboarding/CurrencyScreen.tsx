import React, { useState } from 'react';
import { View, Text, SafeAreaView, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { ProgressDots } from './ProgressDots';
import { OnboardingData } from './useOnboardingState';

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
];

export default function CurrencyScreen({
  data, update, onNext, onBack,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void }) {
  const { colors, typography, radius } = useTheme();
  const [search, setSearch] = useState('');

  const filtered = CURRENCIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Pressable onPress={onBack} style={{ padding: 16 }}>
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900, marginBottom: 6 }}>Choose your currency</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral500, marginBottom: 20 }}>
          You can change this later in settings
        </Text>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.code}
        contentContainerStyle={{ paddingHorizontal: 24 }}
        renderItem={({ item }) => {
          const selected = item.code === data.currency;
          return (
            <Pressable
              onPress={() => update({ currency: item.code, currencySymbol: item.symbol })}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                borderRadius: radius.md, backgroundColor: selected ? colors.accentTint : 'transparent', marginBottom: 4,
              }}
            >
              <Text style={{ fontSize: 20 }}>{item.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{item.name}</Text>
                <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{item.code} · {item.symbol}</Text>
              </View>
              {selected && <Feather name="check" size={20} color={colors.accent500} />}
            </Pressable>
          );
        }}
      />
      <View style={{ paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12 }}>
        <Button label="Continue" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}
