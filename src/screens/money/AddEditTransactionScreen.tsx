import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { SegmentOption } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import {
  createTransaction, updateTransaction, getTransaction, listCategories, listAccounts,
  Category, AccountWithBalance,
} from '@/db';
import { todayKey } from '@/utils/format';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AddEditTransaction'>;

export default function AddEditTransactionScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const editId = route.params?.id;

  const [type, setType] = useState<'expense' | 'income' | 'transfer'>('expense');
  const [amount, setAmount] = useState('0');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    (async () => {
      const accs = await listAccounts();
      setAccounts(accs);
      if (accs.length > 0) setAccountId(accs[0].id);
      const cats = await listCategories('expense');
      setCategories(cats);

      if (editId) {
        const tx = await getTransaction(editId);
        if (tx) {
          setType(tx.type);
          setAmount(String(tx.amount));
          setCategoryId(tx.category_id);
          setAccountId(tx.account_id);
          setNote(tx.note ?? '');
        }
      }
    })();
  }, [editId]);

  useEffect(() => {
    (async () => {
      const cats = await listCategories(type === 'income' ? 'income' : 'expense');
      setCategories(cats);
      setCategoryId(null);
    })();
  }, [type]);

  const isValid = parseFloat(amount) > 0 && (type === 'transfer' || categoryId) && accountId;

  function handleKeypad(key: string) {
    if (key === 'back') {
      setAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount(prev => prev + '.');
      return;
    }
    setAmount(prev => (prev === '0' ? key : prev + key));
  }

  async function handleSave() {
    setTouched(true);
    if (!isValid || !accountId) return;
    const payload = {
      type,
      amount: parseFloat(amount),
      account_id: accountId,
      to_account_id: null,
      category_id: type === 'transfer' ? null : categoryId,
      note: note || null,
      occurred_at: editId ? undefined : todayKey(),
      recurring_id: null,
    } as any;
    if (editId) {
      await updateTransaction(editId, payload);
    } else {
      await createTransaction(payload);
    }
    navigation.goBack();
  }

  const selectedCategory = categories.find(c => c.id === categoryId);
  const selectedAccount = accounts.find(a => a.id === accountId);
  const showError = touched && !isValid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="x" size={22} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit transaction' : 'New transaction'}</Text>
        <Pressable onPress={handleSave}>
          <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: isValid ? colors.accent500 : colors.neutral300 }}>Save</Text>
        </Pressable>
      </View>

      {showError && (
        <View style={{ marginHorizontal: 20, marginTop: 8, padding: 12, backgroundColor: colors.expenseTint, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Feather name="alert-circle" size={18} color={colors.expense} />
          <Text style={{ ...typography.bodySmallMedium, color: colors.expense, flex: 1 }}>Enter an amount{type !== 'transfer' ? ' and pick a category' : ''} to save</Text>
        </View>
      )}

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, gap: 8 }}>
        <SegmentOption label="Expense" selected={type === 'expense'} onPress={() => setType('expense')} selectedBg={colors.expenseTint} selectedFg={colors.expense} />
        <SegmentOption label="Income" selected={type === 'income'} onPress={() => setType('income')} selectedBg={colors.incomeTint} selectedFg={colors.income} />
        <SegmentOption label="Transfer" selected={type === 'transfer'} onPress={() => setType('transfer')} />
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 20 }}>
        <Text style={{ fontSize: 40, fontWeight: '700', color: showError && parseFloat(amount) <= 0 ? colors.expense : colors.neutral900 }}>
          ₹{amount}
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
        <Pressable onPress={() => setShowCategoryPicker(s => !s)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Category</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{selectedCategory?.name ?? 'Select category'}</Text>
            <Feather name="chevron-right" size={16} color={colors.neutral400} />
          </View>
        </Pressable>
        {showCategoryPicker && type !== 'transfer' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 }}>
            {categories.map(c => (
              <Pressable key={c.id} onPress={() => { setCategoryId(c.id); setShowCategoryPicker(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: radius.md, backgroundColor: c.id === categoryId ? colors.accentTint : colors.neutral50 }}>
                <Feather name={mapIcon(c.icon)} size={15} color={c.color} />
                <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable onPress={() => setShowAccountPicker(s => !s)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Account</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{selectedAccount?.name ?? 'Select account'}</Text>
            <Feather name="chevron-right" size={16} color={colors.neutral400} />
          </View>
        </Pressable>
        {showAccountPicker && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 }}>
            {accounts.map(a => (
              <Pressable key={a.id} onPress={() => { setAccountId(a.id); setShowAccountPicker(false); }} style={{ padding: 10, borderRadius: radius.md, backgroundColor: a.id === accountId ? colors.accentTint : colors.neutral50 }}>
                <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ paddingVertical: 14 }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900, marginBottom: 6 }}>Note</Text>
          <Pressable onPress={() => {}}>
            <Text style={{ ...typography.body, color: colors.neutral400 }}>{note || 'Add a note (optional)'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
        {['1','2','3','4','5','6','7','8','9','.','0','back'].map(key => (
          <Pressable
            key={key}
            onPress={() => handleKeypad(key)}
            style={{ width: '33.33%', paddingVertical: 16, alignItems: 'center', borderWidth: 0.5, borderColor: colors.surfaceBorder }}
          >
            {key === 'back' ? (
              <Feather name="delete" size={18} color={colors.neutral900} />
            ) : (
              <Text style={{ fontSize: 20, color: colors.neutral900 }}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
