import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, ToggleSwitch } from '@/components/ui';
import { createAccount, updateAccount, getAccount } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AddEditAccount'>;

const TYPES: Array<{ key: 'cash' | 'bank' | 'card' | 'wallet'; label: string; icon: string }> = [
  { key: 'cash', label: 'Cash', icon: 'dollar-sign' },
  { key: 'bank', label: 'Bank', icon: 'home' },
  { key: 'card', label: 'Card', icon: 'credit-card' },
  { key: 'wallet', label: 'Wallet', icon: 'briefcase' },
];

export default function AddEditAccountScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const editId = route.params?.id;

  const [name, setName] = useState('');
  const [type, setType] = useState<'cash' | 'bank' | 'card' | 'wallet'>('bank');
  const [balance, setBalance] = useState('0');
  const [includeInTotal, setIncludeInTotal] = useState(true);

  useEffect(() => {
    if (editId) {
      getAccount(editId).then(acc => {
        if (acc) {
          setName(acc.name);
          setType(acc.type);
          setBalance(String(acc.starting_balance));
          setIncludeInTotal(!!acc.include_in_total);
        }
      });
    }
  }, [editId]);

  async function handleSave() {
    if (!name.trim()) return;
    const payload = {
      name, type,
      icon: type === 'cash' ? 'ti-cash' : type === 'bank' ? 'ti-building-bank' : type === 'card' ? 'ti-credit-card' : 'ti-wallet',
      color: '#3D5AFE',
      starting_balance: parseFloat(balance) || 0,
      include_in_total: includeInTotal ? 1 : 0,
    };
    if (editId) await updateAccount(editId, payload);
    else await createAccount(payload);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit account' : 'New account'}</Text>
        <Pressable onPress={handleSave}><Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.accent500 }}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        <Input label="Account name" value={name} onChangeText={setName} focused placeholder="e.g. ICICI Savings" />

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Account type</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {TYPES.map(t => {
            const selected = t.key === type;
            return (
              <Pressable key={t.key} onPress={() => setType(t.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: selected ? colors.accent500 : colors.neutral50 }}>
                <Feather name={t.icon} size={16} color={selected ? '#FFFFFF' : colors.neutral600} />
                <Text style={{ ...typography.bodySmallMedium, color: selected ? '#FFFFFF' : colors.neutral600 }}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input label="Current balance" value={balance} onChangeText={t => setBalance(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Include in total balance</Text>
          <ToggleSwitch value={includeInTotal} onValueChange={setIncludeInTotal} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
