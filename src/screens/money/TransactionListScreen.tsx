import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, SectionList, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateLabel, monthKey } from '@/utils/format';
import { listTransactions, getMonthSummary, TransactionWithDetails } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'TransactionList'>;

export default function TransactionListScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });

  const load = useCallback(async () => {
    const tx = await listTransactions();
    setTransactions(tx);
    setSummary(await getMonthSummary(monthKey()));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = groupByDate(transactions);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...typography.h1, color: colors.neutral900 }}>Transactions</Text>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Feather name="search" size={20} color={colors.neutral900} />
          <Pressable onPress={() => navigation.navigate('CategoriesList')}>
            <Feather name="grid" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('AccountsList')}>
            <Feather name="home" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('BudgetsList')}>
            <Feather name="pie-chart" size={20} color={colors.neutral900} />
          </Pressable>
          <Pressable onPress={() => navigation.navigate('RecurringList')}>
            <Feather name="repeat" size={20} color={colors.neutral900} />
          </Pressable>
        </View>
      </View>

      {transactions.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 12 }}>
          <View style={{ flex: 1, padding: 12, backgroundColor: colors.incomeTint, borderRadius: radius.lg }}>
            <Text style={{ ...typography.caption, color: colors.income, textTransform: 'uppercase' }}>Income</Text>
            <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{formatCurrency(summary.income)}</Text>
          </View>
          <View style={{ flex: 1, padding: 12, backgroundColor: colors.expenseTint, borderRadius: radius.lg }}>
            <Text style={{ ...typography.caption, color: colors.expense, textTransform: 'uppercase' }}>Expense</Text>
            <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{formatCurrency(summary.expense)}</Text>
          </View>
        </View>
      )}

      {transactions.length === 0 ? (
        <EmptyState
          icon={<Feather name="file-text" size={40} color={colors.neutral400} />}
          title="No transactions yet"
          description="Log your first expense or income to start seeing your spending take shape"
          actionLabel="Add transaction"
          onAction={() => navigation.navigate('AddEditTransaction', undefined)}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
          renderSectionHeader={({ section }) => (
            <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
            >
              <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: item.category_color ? item.category_color + '22' : colors.neutral50, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={mapIcon(item.category_icon ?? 'ti-dots')} size={19} color={item.category_color ?? colors.neutral500} />
              </View>
              <View style={{ flex: 1 }}>
                {/* Long notes are previewed on a single line here; the full note is on the detail screen. */}
                <Text
                  style={{ ...typography.bodyMedium, color: colors.neutral900 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.note || item.category_name || 'Transaction'}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.neutral400 }} numberOfLines={1} ellipsizeMode="tail">
                  {item.category_name ?? item.type} · {item.account_name}
                </Text>
              </View>
              <Text style={{ ...typography.bodyMedium, fontWeight: '600', color: item.type === 'income' ? colors.income : item.type === 'expense' ? colors.expense : colors.neutral900 }}>
                {item.type === 'income' ? '+' : item.type === 'expense' ? '-' : ''}{formatCurrency(item.amount).replace('-', '')}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('AddEditTransaction', undefined)}
        style={{
          position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5,
        }}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

function groupByDate(transactions: TransactionWithDetails[]) {
  const groups: Record<string, TransactionWithDetails[]> = {};
  for (const t of transactions) {
    const label = formatDateLabel(t.occurred_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}
