import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState, ProgressBar } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, monthKey } from '@/utils/format';
import { listBudgetsWithSpend, BudgetWithSpend } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'BudgetsList'>;

export default function BudgetsListScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);

  useFocusEffect(useCallback(() => { listBudgetsWithSpend(monthKey()).then(setBudgets); }, []));

  const totalLimit = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalLimit > 0 ? Math.min(1, totalSpent / totalLimit) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Budgets</Text>
        <Pressable onPress={() => navigation.navigate('AddEditBudget', undefined)}>
          <Feather name="plus" size={22} color={colors.accent500} />
        </Pressable>
      </View>

      {budgets.length === 0 ? (
        <EmptyState
          icon={<Feather name="pie-chart" size={38} color={colors.neutral400} />}
          title="No budgets set"
          description="Set spending limits for categories like Food or Shopping to stay on track each month"
          actionLabel="Create budget"
          onAction={() => navigation.navigate('AddEditBudget', undefined)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.neutral50, borderRadius: radius.lg, padding: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>This month's budget</Text>
              <Text style={{ ...typography.h2, color: colors.neutral900, marginTop: 2 }}>
                {formatCurrency(totalSpent)} <Text style={{ ...typography.bodySmallMedium, color: colors.neutral400 }}>of {formatCurrency(totalLimit)}</Text>
              </Text>
            </View>
            <Text style={{ ...typography.h3, color: colors.neutral900 }}>{Math.round(overallPct * 100)}%</Text>
          </View>

          {budgets.map(b => {
            const pct = b.spent / b.monthly_limit;
            const over = pct >= 1;
            const color = over ? colors.expense : pct > 0.8 ? colors.warning : colors.accent500;
            return (
              <Pressable key={b.id} onPress={() => navigation.navigate('BudgetDetail', { id: b.id })} style={{ paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: b.category_color + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={mapIcon(b.category_icon)} size={16} color={b.category_color} />
                    </View>
                    <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{b.category_name}</Text>
                  </View>
                  <Text style={{ ...typography.bodySmallMedium, color: over ? colors.expense : colors.neutral900 }}>
                    {formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}
                  </Text>
                </View>
                <ProgressBar progress={Math.min(1, pct)} color={color} />
                {over && (
                  <Text style={{ ...typography.caption, color: colors.expense, marginTop: 8 }}>
                    Over budget by {formatCurrency(b.spent - b.monthly_limit)}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
