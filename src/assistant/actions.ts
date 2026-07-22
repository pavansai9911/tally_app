// Assistant capabilities ("tools").
//
// These are the ONLY place the assistant touches data. Each tool has a name, a description
// and typed parameters — the same shape an LLM needs for function-calling, so migrating to
// OpenAI later means handing this registry to the model instead of matching keywords.

import {
  createTransaction, listAccounts, listCategories, createCategory, createAccount,
  getMonthSummary, getExpenseBreakdownByCategory, listTransactions, listBudgetsWithSpend,
  createBudget, createHabit, listHabits, upsertLog, getTodayHabitsWithStatus,
  calculateStreaks,
} from '@/db';
import { AssistantTool } from './types';
import { formatCurrency, monthKey, todayKey, toTimeKey, toTimestamp, addDaysKey } from '@/utils/format';

function nowStamp(): string {
  return toTimestamp(todayKey(), toTimeKey());
}

async function resolveAccount(name?: string) {
  const accounts = await listAccounts();
  if (accounts.length === 0) return null;
  if (!name) return accounts[0];
  const lower = name.toLowerCase();
  return accounts.find((a) => a.name.toLowerCase().includes(lower)) ?? accounts[0];
}

async function resolveCategory(name: string | undefined, type: 'expense' | 'income') {
  const cats = await listCategories(type);
  if (cats.length === 0) return null;
  if (!name) return null;
  const lower = name.toLowerCase();
  return (
    cats.find((c) => c.name.toLowerCase() === lower) ??
    cats.find((c) => c.name.toLowerCase().includes(lower)) ??
    cats.find((c) => lower.includes(c.name.toLowerCase())) ??
    null
  );
}

