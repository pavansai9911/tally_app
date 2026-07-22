import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { EmptyState } from '@/components/ui';
import { SwipeTabView } from '@/components/SwipeTabView';
import { DonutChart, GroupedBarChart, TrendLineChart, Heatmap } from '@/components/charts';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, monthKey, todayKey, toDateKey, parseDateKey, shortMonthFromKey } from '@/utils/format';
import {
  getMonthSummary, getExpenseBreakdownByCategory, getMonthlyTrend,
  listHabits, calculateStreaks, getLogsInRange,
} from '@/db';
import { exportTransactionsCsv } from '@/services/backup';
import { ReportsStackParamList } from '@/navigation/RootNavigator';

type Props = NativeStackScreenProps<ReportsStackParamList, 'Reports'>;

function lastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(monthKey(dt));
  }
  return keys;
}

export default function ReportsScreen({ navigation }: Props) {
  const { colors, typography, radius } = useTheme();
  const [tab, setTab] = useState<'money' | 'habits'>('money');

  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [breakdown, setBreakdown] = useState<Awaited<ReturnType<typeof getExpenseBreakdownByCategory>>>([]);
  const [trend, setTrend] = useState<{ income: number; expense: number }[]>([]);
  const [monthLabels, setMonthLabels] = useState<string[]>([]);
  const [balanceSeries, setBalanceSeries] = useState<number[]>([]);

  const [habitStats, setHabitStats] = useState({ rate: 0, bestStreak: 0, activeCount: 0 });
  const [heatCells, setHeatCells] = useState<Array<{ date: string; intensity: 0 | 1 | 2 | 3 }>>([]);
  const [leaderboard, setLeaderboard] = useState<Array<{ id: string; name: string; icon: string; color: string; streak: number }>>([]);

  const loadMoney = useCallback(async () => {
    const mk = monthKey();
    setSummary(await getMonthSummary(mk));
    setBreakdown(await getExpenseBreakdownByCategory(mk));
    const keys = lastNMonthKeys(6);
    setMonthLabels(keys.map(k => shortMonthFromKey(k)));
    const months = await getMonthlyTrend(keys);
    setTrend(months);

    let cumulative = 0;
    const series = months.map(m => { cumulative += m.net; return cumulative; });
    setBalanceSeries(series.length > 0 ? series : [0]);
  }, []);

  const loadHabits = useCallback(async () => {
    const habits = await listHabits();
    const today = todayKey();
    const withStreaks = await Promise.all(habits.map(async h => ({ h, s: await calculateStreaks(h, today) })));
    const avgRate = withStreaks.length > 0 ? Math.round(withStreaks.reduce((s, x) => s + x.s.rate30d, 0) / withStreaks.length) : 0;
    const bestStreak = withStreaks.reduce((m, x) => Math.max(m, x.s.longest), 0);
    setHabitStats({ rate: avgRate, bestStreak, activeCount: habits.length });

    setLeaderboard(
      withStreaks
        .map(x => ({ id: x.h.id, name: x.h.name, icon: x.h.icon, color: x.h.color, streak: x.s.current }))
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 5)
    );

    // Build a 16-week heatmap ending today across all habits combined (any 'done' that day = intensity)
    if (habits.length > 0) {
      const start = new Date();
      start.setDate(start.getDate() - 16 * 7);
      const cells: Array<{ date: string; intensity: 0 | 1 | 2 | 3 }> = [];
      const allLogs = await Promise.all(habits.map(h => getLogsInRange(h.id, toDateKey(start), today)));
      const countByDate = new Map<string, number>();
      allLogs.flat().forEach(l => {
        if (l.status === 'done') countByDate.set(l.log_date, (countByDate.get(l.log_date) ?? 0) + 1);
      });
      for (let d = new Date(start); d <= parseDateKey(today); d.setDate(d.getDate() + 1)) {
        const dStr = toDateKey(d);
        const count = countByDate.get(dStr) ?? 0;
        const intensity: 0 | 1 | 2 | 3 = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3;
        cells.push({ date: dStr, intensity });
      }
      setHeatCells(cells);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMoney(); loadHabits(); }, [loadMoney, loadHabits]));

  const hasMoneyData = summary.income > 0 || summary.expense > 0;
  const hasHabitsData = leaderboard.some(l => l.streak > 0) || habitStats.activeCount > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surfaceCard }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12 }}>
        <Text style={{ ...typography.h1, color: colors.neutral900 }}>Reports</Text>
        <Pressable onPress={() => exportTransactionsCsv().catch(() => {})} hitSlop={8} accessibilityLabel="Export transactions as CSV">
          <Feather name="share" size={19} color={colors.neutral900} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 16, gap: 8 }}>
        <Pressable onPress={() => setTab('money')} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tab === 'money' ? colors.neutral900 : colors.neutral50 }}>
          <Text style={{ ...typography.bodySmallMedium, color: tab === 'money' ? colors.neutral0 : colors.neutral600 }}>Money</Text>
        </Pressable>
        <Pressable onPress={() => setTab('habits')} style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18, backgroundColor: tab === 'habits' ? colors.neutral900 : colors.neutral50 }}>
          <Text style={{ ...typography.bodySmallMedium, color: tab === 'habits' ? colors.neutral0 : colors.neutral600 }}>Habits</Text>
        </Pressable>
      </View>

      <SwipeTabView index={tab === 'money' ? 0 : 1} onIndexChange={(i) => setTab(i === 0 ? 'money' : 'habits')}>
        {(
        !hasMoneyData ? (
          <EmptyState icon={<Feather name="bar-chart-2" size={40} color={colors.neutral400} />} title="Not enough data yet" description="Log a few transactions and reports will start showing trends, breakdowns, and insights" />
        ) : (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
              <SummaryTile label="Income" value={formatCurrency(summary.income)} bg={colors.incomeTint} fg={colors.income} />
              <SummaryTile label="Expense" value={formatCurrency(summary.expense)} bg={colors.expenseTint} fg={colors.expense} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <SummaryTile label="Net" value={`${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net)}`} bg={colors.accentTint} fg={colors.accent500} />
              <SummaryTile label="Savings rate" value={summary.income > 0 ? `${Math.round((summary.net / summary.income) * 100)}%` : '—'} bg={colors.neutral50} fg={colors.neutral600} />
            </View>

            <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 14 }}>Expense breakdown</Text>
            {breakdown.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 24 }}>
                <DonutChart
                  data={breakdown.map(b => ({ value: b.total, color: b.category_color }))}
                  centerLabel="Total"
                  centerValue={formatCurrency(breakdown.reduce((s, b) => s + b.total, 0))}
                  onSlicePress={(i) => {
                    const b = breakdown[i];
                    if (b) navigation.navigate('CategoryDrilldown', { categoryId: b.category_id, monthKey: monthKey() });
                  }}
                />
                <View style={{ flex: 1, gap: 9 }}>
                  {breakdown.slice(0, 4).map(b => {
                    const total = breakdown.reduce((s, x) => s + x.total, 0);
                    return (
                      <Pressable key={b.category_id} onPress={() => navigation.navigate('CategoryDrilldown', { categoryId: b.category_id, monthKey: monthKey() })} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                          <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: b.category_color }} />
                          <Text style={{ ...typography.bodySmall, color: colors.neutral900 }}>{b.category_name}</Text>
                        </View>
                        <Text style={{ ...typography.caption, color: colors.neutral500, fontWeight: '600' }}>{Math.round((b.total / total) * 100)}%</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 14 }}>Income vs Expense</Text>
            <GroupedBarChart
              data={monthLabels.map((label, i) => ({ label, a: trend[i]?.income ?? 0, b: trend[i]?.expense ?? 0 }))}
              barColorA={colors.income}
              barColorB={colors.expense}
            />
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 8, marginBottom: 24 }}>
              <LegendDot color={colors.income} label="Income" />
              <LegendDot color={colors.expense} label="Expense" />
            </View>

            <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 6 }}>Balance trend</Text>
            <TrendLineChart points={balanceSeries} color={colors.accent500} fillColor={colors.accentTint} />
          </ScrollView>
        )
      )}
        {(
        !hasHabitsData ? (
        <EmptyState icon={<Feather name="zap" size={40} color={colors.neutral400} />} title="No streaks yet" description="Check in on a habit a few times and your heatmap and stats will start filling in here" />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 18 }}>
            <SummaryTile label="This month" value={`${habitStats.rate}%`} bg={colors.incomeTint} fg={colors.income} />
            <SummaryTile label="Best streak" value={String(habitStats.bestStreak)} bg={colors.warningTint} fg={colors.warning} />
            <SummaryTile label="Active habits" value={String(habitStats.activeCount)} bg={colors.accentTint} fg={colors.accent500} />
          </View>

          <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 10 }}>Activity</Text>
          {heatCells.length > 0 && (
            <Heatmap cells={heatCells} weeks={16} color4={[colors.neutral100, '#C8E6D7', '#7FC9A4', colors.income]} />
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 10, marginBottom: 20 }}>
            <Text style={{ fontSize: 10, color: colors.neutral400 }}>Less</Text>
            {[colors.neutral100, '#C8E6D7', '#7FC9A4', colors.income].map((c, i) => (
              <View key={i} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
            ))}
            <Text style={{ fontSize: 10, color: colors.neutral400 }}>More</Text>
          </View>

          <Text style={{ ...typography.h2, color: colors.neutral900, marginBottom: 12 }}>Streak leaderboard</Text>
          {leaderboard.map((h, i) => (
            <Pressable key={h.id} onPress={() => navigation.navigate('SingleHabitReport', { habitId: h.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i === leaderboard.length - 1 ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: i === 0 ? colors.warning : colors.neutral400, width: 18 }}>{i + 1}</Text>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: h.color + '22', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={mapIcon(h.icon)} size={15} color={h.color} />
              </View>
              <Text style={{ flex: 1, ...typography.bodySmallMedium, color: colors.neutral900 }}>{h.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="zap" size={13} color={colors.income} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.income }}>{h.streak}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )
      )}
      </SwipeTabView>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  const { colors, typography, radius } = useTheme();
  return (
    <View style={{ flex: 1, padding: 14, backgroundColor: bg, borderRadius: radius.lg }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: fg, textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ ...typography.amountMedium, color: colors.neutral900, marginTop: 4 }}>{value}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: colors.neutral500 }}>{label}</Text>
    </View>
  );
}
