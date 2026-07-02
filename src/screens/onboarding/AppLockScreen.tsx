import React from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, ToggleSwitch } from '@/components/ui';
import { OnboardingData } from './useOnboardingState';

export default function AppLockScreen({
  data, update, onNext, onBack, onSkip,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const { colors, typography, radius } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <Pressable onPress={onBack} style={{ padding: 16 }}>
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Feather name="lock" size={40} color={colors.accent500} />
        </View>
        <Text style={{ ...typography.h1, color: colors.neutral900, textAlign: 'center', marginBottom: 8 }}>Protect your data</Text>
        <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', marginBottom: 28, lineHeight: 21 }}>
          Lock Tally with your fingerprint, face, or a PIN so only you can see your finances and habits
        </Text>

        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.lg, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="unlock" size={20} color={colors.neutral900} />
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Biometric unlock</Text>
          </View>
          <ToggleSwitch value={data.biometricEnabled} onValueChange={v => update({ biometricEnabled: v })} />
        </View>

        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="hash" size={20} color={colors.neutral900} />
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Backup PIN</Text>
          </View>
          <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>Set up</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Continue" onPress={onNext} />
        <Pressable onPress={onSkip}>
          <Text style={{ ...typography.bodySmall, color: colors.neutral400, textAlign: 'center', marginTop: 14 }}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
