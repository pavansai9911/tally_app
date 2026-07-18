import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { listAccounts, listCategories, AccountWithBalance, Category } from '@/db';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { exportBackup, exportTransactionsCsv, importBackupInteractive } from '@/services/backup';
import { rescheduleAllHabitReminders } from '@/services/notifications';
import { resetDbHandle } from '@/db/database';
import SetPinScreen from '@/screens/lock/SetPinScreen';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsSub'>;

export default function SettingsSubScreen({ navigation, route }: Props) {
  const { colors, typography, radius, mode, setMode } = useTheme();
  const { section } = route.params;
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (section === 'accounts') listAccounts().then(setAccounts);
    if (section === 'categories') listCategories().then(setCategories);
  }, [section]);

  const titles: Record<string, string> = {
    theme: 'Theme', pin: 'App PIN', accounts: 'Manage accounts',
    categories: 'Manage categories', export: 'Export data', backup: 'Backup & restore', privacy: 'Privacy',
  };

  // Dedicated full-screen PIN flow.
  if (section === 'pin') {
    return <SetPinScreen title="Set app PIN" onCancel={() => navigation.goBack()} onDone={() => navigation.goBack()} />;
  }

  async function handleExportCsv() {
    setBusy('csv');
    try {
      await exportTransactionsCsv();
    } catch {
      Alert.alert('Export failed', 'Could not create the CSV file.');
    } finally {
      setBusy(null);
    }
  }

  async function handleExportBackup() {
    setBusy('backup');
    try {
      await exportBackup();
    } catch {
      Alert.alert('Backup failed', 'Could not create the backup file.');
    } finally {
      setBusy(null);
    }
  }

  function handleRestore() {
    Alert.alert(
      'Restore from backup?',
      'This replaces ALL current data on this device with the contents of the backup file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            setBusy('restore');
            try {
              const result = await importBackupInteractive();
              if (result.restored) {
                resetDbHandle();
                await rescheduleAllHabitReminders();
                Alert.alert('Restore complete', 'Your data has been restored.', [
                  { text: 'OK', onPress: () => navigation.navigate('Tabs') },
                ]);
              } else if (result.error) {
                Alert.alert('Could not restore', result.error);
              }
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Back">
          <Feather name="chevron-left" size={24} color={colors.neutral900} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{titles[section] ?? section}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {section === 'theme' && (['light', 'dark', 'system'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{m[0].toUpperCase() + m.slice(1)}</Text>
            {mode === m && <Feather name="check" size={18} color={colors.accent500} />}
          </Pressable>
        ))}

        {section === 'accounts' && accounts.map((a) => (
          <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(a.icon)} size={16} color={a.color} />
            </View>
            <Text style={{ flex: 1, ...typography.bodyMedium, color: colors.neutral900 }}>{a.name}</Text>
            <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{formatCurrency(a.current_balance)}</Text>
          </View>
        ))}

        {section === 'categories' && categories.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(c.icon)} size={16} color={c.color} />
            </View>
            <Text style={{ flex: 1, ...typography.bodyMedium, color: colors.neutral900 }}>{c.name}</Text>
            <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'capitalize' }}>{c.type}</Text>
          </View>
        ))}

        {section === 'export' && (
          <View>
            <Text style={{ ...typography.body, color: colors.neutral500, marginBottom: 20, lineHeight: 21 }}>
              Export your transactions as a CSV file you can open in any spreadsheet, or save a full backup you can restore later.
            </Text>
            <View style={{ gap: 12 }}>
              <Button label={busy === 'csv' ? 'Preparing…' : 'Export transactions (CSV)'} onPress={handleExportCsv} icon={<Feather name="file-text" size={17} color="#FFFFFF" />} />
              <Button label={busy === 'backup' ? 'Preparing…' : 'Export full backup (JSON)'} variant="secondary" onPress={handleExportBackup} icon={<Feather name="download" size={17} color={colors.neutral900} />} />
            </View>
          </View>
        )}

        {section === 'backup' && (
          <View>
            <Text style={{ ...typography.body, color: colors.neutral500, marginBottom: 20, lineHeight: 21 }}>
              Tally keeps everything on this device only. Save a backup file somewhere safe (your files, email, or a cloud drive), then restore it on a new phone or after reinstalling.
            </Text>
            <View style={{ gap: 12 }}>
              <Button label={busy === 'backup' ? 'Preparing…' : 'Create backup'} onPress={handleExportBackup} icon={<Feather name="download" size={17} color="#FFFFFF" />} />
              <Button label={busy === 'restore' ? 'Restoring…' : 'Restore from backup'} variant="secondary" onPress={handleRestore} icon={<Feather name="upload" size={17} color={colors.neutral900} />} />
            </View>
            {busy === 'restore' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <ActivityIndicator color={colors.accent500} />
                <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>Restoring your data…</Text>
              </View>
            )}
          </View>
        )}

        {section === 'privacy' && (
          <Text style={{ ...typography.body, color: colors.neutral500, lineHeight: 21 }}>
            Tally stores all your data locally on this device only. Nothing is sent to any server, no account is required, and there is no analytics or ad tracking. Your PIN is stored securely in the device keychain, never in plain text.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
