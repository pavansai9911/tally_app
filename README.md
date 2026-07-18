# Tally

A **fully offline** personal money + habit tracker for Android. No account, no server, no
network — everything lives in a local SQLite database on the device.

- **Money:** accounts, transactions (expense / income / transfer), budgets, categories, recurring rules (auto-added on their due date).
- **Habits:** build/quit habits, flexible schedules, streaks, heatmap, local reminders.
- **Reports:** spending breakdowns, income-vs-expense, balance trend, habit stats — all real SVG charts.
- **Privacy & security:** optional PIN + biometric app lock; PIN stored as a salted hash in the OS keychain. No INTERNET permission in release builds.

Built with **bare React Native CLI** (migrated from Expo — see [DECISIONS.md](DECISIONS.md)).

## Tech stack

- React Native 0.81 (React 19), TypeScript (strict), Hermes, New Architecture on.
- SQLite via `@op-engineering/op-sqlite` (behind a thin adapter in `src/db/driver.ts`).
- React Navigation v7, react-native-svg, react-native-vector-icons (Feather).
- Lock: react-native-keychain + react-native-biometrics. Reminders: `@notifee/react-native`.
- Backup/CSV: `@dr.pogodin/react-native-fs` + `@react-native-documents/picker` + `react-native-share`.

## Prerequisites

- Node ≥ 20, JDK 17.
- Android SDK (Android Studio) with **API 35/36** and an emulator or a device.
- `ANDROID_HOME` set. (This repo builds JS anywhere, but the APK/AAB needs the Android SDK.)

## Setup

```bash
npm install --legacy-peer-deps
```

## Run (development)

```bash
npm start                 # start Metro (terminal 1)
npm run android           # build & install the debug app (terminal 2)
```

## Verify without a device

```bash
npm run typecheck         # tsc --noEmit  (must be 0 errors)
# full production JS bundle (catches every import/transform issue):
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output /tmp/tally.bundle --assets-dest /tmp/tally-assets
```

## Release build (AAB for Play Store)

1. Create an upload keystore and set the gradle properties — see [android/keystore.properties.example](android/keystore.properties.example).
2. Build:

```bash
npm run bundle:android    # -> android/app/build/outputs/bundle/release/app-release.aab
# or an APK for sideloading:
npm run apk:android
```

Without the keystore properties, release builds fall back to the debug key (local testing only).

## Project structure

```
App.tsx                 app phases: loading / onboarding / locked / unlocked
src/db/                 SQLite: driver adapter, migrations, typed queries
src/services/           lock, notifications, recurring, backup, startup tasks
src/screens/            onboarding, lock, home, money, habits, reports, settings
src/components/         UI kit, charts, date/time fields, error boundary
src/theme/              colors (light/dark/lock), typography, tokens, ThemeProvider
src/utils/              local-time date + ₹ formatting, haptics, icon map
```

## Remaining before publishing

See the "Known follow-ups" section in [DECISIONS.md](DECISIONS.md): on-device QA, app icon + splash
from a designed logo, optionally enabling R8, and the Play Console listing / Data Safety form.
