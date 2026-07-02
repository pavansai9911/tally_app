import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { ProgressDots } from './ProgressDots';

export default function AllSetScreen({ onFinish }: { onFinish: () => void }) {
  const { colors, typography, radius } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.incomeTint, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Feather name="check" size={42} color={colors.income} />
        </View>
        <Text style={{ ...typography.h1, color: colors.neutral900, textAlign: 'center', marginBottom: 8 }}>You're all set</Text>
        <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', marginBottom: 28, lineHeight: 21 }}>
          Start logging transactions and building habits. Everything stays private, right here on your device.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <View style={{ flex: 1, padding: 16, backgroundColor: colors.neutral50, borderRadius: radius.lg, alignItems: 'center' }}>
            <Feather name="credit-card" size={22} color={colors.accent500} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900, marginTop: 8 }}>Track money</Text>
          </View>
          <View style={{ flex: 1, padding: 16, backgroundColor: colors.neutral50, borderRadius: radius.lg, alignItems: 'center' }}>
            <Feather name="check-square" size={22} color={colors.accent500} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900, marginTop: 8 }}>Build habits</Text>
          </View>
        </View>
      </View>
      <ProgressDots total={5} current={4} />
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Go to dashboard" onPress={onFinish} />
      </View>
    </SafeAreaView>
  );
}
