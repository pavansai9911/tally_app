// Intent catalog — pure configuration, no UI logic.
//
// Each entry maps user phrasings to ONE of:
//   • `tool`     — run a capability from actions.ts and speak the result
//   • `flow`     — start a guided slot-filling conversation (flows.ts)
//   • `reply`    — a static answer (help / how-to / navigation guidance)
// Adding an intent = adding an object here. Nothing else changes.

import { AssistantNavigation, Suggestion } from './types';

export interface IntentDef {
  id: string;
  /** Phrases/keywords that signal this intent. Matched loosely (see nlu.ts). */
  utterances: string[];
  tool?: string;
  flow?: string;
  reply?: string;
  suggestions?: Suggestion[];
  navigate?: AssistantNavigation;
  navigateLabel?: string;
  /** Higher wins when two intents score equally. */
  priority?: number;
}

const s = (...labels: string[]): Suggestion[] => labels.map((l) => ({ label: l }));

export const INTENTS: IntentDef[] = [
  // ---------------- Money: create ----------------
  { id: 'add_expense', utterances: ['add expense', 'new expense', 'spent', 'i spent', 'log expense', 'record expense', 'paid', 'bought', 'purchase'], flow: 'add_expense', priority: 3 },
  { id: 'add_income', utterances: ['add income', 'new income', 'received', 'got paid', 'salary', 'log income', 'record income', 'earned'], flow: 'add_income', priority: 3 },
  { id: 'add_transfer', utterances: ['transfer', 'transfer money', 'move money', 'send money between accounts'], flow: 'add_transfer', priority: 3 },
  { id: 'create_budget', utterances: ['create budget', 'add budget', 'set budget', 'new budget', 'budget limit'], flow: 'create_budget', priority: 3 },
  { id: 'add_account', utterances: ['add account', 'create account', 'new account', 'open account'], flow: 'create_account', priority: 3 },
  { id: 'add_habit', utterances: ['add habit', 'create habit', 'new habit', 'start habit', 'track habit'], flow: 'create_habit', priority: 3 },
  { id: 'complete_habit', utterances: ['complete habit', 'mark habit done', 'i did', 'i completed', 'finished my', 'done with my', 'check in habit'], flow: 'complete_habit', priority: 2 },

  // ---------------- Money: insights ----------------
  { id: 'monthly_spending', utterances: ['monthly spending', 'this month', 'month summary', 'monthly summary', 'how much this month', 'monthly report'], tool: 'monthly_summary' },
  { id: 'expense_summary', utterances: ['expense summary', 'where did my money go', 'spending breakdown', 'category breakdown', 'top spending', 'biggest expense'], tool: 'expense_summary' },
  { id: 'income_summary', utterances: ['income summary', 'how much did i earn', 'total income', 'my income'], tool: 'income_summary' },
  { id: 'today_expense', utterances: ["today's expense", 'today expense', 'spent today', 'how much today'], tool: 'today_expense' },
  { id: 'weekly_expense', utterances: ['weekly expense', 'this week', 'week spending', 'last 7 days'], tool: 'weekly_expense' },
  { id: 'budget_status', utterances: ['budget status', 'my budgets', 'budget progress', 'am i over budget', 'budgets'], tool: 'budget_status' },
  { id: 'recent_transactions', utterances: ['recent transactions', 'latest transactions', 'last transactions', 'recent activity', 'transaction history'], tool: 'recent_transactions' },
  { id: 'accounts_overview', utterances: ['accounts', 'my accounts', 'balance', 'total balance', 'how much do i have', 'account balance'], tool: 'accounts_overview' },
  { id: 'savings', utterances: ['savings', 'savings rate', 'am i saving', 'how much am i saving', 'save money'], tool: 'savings_insight' },
  { id: 'statistics', utterances: ['statistics', 'stats', 'analytics', 'insights'], tool: 'monthly_summary' },

  // ---------------- Habits ----------------
  { id: 'todays_habits', utterances: ["today's habits", 'today habits', 'my habits today', 'habits due', 'what habits'], tool: 'todays_habits' },
  { id: 'habit_stats', utterances: ['habit stats', 'streak', 'streaks', 'my streak', 'habit progress', 'longest streak'], tool: 'habit_stats' },
  { id: 'habits_open', utterances: ['habits', 'habit tracker', 'open habits'], reply: 'Habits let you build routines and track streaks. You can open the Habits tab, or I can help right here.', suggestions: s("Today's habits", 'Add habit', 'Habit streaks'), navigate: { tab: 'Habits' }, navigateLabel: 'Open Habits' },

  // ---------------- Navigation / where-is ----------------
  { id: 'reports', utterances: ['reports', 'view reports', 'charts', 'graphs', 'analysis', 'show reports'], reply: 'Reports show your spending breakdown, income vs expense trend, balance trend and habit activity.', navigate: { tab: 'Reports' }, navigateLabel: 'Open Reports', suggestions: s('Monthly summary', 'Expense summary', 'Budget status') },
  { id: 'categories', utterances: ['categories', 'manage categories', 'category list', 'edit category', 'category colour', 'category color'], reply: 'Categories live under Money → Categories. You can change a category\'s colour from Settings → Manage categories.', navigate: { tab: 'Money', screen: 'CategoriesList' }, navigateLabel: 'Open categories' },
  { id: 'transactions_open', utterances: ['transactions', 'transaction list', 'all transactions', 'money'], reply: 'Your full transaction list is in the Money tab.', navigate: { tab: 'Money', screen: 'TransactionList' }, navigateLabel: 'Open Money', suggestions: s('Add expense', 'Recent transactions', 'Monthly summary') },
  { id: 'search_transactions', utterances: ['search transactions', 'find transaction', 'search'], reply: 'Open the Money tab to browse your transactions by date. I can also summarise them — try "recent transactions" or "expense summary".', suggestions: s('Recent transactions', 'Expense summary') },
  { id: 'recurring', utterances: ['recurring', 'subscriptions', 'repeat transaction', 'auto add'], reply: 'Recurring rules add transactions automatically on their due date — find them under Money → Recurring.', navigate: { tab: 'Money', screen: 'RecurringList' }, navigateLabel: 'Open recurring' },

  // ---------------- Settings & data ----------------
  { id: 'settings', utterances: ['settings', 'preferences', 'options', 'configuration'], reply: 'Settings has currency, theme, app lock, categories, backup and developer tools. Tap the gear icon on Home.', suggestions: s('Dark mode', 'Currency', 'Backup') },
  { id: 'dark_mode', utterances: ['dark mode', 'dark theme', 'night mode'], reply: 'Switch to dark mode in Settings → Theme → Dark. Choosing "System" follows your phone.' },
  { id: 'light_mode', utterances: ['light mode', 'light theme', 'day mode'], reply: 'Switch to light mode in Settings → Theme → Light.' },
  { id: 'currency', utterances: ['currency', 'change currency', 'rupees', 'dollar', 'euro'], reply: 'Change your currency in Settings → Currency. Tally supports INR, USD, EUR and AUD, and every amount reformats instantly.' },
  { id: 'backup', utterances: ['backup', 'save my data', 'export backup'], reply: 'Settings → Backup & restore creates a backup file you can keep anywhere. Everything stays on your device.' },
  { id: 'restore', utterances: ['restore', 'import backup', 'recover data'], reply: 'Settings → Backup & restore → Restore lets you pick a backup file. It replaces current data, so back up first.' },
  { id: 'export', utterances: ['export', 'csv', 'excel', 'spreadsheet', 'export data'], reply: 'Settings → Export data saves your transactions as CSV, ready for any spreadsheet.' },
  { id: 'import', utterances: ['import', 'import data'], reply: 'Restoring a Tally backup is under Settings → Backup & restore.' },
  { id: 'delete_data', utterances: ['delete data', 'clear data', 'erase everything', 'reset app'], reply: 'There is no bulk-delete — that is deliberate, so nothing is lost by accident. You can delete individual records, or remove generated demo data via Settings → Seed sample data.' },
  { id: 'seed_data', utterances: ['sample data', 'demo data', 'test data', 'seed'], reply: 'Settings → Seed sample data generates realistic demo records (3, 6 or 12 months) so you can explore reports. It is a testing utility and can be removed again.' },
  { id: 'notifications', utterances: ['notifications', 'notification settings', 'alerts'], reply: 'Reminders are local notifications with your device\'s default sound. Settings → Reminder diagnostics can send a test notification.' },
  { id: 'reminder', utterances: ['reminder', 'remind me', 'set reminder', 'reminder settings'], flow: 'create_reminder', priority: 2 },
  { id: 'security', utterances: ['app lock', 'pin', 'password', 'security', 'fingerprint', 'biometric', 'lock app'], reply: 'Settings → Security lets you set a PIN and biometric unlock. Your PIN is stored as a salted hash in the device keychain — never in plain text.' },
  { id: 'profile', utterances: ['profile', 'my account', 'user profile'], reply: 'Tally has no accounts or sign-in — everything is stored privately on this device, so there is no profile to manage.' },
  { id: 'privacy', utterances: ['privacy', 'is my data safe', 'do you send my data', 'offline'], reply: 'Everything stays on this phone. Tally has no internet permission in release builds, no analytics and no ads.' },

  // ---------------- Conversational ----------------
  { id: 'greeting', utterances: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'yo'], reply: 'Hello! What would you like to do?', suggestions: s('Add Expense', 'Add Income', 'Others') },
  { id: 'thanks', utterances: ['thanks', 'thank you', 'thx', 'appreciate it'], reply: "Anytime! Anything else I can help with?", suggestions: s('Add Expense', 'Monthly summary', 'Others') },
  { id: 'bye', utterances: ['bye', 'goodbye', 'see you', 'close'], reply: 'Talk soon! Tap the assistant button whenever you need me.' },
  { id: 'who_are_you', utterances: ['who are you', 'what are you', 'your name', 'about you'], reply: "I'm the Tally Assistant. I can add transactions, create budgets and habits, and answer questions about your money — all offline, right on this device." },
  { id: 'capabilities', utterances: ['what can you do', 'help', 'options', 'commands', 'how to use'], reply: "I can:\n• Add expenses, income and transfers\n• Create budgets, accounts and habits\n• Summarise spending, income and savings\n• Check budgets, streaks and recent activity\n• Explain any part of the app\n\nJust talk normally — try \"I spent 500 on food\".", suggestions: s('Add Expense', 'Monthly summary', "Today's habits", 'Others') },
  { id: 'others', utterances: ['others', 'other', 'more', 'more options', 'show more'], reply: 'Here are some things I can help with:', suggestions: s('Transfer Money', 'Create Budget', 'View Reports', "Today's Habits", 'Monthly Summary', 'Recent Transactions', 'Accounts', 'Settings') },
  { id: 'cancel', utterances: ['cancel', 'stop', 'nevermind', 'never mind', 'forget it', 'abort'], reply: 'No problem — cancelled. What else can I do?', suggestions: s('Add Expense', 'Add Income', 'Others'), priority: 5 },
];

/** Chips shown on first open. */
export const STARTER_SUGGESTIONS: Suggestion[] = s('Add Expense', 'Add Income', 'Others');

export const FALLBACK_SUGGESTIONS: Suggestion[] = s('Add Expense', 'Monthly summary', 'What can you do', 'Others');
