# Release Notes

User-facing notes, written in plain language for whoever installs the build. Newest first.

For the engineering view, see [../CHANGELOG.md](../CHANGELOG.md).

---

## Version 1.3.1

**Filter controls stay put**

- Fixed: on Home, picking an account (or time period) with no activity made the balance
  overview and its dropdowns disappear, so you couldn't switch back. The dropdowns now always
  stay visible — an empty selection just shows ₹0.
- Fixed the same thing in Reports: choosing a period with nothing in it no longer hides the
  period selector.

## Version 1.3.0

**Account filtering, category reordering, and a clean-slate reset**

- **See one account at a time on Home.** A new Account dropdown on the balance card lets you
  focus the balance, the income/expense/net summary and recent activity on a single account —
  and it remembers your choice next time you open the app.
- **Put categories in your own order.** Drag the handle next to a category to reorder it (works
  for both Expense and Income). New categories start at the top, and “Other” always stays last.
- **Filter an account by In or Out.** Open an account and tap IN or OUT to see only money coming
  in or going out; tap again to see everything.
- **Transfers look right everywhere.** A transfer now shows as OUT on the account it left and IN
  on the account it reached, and account balances count transfers correctly.
- **Edit a category straight from Reports.** Tap a slice in the expense breakdown, then the edit
  icon, to rename or recolour that category.
- **Cleaner transaction details.** Long notes now have room to breathe and are easy to read.
- **Start over if you want to.** Settings now has a Hard Reset that wipes everything — including
  the automatic backup — after you type DELETE to confirm. Useful if you ever want to stop using
  the on-device backup and begin completely fresh.

## Version 1.2.0

**Never lose your data to a reinstall**

- **Automatic backup, right on your phone.** Tally now quietly keeps a private, encrypted backup
  of your data in a “Tally-tracker” folder on your device. It never leaves your phone.
- **Reinstall and pick up where you left off.** If you uninstall Tally and install it again on the
  same phone, your accounts, transactions, categories, habits, reports and settings come back
  automatically — no exporting or importing, and no setup screens. It just opens on your data.
- **The first time you open Tally**, it asks for storage access so it can keep this backup safe.
  You grant it once (and once again if you ever reinstall). You can turn automatic backup off any
  time in Settings → Backup & restore, where you'll also see when the last backup ran.
- **Your sample/demo data is never backed up**, so restoring never brings back practice records.
- Everything stays offline — the app still has no internet access at all.
- The older manual backup/restore is still there if you want a file you can move to another phone.

## Version 1.1.1

**Works the same on every phone**

- **Nothing hides behind the status bar or camera anymore.** On some newer phones the top of a
  screen was slipping under the clock and the camera notch — that's fixed everywhere.
- **Button labels show in full.** On some phones "Add Expense" and "Add Income" were getting cut
  down to just "Add"; now the full text always shows.
- **A brand-new install now has all its categories.** Setting the app up fresh on another phone
  was leaving only a couple of categories — now you get the complete set from the start. Income
  categories are Salary and Freelance, as before.

## Version 1.1.0

**Filters, friendlier dialogs, and smoother swipes**

- **Find any transaction fast.** The Money tab now has filters — by type, category and month —
  with a running count and a one-tap "clear all".
- **Reports and Home can look back further.** Switch the summary between this month, the last
  3 or 6 months, or all time. Your total balance always reflects everything.
- **Nicer confirmations.** When you delete something important, the pop-up now matches the app
  and tells you exactly what's at stake — for a habit, it names the streak you'd be giving up.
- **Swiping feels alive.** Moving between tabs (in Money, Habits, Reports and Categories)
  follows your finger, with the highlight sliding as you go. Categories can now be swiped
  between Expense and Income.
- **More to work with.** New icons for friends, trips, gifts and more, plus ready-made
  categories for lending to and borrowing from friends, and gifts.
- **Small touches.** Transaction rows show the time and lead with the category; habits gently
  cascade into view; opening Settings now fades in.

---

## Version 1.0.5

**A guided tour of the app**

New to Tally? A short walkthrough now runs the first time you reach the home screen. It
highlights one thing at a time — your balance, budgets, habits, recent activity, the assistant
and each tab — with a quick explanation of what it does.

- Skip it whenever you like; it won't come back on its own.
- Replay it any time from **Settings → Restart product tour**.
- It scrolls the screen for you so the thing being explained is always in view.

---

## Version 1.0.4

**Faster expense entry and a calmer confirmation**

- When you add a transaction, the category list is now open straight away — type the amount and
  pick a category without an extra tap. It closes once you choose (tap it again to change).
- After the assistant saves something, a **Close** button returns you straight to the home screen.
- The green success tick now stays on screen long enough to actually see it.

---

## Version 1.0.3

**Assistant fixes**

- The assistant now asks **which account** money should come out of (or go into) instead of
  picking one for you. If you only have one account, it won't ask.
- Setting a budget for a category that already has one now **updates** it instead of creating a
  second, which was throwing off your reports.
- Closing the assistant now clears the conversation, so it starts fresh next time.
- The home screen updates immediately after the assistant adds something.
- Suggestion buttons now wrap onto multiple lines so you can see all of them.
- Faster answers to spending questions.

---

## Version 1.0.2

**Meet the Tally Assistant**

Tap the new button on the home screen to chat with the assistant. It can:

- Add expenses, income and transfers
- Create budgets, accounts and habits
- Answer questions like *"monthly summary"*, *"budget status"* or *"today's habits"*
- Understand plain sentences such as *"I spent 500 on food"*

It runs **completely offline** — nothing you type leaves your phone.

---

## Version 1.0.1

**Time on transactions, plus reliable reminders**

- Transactions now record the **time** as well as the date, defaulting to now.
- Habit reminders are more dependable: they use your phone's normal notification sound, still
  arrive when the phone is idle, and are restored after a restart.
- **Settings → Reminder diagnostics** can send a test notification so you can check they work.
- **Settings → Seed sample data** fills the app with realistic demo records for trying out the
  reports (and removes them again cleanly).
- Smoother animations throughout, and a confirmation animation when something saves.
- Tapping a recent transaction now opens its details first; edit from there.
- The Money tab always opens on your transaction list.

---

## Version 1.0.0

**First stable release**

- **Money** — expenses, income and transfers across multiple accounts, with categories,
  monthly budgets and recurring entries that add themselves.
- **Habits** — build or quit habits, flexible schedules, streaks and reminders.
- **Reports** — spending breakdown, income vs expense, balance trend and habit activity.
- **Privacy** — everything stays on your phone. No account, no cloud, no ads, no tracking.
  The app has no internet access at all.
- **Security** — optional PIN and fingerprint lock.
- **Your data is yours** — back it up to a file and restore it on a new phone, or export your
  transactions as a spreadsheet.
- Swipe between tabs, choose your currency (₹ $ € A$), and pick light or dark theme.
