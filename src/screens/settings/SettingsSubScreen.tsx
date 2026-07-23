import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { useConfirm } from '@/components/ConfirmDialog';
import { listAccounts, listCategories, updateCategory, setSetting, AccountWithBalance, Category } from '@/db';
import { CURRENCIES, getActiveCurrency, setActiveCurrency } from '@/utils/currency';
import { SEED_RANGES, SeedRange, seedSampleData, clearSampleData, hasSampleData } from '@/services/seed';
import { sendTestReminder, scheduledReminderCount, rescheduleAllHabitReminders } from '@/services/notifications';
import { mapIcon, CATEGORY_COLOR_OPTIONS } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { exportBackup, exportTransactionsCsv, importBackupInteractive } from '@/services/backup';
import { resetDbHandle } from '@/db/database';
import SetPinScreen from '@/screens/lock/SetPinScreen';
import VerifyPinScreen from '@/screens/lock/VerifyPinScreen';
import { isPinSet } from '@/services/lock';
import { lockColors } from '@/theme/colors';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsSub'>;

export default function SettingsSubScreen({ navigation, route }: Props) {
  const { colors, typography, radius, mode, setMode } = useTheme();
  const confirm = useConfirm();
  const { section } = route.params;
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [pinStage, setPinStage] = useState<'checking' | 'verify' | 'set'>('checking');
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState(getActiveCurrency().code);
  const [seeded, setSeeded] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);

  useEffect(() => {
    if (section === 'accounts') listAccounts().then(setAccounts);
    if (section === 'categories') listCategories().then(setCategories);
    // When changing the PIN: verify the current one first (if one exists).
    if (section === 'pin') isPinSet().then((set) => setPinStage(set ? 'verify' : 'set'));
    if (section === 'seed') hasSampleData().then(setSeeded);
    if (section === 'reminders') scheduledReminderCount().then(setReminderCount);
  }, [section]);

  async function runSeed(range: SeedRange, label: string) {
    setBusy('seed');
    try {
      const result = await seedSampleData(range);
      setSeeded(true);
      confirm({
        title: 'Sample data created',
        message: `${label}\n\n${result.transactions} transactions · ${result.habitLogs} habit check-ins\n${result.accounts} accounts · ${result.categories} categories · ${result.habits} habits`,
        icon: 'check-circle',
        buttons: [{ text: 'View', style: 'default', onPress: () => navigation.navigate('Tabs') }],
      });
    } catch {
      confirm({ title: 'Could not create sample data', message: 'Nothing was changed.', icon: 'alert-circle', tone: 'danger' });
    } finally {
      setBusy(null);
    }
  }

  function confirmSeed(range: SeedRange, label: string) {
    if (seeded) {
      confirm({
        title: 'Replace existing sample data?',
        message: 'The current sample data will be removed and regenerated. Your own records are not touched.',
        icon: 'refresh-cw',
        buttons: [
          { text: 'Replace', style: 'destructive', onPress: () => runSeed(range, label) },
          { text: 'Cancel', style: 'cancel' },
        ],
      });
    } else {
      runSeed(range, label);
    }
  }

  async function changeCategoryColor(id: string, color: string) {
    await updateCategory(id, { color });
    setCategories(await listCategories());
  }

  const titles: Record<string, string> = {
    currency: 'Currency', theme: 'Theme', pin: 'App PIN', accounts: 'Manage accounts',
    seed: 'Seed sample data', reminders: 'Reminder diagnostics',
    categories: 'Manage categories', export: 'Export data', backup: 'Backup & restore', privacy: 'Privacy',
  };

  // Dedicated full-screen PIN flow: verify current PIN (if set) -> set new PIN.
  if (section === 'pin') {
    if (pinStage === 'checking') {
      return <SafeAreaView style={{ flex: 1, backgroundColor: lockColors.background }} />;
    }
    if (pinStage === 'verify') {
      return (
        <VerifyPinScreen
          title="Enter current PIN"
          subtitle="Verify your current PIN to change it"
          onCancel={() => navigation.goBack()}
          onSuccess={() => setPinStage('set')}
        />
      );
    }
    return <SetPinScreen title="Set new PIN" onCancel={() => navigation.goBack()} onDone={() => navigation.goBack()} />;
  }

  async function handleExportCsv() {
    setBusy('csv');
    try {
      await exportTransactionsCsv();
    } catch {
      confirm({ title: 'Export failed', message: 'Could not create the CSV file.', icon: 'alert-circle', tone: 'danger' });
    } finally {
      setBusy(null);
    }
  }

  async function handleExportBackup() {
    setBusy('backup');
    try {
      await exportBackup();
    } catch {
      confirm({ title: 'Backup failed', message: 'Could not create the backup file.', icon: 'alert-circle', tone: 'danger' });
    } finally {
      setBusy(null);
    }
  }

  function handleRestore() {
    confirm({
      title: 'Restore from backup?',
      message: 'This replaces ALL current data on this device with the contents of the backup file. This cannot be undone.',
      icon: 'alert-triangle',
      tone: 'danger',
      buttons: [
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
                confirm({
                  title: 'Restore complete',
                  message: 'Your data has been restored.',
                  icon: 'check-circle',
                  buttons: [{ text: 'OK', style: 'default', onPress: () => navigation.navigate('Tabs') }],
                });
              } else if (result.error) {
                confirm({ title: 'Could not restore', message: result.error, icon: 'alert-circle', tone: 'danger' });
              }
            } finally {
              setBusy(null);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    });
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
        {section === 'currency' && CURRENCIES.map((c) => {
          const selected = c.code === currencyCode;
          return (
            <Pressable
              key={c.code}
              onPress={async () => {
                await setSetting('currency', c.code);
                await setSetting('currency_symbol', c.symbol);
                setActiveCurrency(c.code);
                setCurrencyCode(c.code);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}
            >
              <Text style={{ fontSize: 24 }}>{c.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{c.name}</Text>
                <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{c.code} · {c.symbol}</Text>
              </View>
              {selected && <Feather name="check" size={18} color={colors.accent500} />}
            </Pressable>
          );
        })}

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

        {section === 'categories' && (
          <>
            <Text style={{ ...typography.bodySmall, color: colors.neutral500, marginBottom: 12 }}>
              Tap a category to change its colour (used in charts and lists).
            </Text>
            {categories.map((c) => (
              <View key={c.id}>
                <Pressable
                  onPress={() => setExpandedCat(expandedCat === c.id ? null : c.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}
                >
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={mapIcon(c.icon)} size={16} color={c.color} />
                  </View>
                  <Text style={{ flex: 1, ...typography.bodyMedium, color: colors.neutral900 }}>{c.name}</Text>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.color, marginRight: 4 }} />
                  <Feather name={expandedCat === c.id ? 'chevron-up' : 'chevron-down'} size={16} color={colors.neutral400} />
                </Pressable>
                {expandedCat === c.id && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 14, paddingLeft: 48 }}>
                    {CATEGORY_COLOR_OPTIONS.map((col) => (
                      <Pressable
                        key={col}
                        onPress={() => changeCategoryColor(c.id, col)}
                        accessibilityLabel={`Set colour ${col}`}
                        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: col, alignItems: 'center', justifyContent: 'center', borderWidth: c.color === col ? 2 : 0, borderColor: colors.neutral900 }}
                      >
                        {c.color === col && <Feather name="check" size={16} color="#FFFFFF" />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </>
        )}

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

        {section === 'seed' && (
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningTint, marginBottom: 16 }}>
              <Feather name="alert-triangle" size={16} color={colors.warning} />
              <Text style={{ ...typography.bodySmall, color: colors.neutral900, flex: 1 }}>
                Testing / developer utility. Generates demo records for evaluating reports and performance.
              </Text>
            </View>
            <Text style={{ ...typography.body, color: colors.neutral500, marginBottom: 16, lineHeight: 21 }}>
              Creates realistic accounts, categories, income, expenses, transfers, budgets, habits and
              check-in history across the chosen period. Running it again replaces the previous sample
              data — your own records are never touched.
            </Text>
            {seeded && (
              <Text style={{ ...typography.bodySmallMedium, color: colors.warning, marginBottom: 12 }}>
                Sample data is currently present.
              </Text>
            )}
            <View style={{ gap: 10 }}>
              {SEED_RANGES.map((r) => (
                <Button
                  key={r.key}
                  label={busy === 'seed' ? 'Generating…' : r.label}
                  variant={r.key === 'large' ? 'secondary' : 'primary'}
                  onPress={() => confirmSeed(r.key, r.label)}
                />
              ))}
              {seeded && (
                <Button
                  label="Remove sample data"
                  variant="destructive"
                  onPress={() => confirm({
                    title: 'Remove sample data?',
                    message: 'All generated demo records will be deleted. Your own records are untouched.',
                    icon: 'trash-2',
                    buttons: [
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          setBusy('seed');
                          await clearSampleData();
                          setSeeded(false);
                          setBusy(null);
                          confirm({ title: 'Removed', message: 'Sample data deleted.', icon: 'check-circle' });
                        },
                      },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  })}
                />
              )}
            </View>
            {busy === 'seed' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
                <ActivityIndicator color={colors.accent500} />
                <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>Working… this can take a few seconds.</Text>
              </View>
            )}
          </View>
        )}

        {section === 'reminders' && (
          <View>
            <Text style={{ ...typography.body, color: colors.neutral500, marginBottom: 16, lineHeight: 21 }}>
              Habit reminders are local notifications. They are rebuilt every time the app starts
              (Android clears scheduled alarms on reboot), use the device's default notification
              sound, and are delivered even in Doze mode.
            </Text>
            <View style={{ padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSunken, marginBottom: 16 }}>
              <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>
                Scheduled reminders: {reminderCount}
              </Text>
              <Text style={{ ...typography.caption, color: colors.neutral500, marginTop: 4 }}>
                Enable a reminder on a habit to add one.
              </Text>
            </View>
            <View style={{ gap: 10 }}>
              <Button
                label="Send test reminder (5s)"
                onPress={async () => {
                  const ok = await sendTestReminder();
                  confirm({
                    title: ok ? 'Test scheduled' : 'Notifications blocked',
                    message: ok
                      ? 'A test notification will arrive in about 5 seconds. You can leave this screen.'
                      : 'Notification permission was denied. Enable notifications for Tally in Android settings.',
                    icon: ok ? 'bell' : 'bell-off',
                    tone: ok ? 'default' : 'danger',
                  });
                }}
                icon={<Feather name="bell" size={17} color="#FFFFFF" />}
              />
              <Button
                label="Reschedule all reminders"
                variant="secondary"
                onPress={async () => {
                  await rescheduleAllHabitReminders();
                  setReminderCount(await scheduledReminderCount());
                  confirm({ title: 'Done', message: 'All habit reminders were rebuilt.', icon: 'check-circle' });
                }}
              />
            </View>
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
