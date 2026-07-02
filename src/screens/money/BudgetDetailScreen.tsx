import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { ProgressBar } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateLabel, monthKey } from '@/utils/format';
import { listBudgetsWithSpend, listTransactions, BudgetWithSpend, TransactionWithDetails } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'BudgetDetail'>;

export default function BudgetDetailScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const [budget, setBudget] = useState<BudgetWithSpend | null>(null);
  const [txs, setTxs] = useState<TransactionWithDetails[]>([]);

  useEffect(() => {
    (async () => {
      const budgets = await listBudgetsWithSpend(monthKey());
      const b = budgets.find(x => x.id === route.params.id) ?? null;
      setBudget(b);
      if (b) {
        const all = await listTransactions();
        setTxs(all.filter(t => t.category_id === b.category_id && t.type === 'expense'));
      }
    })();
  }, [route.params.id]);

  if (!budget) return <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} />;

  const pct = budget.spent / budget.monthly_limit;
  const remaining = budget.monthly_limit - budget.spent;
  const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Pressable onPress={() => navigation.navigate('AddEditBudget', { id: budget.id })}><Feather name="edit-2" size={20} color={colors.neutral900} /></Pressable>
      </View>

      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: budget.category_color + '22', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
          <Feather name={mapIcon(budget.category_icon)} size={26} color={budget.category_color} />
        </View>
        <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{budget.category_name}</Text>
        <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>Monthly budget</Text>
      </View>

      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 30, fontWeight: '700', color: colors.neutral900, textAlign: 'center' }}>
          {formatCurrency(budget.spent)} <Text style={{ fontSize: 14, fontWeight: '400', color: colors.neutral400 }}>of {formatCurrency(budget.monthly_limit)}</Text>
        </Text>
        <View style={{ marginVertical: 12 }}>
          <ProgressBar progress={Math.min(1, pct)} color={pct >= 1 ? colors.expense : colors.accent500} />
        </View>
        <Text style={{ ...typography.bodySmall, color: colors.neutral500, textAlign: 'center', marginBottom: 20 }}>
          {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`} · {daysLeft} days remaining
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>Transactions in this category</Text>
        {txs.map(t => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(t.category_icon ?? 'ti-dots')} size={16} color={colors.neutral500} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{t.note || t.category_name}</Text>
              <Text style={{ ...typography.caption, color: colors.neutral400 }}>{formatDateLabel(t.occurred_at)}</Text>
            </View>
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{formatCurrency(t.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
