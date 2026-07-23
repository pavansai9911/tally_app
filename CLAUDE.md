# CLAUDE.md — Tally project memory

**This is the single source of truth for future sessions. Read this first.**

It records *what the app is* and *why things are the way they are* — especially decisions
that are expensive to rediscover. It deliberately does **not** restate implementation
detail that the code already expresses; it points at the code instead, so this file stays
true as the code evolves.

| | |
|---|---|
| **App** | Tally — offline personal money + habit tracker |
| **Package** | `com.tally.app` |
| **Platform** | Android only (no iOS project) |
| **Current version** | see `package.json` → `version` (single source of truth) |
| **Branch** | `rn-cli-migration` (the original Expo app is on `main`) |
| **Related docs** | [PROJECT_RULES.md](PROJECT_RULES.md) · [BUILD.md](BUILD.md) · [DECISIONS.md](DECISIONS.md) · [docs/architecture.md](docs/architecture.md) · [docs/ui_guidelines.md](docs/ui_guidelines.md) · [CHANGELOG.md](CHANGELOG.md) |

---

## 1. Purpose

Tally lets one person track their money and their habits, **entirely offline**. There is no
account, no server, no analytics, no ads. Everything lives in a local SQLite database on the
device. Release builds ship **without the INTERNET permission** — that is a product promise,
not an implementation detail, and it must not be broken casually.

Primary jobs the app does:
- Log expenses, income and transfers across multiple accounts.
- Organise spending with categories and monthly budgets.
- Track build/quit habits with schedules, streaks and local reminders.
- Explain the data back via reports and an offline conversational assistant.

---

## 2. Technology stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **React Native 0.81.6**, React 19.1.4 | Runs on Node 20 (0.86 needs Node 22) |
| Language | TypeScript, `strict: true` | `npm run typecheck` must be 0 errors |
| Engine | Hermes | |
| Architecture | **Classic (`newArchEnabled=false`)** | See §12 — this is deliberate |
| Database | `@op-engineering/op-sqlite` | Behind an adapter, see §5 |
| Navigation | React Navigation v7 (native-stack + bottom-tabs) | |
| Icons | `react-native-vector-icons` (Feather) | Linked via `fonts.gradle` |
| Vector art | `react-native-svg` | Charts, assistant avatar, tour spotlight |
| Security | `react-native-keychain` + `react-native-biometrics` + `js-sha256` | |
| Notifications | `@notifee/react-native` | Local only |
| Files | `@dr.pogodin/react-native-fs`, `@react-native-documents/picker`, `react-native-share` | Backup/CSV |
| Pickers | `@react-native-community/datetimepicker` | |
| Haptics | `react-native-haptic-feedback` | |

**No custom fonts are bundled** — the app uses the system font (Roboto). Typography is
weight-based, which is reliable across devices and adds nothing to APK size.

---

## 3. Folder structure

```
App.tsx                  app phases: loading → onboarding → locked → unlocked
index.js                 RN entry (registers "Tally")
src/
  assistant/             Tally Assistant: engine, intents, flows, NLU, tools
  components/            shared UI (ui.tsx kit, charts, SwipeTabs/SwipeTabView, ConfirmDialog,
                         PeriodMenu, overlays, assistant/)
  constants/             app.ts (APP_VERSION from package.json)
  db/                    driver adapter, migrations, typed queries per domain
  navigation/            RootNavigator (tabs + stacks, transitions)
  screens/               onboarding, lock, home, money, habits, reports, settings
  services/              lock, notifications, recurring, backup, seed, startup
  theme/                 colors (light/dark/lock), typography, tokens, ThemeProvider
  tour/                  product tour engine + script
  types/                 ambient module declarations
  utils/                 format (dates/currency), currency, haptics, iconMap
android/                 native project (no ios/ — Android only)
docs/                    architecture, UI guidelines, future features, release notes
```

**Rule:** business logic lives in `src/db` and `src/services`; screens compose UI and call
into them. Never put SQL or persistence logic in a screen.

---

## 4. Coding standards

- TypeScript strict; no `any` unless bridging an untyped native module (comment why).
- Comments explain **why**, never what the code already says.
- Match surrounding style — the codebase uses inline style objects with theme tokens, not
  StyleSheet.create. Follow that.
- Reusable UI belongs in `src/components`; do not copy-paste a component into a second screen.
- Every screen reads colours from `useTheme()`. **Never hard-code a colour that must adapt.**

---

## 5. Database

- **Access is always through `src/db/driver.ts`** (`SqlDb`). Nothing else may import op-sqlite.
  The adapter also coerces `undefined` binds to `null` and tolerates op-sqlite's differing
  result shapes across versions.
