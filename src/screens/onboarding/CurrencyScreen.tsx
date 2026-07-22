import React from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { CURRENCIES } from '@/utils/currency';
import { OnboardingData } from './useOnboardingState';

/**
 * Currency picker. The list comes from CURRENCIES in utils/currency.ts — adding a new
 * currency there automatically shows up here (and in Settings) with correct formatting.
 */
export default function CurrencyScreen({
  data, update, onNext, onBack,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void }) {
  const { colors, typography, radius } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <Pressable onPress={onBack} style={{ padding: 16 }} accessibilityLabel="Back">
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900, marginBottom: 6 }}>Choose your currency</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral500, marginBottom: 20 }}>
          All amounts will be shown in this currency. You can change it later in Settings.
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 12 }}>
        {CURRENCIES.map((c) => {
          const selected = c.code === data.currency;
          return (
            <Pressable
              key={c.code}
              onPress={() => update({ currency: c.code, currencySymbol: c.symbol })}
              accessibilityLabel={`${c.name} (${c.code})`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 10,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: selected ? colors.accent500 : colors.surfaceBorder,
                backgroundColor: selected ? colors.accentTint : 'transparent',
              }}
            >
              <Text style={{ fontSize: 26 }}>{c.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{c.name}</Text>
                <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{c.code} · {c.symbol}</Text>
              </View>
              {selected && <Feather name="check-circle" size={20} color={colors.accent500} />}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: 36, paddingTop: 8 }}>
        <Button label="Continue" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}