export const addExpense: AssistantTool = {
  name: 'add_expense',
  description: 'Record a new expense transaction',
  parameters: [
    { name: 'amount', description: 'Amount spent', required: true },
    { name: 'category', description: 'Expense category name' },
    { name: 'note', description: 'Optional note' },
    { name: 'account', description: 'Account name' },
  ],
  async run(args) {
    const amount = parseFloat(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 'That amount did not look right, so nothing was saved.';
    const account = await resolveAccount(args.account);
    if (!account) return 'You need at least one account before I can add a transaction.';
    let category = await resolveCategory(args.category, 'expense');
    if (!category && args.category) {
      const id = await createCategory({ name: args.category, type: 'expense', icon: 'ti-dots', color: '#6B7280' });
      category = { id, name: args.category, type: 'expense', icon: 'ti-dots', color: '#6B7280', archived: 0 };
    }
    await createTransaction({
      type: 'expense',
      amount,
      account_id: account.id,
      to_account_id: null,
      category_id: category?.id ?? null,
      note: args.note?.trim() || null,
      occurred_at: nowStamp(),
      recurring_id: null,
    });
    return `Done — ${formatCurrency(amount)} expense saved${category ? ` under ${category.name}` : ''} in ${account.name}.`;
  },
};

export const addIncome: AssistantTool = {
  name: 'add_income',
  description: 'Record a new income transaction',
  parameters: [
    { name: 'amount', description: 'Amount received', required: true },
    { name: 'category', description: 'Income category name' },
    { name: 'note', description: 'Optional note' },
    { name: 'account', description: 'Account name' },
  ],
  async run(args) {
    const amount = parseFloat(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 'That amount did not look right, so nothing was saved.';
    const account = await resolveAccount(args.account);
    if (!account) return 'You need at least one account before I can add a transaction.';
    let category = await resolveCategory(args.category, 'income');
    if (!category && args.category) {
      const id = await createCategory({ name: args.category, type: 'income', icon: 'ti-briefcase', color: '#1A9E6B' });
      category = { id, name: args.category, type: 'income', icon: 'ti-briefcase', color: '#1A9E6B', archived: 0 };
    }
    await createTransaction({
      type: 'income',
      amount,
      account_id: account.id,
      to_account_id: null,
      category_id: category?.id ?? null,
      note: args.note?.trim() || null,
      occurred_at: nowStamp(),
      recurring_id: null,
    });
    return `Nice — ${formatCurrency(amount)} income recorded${category ? ` as ${category.name}` : ''} in ${account.name}.`;
  },
};

export const addTransfer: AssistantTool = {
  name: 'add_transfer',
  description: 'Move money between two accounts',
  parameters: [
    { name: 'amount', description: 'Amount to transfer', required: true },
    { name: 'from', description: 'Source account name', required: true },
    { name: 'to', description: 'Destination account name', required: true },
  ],
  async run(args) {
    const amount = parseFloat(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 'That amount did not look right, so nothing was saved.';
    const accounts = await listAccounts();
    if (accounts.length < 2) return 'You need at least two accounts to make a transfer.';
    const from = await resolveAccount(args.from);
    const toMatch = accounts.find((a) => a.name.toLowerCase().includes((args.to ?? '').toLowerCase()) && a.id !== from?.id);
    const to = toMatch ?? accounts.find((a) => a.id !== from?.id)!;
    if (!from || from.id === to.id) return 'I need two different accounts for a transfer.';
    await createTransaction({
      type: 'transfer',
      amount,
      account_id: from.id,
      to_account_id: to.id,
      category_id: null,
      note: 'Transfer',
      occurred_at: nowStamp(),
      recurring_id: null,
    });
    return `Transferred ${formatCurrency(amount)} from ${from.name} to ${to.name}.`;
  },
};

export const createBudgetTool: AssistantTool = {
  name: 'create_budget',
  description: 'Set a monthly spending limit for a category',
  parameters: [
    { name: 'category', description: 'Category to budget', required: true },
    { name: 'amount', description: 'Monthly limit', required: true },
  ],
  async run(args) {
    const amount = parseFloat(args.amount);
    if (!Number.isFinite(amount) || amount <= 0) return 'That limit did not look right, so nothing was saved.';
    let category = await resolveCategory(args.category, 'expense');
    if (!category) {
      const id = await createCategory({ name: args.category, type: 'expense', icon: 'ti-dots', color: '#6B7280' });
      category = { id, name: args.category, type: 'expense', icon: 'ti-dots', color: '#6B7280', archived: 0 };
    }
    await createBudget({
      category_id: category.id,
      monthly_limit: amount,
      recurrence: 'monthly',
      alert_near_limit: 1,
      alert_threshold_pct: 90,
    });
    return `Budget set — ${formatCurrency(amount)} a month for ${category.name}.`;
  },
};

export const createAccountTool: AssistantTool = {
  name: 'create_account',
  description: 'Create a new account',
  parameters: [
    { name: 'name', description: 'Account name', required: true },
    { name: 'type', description: 'cash, bank, card or wallet' },
    { name: 'balance', description: 'Opening balance' },
  ],
  async run(args) {
    const name = args.name?.trim();
    if (!name) return 'I need a name for the account.';
    const t = (args.type ?? 'bank').toLowerCase();
    const type = (['cash', 'bank', 'card', 'wallet'].includes(t) ? t : 'bank') as 'cash' | 'bank' | 'card' | 'wallet';
    const balance = parseFloat(args.balance ?? '0');
    await createAccount({
      name,
      type,
      icon: type === 'cash' ? 'ti-cash' : type === 'bank' ? 'ti-building-bank' : type === 'card' ? 'ti-credit-card' : 'ti-wallet',
      color: '#3D5AFE',
      starting_balance: Number.isFinite(balance) ? balance : 0,
      include_in_total: 1,
    });
    return `Account "${name}" created with ${formatCurrency(Number.isFinite(balance) ? balance : 0)}.`;
  },
};

export const createHabitTool: AssistantTool = {
  name: 'create_habit',
  description: 'Create a new habit to track',
  parameters: [
    { name: 'name', description: 'Habit name', required: true },
    { name: 'type', description: 'build or quit' },
  ],
  async run(args) {
    const name = args.name?.trim();
    if (!name) return 'I need a name for the habit.';
    const type = (args.type ?? 'build').toLowerCase() === 'quit' ? 'quit' : 'build';
    await createHabit({
      name, type, goal_type: 'boolean', goal_value: null, goal_unit: null,
      schedule_type: 'daily', schedule_days: null, schedule_target: null,
      icon: 'ti-checklist', color: '#3D5AFE', reminder_enabled: 0, reminder_time: null,
    });
    return `Habit "${name}" created — it will show up in Today's habits.`;
  },
};

export const completeHabitTool: AssistantTool = {
  name: 'complete_habit',
  description: "Mark a habit as done for today",
  parameters: [{ name: 'name', description: 'Habit name', required: true }],
  async run(args) {
    const habits = await listHabits();
    if (habits.length === 0) return "You don't have any habits yet — say \"add habit\" to create one.";
    const lower = (args.name ?? '').toLowerCase();
    const habit = habits.find((h) => h.name.toLowerCase().includes(lower)) ?? null;
    if (!habit) return `I couldn't find a habit called "${args.name}".`;
    await upsertLog(habit.id, todayKey(), 'done', 1);
    const { current } = await calculateStreaks(habit, todayKey());
    return `Checked off "${habit.name}" for today. Current streak: ${current} day${current === 1 ? '' : 's'}.`;
  },
};

// ---------------------------------------------------------------------------
// Read-only insight tools
// ---------------------------------------------------------------------------

export const monthlySummary: AssistantTool = {
  name: 'monthly_summary',
  description: "Summarise this month's income, expense and net",
  parameters: [],
  async run() {
    const s = await getMonthSummary(monthKey());
    if (s.income === 0 && s.expense === 0) return 'No transactions recorded this month yet.';
    const rate = s.income > 0 ? Math.round((s.net / s.income) * 100) : 0;
    return `This month: ${formatCurrency(s.income)} in, ${formatCurrency(s.expense)} out. Net ${s.net >= 0 ? '+' : ''}${formatCurrency(s.net)}${s.income > 0 ? ` (saving ${rate}% of income)` : ''}.`;
  },
};

export const expenseSummary: AssistantTool = {
  name: 'expense_summary',
  description: "Break down this month's spending by category",
  parameters: [],
  async run() {
    const rows = await getExpenseBreakdownByCategory(monthKey());
    if (rows.length === 0) return 'No spending recorded this month yet.';
    const total = rows.reduce((s, r) => s + r.total, 0);
    const top = rows.slice(0, 4).map((r) => `• ${r.category_name} — ${formatCurrency(r.total)} (${Math.round((r.total / total) * 100)}%)`);
    return `You've spent ${formatCurrency(total)} this month.\n${top.join('\n')}`;
  },
};

export const incomeSummary: AssistantTool = {
  name: 'income_summary',
  description: "Summarise this month's income",
  parameters: [],
  async run() {
    const s = await getMonthSummary(monthKey());
    return s.income === 0 ? 'No income recorded this month yet.' : `You've received ${formatCurrency(s.income)} this month.`;
  },
};

export const todayExpense: AssistantTool = {
  name: 'today_expense',
  description: "Total spent today",
  parameters: [],
  async run() {
    const all = await listTransactions();
    const today = todayKey();
    const sum = all.filter((t) => t.type === 'expense' && t.occurred_at.startsWith(today)).reduce((s, t) => s + t.amount, 0);
    return sum === 0 ? "You haven't spent anything today." : `You've spent ${formatCurrency(sum)} today.`;
  },
};

export const weeklyExpense: AssistantTool = {
  name: 'weekly_expense',
  description: 'Total spent over the last 7 days',
  parameters: [],
  async run() {
    const all = await listTransactions();
    const from = addDaysKey(todayKey(), -6);
    const sum = all
      .filter((t) => t.type === 'expense' && t.occurred_at.slice(0, 10) >= from)
      .reduce((s, t) => s + t.amount, 0);
    return sum === 0 ? "No spending in the last 7 days." : `You've spent ${formatCurrency(sum)} in the last 7 days.`;
  },
};

export const budgetStatus: AssistantTool = {
  name: 'budget_status',
  description: 'Report how each budget is tracking this month',
  parameters: [],
  async run() {
    const budgets = await listBudgetsWithSpend(monthKey());
    if (budgets.length === 0) return "You haven't set any budgets yet. Say \"create budget\" and I'll help.";
    const lines = budgets.slice(0, 5).map((b) => {
      const pct = b.monthly_limit > 0 ? Math.round((b.spent / b.monthly_limit) * 100) : 0;
      const mark = pct >= 100 ? '⚠️ over' : pct >= 90 ? 'close to limit' : 'on track';
      return `• ${b.category_name}: ${formatCurrency(b.spent)} of ${formatCurrency(b.monthly_limit)} (${pct}%, ${mark})`;
    });
    return `Budget status:\n${lines.join('\n')}`;
  },
};

export const recentTransactions: AssistantTool = {
  name: 'recent_transactions',
  description: 'List the most recent transactions',
  parameters: [],
  async run() {
    const rows = await listTransactions(5);
    if (rows.length === 0) return 'No transactions yet.';
    const lines = rows.map((t) => `• ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount).replace('-', '')} — ${t.note || t.category_name || t.type}`);
    return `Your latest activity:\n${lines.join('\n')}`;
  },
};

export const accountsOverview: AssistantTool = {
  name: 'accounts_overview',
  description: 'List accounts and their balances',
  parameters: [],
  async run() {
    const accounts = await listAccounts();
    if (accounts.length === 0) return 'You have no accounts yet.';
    const total = accounts.filter((a) => a.include_in_total).reduce((s, a) => s + a.current_balance, 0);
    const lines = accounts.map((a) => `• ${a.name} — ${formatCurrency(a.current_balance)}`);
    return `Total balance ${formatCurrency(total)}\n${lines.join('\n')}`;
  },
};

export const savingsInsight: AssistantTool = {
  name: 'savings_insight',
  description: 'Explain how much is being saved this month',
  parameters: [],
  async run() {
    const s = await getMonthSummary(monthKey());
    if (s.income === 0) return 'No income recorded this month, so I can\'t work out a savings rate yet.';
    const rate = Math.round((s.net / s.income) * 100);
    const verdict = rate >= 30 ? "that's excellent" : rate >= 15 ? "that's a solid rate" : rate >= 0 ? 'there is room to improve' : "you're spending more than you earn this month";
    return `You've kept ${formatCurrency(s.net)} of ${formatCurrency(s.income)} — about ${rate}%. In general, ${verdict}.`;
  },
};

export const todaysHabits: AssistantTool = {
  name: 'todays_habits',
  description: "List today's habits and which are done",
  parameters: [],
  async run() {
    const habits = await getTodayHabitsWithStatus(todayKey());
    if (habits.length === 0) return "No habits scheduled today. Say \"add habit\" to start one.";
    const done = habits.filter((h) => h.log?.status === 'done').length;
    const lines = habits.map((h) => `${h.log?.status === 'done' ? '✅' : '⬜'} ${h.name}${h.streak > 0 ? ` (${h.streak}d streak)` : ''}`);
    return `${done} of ${habits.length} done today.\n${lines.join('\n')}`;
  },
};

export const habitStats: AssistantTool = {
  name: 'habit_stats',
  description: 'Report habit streaks',
  parameters: [],
  async run() {
    const habits = await listHabits();
    if (habits.length === 0) return 'No habits yet.';
    const rows = await Promise.all(habits.map(async (h) => ({ h, s: await calculateStreaks(h, todayKey()) })));
    rows.sort((a, b) => b.s.current - a.s.current);
    const lines = rows.slice(0, 5).map((r) => `• ${r.h.name} — ${r.s.current}d current, ${r.s.longest}d best`);
    return `Your streaks:\n${lines.join('\n')}`;
  },
};

/** Registry — the exact set that would be exposed to an LLM as callable tools. */
export const ASSISTANT_TOOLS: AssistantTool[] = [
  addExpense, addIncome, addTransfer, createBudgetTool, createAccountTool,
  createHabitTool, completeHabitTool, monthlySummary, expenseSummary, incomeSummary,
  todayExpense, weeklyExpense, budgetStatus, recentTransactions, accountsOverview,
  savingsInsight, todaysHabits, habitStats,
];

export function getTool(name: string): AssistantTool | undefined {
  return ASSISTANT_TOOLS.find((t) => t.name === name);
}
