import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect, useNavigation, CompositeNavigationProp, ParamListBase } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { ProgressBar } from '@/components/ui';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, monthKey, todayKey, formatWeekdayLong } from '@/utils/format';
import {
  getMonthSummary, getTotalBalance, listBudgetsWithSpend, listTransactions,
  getTodayHabitsWithStatus, upsertLog, deleteLog,
  MonthSummary, BudgetWithSpend, TransactionWithDetails,
} from '@/db';
import { RootStackParamList } from '@/navigation/RootNavigator';

type Nav = CompositeNavigationProp<BottomTabNavigationProp<ParamListBase>, NativeStackNavigationProp<RootStackParamList>>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, typography, radius, isDark } = useTheme();
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expense: 0, net: 0 });
  const [totalBalance, setTotalBalance] = useState(0);
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [habits, setHabits] = useState<Awaited<ReturnType<typeof getTodayHabitsWithStatus>>>([]);
  const [recentTx, setRecentTx] = useState<TransactionWithDetails[]>([]);

  const load = useCallback(async () => {
    setSummary(await getMonthSummary(monthKey()));
    setTotalBalance(await getTotalBalance());
    setBudgets((await listBudgetsWithSpend(monthKey())).slice(0, 2));
    setHabits(await getTodayHabitsWithStatus(todayKey()));
    setRecentTx((await listTransactions(5)));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleHabit(h: any) {
    if (h.log?.status === 'done') await deleteLog(h.id, todayKey());
    else await upsertLog(h.id, todayKey(), 'done', 1);
    load();
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const isEmpty = recentTx.length === 0 && budgets.length === 0 && habits.length === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}>
        <View>
          <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{formatWeekdayLong()}</Text>
          <Text style={{ ...typography.h1, color: colors.neutral900 }}>{greeting}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate('Settings')} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceCard : colors.neutral900, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="settings" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ backgroundColor: isDark ? colors.surfaceCard : colors.neutral900, borderRadius: radius.xl, padding: 20, marginBottom: 16 }}>
          <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase' }}>Total balance</Text>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 6, marginBottom: isEmpty ? 0 : 16 }}>{formatCurrency(totalBalance)}</Text>
          {!isEmpty && (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <MiniStat label="Income" value={formatCurrency(summary.income)} icon="arrow-down-left" bg="#13301F" fg={colors.income} />
              <MiniStat label="Expense" value={formatCurrency(summary.expense)} icon="arrow-up-right" bg="#3A1816" fg={colors.expense} />
              <MiniStat label="Net" value={`${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net)}`} icon="trending-up" bg="#1B2040" fg="#5B79FF" />
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <Pressable onPress={() => navigation.navigate('Money', { screen: 'AddEditTransaction' })} style={{ flex: 1, height: 44, backgroundColor: colors.surfaceCard, borderWidth: 0.5, borderColor: colors.surfaceBorder, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Feather name="plus" size={16} color={colors.accent500} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>Transaction</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Habits', { screen: 'HabitList' })} style={{ flex: 1, height: 44, backgroundColor: colors.surfaceCard, borderWidth: 0.5, borderColor: colors.surfaceBorder, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Feather name="check-square" size={16} color={colors.income} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>Check-in</Text>
          </Pressable>
        </View>

        <SectionHeader title="Budget progress" onPress={() => navigation.navigate('Money', { screen: 'BudgetsList' })} />
        {budgets.length === 0 ? (
          <EmptyCard icon="pie-chart" title="No budgets yet" subtitle="Set spending limits to see progress here" />
        ) : (
          <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: 16, marginBottom: 18 }}>
            {budgets.map((b, i) => {
              const pct = b.spent / b.monthly_limit;
              return (
                <View key={b.id} style={{ marginBottom: i === budgets.length - 1 ? 0 : 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{b.category_name}</Text>
                    <Text style={{ ...typography.caption, color: pct >= 1 ? colors.expense : colors.neutral500 }}>{formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}</Text>
                  </View>
                  <ProgressBar progress={Math.min(1, pct)} color={pct >= 1 ? colors.expense : colors.accent500} />
                </View>
              );
            })}
          </View>
        )}

        <SectionHeader title="Today's habits" onPress={() => navigation.navigate('Habits', { screen: 'HabitList' })} />
        {habits.length === 0 ? (
          <EmptyCard icon="check-square" title="No habits scheduled today" subtitle="Add a habit to start building streaks" />
        ) : (
          <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, paddingHorizontal: 16, marginBottom: 18 }}>
            {habits.map((h, i) => {
              const done = h.log?.status === 'done';
              return (
                <Pressable key={h.id} onPress={() => toggleHabit(h)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === habits.length - 1 ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: done ? colors.income : 'transparent', borderWidth: done ? 0 : 2, borderColor: colors.neutral200, alignItems: 'center', justifyContent: 'center' }}>
                    {done && <Feather name="check" size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={{ flex: 1, ...typography.bodySmallMedium, color: colors.neutral900, textDecorationLine: done ? 'line-through' : 'none', opacity: done ? 0.6 : 1 }}>{h.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Feather name="zap" size={12} color={h.streak > 0 ? colors.income : colors.warning} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: h.streak > 0 ? colors.income : colors.warning }}>{h.streak}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <SectionHeader title="Recent transactions" onPress={() => navigation.navigate('Money', { screen: 'TransactionList' })} />
        {recentTx.length === 0 ? (
          <EmptyCard icon="file-text" title="No transactions yet" subtitle="Your recent activity will show up here" />
        ) : (
          <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, paddingHorizontal: 16 }}>
            {recentTx.map((t, i) => (
              <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === recentTx.length - 1 ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: (t.category_color ?? colors.neutral400) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={mapIcon(t.category_icon ?? 'ti-dots')} size={14} color={t.category_color ?? colors.neutral500} />
                </View>
                <Text style={{ flex: 1, ...typography.bodySmallMedium, color: colors.neutral900 }}>{t.note || t.category_name}</Text>
                <Text style={{ ...typography.bodySmallMedium, color: t.type === 'income' ? colors.income : colors.expense }}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount).replace('-', '')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value, icon, bg, fg }: { label: string; value: string; icon: string; bg: string; fg: string }) {
  return (
    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={14} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 10, color: '#8A93A0' }} numberOfLines={1}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress: () => void }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <Text style={{ ...typography.h2, color: colors.neutral900 }}>{title}</Text>
      <Pressable onPress={onPress}><Text style={{ ...typography.bodySmallMedium, color: colors.accent500 }}>View all</Text></Pressable>
    </View>
  );
}

function EmptyCard({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.xl, padding: 24, alignItems: 'center', marginBottom: 18 }}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.neutral50, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <Feather name={icon} size={24} color={colors.neutral400} />
      </View>
      <Text style={{ ...typography.bodyMedium, color: colors.neutral900, marginBottom: 4 }}>{title}</Text>
      <Text style={{ ...typography.caption, color: colors.neutral400 }}>{subtitle}</Text>
    </View>
  );
}
