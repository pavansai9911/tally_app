import { getDb, genId, buildUpdate } from './database';

export interface Transaction {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  note: string | null;
  occurred_at: string;
  recurring_id: string | null;
}

export interface TransactionWithDetails extends Transaction {
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  account_name: string;
}

export async function listTransactions(limit?: number): Promise<TransactionWithDetails[]> {
  const db = await getDb();
  const sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    JOIN accounts a ON a.id = t.account_id
    ORDER BY t.occurred_at DESC
    ${limit ? 'LIMIT ?' : ''}
  `;
  return limit ? db.getAllAsync(sql, [limit]) : db.getAllAsync(sql);
}

export async function getTransaction(id: string): Promise<TransactionWithDetails | null> {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color, a.name as account_name
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     JOIN accounts a ON a.id = t.account_id
     WHERE t.id = ?`,
    [id]
  );
}

export async function createTransaction(input: Omit<Transaction, 'id'>): Promise<string> {
  const db = await getDb();
  const id = genId('tx');
  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, account_id, to_account_id, category_id, note, occurred_at, recurring_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.type, input.amount, input.account_id, input.to_account_id, input.category_id, input.note, input.occurred_at, input.recurring_id]
  );
  return id;
}

export async function updateTransaction(id: string, input: Partial<Transaction>): Promise<void> {
  const db = await getDb();
  const { clause, values } = buildUpdate<Transaction>(input, [
    'type', 'amount', 'account_id', 'to_account_id', 'category_id', 'note', 'occurred_at', 'recurring_id',
  ]);
  if (!clause) return;
  await db.runAsync(
    `UPDATE transactions SET ${clause}, updated_at = datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
}

export interface MonthSummary {
  income: number;
  expense: number;
  net: number;
}

export async function getMonthSummary(monthKey: string, accountId?: string): Promise<MonthSummary> {
  // monthKey format: 'YYYY-MM'. Optional accountId scopes income/expense to one account.
  const db = await getDb();
  const acc = accountId ? 'AND account_id = ?' : '';
  const params = accountId ? [monthKey, accountId] : [monthKey];
  const row = await db.getFirstAsync<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions
     WHERE occurred_at LIKE ? || '%' ${acc}`,
    params
  );
  const income = row?.income ?? 0;
  const expense = row?.expense ?? 0;
  return { income, expense, net: income - expense };
}

/** Total expense for a single day (occurred_at is 'YYYY-MM-DD HH:MM'). */
export async function getExpenseTotalForDay(dayKey: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND occurred_at LIKE ? || '%'",
    [dayKey],
  );
  return row?.total ?? 0;
}

/** Total expense from a date (inclusive) onwards. */
export async function getExpenseTotalSince(startKey: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'expense' AND occurred_at >= ?",
    [startKey],
  );
  return row?.total ?? 0;
}

export interface CategoryBreakdown {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
}

export async function getExpenseBreakdownByCategory(monthKey: string): Promise<CategoryBreakdown[]> {
  const db = await getDb();
  return db.getAllAsync<CategoryBreakdown>(
    `SELECT c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
            SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' AND t.occurred_at LIKE ? || '%'
     GROUP BY c.id
     ORDER BY total DESC`,
    [monthKey]
  );
}

/**
 * Income/expense summary from a start month ('YYYY-MM') onward; pass null for all-time.
 * `occurred_at >= 'YYYY-MM'` works because the stored format ('YYYY-MM-DD HH:MM') sorts
 * lexicographically and the bare month prefix is <= any timestamp within that month.
 */
export async function getRangeSummary(startMonthKey: string | null, accountId?: string): Promise<MonthSummary> {
  const db = await getDb();
  const conds: string[] = [];
  const params: unknown[] = [];
  if (startMonthKey) { conds.push('occurred_at >= ?'); params.push(startMonthKey); }
  if (accountId) { conds.push('account_id = ?'); params.push(accountId); }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const row = await db.getFirstAsync<{ income: number; expense: number }>(
    `SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END), 0) as expense
     FROM transactions ${where}`,
    params,
  );
  const income = row?.income ?? 0;
  const expense = row?.expense ?? 0;
  return { income, expense, net: income - expense };
}

/** Expense-by-category breakdown from a start month onward; null = all-time. */
export async function getExpenseBreakdownByRange(startMonthKey: string | null): Promise<CategoryBreakdown[]> {
  const db = await getDb();
  const cond = startMonthKey ? 'AND t.occurred_at >= ?' : '';
  const params = startMonthKey ? [startMonthKey] : [];
  return db.getAllAsync<CategoryBreakdown>(
    `SELECT c.id as category_id, c.name as category_name, c.icon as category_icon, c.color as category_color,
            SUM(t.amount) as total
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense' ${cond}
     GROUP BY c.id
     ORDER BY total DESC`,
    params,
  );
}

