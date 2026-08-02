import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, monthKey } from '@/utils/format';
import { periodStartKey, periodLabel } from '@/utils/period';
import { getExpenseBreakdownByCategory, getExpenseBreakdownByRange, CategoryBreakdown } from '@/db';
import { ReportsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'ExpenseCategories'>;

/**
 * Full expense-by-category breakdown for the selected period (every category, highest→lowest %).
 * Reached from the Reports donut's "Remaining" line and the "Total" centre. Tapping a category
 * opens its transactions (CategoryDrilldown), keeping the same period.
 */
export default function ExpenseCategoriesScreen({ navigation, route }: Props) {
  const { colors, typography, radius } = useTheme();
  const { period } = route.params;
  const [rows, setRows] = useState<CategoryBreakdown[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const data = period === 'month'
        ? await getExpenseBreakdownByCategory(monthKey())
        : await getExpenseBreakdownByRange(periodStartKey(period));
      setRows(data); // already ordered by total DESC
    })();
  }, [period]));

  const total = rows.reduce((s, r) => s + r.total, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Expense breakdown</Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 }}>
        <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase' }}>Total · {periodLabel(period)}</Text>
        <Text style={{ fontSize: 28, fontWeight: '700', color: colors.neutral900, marginTop: 4 }}>{formatCurrency(total)}</Text>
      </View>

      {rows.length === 0 ? (
        <EmptyState icon={<Feather name="pie-chart" size={38} color={colors.neutral400} />} title="No expenses in this period" description="Log some expenses and they'll break down by category here." />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
          <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 8 }}>{rows.length} categories</Text>
          {rows.map(r => (
            <Pressable
              key={r.category_id}
              onPress={() => navigation.navigate('CategoryDrilldown', { categoryId: r.category_id, period })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}
            >
              <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: r.category_color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={mapIcon(r.category_icon)} size={18} color={r.category_color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }} numberOfLines={1} ellipsizeMode="tail">{r.category_name}</Text>
                <Text style={{ ...typography.caption, color: colors.neutral400 }}>{formatCurrency(r.total)}</Text>
              </View>
              {/* Percentage bar + value give a quick sense of relative size. */}
              <View style={{ width: 64, marginRight: 8 }}>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.neutral100, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(pct(r.total), 2)}%`, height: '100%', backgroundColor: r.category_color }} />
                </View>
              </View>
              <Text style={{ ...typography.bodySmallMedium, color: colors.neutral500, width: 38, textAlign: 'right' }}>{pct(r.total)}%</Text>
              <Feather name="chevron-right" size={16} color={colors.neutral300} />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
