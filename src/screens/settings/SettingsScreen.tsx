import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { ToggleSwitch } from '@/components/ui';
import { getSetting, setSetting } from '@/db';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { colors, typography, radius, mode, setMode } = useTheme();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    getSetting('lock_enabled').then(v => setLockEnabled(v === '1'));
    getSetting('currency').then(v => setCurrency(v ?? 'INR'));
  }, []);

  async function toggleLock(v: boolean) {
    setLockEnabled(v);
    await setSetting('lock_enabled', v ? '1' : '0');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <SectionLabel title="General" />
        <Card>
          <Row label="Currency" value={currency} onPress={() => navigation.navigate('SettingsSub', { section: 'currency' })} />
          <Row label="Theme" value={mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} onPress={() => navigation.navigate('SettingsSub', { section: 'theme' })} last />
        </Card>

        <SectionLabel title="Security" />
        <Card>
          <ToggleRow label="App lock" value={lockEnabled} onValueChange={toggleLock} />
          <Row label="Change PIN" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'pin' })} last />
        </Card>

        <SectionLabel title="Money" />
        <Card>
          <Row label="Manage accounts" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'accounts' })} />
          <Row label="Manage categories" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'categories' })} last />
        </Card>

        <SectionLabel title="Data" />
        <Card>
          <Row label="Export data" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'export' })} />
          <Row label="Backup & restore" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'backup' })} last />
        </Card>

        <SectionLabel title="About" />
        <Card>
          <Row label="Version" value="1.0.0" onPress={() => {}} />
          <Row label="Privacy" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'privacy' })} last />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ title }: { title: string }) {
  const { colors, typography } = useTheme();
  return <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 }}>{title}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  const { colors, radius } = useTheme();
  return <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, paddingHorizontal: 16 }}>{children}</View>;
}

function Row({ label, value, onPress, last = false }: { label: string; value: string; onPress: () => void; last?: boolean }) {
  const { colors, typography } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
      <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value && <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{value}</Text>}
        <Feather name="chevron-right" size={16} color={colors.neutral300} />
      </View>
    </Pressable>
  );
}

function ToggleRow({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
      <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{label}</Text>
      <ToggleSwitch value={value} onValueChange={onValueChange} />
    </View>
  );
}
