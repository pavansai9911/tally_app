import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateTimeLabel } from '@/utils/format';
import { getDb, getAccount, listTransactions, Account, TransactionWithDetails } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'AccountDetail'>;

export default function AccountDetailScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const [account, setAccount] = useState<Account | null>(null);
  const [txs, setTxs] = useState<TransactionWithDetails[]>([]);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    (async () => {
      const acc = await getAccount(route.params.id);
      setAccount(acc);
      const all = await listTransactions();
      const filtered = all.filter(t => t.account_id === route.params.id);
      setTxs(filtered.slice(0, 10));
      const db = await getDb();
      const row = await db.getFirstAsync<{ bal: number }>(
        `SELECT (a.starting_balance + COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount ELSE 0 END) FROM transactions t WHERE t.account_id = a.id), 0)) as bal FROM accounts a WHERE a.id = ?`,
        [route.params.id]
      );
      setBalance(row?.bal ?? 0);
    })();
  }, [route.params.id]);

  if (!account) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }} />;

  const inflow = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const outflow = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Feather name="more-horizontal" size={20} color={colors.neutral900} />
      </View>

      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: account.color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Feather name={mapIcon(account.icon)} size={26} color={account.color} />
        </View>
        <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{account.name}</Text>
        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.neutral900, marginTop: 4 }}>{formatCurrency(balance)}</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral400, marginTop: 4 }}>{account.type[0].toUpperCase() + account.type.slice(1)} account</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 16 }}>
        <View style={{ flex: 1, padding: 12, backgroundColor: colors.incomeTint, borderRadius: radius.lg, alignItems: 'center' }}>
          <Text style={{ ...typography.caption, color: colors.income, textTransform: 'uppercase' }}>In</Text>
          <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{formatCurrency(inflow)}</Text>
        </View>
        <View style={{ flex: 1, padding: 12, backgroundColor: colors.expenseTint, borderRadius: radius.lg, alignItems: 'center' }}>
          <Text style={{ ...typography.caption, color: colors.expense, textTransform: 'uppercase' }}>Out</Text>
          <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{formatCurrency(outflow)}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 8 }}>Recent activity</Text>
        {txs.map(t => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: (t.category_color ?? colors.neutral400) + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(t.category_icon ?? 'ti-dots')} size={18} color={t.category_color ?? colors.neutral500} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }} numberOfLines={1} ellipsizeMode="tail">{t.note || t.category_name}</Text>
              <Text style={{ ...typography.caption, color: colors.neutral400 }}>{formatDateTimeLabel(t.occurred_at)}</Text>
            </View>
            <Text style={{ ...typography.bodySmallMedium, color: t.type === 'income' ? colors.income : colors.expense }}>
              {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).replace('-', '')}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ paddingHorizontal: 24, paddingBottom: 36 }}>
        <Button label="Edit account" variant="secondary" onPress={() => navigation.navigate('AddEditAccount', { id: account.id })} />
      </View>
    </SafeAreaView>
  );
}
