import React, { useEffect } from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { OnboardingData } from './useOnboardingState';

/**
 * v1 ships India-only (₹ INR). Rather than a picker that wouldn't affect formatting, this is a
 * simple confirmation step so the flow (and the 5-step progress) stays intact.
 */
export default function CurrencyScreen({
  data, update, onNext, onBack,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void }) {
  const { colors, typography, radius } = useTheme();

  useEffect(() => {
    update({ currency: 'INR', currencySymbol: '₹' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <Pressable onPress={onBack} style={{ padding: 16 }} accessibilityLabel="Back">
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900, marginBottom: 6 }}>Your currency</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral500, marginBottom: 24 }}>
          Tally is set up for Indian Rupees
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.accent500, backgroundColor: colors.accentTint }}>
          <Text style={{ fontSize: 26 }}>🇮🇳</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Indian Rupee</Text>
            <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>INR · ₹</Text>
          </View>
          <Feather name="check-circle" size={20} color={colors.accent500} />
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 36, paddingTop: 12 }}>
        <Button label="Continue" onPress={onNext} />
      </View>
    </SafeAreaView>
  );
}
