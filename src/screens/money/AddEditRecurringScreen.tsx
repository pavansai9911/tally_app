import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Input, SegmentOption, ToggleSwitch } from '@/components/ui';
import {
  createRecurringRule, updateRecurringRule, deleteRecurringRule, listRecurringRules,
  listAccounts, listCategories, AccountWithBalance, Category,
} from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AddEditRecurring'>;

export default function AddEditRecurringScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const editId = route.params?.id;

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [nextDate, setNextDate] = useState(new Date().toISOString().slice(0, 10));
  const [autoAdd, setAutoAdd] = useState(true);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      const accs = await listAccounts();
      setAccounts(accs);
      if (accs.length > 0) setAccountId(accs[0].id);
      const cats = await listCategories(type);
      setCategories(cats);

      if (editId) {
        const rules = await listRecurringRules();
        const r = rules.find(x => x.id === editId);
        if (r) {
          setType(r.type);
          setName(r.name);
          setAmount(String(r.amount));
          setFrequency(r.frequency);
          setAccountId(r.account_id);
          setCategoryId(r.category_id);
          setNextDate(r.next_date);
          setAutoAdd(!!r.auto_add);
        }
      }
    })();
  }, [editId]);

  async function handleSave() {
    if (!name.trim() || !parseFloat(amount) || !accountId) return;
    const payload = {
      type, name, amount: parseFloat(amount), category_id: categoryId, account_id: accountId,
      frequency, next_date: nextDate, auto_add: autoAdd ? 1 : 0,
    };
    if (editId) await updateRecurringRule(editId, payload);
    else await createRecurringRule(payload);
    navigation.goBack();
  }

  function handleDelete() {
    Alert.alert('Delete recurring rule?', 'This will stop future automatic entries for this item.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { if (editId) await deleteRecurringRule(editId); navigation.goBack(); } },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit recurring' : 'New recurring'}</Text>
        <Pressable onPress={handleSave}><Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.accent500 }}>Save</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          <SegmentOption label="Expense" selected={type === 'expense'} onPress={() => setType('expense')} selectedBg={colors.expenseTint} selectedFg={colors.expense} />
          <SegmentOption label="Income" selected={type === 'income'} onPress={() => setType('income')} selectedBg={colors.incomeTint} selectedFg={colors.income} />
        </View>

        <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Netflix" focused />
        <Input label="Amount" value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="649" />

        <Text style={{ ...typography.caption, color: colors.neutral600, textTransform: 'uppercase', marginBottom: 10 }}>Frequency</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
          <SegmentOption label="Weekly" selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')} />
          <SegmentOption label="Monthly" selected={frequency === 'monthly'} onPress={() => setFrequency('monthly')} />
          <SegmentOption label="Yearly" selected={frequency === 'yearly'} onPress={() => setFrequency('yearly')} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderTopWidth: 0.5, borderBottomWidth: 0.5, borderColor: colors.surfaceBorder }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Next date</Text>
          <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>
            {new Date(nextDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderColor: colors.surfaceBorder }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Account</Text>
          <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>
            {accounts.find(a => a.id === accountId)?.name ?? 'Select'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 }}>
          <View>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Auto-add transaction</Text>
            <Text style={{ ...typography.caption, color: colors.neutral400 }}>Logs automatically on due date</Text>
          </View>
          <ToggleSwitch value={autoAdd} onValueChange={setAutoAdd} />
        </View>

        {editId && (
          <View style={{ marginTop: 16, marginBottom: 24 }}>
            <Button label="Delete recurring rule" variant="destructive" onPress={handleDelete} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
