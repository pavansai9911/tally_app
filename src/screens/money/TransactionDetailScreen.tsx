import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, Pressable, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { getTransaction, deleteTransaction, createTransaction, TransactionWithDetails } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'TransactionDetail'>;

export default function TransactionDetailScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const [tx, setTx] = useState<TransactionWithDetails | null>(null);

  useEffect(() => {
    getTransaction(route.params.id).then(setTx);
  }, [route.params.id]);

  if (!tx) return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;

  const amountColor = tx.type === 'income' ? colors.income : tx.type === 'expense' ? colors.expense : colors.neutral900;
  const sign = tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '';

  function confirmDelete() {
    Alert.alert('Delete transaction?', `"${tx?.note || tx?.category_name}" will be permanently removed. This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTransaction(tx!.id); navigation.goBack(); } },
    ]);
  }

  async function duplicate() {
    await createTransaction({
      type: tx.type, amount: tx.amount, account_id: tx.account_id, to_account_id: tx.to_account_id,
      category_id: tx.category_id, note: tx.note, occurred_at: new Date().toISOString().slice(0, 10), recurring_id: null,
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable onPress={() => navigation.navigate('AddEditTransaction', { id: tx.id })}>
            <Feather name="edit-2" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={confirmDelete}>
            <Feather name="trash-2" size={20} color={colors.expense} />
          </Pressable>
        </View>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 28 }}>
        <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: tx.category_color ? tx.category_color + '22' : colors.neutral50, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Feather name={mapIcon(tx.category_icon ?? 'ti-dots')} size={28} color={tx.category_color ?? colors.neutral500} />
        </View>
        <Text style={{ fontSize: 32, fontWeight: '700', color: colors.neutral900 }}>{sign}{formatCurrency(tx.amount).replace('-', '')}</Text>
        <Text style={{ ...typography.body, color: colors.neutral500, marginTop: 4 }}>{tx.note || tx.category_name}</Text>
      </View>

      <View style={{ paddingHorizontal: 24, flex: 1 }}>
        <View style={{ backgroundColor: colors.neutral50, borderRadius: radius.lg, paddingHorizontal: 16 }}>
          <Row label="Category" value={tx.category_name ?? '—'} />
          <Row label="Account" value={tx.account_name} />
          <Row label="Date" value={new Date(tx.occurred_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} />
          <Row label="Note" value={tx.note ?? '—'} last />
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Duplicate transaction" onPress={duplicate} variant="secondary" icon={<Feather name="copy" size={17} color={colors.neutral900} />} />
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: last ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
      <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{label}</Text>
      <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{value}</Text>
    </View>
  );
}
