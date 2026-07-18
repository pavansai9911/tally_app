import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, ToggleSwitch } from '@/components/ui';
import { OnboardingData } from './useOnboardingState';
import SetPinScreen from '@/screens/lock/SetPinScreen';
import { isBiometricAvailable } from '@/services/lock';

export default function AppLockScreen({
  data, update, onNext, onBack, onSkip,
}: { data: OnboardingData; update: (p: Partial<OnboardingData>) => void; onNext: () => void; onBack: () => void; onSkip: () => void }) {
  const { colors, typography, radius } = useTheme();
  const [showSetPin, setShowSetPin] = useState(false);
  const [biometricHardware, setBiometricHardware] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricHardware);
  }, []);

  if (showSetPin) {
    return (
      <SetPinScreen
        title="Create app PIN"
        onCancel={() => setShowSetPin(false)}
        onDone={() => {
          update({ pinSet: true });
          setShowSetPin(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <Pressable onPress={onBack} style={{ padding: 16 }} accessibilityLabel="Back">
        <Feather name="chevron-left" size={24} color={colors.neutral900} />
      </Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Feather name="lock" size={40} color={colors.accent500} />
        </View>
        <Text style={{ ...typography.h1, color: colors.neutral900, textAlign: 'center', marginBottom: 8 }}>Protect your data</Text>
        <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', marginBottom: 28, lineHeight: 21 }}>
          Lock Tally with a PIN — and your fingerprint or face — so only you can see your finances and habits
        </Text>

        <Pressable
          onPress={() => setShowSetPin(true)}
          style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: data.pinSet ? colors.income : colors.neutral200, borderRadius: radius.lg, marginBottom: 12 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="hash" size={20} color={colors.neutral900} />
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>App PIN</Text>
          </View>
          {data.pinSet ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="check-circle" size={16} color={colors.income} />
              <Text style={{ ...typography.bodySmallMedium, color: colors.income }}>PIN created</Text>
            </View>
          ) : (
            <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>Set up</Text>
          )}
        </Pressable>

        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: colors.neutral200, borderRadius: radius.lg, opacity: data.pinSet && biometricHardware ? 1 : 0.5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Feather name="unlock" size={20} color={colors.neutral900} />
            <View>
              <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Biometric unlock</Text>
              {!data.pinSet && <Text style={{ ...typography.caption, color: colors.neutral400 }}>Set a PIN first</Text>}
            </View>
          </View>
          <ToggleSwitch
            value={data.biometricEnabled && data.pinSet && biometricHardware}
            onValueChange={(v) => {
              if (data.pinSet && biometricHardware) update({ biometricEnabled: v });
            }}
          />
        </View>
      </View>
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Continue" onPress={onNext} />
        <Pressable onPress={onSkip} accessibilityRole="button">
          <Text style={{ ...typography.bodySmall, color: colors.neutral400, textAlign: 'center', marginTop: 14 }}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
