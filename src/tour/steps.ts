// Product tour script — pure configuration.
//
// `target` is the id registered by a <TourTarget>. A step with no target shows a centred
// card (used for the welcome and finish steps). `tab` switches the bottom tab before the
// step is shown, so the tour can walk the user through the whole app.

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** Registered TourTarget id to spotlight. Omit for a centred card. */
  target?: string;
  /** Switch to this bottom tab before showing the step. */
  tab?: 'Home' | 'Money' | 'Habits' | 'Reports';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Tally 👋',
    body: "Let me show you around — it takes about a minute. You can skip at any time and replay this later from Settings.",
    tab: 'Home',
  },
  {
    id: 'balance',
    title: 'Your total balance',
    body: 'Everything across your accounts, plus this month\'s income, expense and net. Tap it any time to jump straight to your accounts.',
    target: 'home-hero',
    tab: 'Home',
  },
  {
    id: 'quick-actions',
    title: 'Add things fast',
    body: 'One tap to log a transaction, or to check in on a habit — the two things you will do most often.',
    target: 'home-quick-actions',
  },
  {
    id: 'budgets',
    title: 'Budget progress',
    body: 'Set monthly limits and watch them fill up. Bars turn red when you go over, so overspending is obvious at a glance.',
    target: 'home-budgets',
  },
  {
    id: 'habits',
    title: "Today's habits",
    body: 'Your habits for today, with streaks. Tap the circle to check one off without leaving Home.',
    target: 'home-habits',
  },
  {
    id: 'recent',
    title: 'Recent activity',
    body: 'Your latest transactions. Tap any row to see its full details, then edit from there.',
    target: 'home-recent',
  },
  {
    id: 'assistant',
    title: 'Meet your Tally Assistant',
    body: 'Tap here to chat. Say things like "I spent 500 on food" or "monthly summary" — it adds transactions and answers questions, completely offline.',
    target: 'home-assistant-fab',
  },
  {
    id: 'settings',
    title: 'Settings & security',
    body: 'Currency, theme, PIN lock, backup and restore all live here — along with the option to replay this tour.',
    target: 'home-settings',
  },
  {
    id: 'money-tab',
    title: 'Money',
    body: 'Your full transaction history, accounts, budgets, categories and recurring rules. Swipe between Expense, Income and Transfer when adding.',
    target: 'tab-money',
  },
  {
    id: 'habits-tab',
    title: 'Habits',
    body: 'Build or quit habits, set reminders, and track streaks. Swipe between Today and All habits.',
    target: 'tab-habits',
  },
  {
    id: 'reports-tab',
    title: 'Reports',
    body: 'Spending breakdowns, income vs expense trends and habit activity. Tap a slice of the donut to drill into a category.',
    target: 'tab-reports',
  },
  {
    id: 'finish',
    title: "You're all set 🎉",
    body: 'That is the whole app. Everything stays private on this device — no account, no cloud. You can replay this tour any time from Settings.',
    tab: 'Home',
  },
];

export const TOUR_DONE_KEY = 'product_tour_done';