- **Migrations are versioned** via `PRAGMA user_version` in `src/db/schema.ts`.
  **Never edit a released migration** — append a new one with the next version number.
- Updates use `buildUpdate()` with an explicit column whitelist. Do not build `SET` clauses
  from raw `Object.keys`.
- Tables: `settings`, `accounts`, `categories`, `transactions`, `budgets`, `recurring_rules`,
  `habits`, `habit_logs`.
- `settings` is a key/value store (theme, currency, onboarding, lock flags, tour flag, seed marker).

### Transaction rules
- `occurred_at` is **`'YYYY-MM-DD HH:MM'` in local time**, lexicographically sortable.
  Rows created before time support exist as date-only `'YYYY-MM-DD'` — **every helper must
  tolerate both**. No migration was needed precisely because of this format choice.
- Month queries use prefix matching (`LIKE 'YYYY-MM%'`), which is why adding time was safe.
- A transfer is **one row** with `type='transfer'`, `account_id` (from) and `to_account_id` (to).
  Balance maths lives in `listAccounts()`.

### Habit rules
- A day counts via `habit_logs.status`: `done` / `partial` / `skipped`.
- **build** habits: a logged day continues the streak; an unlogged past day breaks it. Today
  being unlogged does *not* break it (it is still pending).
- **quit** habits: every day without a `skipped` (relapse) counts as success.
- Streak walks are floored at the habit's creation date — this prevents an infinite loop for
  quit habits with no logs.

### Budget rules
- **A category holds at most one budget.** Creating one for a category that already has a
  budget must **update** it (see `getBudgetByCategory`), never insert a duplicate — duplicates
  double-count in reports.

---

## 6. Dates, time and currency

- **Never use `toISOString()` to build a date key.** It is UTC and silently shifts the date
  (in IST it reported "yesterday" between 00:00–05:30). Use the helpers in `src/utils/format.ts`
  (`todayKey`, `toDateKey`, `monthKey`, `addDaysKey`, `parseDateKey`).
- **Never rely on `Intl` / `toLocaleDateString`** for user-visible values. ICU data is not
  guaranteed on every Android build. `format.ts` implements month/weekday names and digit
  grouping manually.
- Currency lives in `src/utils/currency.ts`: a `CURRENCIES` list (INR, USD, EUR, AUD) plus a
  module-level *active* currency loaded at startup. `formatCurrency()` applies the right symbol
  **and grouping style** (Indian lakh/crore vs western 3-digit). Adding a currency = one entry.

---

## 7. Theme, navigation and UI

Full detail in [docs/ui_guidelines.md](docs/ui_guidelines.md). The rules that cause bugs when
forgotten:

- **`colors.neutral900` inverts between themes** (near-black in light, near-white in dark).
  Using it as a *background* with white text produces white-on-white in dark mode. Either
  pair it with `colors.neutral0` text (which inverts too), or pick an explicitly dark value.
- The Home/Accounts hero cards stay dark in **both** themes: `isDark ? neutral200 : neutral900`.
- Bottom tabs: Home, Money, Habits, Reports. **Tapping the Money tab always resets to the
  Transactions screen** (a `tabPress` listener) so it never reopens a deep inner screen.
- Page transitions: `slide_from_right` for stacks, `slide_from_bottom` for modals, cross-fade
  between tabs. **Settings uses `animation: 'fade'`** (side-slide felt out of place there).
  Configured once in `RootNavigator`.
- Inner tab switching (Expense/Income/Transfer, Today/All, Money/Habits, Categories
  Expense/Income) uses **`components/SwipeTabs`** — a paging ScrollView whose highlight and
  label colours interpolate off the live scroll offset, so the indicator follows the finger.
  (`SwipeTabView` is the older non-interactive paging primitive, kept as a lighter option.)
  **Do not add `react-native-pager-view`**; a JS pager avoids another native dependency and
  pages horizontally only, so each page keeps its own vertical scrolling without gesture
  conflicts. Colour interpolation forces `useNativeDriver: false` in `SwipeTabs` — expected.
- **Confirmations use `components/ConfirmDialog` (`ConfirmProvider` + `useConfirm`), never
  `Alert.alert`.** One provider wraps the app (above the lock screen) and owns a single
  themed, animated dialog. `confirm({ title, message, icon?, tone?, buttons })` mirrors
  `Alert.alert`; messages should be context-aware (e.g. name the streak a delete would cost).
