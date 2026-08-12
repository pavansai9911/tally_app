import React, { useCallback, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useFocusEffect, useNavigation, CompositeNavigationProp, ParamListBase } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { ProgressBar } from '@/components/ui';
import { TourTarget } from '@/tour/TourTarget';
import { useTour } from '@/tour/TourProvider';
import { AssistantFab } from '@/components/assistant/AssistantFab';
import { AssistantSheet } from '@/components/assistant/AssistantSheet';
import { PeriodMenu } from '@/components/PeriodMenu';
import { AccountMenu, AccountOption } from '@/components/AccountMenu';
import { mapIcon } from '@/utils/iconMap';
import { formatCurrency, monthKey, todayKey, formatWeekdayLong, formatStoredTime } from '@/utils/format';
import { PeriodKey, periodStartKey } from '@/utils/period';
import {
  getMonthSummary, getRangeSummary, getTotalBalance, getAccountBalance, listBudgetsWithSpend,
  listTransactions, listAccountTransactions, listAccounts, getTodayHabitsWithStatus, upsertLog, deleteLog,
  getSetting, setSetting, MonthSummary, BudgetWithSpend,
} from '@/db';
import { RootStackParamList } from '@/navigation/RootNavigator';

const DASHBOARD_ACCOUNT_KEY = 'dashboard_account';

// Unified recent-activity item so the same row renders whether we're showing all accounts or one
// (a transfer is 'in' for the receiving account and 'out' for the sending account).
type Recent = {
  id: string;
  title: string;
  icon: string;
  color: string | null;
  isTransfer: boolean;
  dir: 'in' | 'out';
  amount: number;
  note: string | null;
  occurred_at: string;
};

