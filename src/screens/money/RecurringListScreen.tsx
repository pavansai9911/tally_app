import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency } from '@/utils/format';
import { listRecurringRules, listCategories, RecurringRule, Category } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'RecurringList'>;

export default function RecurringListScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useFocusEffect(useCallback(() => {
    listRecurringRules().then(setRules);
    listCategories().then(setCategories);
  }, []));

  const monthlyTotal = rules
    .filter(r => r.type === 'expense' && r.frequency === 'monthly')
    .reduce((s, r) => s + r.amount, 0);

  const expenseRules = rules.filter(r => r.type === 'expense');
  const incomeRules = rules.filter(r => r.type === 'income');

  function categoryFor(r: RecurringRule) {
    return categories.find(c => c.id === r.category_id);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()}><Feather name="chevron-left" size={24} color={colors.neutral900} /></Pressable>
        <Text style={{ ...typography.h3, color: colors.neutral900 }}>Recurring</Text>
        <Pressable onPress={() => navigation.navigate('AddEditRecurring', undefined)}>
          <Feather name="plus" size={22} color={colors.accent500} />
        </Pressable>
      </View>

      {rules.length === 0 ? (
        <EmptyState
          icon={<Feather name="repeat" size={38} color={colors.neutral400} />}
          title="No recurring transactions"
          description="Add bills, subscriptions, or your salary so Tally can remind you and log them automatically"
          actionLabel="Add recurring"
          onAction={() => navigation.navigate('AddEditRecurring', undefined)}
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: colors.neutral50, borderRadius: radius.lg, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>Monthly recurring total</Text>
              <Text style={{ ...typography.h3, color: colors.neutral900, marginTop: 2 }}>{formatCurrency(monthlyTotal)}</Text>
            </View>
            <Feather name="repeat" size={22} color={colors.neutral400} />
          </View>

          {expenseRules.length > 0 && (
            <>
              <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>Upcoming</Text>
              {expenseRules.map(r => {
                const cat = categoryFor(r);
                return (
                  <Pressable key={r.id} onPress={() => navigation.navigate('AddEditRecurring', { id: r.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: colors.surfaceBorder }}>
                    <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: (cat?.color ?? colors.neutral400) + '22', alignItems: 'center', justifyContent: 'center' }}>
                      <Feather name={mapIcon(cat?.icon ?? 'ti-repeat')} size={18} color={cat?.color ?? colors.neutral500} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{r.name}</Text>
                      <Text style={{ ...typography.caption, color: colors.neutral400 }}>{r.frequency[0].toUpperCase() + r.frequency.slice(1)} · Next: {new Date(r.next_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                    </View>
                    <Text style={{ ...typography.bodySmallMedium, color: colors.expense }}>-{formatCurrency(r.amount)}</Text>
                  </Pressable>
                );
              })}
            </>
          )}

          {incomeRules.length > 0 && (
            <>
              <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 }}>Income</Text>
              {incomeRules.map(r => (
                <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: colors.incomeTint, alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name="briefcase" size={18} color={colors.income} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.bodyMedium, color: colors.neutral900 }}>{r.name}</Text>
                    <Text style={{ ...typography.caption, color: colors.neutral400 }}>{r.frequency[0].toUpperCase() + r.frequency.slice(1)} · Next: {new Date(r.next_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</Text>
                  </View>
                  <Text style={{ ...typography.bodySmallMedium, color: colors.income }}>+{formatCurrency(r.amount)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