- **Period selection** (Home hero, Reports) uses `components/PeriodMenu` + `utils/period.ts`
  (`This month / 3M / 6M / All time`). Backed by `getRangeSummary` / `getExpenseBreakdownByRange`,
  which filter on `occurred_at >= 'YYYY-MM'`; `'month'` keeps exact prefix matching.
- Animations use `Animated` with `useNativeDriver: true` wherever the property allows.

---

## 8. Feature notes

### Tally Assistant (`src/assistant/`)
Offline conversational assistant reached from a Home-only FAB. Architecture and the OpenAI
migration path are in §11 and [docs/architecture.md](docs/architecture.md).
- Every open starts a **fresh session** (history cleared on close).
- It performs **real writes** through the tool layer; it does not fake replies.
- With more than one account it **must ask which account** — never guess where money moves.
- After a successful action the chips include **Close**, a reserved UI action (`__close__`)
  intercepted by the chat UI, not sent to the engine.

### Product tour (`src/tour/`)
12-step spotlight walkthrough. Targets register a `measureInWindow` handle via `<TourTarget>`,
so highlights are computed at **runtime** and stay correct on any screen size/orientation —
never hard-code coordinates. Auto-starts once (flag `product_tour_done`), auto-scrolls Home to
reveal off-screen targets, can switch tabs, and is replayable from **Settings → Restart product tour**.

### Reminders (`src/services/notifications.ts`)
- Local notifications via notifee, using the **device default sound** (no bundled audio, so
  nothing copyrighted ships).
- Triggers use `alarmManager.allowWhileIdle` so they fire in Doze **without** requiring
  `SCHEDULE_EXACT_ALARM` (that permission attracts Play policy review). notifee's manifest
  merges the permission in anyway, so `android/app/src/release/AndroidManifest.xml` strips it
  (and INTERNET) from release with `tools:node="remove"`. **Verify with
  `aapt2 dump permissions <apk>` after any native/dependency change.**
- Android drops scheduled alarms on reboot, so **all reminders are rebuilt on every launch**.
- **Settings → Reminder diagnostics** shows the scheduled count, sends a 5-second test
  notification and can force a reschedule. Use it to verify the pipeline instead of waiting.

### Recurring (`src/services/recurring.ts`)
Auto-add rules are processed at launch and **catch up every missed occurrence**, so being away
for weeks still produces the right history.

### Backup / export (`src/services/backup.ts`)
Portable JSON snapshot of every table via the share sheet; restore replaces all data inside one
transaction. The PIN salt is never exported. CSV export is separate.

### Sample data (`src/services/seed.ts`)
**Developer/testing utility**, exposed in Settings and clearly labelled. Generates realistic
3/6/12-month or large datasets. Seeded ids are recorded in `settings`, so re-running **replaces**
rather than duplicates, and it can be cleanly removed.

---

## 9. Security

- The PIN is stored as a **salted SHA-256 hash in the OS keychain** — never in SQLite, never
  in plain text. The salt lives in `settings` and is excluded from backups.
- App lock only engages when a real credential exists, so a restored/misconfigured state can
  never lock the user out.
- **Every** security-sensitive change requires authentication: removing the lock and changing
  the PIN require the current PIN; enabling *and* disabling biometrics require a fingerprint.
- "Forgot PIN" disables the lock and keeps the data — there is no server-side recovery.

---

## 10. Versioning, build and release

- **`package.json` `version` is the single source of truth.** `android/app/build.gradle` reads
  it for `versionName` and derives `versionCode` (`1.2.3 → 10203`). `Settings → Version` imports
  the same file. **To release, bump only `package.json`.**
- Build: `npm run apk:android` → `android/app/build/outputs/apk/release/app-release.apk`.
  Full instructions (including a clean machine) are in [BUILD.md](BUILD.md).
- Do **not** run `react-native bundle` as a separate verification step — `assembleRelease`
  already bundles the JS, so it just doubles the work.
- Release signing reads gradle properties and falls back to the debug key when absent, so the
  project still builds without secrets.

---

## 11. Future OpenAI integration plan

The assistant was built so this is a drop-in, not a rewrite:

1. `src/assistant/types.ts` defines `AssistantEngine`. **The chat UI depends only on this.**
2. `src/assistant/actions.ts` exports `ASSISTANT_TOOLS` — each tool already carries a `name`,
   `description` and typed `parameters`, which is exactly the OpenAI function/tool schema.
3. To migrate: add `openAiEngine.ts` implementing `AssistantEngine`, pass `ASSISTANT_TOOLS` as
   function definitions, execute whichever tool the model selects, and return an `AssistantReply`.
   Then return it from `createAssistantEngine()` in `src/assistant/index.ts`.
