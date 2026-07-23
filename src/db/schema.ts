// Tally SQLite schema — fully offline local database.
//
// Schema is defined as an ordered list of MIGRATIONS keyed by an integer version stored
// in SQLite's `PRAGMA user_version`. The runner in database.ts applies only migrations
// newer than the DB's current version, so shipping a schema change in a future app update
// is safe and non-destructive. NEVER edit an already-released migration — always append a
// new one with the next version number.

export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('cash','bank','card','wallet')),
        icon TEXT NOT NULL DEFAULT 'ti-wallet',
        color TEXT NOT NULL DEFAULT '#3D5AFE',
        starting_balance REAL NOT NULL DEFAULT 0,
        include_in_total INTEGER NOT NULL DEFAULT 1,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('expense','income')),
        icon TEXT NOT NULL DEFAULT 'ti-dots',
        color TEXT NOT NULL DEFAULT '#6B7280',
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('expense','income','transfer')),
        amount REAL NOT NULL,
        account_id TEXT NOT NULL REFERENCES accounts(id),
        to_account_id TEXT REFERENCES accounts(id),
        category_id TEXT REFERENCES categories(id),
        note TEXT,
        occurred_at TEXT NOT NULL,
        recurring_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_tx_occurred_at ON transactions(occurred_at)`,
      `CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id)`,
      `CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL REFERENCES categories(id),
        monthly_limit REAL NOT NULL,
        recurrence TEXT NOT NULL DEFAULT 'monthly' CHECK(recurrence IN ('monthly','one_time')),
        alert_near_limit INTEGER NOT NULL DEFAULT 1,
        alert_threshold_pct INTEGER NOT NULL DEFAULT 90,
        month_key TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS recurring_rules (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('expense','income')),
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category_id TEXT REFERENCES categories(id),
        account_id TEXT NOT NULL REFERENCES accounts(id),
        frequency TEXT NOT NULL CHECK(frequency IN ('weekly','monthly','yearly')),
        next_date TEXT NOT NULL,
        auto_add INTEGER NOT NULL DEFAULT 1,
        active INTEGER NOT NULL DEFAULT 1,
        last_run_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('build','quit')),
        goal_type TEXT NOT NULL CHECK(goal_type IN ('boolean','count','duration')),
        goal_value REAL,
        goal_unit TEXT,
        schedule_type TEXT NOT NULL CHECK(schedule_type IN ('daily','specific_days','per_week','per_month')),
        schedule_days TEXT,
        schedule_target INTEGER,
        icon TEXT NOT NULL DEFAULT 'ti-checklist',
        color TEXT NOT NULL DEFAULT '#3D5AFE',
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        reminder_time TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS habit_logs (
        id TEXT PRIMARY KEY,
        habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
        log_date TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('done','partial','skipped')),
        value REAL,
        note TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(habit_id, log_date)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_habitlog_habit ON habit_logs(habit_id)`,
      `CREATE INDEX IF NOT EXISTS idx_habitlog_date ON habit_logs(log_date)`,
    ],
  },
  {
    // Better default-category colours (only if still at the old grey default, so a user's
    // custom colour is never overwritten) + Entertainment and friend money categories for
    // existing installs. INSERT ... SELECT ... WHERE NOT EXISTS avoids duplicates.
    version: 2,
    statements: [
      `UPDATE categories SET color = '#7C4DFF' WHERE name = 'Shopping' AND color = '#4B5159'`,
      `UPDATE categories SET color = '#149C8E' WHERE name = 'Health' AND color = '#6B7280'`,
      `UPDATE categories SET color = '#34C28A' WHERE name = 'Freelance' AND color = '#1A9E6B'`,
      `INSERT INTO categories (id, name, type, icon, color)
         SELECT 'cat_seed_entertainment', 'Entertainment', 'expense', 'ti-device-tv', '#D6336C'
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Entertainment' AND type = 'expense')`,
      `INSERT INTO categories (id, name, type, icon, color)
         SELECT 'cat_seed_lentfriend', 'Lent to Friend', 'expense', 'ti-users', '#F2711C'
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Lent to Friend' AND type = 'expense')`,
      `INSERT INTO categories (id, name, type, icon, color)
         SELECT 'cat_seed_borrowfriend', 'Borrowed from Friend', 'income', 'ti-users', '#5B79FF'
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Borrowed from Friend' AND type = 'income')`,
      `INSERT INTO categories (id, name, type, icon, color)
         SELECT 'cat_seed_gift', 'Gift', 'income', 'ti-gift', '#D6336C'
         WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Gift' AND type = 'income')`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export const DEFAULT_CATEGORIES: Array<{ name: string; type: 'expense' | 'income'; icon: string; color: string }> = [
  { name: 'Food & Dining', type: 'expense', icon: 'ti-tools-kitchen-2', color: '#E0473F' },
  { name: 'Transport', type: 'expense', icon: 'ti-car', color: '#3D5AFE' },
  { name: 'Shopping', type: 'expense', icon: 'ti-shopping-bag', color: '#7C4DFF' },
  { name: 'Entertainment', type: 'expense', icon: 'ti-device-tv', color: '#D6336C' },
  { name: 'Utilities', type: 'expense', icon: 'ti-bolt', color: '#C98A1B' },
  { name: 'Health', type: 'expense', icon: 'ti-medical-cross', color: '#149C8E' },
  { name: 'Lent to Friend', type: 'expense', icon: 'ti-users', color: '#F2711C' },
  { name: 'Other', type: 'expense', icon: 'ti-dots', color: '#9AA1A9' },
  { name: 'Salary', type: 'income', icon: 'ti-briefcase', color: '#1A9E6B' },
  { name: 'Freelance', type: 'income', icon: 'ti-briefcase', color: '#34C28A' },
  { name: 'Borrowed from Friend', type: 'income', icon: 'ti-users', color: '#5B79FF' },
  { name: 'Gift', type: 'income', icon: 'ti-gift', color: '#D6336C' },
];
