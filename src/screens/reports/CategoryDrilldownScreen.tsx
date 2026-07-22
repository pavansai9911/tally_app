import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateTimeLabel } from '@/utils/format';
import { listTransactions, listCategories, getExpenseBreakdownByCategory, TransactionWithDetails, Category } from '@/db';
import { ReportsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'CategoryDrilldown'>;

export default function CategoryDrilldownScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const { categoryId, monthKey: mk } = route.params;
  const [category, setCategory] = useState<Category | null>(null);
  const [txs, setTxs] = useState<TransactionWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [pctOfTotal, setPctOfTotal] = useState(0);

  useEffect(() => {
    (async () => {
      const cats = await listCategories();
      setCategory(cats.find(c => c.id === categoryId) ?? null);
      const all = await listTransactions();
      const filtered = all.filter(t => t.category_id === categoryId && t.occurred_at.startsWith(mk));
      setTxs(filtered);
      const myTotal = filtered.reduce((s, t) => s + t.amount, 0);
      setTotal(myTotal);
      const breakdown = await getExpenseBreakdownByCategory(mk);
      const grand = breakdown.reduce((s, b) => s + b.total, 0);
      setPctOfTotal(grand > 0 ? Math.round((myTotal / grand) * 100) : 0);
    })();
  }, [categoryId, mk]);

  if (!category) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: category.color + '22', alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={mapIcon(category.icon)} size={22} color={category.color} />
        </View>
        <View>
          <Text style={{ ...typography.h2, color: colors.neutral900 }}>{category.name}</Text>
          <Text style={{ ...typography.bodySmall, color: colors.neutral400 }}>{pctOfTotal}% of expenses</Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.neutral900 }}>{formatCurrency(total)}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>{txs.length} transactions</Text>
        {txs.map(t => (
          <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={mapIcon(category.icon)} size={16} color={colors.neutral500} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }} numberOfLines={1} ellipsizeMode="tail">{t.note || category.name}</Text>
              <Text style={{ ...typography.caption, color: colors.neutral400 }}>{formatDateTimeLabel(t.occurred_at)}</Text>
            </View>
            <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{formatCurrency(t.amount)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