export async function getMonthlyTrend(months: string[]): Promise<MonthSummary[]> {
  const results: MonthSummary[] = [];
  for (const m of months) {
    results.push(await getMonthSummary(m));
  }
  return results;
}

export async function getDailyBalanceSeries(startDate: string, endDate: string): Promise<{ date: string; balance: number }[]> {
  const db = await getDb();
  // Cumulative net change per day within range; caller adds the starting total balance offset.
  return db.getAllAsync(
    `SELECT occurred_at as date,
            SUM(CASE WHEN type='income' THEN amount WHEN type='expense' THEN -amount ELSE 0 END) as balance
     FROM transactions
     WHERE occurred_at BETWEEN ? AND ?
     GROUP BY occurred_at
     ORDER BY occurred_at ASC`,
    [startDate, endDate]
  );
}

// ---------------- ACCOUNT-SCOPED (transfer-aware) ----------------

/** Transfer-aware balance for a single account (matches the formula in listAccounts). */
export async function getAccountBalance(accountId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ bal: number }>(
    `SELECT a.starting_balance
       + COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount ELSE 0 END)
                   FROM transactions t WHERE t.account_id = a.id), 0)
       - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.type='transfer' AND t.account_id = a.id), 0)
       + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.type='transfer' AND t.to_account_id = a.id), 0)
       AS bal
     FROM accounts a WHERE a.id = ?`,
    [accountId],
  );
  return row?.bal ?? 0;
}

/** Total money IN (income + transfers received) and OUT (expense + transfers sent) for an account. */
export async function getAccountFlow(accountId: string): Promise<{ inflow: number; outflow: number }> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ inflow: number; outflow: number }>(
    `SELECT
       COALESCE(SUM(CASE WHEN t.type='income' THEN t.amount
                         WHEN t.type='transfer' AND t.to_account_id = ? THEN t.amount ELSE 0 END), 0) as inflow,
       COALESCE(SUM(CASE WHEN t.type='expense' THEN t.amount
                         WHEN t.type='transfer' AND t.account_id = ? THEN t.amount ELSE 0 END), 0) as outflow
     FROM transactions t
     WHERE t.account_id = ? OR (t.type='transfer' AND t.to_account_id = ?)`,
    [accountId, accountId, accountId, accountId],
  );
  return { inflow: row?.inflow ?? 0, outflow: row?.outflow ?? 0 };
}

export interface AccountTransaction extends TransactionWithDetails {
  /** 'in' or 'out' from THIS account's perspective (a transfer is out for the sender, in for the receiver). */
  direction: 'in' | 'out';
  /** For a transfer: the other account's name (destination if outgoing, source if incoming). */
  counterparty_name: string | null;
}

/**
 * Transactions that touch an account, from that account's perspective — including transfers on
 * BOTH sides (sent and received), each tagged with a per-account direction. Optional filter:
 * 'in' shows only incoming, 'out' only outgoing.
 */
export async function listAccountTransactions(
  accountId: string,
  opts?: { limit?: number; direction?: 'in' | 'out' },
): Promise<AccountTransaction[]> {
  const db = await getDb();
  const dirFilter = opts?.direction
    ? (opts.direction === 'in'
        ? "AND (t.type='income' OR (t.type='transfer' AND t.to_account_id = ?))"
        : "AND (t.type='expense' OR (t.type='transfer' AND t.account_id = ?))")
    : '';
  const sql = `
    SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
           a.name as account_name,
           CASE
             WHEN t.type='income' THEN 'in'
             WHEN t.type='expense' THEN 'out'
             WHEN t.type='transfer' AND t.account_id = ? THEN 'out'
             ELSE 'in'
           END as direction,
           CASE
             WHEN t.type='transfer' AND t.account_id = ? THEN ta.name
             WHEN t.type='transfer' AND t.to_account_id = ? THEN a.name
             ELSE NULL
           END as counterparty_name
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    JOIN accounts a ON a.id = t.account_id
    LEFT JOIN accounts ta ON ta.id = t.to_account_id
    WHERE (t.account_id = ? OR (t.type='transfer' AND t.to_account_id = ?)) ${dirFilter}
    ORDER BY t.occurred_at DESC
    ${opts?.limit ? 'LIMIT ?' : ''}`;
  // Param order matches the ?s above: direction CASE, counterparty CASE (x2), WHERE (x2), dirFilter?, limit?
  const params: unknown[] = [accountId, accountId, accountId, accountId, accountId];
  if (opts?.direction) params.push(accountId);
  if (opts?.limit) params.push(opts.limit);
  return db.getAllAsync<AccountTransaction>(sql, params);
}
