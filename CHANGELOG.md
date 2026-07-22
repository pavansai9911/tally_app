# Changelog

All notable changes to Tally. Newest first.

Format: [Keep a Changelog](https://keepachangelog.com/). Versions follow `MAJOR.MINOR.PATCH`
from `package.json` — the single source of truth, from which `versionName` and `versionCode`
(`1.2.3 → 10203`) are derived.

**Every release appends an entry here.** Add it in the same change as the version bump.

---

## [1.0.5] — 2026-07-22

### Added
- **Interactive product tour.** 12-step spotlight walkthrough covering the Home dashboard,
  Money, Habits, Reports, Settings and the Tally Assistant. Dimmed backdrop with a rounded
  cut-out, adaptive tooltip placement, step counter, progress bars, Back/Next/Skip/Finish.
- Tour auto-starts once after onboarding and is replayable from **Settings → Restart product tour**.
- Auto-scroll brings below-the-fold targets into view; the tour can switch bottom tabs.

### Notes
- Highlight positions are measured at runtime (`measureInWindow`), so they stay correct on any
  screen size, density or orientation.

## [1.0.4] — 2026-07-22

### Added
- **Close** chip after a successful assistant action, returning the user to Home.

### Changed
- Category list is **expanded by default** on a new transaction (collapses on selection,
  re-opens on tap). Stays collapsed when editing.
- Success animation now holds ~2.2s (was ~0.9s) so the tick completes and registers.

## [1.0.3] — 2026-07-22

### Fixed
- Assistant now **asks which account** to debit/credit instead of silently using the first one
  (auto-skipped when only one account exists).
- Creating a budget for a category that already had one now **updates** it instead of creating a
  duplicate (duplicates double-counted in reports).
- Assistant starts a **fresh session** on every open.
- Home refreshes immediately after the assistant writes data.
- Suggestion chips **wrap** onto multiple lines instead of scrolling horizontally.
- Spend insight tools aggregate in SQL instead of loading every transaction into JS.
- Guarded against double-send; fixed keyboard avoidance hiding the chat composer.

## [1.0.2] — 2026-07-21

### Added
- **Tally Assistant** — offline conversational assistant on a Home FAB: 47 intents, 19
  executable tools, 8 guided slot-filling flows, free-text understanding ("I spent 500 on food"),
  typing animation, suggestion chips and an SVG support-agent avatar.
- Architected behind an `AssistantEngine` interface with an LLM-function-calling-shaped tool
  registry, so OpenAI can replace the rule engine without UI changes.

## [1.0.1] — 2026-07-21

### Added
- **Date *and* time** on transactions (time defaults to now); shown on details and lists.
- **Seed sample data** developer utility (3/6/12-month and large datasets), replaceable and removable.
- **Reminder diagnostics** in Settings: scheduled count, 5-second test notification, manual reschedule.
- Production animations: page transitions, success overlay, tab/list fade-ins.

### Changed
- Reminders use the device default notification sound and `allowWhileIdle` so they fire in Doze
  without needing `SCHEDULE_EXACT_ALARM`; they are rebuilt on every launch.
- App version is now single-sourced from `package.json` (Gradle reads it; Settings imports it).
- Home → Recent transactions opens **Details** (not Edit); details show Type and Time.

### Fixed
- Transaction details refresh immediately after saving an edit.
- Money bottom tab always reopens the Transactions screen.

## [1.0.0] — 2026-07-20

First stable build on bare React Native CLI.

### Added
- Swipeable inner tabs (Expense/Income/Transfer, Today/All habits, Money/Habits reports).
- Swipeable onboarding walkthrough; multi-currency (INR, USD, EUR, AUD).
- Backup/restore (JSON) and CSV export; recurring auto-add with catch-up; habit reminders.
- Real app lock: salted-hash PIN in the keychain, biometrics, lockout, safe reset.
- Adaptive app icon generated from the Tally logo.

### Changed
- **Migrated from Expo (SDK 51) to bare React Native CLI 0.81** targeting Android SDK 36.
- Release builds ship **without the INTERNET permission**; `allowBackup=false`.

### Fixed
- Startup crash caused by op-sqlite under the New Architecture (now `newArchEnabled=false`).
- UTC date bug that mis-dated habit logs, streaks and monthly summaries in IST.
- Dark-mode contrast across the app (hero cards, tab pills, stat tiles).
- Versioned SQLite migrations added; transfers, notes and transaction dates made functional.

### Breaking
- Expo tooling no longer applies; builds now use Gradle. See [BUILD.md](BUILD.md).
