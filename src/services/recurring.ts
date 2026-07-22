// Recurring transactions engine.
//
// The original app stored recurring rules but never acted on them. This processes every
// active auto-add rule whose next_date has arrived, inserting the transaction(s) and
// advancing next_date — catching up correctly even if the app wasn't opened for weeks.

import { getDb } from '@/db/database';
import { createTransaction } from '@/db/transactions';
import { RecurringRule } from '@/db/moneyMeta';
import { parseDateKey, toDateKey, todayKey, toTimestamp } from '@/utils/format';

function advance(dateKey: string, frequency: RecurringRule['frequency']): string {
  const d = parseDateKey(dateKey);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return toDateKey(d);
}

/** Insert transactions for all due auto-add rules. Returns how many were created. */
export async function processDueRecurring(): Promise<number> {
  const db = await getDb();
  const today = todayKey();
  const rules = await db.getAllAsync<RecurringRule & { next_date: string }>(
    'SELECT * FROM recurring_rules WHERE active = 1 AND auto_add = 1 AND next_date <= ?',
    [today],
  );

  let added = 0;
  for (const rule of rules) {
    let next = rule.next_date;
    let guard = 0;
    // Catch up every missed occurrence up to and including today.
    while (next <= today && guard < 1000) {
      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        account_id: rule.account_id,
        to_account_id: null,
        category_id: rule.category_id,
        note: rule.name,
        // Auto-added entries are stamped at a fixed morning time so they carry a time
        // component like manually entered transactions.
        occurred_at: toTimestamp(next, '09:00'),
        recurring_id: rule.id,
      });
      added++;
      next = advance(next, rule.frequency);
      guard++;
    }
    await db.runAsync('UPDATE recurring_rules SET next_date = ?, last_run_date = ? WHERE id = ?', [next, today, rule.id]);
  }
  return added;
}
