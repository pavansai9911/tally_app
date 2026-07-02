import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { setSetting, listAccounts, listCategories, deleteAccount, AccountWithBalance, Category } from '@/db';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'SettingsSub'>;

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export default function SettingsSubScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const { section } = route.params;
  const { mode, setMode } = useTheme();
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (section === 'accounts') listAccounts().then(setAccounts);
    if (section === 'categories') listCategories().then(setCategories);
  }, [section]);

  const titles: Record<string, string> = {
    currency: 'Currency', theme: 'Theme', pin: 'Change PIN', accounts: 'Manage accounts',
    categories: 'Manage categories', export: 'Export data', backup: 'Backup & restore', privacy: 'Privacy',
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{titles[section] ?? section}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {section === 'currency' && CURRENCIES.map(c => (
          <Pressable key={c.code} onPress={async () => { await setSetting('currency', c.code); await setSetting('currency_symbol', c.symbol); navigation.goBack(); }} style={{ paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{c.name} ({c.symbol})</Text>
          </Pressable>
        ))}

        {section === 'theme' && (['light', 'dark', 'system'] as const).map(m => (
          <Pressable key={m} onPress={() => setMode(m)} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{m[0].toUpperCase() + m.slice(1)}</Text>
            {mode === m && <Feather name="check" size={18} color={colors.accent500} />}
          </Pressable>
        ))}

        {section === 'pin' && (
          <Text style={{ ...typography.body, color: colors.neutral500 }}>
            PIN management would open a dedicated set/change-PIN flow here, reusing the same keypad component as the Lock screen.
          </Text>
        )}

        {section === 'accounts' && accounts.map(a => (
          <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: a.color + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(a.icon)} size={16} color={a.color} />
            </View>
            <Text style={{ flex: 1, ...typography.bodyMedium, color: colors.neutral900 }}>{a.name}</Text>
            <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{formatCurrency(a.current_balance)}</Text>
          </View>
        ))}

        {section === 'categories' && categories.map(c => (
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
            <Text style={{ ...typography.body, color: colors.neutral500, marginBottom: 20 }}>
              Export all your transactions and habit logs as a CSV file you can keep, back up, or open in a spreadsheet.
            </Text>
            <Button label="Export as CSV" onPress={() => {}} />
          </View>
        )}

        {section === 'backup' && (
          <Text style={{ ...typography.body, color: colors.neutral500 }}>
            Since Tally stores everything locally in SQLite, back up by exporting the database file from your device's file manager, or wire this section up to a cloud-folder copy (e.g. Google Drive) if you add that feature later.
          </Text>
        )}

        {section === 'privacy' && (
          <Text style={{ ...typography.body, color: colors.neutral500, lineHeight: 21 }}>
            Tally stores all your data locally on this device only. Nothing is sent to a server, no account is required, and no analytics or ad tracking is included.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
