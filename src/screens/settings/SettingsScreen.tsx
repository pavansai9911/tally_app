import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { ToggleSwitch } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  isPinSet, clearPin, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled,
  authenticateBiometric,
} from '@/services/lock';
import VerifyPinScreen from '@/screens/lock/VerifyPinScreen';
import { getActiveCurrency } from '@/utils/currency';
import { APP_VERSION } from '@/constants/app';
import { useTour } from '@/tour/TourProvider';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;


export default function SettingsScreen({ navigation }: Props) {
  const { colors, typography, radius, mode } = useTheme();
  const { startTour } = useTour();
  const confirm = useConfirm();
  const [lockEnabled, setLockEnabled] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);
  const [biometricHardware, setBiometricHardware] = useState(false);
  const [pendingDisable, setPendingDisable] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(getActiveCurrency().code);

  const reload = useCallback(() => {
    (async () => {
      setLockEnabled(await isPinSet());
      setBiometricOn(await isBiometricEnabled());
      setBiometricHardware(await isBiometricAvailable());
      setCurrencyCode(getActiveCurrency().code);
    })();
  }, []);

  useFocusEffect(reload);

  async function toggleLock(v: boolean) {
    if (v) {
      if (await isPinSet()) {
        setLockEnabled(true);
      } else {
        navigation.navigate('SettingsSub', { section: 'pin' });
      }
    } else {
      // Removing the lock is sensitive — require the current PIN first.
      setPendingDisable(true);
    }
  }

  async function toggleBiometric(v: boolean) {
    // Security: both enabling AND disabling biometric unlock require a successful
    // fingerprint scan, so nobody can change it while the phone is briefly unattended.
    const ok = await authenticateBiometric(
      v ? 'Confirm your fingerprint to enable biometric unlock'
        : 'Confirm your fingerprint to turn off biometric unlock',
    );
    if (!ok) {
      confirm({
        title: 'Not confirmed',
        message: v ? 'Biometric unlock was not enabled.' : 'Biometric unlock was not turned off.',
        icon: 'shield-off',
      });
      return;
    }
    setBiometricOn(v);
    await setBiometricEnabled(v);
  }

  if (pendingDisable) {
    return (
      <VerifyPinScreen
        title="Enter PIN to turn off lock"
        subtitle="Confirm your PIN to disable the app lock"
        onCancel={() => setPendingDisable(false)}
        onSuccess={async () => {
          await clearPin();
          setLockEnabled(false);
          setBiometricOn(false);
          setPendingDisable(false);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={colors.neutral900} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <SectionLabel title="General" />
        <Card>
          <Row label="Currency" value={currencyCode} onPress={() => navigation.navigate('SettingsSub', { section: 'currency' })} />
          <Row label="Theme" value={mode === 'system' ? 'System' : mode === 'dark' ? 'Dark' : 'Light'} onPress={() => navigation.navigate('SettingsSub', { section: 'theme' })} last />
        </Card>

        <SectionLabel title="Security" />
        <Card>
          <ToggleRow label="App lock (PIN)" value={lockEnabled} onValueChange={toggleLock} />
          {lockEnabled && biometricHardware && (
            <ToggleRow label="Biometric unlock" value={biometricOn} onValueChange={toggleBiometric} />
          )}
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

        <SectionLabel title="Help" />
        <Card>
          <Row
            label="Restart product tour"
            value=""
            onPress={() => {
              // Return to Home first — that is where the tour begins.
              navigation.navigate('Tabs');
              setTimeout(() => startTour(), 450);
            }}
            last
          />
        </Card>

        <SectionLabel title="Developer / testing" />
        <Card>
          <Row label="Seed sample data" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'seed' })} />
          <Row label="Reminder diagnostics" value="" onPress={() => navigation.navigate('SettingsSub', { section: 'reminders' })} last />
        </Card>

        <SectionLabel title="About" />
        <Card>
          <Row label="Version" value={APP_VERSION} onPress={() => {}} />
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
  return <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, paddingHorizontal: 16, borderWidth: 0.5, borderColor: colors.surfaceBorder }}>{children}</View>;
}

function Row({ label, value, onPress, last = false }: { label: string; value: string; onPress: () => void; last?: boolean }) {
  const { colors, typography } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
      <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {value ? <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{value}</Text> : null}
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