4. **Nothing in the UI, intents, flows or tools needs to change.**

⚠️ This would introduce the app's first network call. That breaks the "no INTERNET permission"
promise and changes the Play Data Safety declaration — it must be a deliberate product decision,
ideally opt-in, and the offline engine should remain as the fallback.

---

## 12. Hard-won decisions (do not undo without reading why)

| Decision | Reason |
|---|---|
| `newArchEnabled=false` | op-sqlite cannot be parsed by the New Architecture TurboModule interop (`returnType == void iff synchronous`). The app crashed ~2s after launch. RN 0.81 fully supports the classic architecture. |
| `react-native-screens` pinned **exactly 4.16.0** | 4.26 breaks RN 0.81 codegen (`setToolbarMenuElementOptions`); 4.11 fails the C++ build (deprecated `ShadowNode::Shared` under `-Werror`). Verified in-source. **Pin native versions exactly — no carets.** |
| Build-Tools **35.0.0** required | `@dr.pogodin/react-native-fs` pins it internally; Gradle cannot auto-install it. |
| RN 0.81 (not 0.86) | 0.86 requires Node ≥22; the dev machine runs Node 20. |
| System font, no bundled Inter | Custom font linking was untestable in the build environment; weight-based typography is reliable. |
| No INTERNET in release | Backs the offline promise. Libraries merge INTERNET (and `SCHEDULE_EXACT_ALARM`) in, so `src/release/AndroidManifest.xml` strips them via `tools:node="remove"`; the debug manifest re-adds INTERNET for Metro. Confirm with `aapt2 dump permissions`. |
| `allowBackup=false` | A finance app should not auto-sync its DB to Google cloud backup. |
| SVG assistant avatar | Crisp at any density, themeable, no binary asset, no licensing risk. |
| Status bar not translucent | Translucent modals break keyboard avoidance on Android and overlapped screen headers. |

---

## 13. Checklists

### Regression checklist (run before every release)
1. `npm run typecheck` → **0 errors**.
2. `npm run apk:android` → **BUILD SUCCESSFUL**.
3. Install with `adb install -r` (preserves data) and confirm the app launches with no
   `FATAL` / `E ReactNativeJS` entries in `adb logcat`.
4. Money: add expense / income / **transfer**; edit an existing transaction (amount, date,
   time, account, category, note all persist).
5. Home: totals, budgets, habits and recents refresh; tapping a recent row opens **Details**.
6. Navigation: Money tab always opens Transactions; Home hero opens Accounts; back behaves.
7. Swipe tabs in Money / Habits / Reports; confirm vertical scrolling still works.
8. Habits: check-in, streaks, reminder save.
9. Reports: charts render; donut slice opens the category drill-down.
10. Settings: theme, currency, PIN set/change/remove, biometrics, backup + restore.
11. Assistant: guided expense (account step appears), free text, fresh session on reopen,
    Close chip, Home refresh after a write.
12. Product tour: auto-start, spotlight alignment, skip, finish, restart from Settings.
13. **Dark mode pass** over every screen touched.

### Testing notes
- On-device testing needs the phone **unlocked**; `adb` cannot dismiss a secured keyguard and
  screenshots return 0 bytes while locked.
- Do not drive the device with `adb input` while someone is using it — taps land on whatever
  moved underneath and can create real records.
- MIUI blocks *new* installs over USB unless "Install via USB" is enabled; `install -r` over an
  existing install works.

### Performance guidelines
- Aggregate in **SQL**, not JavaScript. Do not load whole tables to sum them (this was a real
  regression in the assistant's spend tools).
- Keep animations on the native driver; avoid animating layout props in lists.
- Long lists must virtualise or be limited (`listTransactions(limit)`).
- The seeder can create thousands of rows — use it to sanity-check performance.

---

## 14. Documentation upkeep (standing instruction)

Whenever a feature, fix or architectural change lands, **update the docs in the same change**:

| Change type | Update |
|---|---|
| Any release | `package.json` version, [CHANGELOG.md](CHANGELOG.md), [docs/release_notes.md](docs/release_notes.md) |
| New/changed behaviour or decision | this file + [DECISIONS.md](DECISIONS.md) if it is a trade-off |
| Module or data-flow change | [docs/architecture.md](docs/architecture.md) |
| Visual/interaction change | [docs/ui_guidelines.md](docs/ui_guidelines.md) |
| Idea deferred | [docs/future_features.md](docs/future_features.md) |

Keep entries short and factual. If a doc and the code disagree, **the code is right** — fix the doc.
