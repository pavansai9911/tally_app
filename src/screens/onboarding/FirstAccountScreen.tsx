import React from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input } from '@/components/ui';
import { OnboardingData } from './useOnboardingState';

const TYPES: Array<{ key: OnboardingData['accountType']; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { key: 'cash', label: 'Cash', icon: 'dollar-sign' },
  { key: 'bank', label: 'Bank', icon: 'home' },
  { key: 'card', label: 'Card', icon: 'credit-card' },
  { key: 'wallet', label: 'Wallet', icon: 'briefcase' },
];

export default function FirstAccountScreen({
  data, update, onNext, onBack,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void }) {
  const { colors, typography, radius } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Pressable onPress={onBack} style={{ padding: 16 }}>
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ flex: 1, paddingHorizontal: 24 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900, marginBottom: 6 }}>Add your first account</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral500, marginBottom: 24 }}>
          This is where your transactions will live, like a wallet or bank account
        </Text>

        <Input label="Account name" value={data.accountName} onChangeText={t => update({ accountName: t })} focused />

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>
          Account type
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {TYPES.map(t => {
            const selected = t.key === data.accountType;
            return (
              <Pressable
                key={t.key}
                onPress={() => update({ accountType: t.key })}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16,
                  borderRadius: radius.md, backgroundColor: selected ? colors.accent500 : colors.neutral50,
                }}
              >
                <Feather name={t.icon} size={16} color={selected ? '#FFFFFF' : colors.neutral600} />
                <Text style={{ ...typography.bodySmallMedium, color: selected ? '#FFFFFF' : colors.neutral600 }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Starting balance"
          value={data.startingBalance}
          onChangeText={t => update({ startingBalance: t.replace(/[^0-9.]/g, '') })}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Continue" onPress={onNext} />
        <Text style={{ ...typography.bodySmall, color: colors.neutral400, textAlign: 'center', marginTop: 14 }}>
          You can add more accounts anytime
        </Text>
      </View>
    </SafeAreaView>
  );
}
