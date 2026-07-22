# Tally

A **fully offline** personal money and habit tracker for Android. No account, no server, no
network — everything lives in a local SQLite database on the device. Release builds ship
without the INTERNET permission.

---

## Documentation map

| Document | Purpose |
|---|---|
| **[CLAUDE.md](CLAUDE.md)** | **Project memory — start here.** Purpose, decisions, rules, checklists. |
| [PROJECT_RULES.md](PROJECT_RULES.md) | Permanent development rules. |
| [BUILD.md](BUILD.md) | Zero-to-APK build guide, including a clean machine. |
| [DECISIONS.md](DECISIONS.md) | Chronological record of engineering decisions and their reasons. |
| [CHANGELOG.md](CHANGELOG.md) | Engineering release history. |
| [docs/architecture.md](docs/architecture.md) | Modules and how they communicate. |
| [docs/ui_guidelines.md](docs/ui_guidelines.md) | Colour, type, spacing, motion, components. |
| [docs/future_features.md](docs/future_features.md) | Backlog and deferred ideas. |
| [docs/release_notes.md](docs/release_notes.md) | User-facing release notes. |

---

## Features

**Money** — expenses, income and transfers across multiple accounts · categories with custom
colours · monthly budgets with progress and over-limit warnings · recurring rules that auto-add
and catch up · date **and** time on every transaction.

**Habits** — build or quit habits · daily or specific-day schedules · streaks and completion
history · local reminders with the device notification sound.

**Reports** — spending breakdown (tap a donut slice to drill in) · income vs expense trend ·
balance trend · habit heatmap and streak leaderboard.

**Tally Assistant** — an offline conversational assistant: adds transactions, creates budgets,
accounts and habits, and answers questions like *"I spent 500 on food"* or *"monthly summary"*.
Built behind a swappable engine interface so an LLM can replace the rule engine later.

**Product tour** — a 12-step spotlight walkthrough on first run, replayable from Settings.

**Privacy & security** — all data on-device · optional PIN (salted hash in the OS keychain) and
biometric unlock · backup/restore to a file · CSV export · light/dark theme · INR/USD/EUR/AUD.

---

## Technology stack

- **React Native 0.81.6** (React 19), TypeScript strict, Hermes, classic architecture
- **SQLite** via `@op-engineering/op-sqlite`, behind a thin driver adapter
- **React Navigation v7** (native-stack + bottom tabs)
- `react-native-svg` · `react-native-vector-icons` (Feather) · `@notifee/react-native`
- `react-native-keychain` + `react-native-biometrics` · `@dr.pogodin/react-native-fs`,
  `@react-native-documents/picker`, `react-native-share`

Android only — `minSdk 24`, `targetSdk 36`. There is no iOS project.

---

## Architecture at a glance

```
Screens  ──▶  Services  ──▶  Data (src/db)  ──▶  SQLite
   │             │
   └── Shared UI, Theme, Tour, Assistant
```

Dependencies point strictly downward: screens compose UI and call services/data; **only
`src/db/driver.ts` touches the database driver**. Full detail in
[docs/architecture.md](docs/architecture.md).

---

## Folder structure

```
App.tsx              app phases: loading → onboarding → locked → unlocked
index.js             RN entry point
src/
  assistant/         engine, intents, flows, NLU, tools
  components/        shared UI kit, charts, overlays, assistant UI
  constants/         APP_VERSION
  db/                driver adapter, migrations, typed queries
  navigation/        RootNavigator (tabs, stacks, transitions)
  screens/           onboarding, lock, home, money, habits, reports, settings
  services/          lock, notifications, recurring, backup, seed, startup
  theme/             colours, typography, tokens, ThemeProvider
  tour/              product tour engine + script
  utils/             date/currency formatting, haptics, icons
android/             native Android project
docs/                architecture, UI guidelines, future features, release notes
```

---

## Setup

Requires **Node ≥ 20**, **JDK 17**, and the Android SDK (API 36, Build-Tools 36.0.0 **and**
35.0.0, NDK 27.1.12297006, CMake).

```bash
git clone <repo> tally-app && cd tally-app
git checkout rn-cli-migration          # the React Native app lives here
npm install --legacy-peer-deps
```

Full environment setup — including a clean machine and troubleshooting — is in
**[BUILD.md](BUILD.md)**.

---

## Build

```bash
npm run typecheck        # tsc --noEmit — must be 0 errors
npm run android          # debug build onto a connected device (needs Metro: npm start)
npm run apk:android      # release APK  → android/app/build/outputs/apk/release/app-release.apk
npm run bundle:android   # Play Store AAB (requires signing config)
```

`npm run apk:android` bundles the JS itself — running `react-native bundle` separately just
duplicates the work.

---

## Development workflow

1. Read [CLAUDE.md](CLAUDE.md) and [PROJECT_RULES.md](PROJECT_RULES.md) first.
2. Make the change, keeping business logic out of screens.
3. `npm run typecheck` → 0 errors.
4. Bump `version` in `package.json` (the single source of truth for `versionName`/`versionCode`
   and the Settings screen).
5. `npm run apk:android`, install with `adb install -r` (preserves user data).
6. Work through the **regression checklist** in [CLAUDE.md §13](CLAUDE.md) — including a
   dark-mode pass.
7. Update [CHANGELOG.md](CHANGELOG.md), [docs/release_notes.md](docs/release_notes.md) and any
   affected docs **in the same change**.

---

## Contribution guidelines

- **Never break existing functionality**; additive by default.
- **Offline-first is a product promise** — no network calls, analytics or tracking.
- **Pin native dependency versions exactly** (no `^`) — mismatches have broken the build before.
- **Never edit a released database migration**; append a new one.
- Use theme tokens; **verify every visual change in both light and dark mode**.
- Reuse the shared motion primitives rather than inventing new animations.
- Document decisions in [DECISIONS.md](DECISIONS.md); keep docs in sync with the code.
