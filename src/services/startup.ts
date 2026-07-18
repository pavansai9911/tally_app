// Tasks that run once per app launch (after onboarding), before showing the main UI.

import { processDueRecurring } from './recurring';
import { rescheduleAllHabitReminders } from './notifications';

export async function runStartupTasks(): Promise<void> {
  // Insert any due recurring transactions (must finish before the dashboard renders totals).
  try {
    await processDueRecurring();
  } catch {
    // never block launch on this
  }
  // Reminders are best-effort and can settle in the background.
  rescheduleAllHabitReminders().catch(() => {});
}