type Nav = CompositeNavigationProp<BottomTabNavigationProp<ParamListBase>, NativeStackNavigationProp<RootStackParamList>>;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, typography, radius, isDark } = useTheme();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { registerScroller, maybeAutoStart } = useTour();
  const scrollRef = React.useRef<ScrollView>(null);
  const scrollY = React.useRef(0);
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expense: 0, net: 0 });
  const [totalBalance, setTotalBalance] = useState(0);
  const [budgets, setBudgets] = useState<BudgetWithSpend[]>([]);
  const [habits, setHabits] = useState<Awaited<ReturnType<typeof getTodayHabitsWithStatus>>>([]);
  const [recentTx, setRecentTx] = useState<Recent[]>([]);
  // Hero income/expense/net window. Total balance always stays all-time regardless.
  const [period, setPeriod] = useState<PeriodKey>('month');
  // Home account filter (#9): null = All accounts. Persisted so it survives an app restart.
  const [account, setAccount] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // Recompute only the hero summary when the period/account changes (cheap, SQL-aggregated).
  const loadSummary = useCallback(async (p: PeriodKey, acc: string | null) => {
    setSummary(p === 'month'
      ? await getMonthSummary(monthKey(), acc ?? undefined)
      : await getRangeSummary(periodStartKey(p), acc ?? undefined));
  }, []);

  const load = useCallback(async () => {
    // Keep the account dropdown current (a new account should appear without an app restart).
    const accs = await listAccounts();
    setAccounts(accs.map(a => ({ id: a.id, name: a.name, icon: a.icon, color: a.color })));
    // If the filtered account was deleted, fall back to All so the dashboard never gets stuck.
    let acc = account;
    if (acc && !accs.some(a => a.id === acc)) {
      acc = null;
      setAccount(null);
      setSetting(DASHBOARD_ACCOUNT_KEY, 'all').catch(() => {});
    }
    await loadSummary(period, acc);
    // Balance + recents follow the selected account; budgets stay all-accounts.
    setTotalBalance(acc ? await getAccountBalance(acc) : await getTotalBalance());
    setBudgets((await listBudgetsWithSpend(monthKey())).slice(0, 2));
    setHabits(await getTodayHabitsWithStatus(todayKey()));
    if (acc) {
      const rows = await listAccountTransactions(acc, { limit: 5 });
      setRecentTx(rows.map(t => ({
        id: t.id,
        title: t.type === 'transfer'
          ? (t.counterparty_name ? `Transfer ${t.direction === 'out' ? 'to' : 'from'} ${t.counterparty_name}` : 'Transfer')
          : (t.category_name || (t.type === 'income' ? 'Income' : 'Transaction')),
        icon: t.category_icon ?? 'ti-dots',
        color: t.type === 'transfer' ? null : t.category_color,
        isTransfer: t.type === 'transfer',
        dir: t.direction,
        amount: t.amount,
        note: t.note,
        occurred_at: t.occurred_at,
      })));
    } else {
      const rows = await listTransactions(5);
      setRecentTx(rows.map(t => ({
        id: t.id,
        title: t.category_name || (t.type === 'transfer' ? 'Transfer' : 'Transaction'),
        icon: t.category_icon ?? 'ti-dots',
        color: t.category_color,
        isTransfer: t.type === 'transfer',
        dir: t.type === 'income' ? 'in' : 'out',
        amount: t.amount,
        note: t.note,
        occurred_at: t.occurred_at,
      })));
    }
  }, [loadSummary, period, account]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Load the account list + the persisted filter once. Refreshed accounts also come via load().
  React.useEffect(() => {
    (async () => {
      const accs = await listAccounts();
      setAccounts(accs.map(a => ({ id: a.id, name: a.name, icon: a.icon, color: a.color })));
      const saved = await getSetting(DASHBOARD_ACCOUNT_KEY);
      if (saved && saved !== 'all' && accs.some(a => a.id === saved)) setAccount(saved);
    })();
  }, []);

  const onChangeAccount = useCallback((id: string | null) => {
    setAccount(id);
    setSetting(DASHBOARD_ACCOUNT_KEY, id ?? 'all').catch(() => {});
  }, []);

  // Let the tour scroll Home so an off-screen highlight becomes visible.
  React.useEffect(() => {
    registerScroller((deltaY: number) => {
      const next = Math.max(0, scrollY.current + deltaY);
      scrollRef.current?.scrollTo({ y: next, animated: true });
    });
    return () => registerScroller(null);
  }, [registerScroller]);

  // First run after onboarding: start the product tour once.
  React.useEffect(() => {
    const t = setTimeout(() => maybeAutoStart(), 900);
    return () => clearTimeout(t);
  }, [maybeAutoStart]);

  async function toggleHabit(h: any) {
    if (h.log?.status === 'done') await deleteLog(h.id, todayKey());
    else await upsertLog(h.id, todayKey(), 'done', 1);
    load();
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  // Show the Overview (period/account dropdowns + income/expense/net) whenever the user has any
  // accounts — the controls must stay reachable even when the CURRENT (possibly account-filtered)
  // view has no transactions. Gating this on "is the filtered view empty" made the dropdowns
  // vanish after picking an account with no data, stranding the user.
  const showOverview = accounts.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutral50 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }}>
        <View>
          <Text style={{ ...typography.bodySmall, color: colors.neutral500 }}>{formatWeekdayLong()}</Text>
          <Text style={{ ...typography.h1, color: colors.neutral900 }}>{greeting}</Text>
        </View>
        <TourTarget id="home-settings">
          <Pressable onPress={() => navigation.navigate('Settings')} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: isDark ? colors.surfaceCard : colors.neutral900, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="settings" size={18} color="#FFFFFF" />
          </Pressable>
        </TourTarget>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 104 }}
      >
        <TourTarget id="home-hero" style={{ marginBottom: 16 }}>
        <Pressable
          onPress={() => navigation.navigate('Money', { screen: 'AccountsList' })}
          style={{ backgroundColor: isDark ? colors.neutral200 : colors.neutral900, borderRadius: radius.xl, padding: 20 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...typography.caption, color: colors.neutral400, textTransform: 'uppercase' }}>Total balance</Text>
            <Feather name="chevron-right" size={16} color={colors.neutral400} />
          </View>
          <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginTop: 6, marginBottom: showOverview ? 14 : 0 }}>{formatCurrency(totalBalance)}</Text>
          {showOverview && (
            <>
              {/* No "Overview" label (removed per BA). The account pill flex-shrinks and
                  ellipsizes a long name so the period pill never overflows the hero — all via
                  flexbox, so it adapts to any screen width / font scale with no hardcoded sizes. */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <AccountMenu accounts={accounts} value={account} onChange={onChangeAccount} variant="onDark" />
                <PeriodMenu value={period} onChange={setPeriod} variant="onDark" />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <MiniStat label="Income" value={formatCurrency(summary.income)} icon="arrow-down-left" bg="#13301F" fg={colors.income} />
                <MiniStat label="Expense" value={formatCurrency(summary.expense)} icon="arrow-up-right" bg="#3A1816" fg={colors.expense} />
                <MiniStat label="Net" value={`${summary.net >= 0 ? '+' : ''}${formatCurrency(summary.net)}`} icon="trending-up" bg="#1B2040" fg="#5B79FF" />
              </View>
            </>
          )}
        </Pressable>
        </TourTarget>

        <TourTarget id="home-quick-actions" style={{ marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => navigation.navigate('Money', { screen: 'AddEditTransaction' })} style={{ flex: 1, height: 44, backgroundColor: colors.surfaceCard, borderWidth: 0.5, borderColor: colors.surfaceBorder, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Feather name="plus" size={16} color={colors.accent500} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>Transaction</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Habits', { screen: 'HabitList' })} style={{ flex: 1, height: 44, backgroundColor: colors.surfaceCard, borderWidth: 0.5, borderColor: colors.surfaceBorder, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Feather name="check-square" size={16} color={colors.income} />
            <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>Check-in</Text>
          </Pressable>
        </View>
        </TourTarget>

        <SectionHeader title="Budget progress" onPress={() => navigation.navigate('Money', { screen: 'BudgetsList' })} />
        <TourTarget id="home-budgets">
        {budgets.length === 0 ? (
          <EmptyCard icon="pie-chart" title="No budgets yet" subtitle="Set spending limits to see progress here" />
        ) : (
          <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: 16, marginBottom: 18 }}>
            {budgets.map((b, i) => {
              const pct = b.spent / b.monthly_limit;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => navigation.navigate('Money', { screen: 'BudgetDetail', params: { id: b.id } })}
                  style={{ marginBottom: i === budgets.length - 1 ? 0 : 14 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }}>{b.category_name}</Text>
                    <Text style={{ ...typography.caption, color: pct >= 1 ? colors.expense : colors.neutral500 }}>{formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}</Text>
                  </View>
                  <ProgressBar progress={Math.min(1, pct)} color={pct >= 1 ? colors.expense : colors.accent500} />
                </Pressable>
              );
            })}
          </View>
        )}
        </TourTarget>

        <SectionHeader title="Today's habits" onPress={() => navigation.navigate('Habits', { screen: 'HabitList' })} />
        <TourTarget id="home-habits">
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

        </TourTarget>

        <SectionHeader title="Recent transactions" onPress={() => navigation.navigate('Money', { screen: 'TransactionList' })} />
        <TourTarget id="home-recent">
        {recentTx.length === 0 ? (
          <EmptyCard icon="file-text" title="No transactions yet" subtitle="Your recent activity will show up here" />
        ) : (
          <View style={{ backgroundColor: colors.surfaceCard, borderRadius: radius.lg, paddingHorizontal: 16 }}>
            {recentTx.map((t, i) => (
              <Pressable
                key={t.id}
                onPress={() => navigation.navigate('Money', { screen: 'TransactionDetail', params: { id: t.id } })}
                accessibilityRole="button"
                accessibilityLabel={`View ${t.title}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i === recentTx.length - 1 ? 0 : 0.5, borderBottomColor: colors.surfaceBorder }}
              >
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: t.isTransfer ? colors.neutral50 : (t.color ?? colors.neutral400) + '22', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name={t.isTransfer ? 'repeat' : mapIcon(t.icon)} size={14} color={t.isTransfer ? colors.neutral500 : (t.color ?? colors.neutral500)} />
                </View>
                {/* Category (or transfer label) is the title; time + note preview form the subtitle. */}
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typography.bodySmallMedium, color: colors.neutral900 }} numberOfLines={1} ellipsizeMode="tail">
                    {t.title}
                  </Text>
                  <Text style={{ ...typography.caption, color: colors.neutral400 }} numberOfLines={1} ellipsizeMode="tail">
                    {[formatStoredTime(t.occurred_at), t.note].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
                <Text style={{ ...typography.bodySmallMedium, color: t.dir === 'in' ? colors.income : colors.expense }}>
                  {t.dir === 'in' ? '+' : '-'}{formatCurrency(t.amount).replace('-', '')}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        </TourTarget>
      </ScrollView>

      {/* Tally Assistant — Home only. Sits above the tab bar so it never covers content. */}
      <TourTarget id="home-assistant-fab" style={{ position: 'absolute', right: 20, bottom: 20 }}>
        <AssistantFab onPress={() => setAssistantOpen(true)} embedded />
      </TourTarget>
      <AssistantSheet
        visible={assistantOpen}
        onClose={() => { setAssistantOpen(false); load(); }}
        onDataChanged={load}
        onNavigate={(target) => {
          // Dynamic tab/screen hand-off from the assistant; the shape is validated by
          // AssistantNavigation, so a loose cast here is safe and keeps the types simple.
          const nav = navigation as any;
          if (target.screen) nav.navigate(target.tab, { screen: target.screen, params: target.params });
          else nav.navigate(target.tab);
        }}
      />
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
