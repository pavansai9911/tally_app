import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { ProgressDots } from './ProgressDots';

export default function WelcomeScreen({ onNext }: { onNext: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <View style={{ width: 84, height: 84, borderRadius: 20, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          <Feather name="layers" size={40} color="#FFFFFF" />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '700', color: colors.neutral900, marginBottom: 8 }}>Tally</Text>
        <Text style={{ ...typography.body, color: colors.neutral500, textAlign: 'center', lineHeight: 21 }}>
          Track your money and habits, fully offline. No account, no cloud, no ads.
        </Text>
      </View>
      <ProgressDots total={5} current={0} />
      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Get started" onPress={onNext} icon={<Feather name="arrow-right" size={18} color="#FFFFFF" />} />
        <Text style={{ ...typography.bodySmall, color: colors.neutral400, textAlign: 'center', marginTop: 14 }}>
          Your data stays on this device
        </Text>
      </View>
    </SafeAreaView>
  );
}
