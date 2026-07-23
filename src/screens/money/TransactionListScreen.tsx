import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, SafeAreaView, SectionList, Pressable, Modal, ScrollView } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, formatDateLabel, formatStoredTime, monthKey, shortMonthFromKey } from '@/utils/format';
import { listTransactions, getMonthSummary, listCategories, TransactionWithDetails, Category } from '@/db';
import { MoneyStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<MoneyStackParamList, 'TransactionList'>;
type TxType = 'all' | 'income' | 'expense' | 'transfer';

export default function TransactionListScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });

  // Filters (applied client-side over the already-loaded list; no extra DB work).
  const [filterOpen, setFilterOpen] = useState(false);
  const [fType, setFType] = useState<TxType>('all');
  const [fCategory, setFCategory] = useState<string | null>(null);
  const [fMonth, setFMonth] = useState<string | null>(null);

  const load = useCallback(async () => {
    const tx = await listTransactions();
    setTransactions(tx);
    setCategories(await listCategories());
    setSummary(await getMonthSummary(monthKey()));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Distinct months present in the data, newest first, for the month filter.
  const months = useMemo(() => {
    const set = new Set(transactions.map(t => t.occurred_at.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  const activeCount = (fType !== 'all' ? 1 : 0) + (fCategory ? 1 : 0) + (fMonth ? 1 : 0);

  const filtered = useMemo(
    () => transactions.filter(t =>
      (fType === 'all' || t.type === fType) &&
      (!fCategory || t.category_id === fCategory) &&
      (!fMonth || t.occurred_at.startsWith(fMonth))
    ),
    [transactions, fType, fCategory, fMonth],
  );

  function clearFilters() { setFType('all'); setFCategory(null); setFMonth(null); }

  const sections = groupByDate(filtered);
  const filterCategoryName = fCategory ? categories.find(c => c.id === fCategory)?.name : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ ...typography.h1, color: colors.neutral900 }}>Transactions</Text>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Pressable onPress={() => setFilterOpen(true)} hitSlop={6} accessibilityLabel="Filter transactions">
            <Feather name="sliders" size={20} color={activeCount > 0 ? colors.accent500 : colors.neutral900} />
            {activeCount > 0 && (
              <View style={{ position: 'absolute', top: -5, right: -6, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>{activeCount}</Text>
              </View>
            )}
          </Pressable>
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

      {activeCount > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingBottom: 12 }}>
          {fType !== 'all' && <FilterChip label={fType[0].toUpperCase() + fType.slice(1)} onClear={() => setFType('all')} colors={colors} typography={typography} />}
          {fMonth && <FilterChip label={`${shortMonthFromKey(fMonth)} ${fMonth.slice(0, 4)}`} onClear={() => setFMonth(null)} colors={colors} typography={typography} />}
          {filterCategoryName && <FilterChip label={filterCategoryName} onClear={() => setFCategory(null)} colors={colors} typography={typography} />}
          <Pressable onPress={clearFilters} hitSlop={6}>
            <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>Clear all</Text>
          </Pressable>
        </View>
      )}

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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Feather name="filter" size={40} color={colors.neutral400} />}
          title="No matching transactions"
          description="No transactions match the filters you've applied. Try widening or clearing them."
          actionLabel="Clear filters"
          onAction={clearFilters}
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
                {/* Category is the title; note (preview) + time + account form the subtitle. */}
                <Text
                  style={{ ...typography.bodyMedium, color: colors.neutral900 }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.category_name || (item.type === 'transfer' ? 'Transfer' : 'Transaction')}
                </Text>
                <Text style={{ ...typography.bodySmall, color: colors.neutral400 }} numberOfLines={1} ellipsizeMode="tail">
                  {[formatStoredTime(item.occurred_at), item.note || item.account_name].filter(Boolean).join(' · ')}
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

      <Modal visible={filterOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,18,22,0.45)', justifyContent: 'flex-end' }} onPress={() => setFilterOpen(false)}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingBottom: 32, maxHeight: '82%' }}>
            <View style={{ width: 36, height: 4, backgroundColor: colors.neutral200, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 }}>
              <Text style={{ ...typography.h3, color: colors.neutral900 }}>Filters</Text>
              {activeCount > 0 && (
                <Pressable onPress={clearFilters} hitSlop={6}>
                  <Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>Clear all</Text>
                </Pressable>
              )}
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
              <FilterLabel text="Type" colors={colors} typography={typography} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {(['all', 'expense', 'income', 'transfer'] as TxType[]).map(t => (
                  <SelectPill key={t} label={t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)} selected={fType === t} onPress={() => setFType(t)} colors={colors} radius={radius} typography={typography} />
                ))}
              </View>

              {months.length > 0 && (
                <>
                  <FilterLabel text="Month" colors={colors} typography={typography} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                    <SelectPill label="All" selected={fMonth === null} onPress={() => setFMonth(null)} colors={colors} radius={radius} typography={typography} />
                    {months.map(m => (
                      <SelectPill key={m} label={`${shortMonthFromKey(m)} ${m.slice(0, 4)}`} selected={fMonth === m} onPress={() => setFMonth(m)} colors={colors} radius={radius} typography={typography} />
                    ))}
                  </View>
                </>
              )}

              {fType !== 'transfer' && categories.length > 0 && (
                <>
                  <FilterLabel text="Category" colors={colors} typography={typography} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                    <SelectPill label="All" selected={fCategory === null} onPress={() => setFCategory(null)} colors={colors} radius={radius} typography={typography} />
                    {categories.map(c => (
                      <SelectPill key={c.id} label={c.name} icon={c.icon} iconColor={c.color} selected={fCategory === c.id} onPress={() => setFCategory(c.id)} colors={colors} radius={radius} typography={typography} />
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
            <View style={{ paddingHorizontal: 24, paddingTop: 12 }}>
              <Pressable onPress={() => setFilterOpen(false)} style={{ height: 50, borderRadius: radius.lg, backgroundColor: colors.accent500, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ ...typography.button, color: '#FFFFFF' }}>Show {filtered.length} result{filtered.length === 1 ? '' : 's'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function FilterLabel({ text, colors, typography }: { text: string; colors: any; typography: any }) {
  return <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase', marginBottom: 10 }}>{text}</Text>;
}

function FilterChip({ label, onClear, colors, typography }: { label: string; onClear: () => void; colors: any; typography: any }) {
  return (
    <Pressable onPress={onClear} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 5, paddingLeft: 12, paddingRight: 9, borderRadius: 16, backgroundColor: colors.accentTint }}>
      <Text style={{ ...typography.caption, fontWeight: '600', color: colors.accent500 }}>{label}</Text>
      <Feather name="x" size={13} color={colors.accent500} />
    </Pressable>
  );
}

function SelectPill({ label, icon, iconColor, selected, onPress, colors, radius, typography }: { label: string; icon?: string; iconColor?: string; selected: boolean; onPress: () => void; colors: any; radius: any; typography: any }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: selected ? colors.neutral900 : colors.neutral50 }}
    >
      {icon && <Feather name={mapIcon(icon)} size={14} color={selected ? colors.neutral0 : (iconColor ?? colors.neutral500)} />}
      <Text style={{ ...typography.bodySmallMedium, color: selected ? colors.neutral0 : colors.neutral700 }}>{label}</Text>
    </Pressable>
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
