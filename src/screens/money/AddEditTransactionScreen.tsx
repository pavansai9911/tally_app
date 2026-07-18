import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, ScrollView, TextInput } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { SegmentOption } from '@/components/ui';
import { DateField } from '@/components/DateTimeField';
import { mapIcon } from '@/utils/iconMap';
import {
  createTransaction, updateTransaction, getTransaction, listCategories, listAccounts,
  Category, AccountWithBalance,
} from '@/db';
import { todayKey } from '@/utils/format';
import { haptic } from '@/utils/haptics';
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
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(todayKey());
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showToAccountPicker, setShowToAccountPicker] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    (async () => {
      const accs = await listAccounts();
      setAccounts(accs);
      if (accs.length > 0) setAccountId(accs[0].id);
      if (accs.length > 1) setToAccountId(accs[1].id);
      if (editId) {
        const tx = await getTransaction(editId);
        if (tx) {
          setType(tx.type);
          setAmount(String(tx.amount));
          setCategoryId(tx.category_id);
          setAccountId(tx.account_id);
          setToAccountId(tx.to_account_id);
          setNote(tx.note ?? '');
          setOccurredAt(tx.occurred_at.slice(0, 10));
        }
      }
    })();
  }, [editId]);

  useEffect(() => {
    (async () => {
      if (type === 'transfer') {
        setCategories([]);
        setCategoryId(null);
        return;
      }
      const cats = await listCategories(type === 'income' ? 'income' : 'expense');
      setCategories(cats);
      setCategoryId((prev) => (prev && cats.some((c) => c.id === prev) ? prev : null));
    })();
  }, [type]);

  const amountValid = parseFloat(amount) > 0;
  const transferValid = type !== 'transfer' || (!!accountId && !!toAccountId && accountId !== toAccountId);
  const categoryValid = type === 'transfer' || !!categoryId;
  const isValid = amountValid && categoryValid && !!accountId && transferValid;

  function handleKeypad(key: string) {
    haptic('selection');
    if (key === 'back') {
      setAmount((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      return;
    }
    if (key === '.') {
      if (amount.includes('.')) return;
      setAmount((prev) => prev + '.');
      return;
    }
    setAmount((prev) => (prev === '0' ? key : prev + key));
  }

  async function handleSave() {
    setTouched(true);
    if (!isValid || !accountId) {
      haptic('notificationWarning');
      return;
    }
    const payload = {
      type,
      amount: parseFloat(amount),
      account_id: accountId,
      to_account_id: type === 'transfer' ? toAccountId : null,
      category_id: type === 'transfer' ? null : categoryId,
      note: note.trim() || null,
      occurred_at: occurredAt,
      recurring_id: null,
    };
    if (editId) {
      await updateTransaction(editId, payload);
    } else {
      await createTransaction(payload);
    }
    haptic('notificationSuccess');
    navigation.goBack();
  }

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedToAccount = accounts.find((a) => a.id === toAccountId);
  const errorMsg = touched && !isValid
    ? !amountValid
      ? 'Enter an amount greater than zero'
      : type === 'transfer'
        ? accountId === toAccountId ? 'Choose two different accounts' : 'Pick both accounts'
        : 'Pick a category'
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityLabel="Close">
          <Feather name="x" size={22} color={colors.neutral900} />
        </Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>{editId ? 'Edit transaction' : 'New transaction'}</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingTop: 8, gap: 8 }}>
        <SegmentOption label="Expense" selected={type === 'expense'} onPress={() => setType('expense')} selectedBg={colors.expenseTint} selectedFg={colors.expense} />
        <SegmentOption label="Income" selected={type === 'income'} onPress={() => setType('income')} selectedBg={colors.incomeTint} selectedFg={colors.income} />
        <SegmentOption label="Transfer" selected={type === 'transfer'} onPress={() => setType('transfer')} />
      </View>

      <View style={{ alignItems: 'center', paddingVertical: 16 }}>
        <Text style={{ fontSize: 40, fontWeight: '700', color: errorMsg && !amountValid ? colors.expense : colors.neutral900 }}>
          ₹{amount}
        </Text>
        {errorMsg && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Feather name="alert-circle" size={14} color={colors.expense} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.expense }}>{errorMsg}</Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }} keyboardShouldPersistTaps="handled">
        {type !== 'transfer' && (
          <>
            <Pressable onPress={() => setShowCategoryPicker((s) => !s)} style={rowStyle(colors)}>
              <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>Category</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: selectedCategory ? colors.neutral900 : colors.neutral400 }}>{selectedCategory?.name ?? 'Select category'}</Text>
                <Feather name="chevron-right" size={16} color={colors.neutral400} />
              </View>
            </Pressable>
            {showCategoryPicker && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 }}>
                {categories.map((c) => (
                  <Pressable key={c.id} onPress={() => { setCategoryId(c.id); setShowCategoryPicker(false); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, borderRadius: radius.md, backgroundColor: c.id === categoryId ? colors.accentTint : colors.surfaceSunken }}>
                    <Feather name={mapIcon(c.icon)} size={15} color={c.color} />
                    <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{c.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <Pressable onPress={() => setShowAccountPicker((s) => !s)} style={rowStyle(colors)}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{type === 'transfer' ? 'From account' : 'Account'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{selectedAccount?.name ?? 'Select account'}</Text>
            <Feather name="chevron-right" size={16} color={colors.neutral400} />
          </View>
        </Pressable>
        {showAccountPicker && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 }}>
            {accounts.map((a) => (
              <Pressable key={a.id} onPress={() => { setAccountId(a.id); setShowAccountPicker(false); }} style={{ padding: 10, borderRadius: radius.md, backgroundColor: a.id === accountId ? colors.accentTint : colors.surfaceSunken }}>
                <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{a.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {type === 'transfer' && (
          <>
            <Pressable onPress={() => setShowToAccountPicker((s) => !s)} style={rowStyle(colors)}>
              <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>To account</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: colors.neutral900 }}>{selectedToAccount?.name ?? 'Select account'}</Text>
                <Feather name="chevron-right" size={16} color={colors.neutral400} />
              </View>
            </Pressable>
            {showToAccountPicker && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 10 }}>
                {accounts.filter((a) => a.id !== accountId).map((a) => (
                  <Pressable key={a.id} onPress={() => { setToAccountId(a.id); setShowToAccountPicker(false); }} style={{ padding: 10, borderRadius: radius.md, backgroundColor: a.id === toAccountId ? colors.accentTint : colors.surfaceSunken }}>
                    <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{a.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}

        <DateField label="Date" value={occurredAt} onChange={setOccurredAt} maximumDate={new Date(2100, 0, 1)} />

        <View style={{ paddingVertical: 14 }}>
          <Text style={{ ...typography.bodyMedium, color: colors.neutral900, marginBottom: 8 }}>Note</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            placeholderTextColor={colors.neutral400}
            style={{ ...typography.body, color: colors.neutral900, backgroundColor: colors.surfaceSunken, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12 }}
          />
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 0.5, borderTopColor: colors.surfaceBorder }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((key) => (
            <Pressable
              key={key}
              onPress={() => handleKeypad(key)}
              accessibilityLabel={key === 'back' ? 'Delete digit' : `Digit ${key}`}
              style={({ pressed }) => ({ width: '33.33%', paddingVertical: 14, alignItems: 'center', opacity: pressed ? 0.5 : 1 })}
            >
              {key === 'back' ? (
                <Feather name="delete" size={20} color={colors.neutral900} />
              ) : (
                <Text style={{ fontSize: 22, color: colors.neutral900 }}>{key}</Text>
              )}
            </Pressable>
          ))}
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14 }}>
          <Pressable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save transaction"
            style={({ pressed }) => ({
              height: 52, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
              backgroundColor: isValid ? colors.accent500 : colors.neutral200,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ ...typography.button, color: isValid ? '#FFFFFF' : colors.neutral400 }}>
              {editId ? 'Save changes' : 'Add transaction'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function rowStyle(colors: ReturnType<typeof useTheme>['colors']) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.surfaceBorder,
  };
}
