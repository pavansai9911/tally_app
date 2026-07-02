import { getDb, genId } from './database';

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'card' | 'wallet';
  icon: string;
  color: string;
  starting_balance: number;
  include_in_total: number;
  archived: number;
  sort_order: number;
}

export interface AccountWithBalance extends Account {
  current_balance: number;
}

export async function listAccounts(): Promise<AccountWithBalance[]> {
  const db = await getDb();
  return db.getAllAsync<AccountWithBalance>(`
    SELECT a.*,
      a.starting_balance
      + COALESCE((SELECT SUM(CASE WHEN t.type='income' THEN t.amount WHEN t.type='expense' THEN -t.amount ELSE 0 END)
                  FROM transactions t WHERE t.account_id = a.id), 0)
      - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.type='transfer' AND t.account_id = a.id), 0)
      + COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.type='transfer' AND t.to_account_id = a.id), 0)
      AS current_balance
    FROM accounts a
    WHERE a.archived = 0
    ORDER BY a.sort_order ASC, a.created_at ASC
  `);
}

export async function getAccount(id: string): Promise<Account | null> {
  const db = await getDb();
  return db.getFirstAsync<Account>('SELECT * FROM accounts WHERE id = ?', [id]);
}

export async function createAccount(input: Omit<Account, 'id' | 'archived' | 'sort_order'>): Promise<string> {
  const db = await getDb();
  const id = genId('acc');
  await db.runAsync(
    `INSERT INTO accounts (id, name, type, icon, color, starting_balance, include_in_total)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.type, input.icon, input.color, input.starting_balance, input.include_in_total]
  );
  return id;
}

export async function updateAccount(id: string, input: Partial<Account>): Promise<void> {
  const db = await getDb();
  const fields = Object.keys(input);
  if (fields.length === 0) return;
  const setClause = fields.map(f => `${f} = ?`).join(', ');
  await db.runAsync(`UPDATE accounts SET ${setClause} WHERE id = ?`, [...fields.map(f => (input as any)[f]), id]);
}

export async function deleteAccount(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE accounts SET archived = 1 WHERE id = ?', [id]);
}

export async function getTotalBalance(): Promise<number> {
  const accounts = await listAccounts();
  return accounts
    .filter(a => a.include_in_total)
    .reduce((sum, a) => sum + a.current_balance, 0);
}
