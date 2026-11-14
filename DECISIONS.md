# Tally — Migration & Production Decisions Log

This document records every non-trivial decision taken while converting Tally from Expo
to bare React Native CLI and hardening it to production grade for the Google Play Store.
It is updated continuously as work proceeds.

- **App:** Tally — fully **offline** personal money + habit tracker (SQLite, no backend, no network).
- **Target:** Google Play Store, Android only, India (₹ INR fixed).
- **Branch:** `rn-cli-migration` (original working Expo app preserved on `main`).
- **Started:** 2026-07-18.

---

## Phase 0 — Environment & platform decisions

| # | Decision | Why |
|---|----------|-----|
| 0.1 | **Migrate off Expo to bare React Native CLI** | Owner is practising for larger native apps and wants full native control; the app is fully offline so no Expo-only service is needed. |
| 0.2 | **React Native 0.81.6 (React 18.3)** — not the newest 0.86 | 0.86 requires Node ≥ 22.11; this machine runs Node 20. 0.81 runs on Node 20 with no environment change, still uses `targetSdk 35` (Play-compliant), and has the most mature support across the native libraries we need (op-sqlite, notifee, keychain, vector-icons). Newest ≠ safest for shipping. |
| 0.3 | **Keep `com.tally.app` as the Android applicationId** | Preserves the identity from the Expo build; a stable app id matters once published. |
| 0.4 | **Build the APK/AAB on the owner's machine / CI, not here** | This environment has Node + Java but no Android SDK (`ANDROID_HOME` unset). All code is written build-ready and verified with TypeScript + Metro bundling; final Gradle build runs where the SDK is installed. |

## Library replacements (Expo → bare RN CLI)

| Capability | Expo module (old) | Bare RN replacement (new) | Notes |
|-----------|-------------------|---------------------------|-------|
| SQLite | expo-sqlite | **op-sqlite** | Wrapped behind a thin `db/driver` adapter so query code barely changes. |
| App-lock / biometrics | expo-local-authentication | **react-native-biometrics** + **react-native-keychain** | PIN stored hashed in the OS keychain, never in the SQLite DB. |
| Haptics | expo-haptics | **react-native-haptic-feedback** | |
| Icons | @expo/vector-icons | **react-native-vector-icons** | Feather set retained. |
| Splash | expo-splash-screen | **react-native-bootsplash** | |
| Fonts | @expo-google-fonts/inter + expo-font | **bundled Inter .ttf** via react-native.config assets | |
| Local notifications (NEW) | — | **@notifee/react-native** | Habit reminders scheduling. |
| Backup files (NEW) | — | **react-native-fs** + **react-native-document-picker** + **react-native-share** | Export/import backup + CSV. |
| Date picker (NEW) | — | **@react-native-community/datetimepicker** | Transaction date + reminder time. |
| Path alias `@/*` | babel-preset-expo | **babel-plugin-module-resolver** | Keeps existing `@/...` imports working. |

---

## Phase 2 — Data layer

| # | Decision | Why |
|---|----------|-----|
| 2.1 | All SQLite access goes through `src/db/driver.ts` (`SqlDb` adapter) | Keeps the query layer identical to the old expo-sqlite API; a future driver swap touches one file. Adapter is defensive about op-sqlite's result shape + sync/async `execute` (varies by version). |
| 2.2 | **Versioned migrations** via `PRAGMA user_version` (`src/db/schema.ts` MIGRATIONS) | The original used only `CREATE TABLE IF NOT EXISTS` with no versioning — any post-release schema change would silently fail. Now future changes append a migration and apply safely on update. |
| 2.3 | `undefined` bind params coerced to `null` in the adapter | Fixes the original edit-transaction crash (`occurred_at: undefined`). |
| 2.4 | `update*` functions use a **column whitelist** (`buildUpdate`) | The original built `SET` clauses from raw `Object.keys` — fragile/injectable. |
| 2.5 | Added `recurring_rules.last_run_date` column | Supports the new recurring auto-add engine. |

## Phase 3 — Correctness

| # | Decision | Why |
|---|----------|-----|
| 3.1 | **All date keys computed in local time** (`toDateKey`/`monthKey`/`parseDateKey`/`addDaysKey`); `toISOString` banned for keys | Kills the UTC bug that mis-dated logs/streaks/summaries in IST between 00:00–05:30. |
| 3.2 | Currency + date labels formatted **without Intl** (manual Indian grouping, month/weekday arrays) | Avoids reliance on Hermes ICU data being present on every device. ₹ is fixed for v1. |
| 3.3 | **Dark mode fixed** by replacing hardcoded `#FFFFFF` backgrounds with `colors.surfaceCard` (identical in light mode) + theming inputs | Light mode is byte-for-byte unchanged; dark mode becomes readable. |
| 3.4 | Theme mode **persisted** to SQLite settings and reloaded at startup | The original reset to "system" every launch. |
| 3.5 | Streak walker rewritten with a creation-date floor + guard | Fixes an infinite-loop risk for "quit" habits with no logs, and only-365-day longest-streak scan. |

## Phase 4 — Security (app lock)

| # | Decision | Why |
|---|----------|-----|
| 4.1 | PIN stored as **salted SHA-256 in the OS keychain** (react-native-keychain), never in SQLite | Original stored no PIN at all, so ANY 4 digits unlocked. |
| 4.2 | Enabling app-lock **requires creating a PIN**; biometric is an add-on | Prevents a lock state with no verifiable credential. |
| 4.3 | "Forgot PIN" **disables the lock** (data kept), no server recovery | Reasonable offline recovery; documented to the user in the dialog. |
| 4.4 | App only enters the locked phase if a real credential exists | Avoids a soft-lockout if settings say locked but no PIN is set (e.g. after restore). |

## Phase 5 — Features

| # | Decision | Why |
|---|----------|-----|
| 5.1 | Backup/restore = **portable JSON snapshot** of all tables (share sheet), restore inside one transaction | More robust/inspectable than shuffling the raw .db file; excludes the PIN salt. Critical for an offline app (data survives phone change). |
| 5.2 | CSV export of transactions via share sheet | Spreadsheet-friendly; the old button did nothing. |
| 5.3 | Recurring **auto-add catch-up on launch** (`processDueRecurring`) | Inserts every missed occurrence up to today; original never fired. |
| 5.4 | Habit reminders via **notifee** local notifications; daily habits → DAILY trigger, specific-days → per-weekday WEEKLY triggers; **inexact** scheduling | No SCHEDULE_EXACT_ALARM permission needed (Play-friendly). |
| 5.5 | Transaction screen gains real **note input, date picker, and transfer destination**; transfer now moves money correctly | Original had a dead note field, no date, and transfers that destroyed money. |

## Phase 6 — UX

| # | Decision | Why |
|---|----------|-----|
| 6.1 | **Thumb-reachable Save**: transaction screen has a full-width Save button below the keypad; habit/recurring screens have bottom Save bars | Owner's explicit request on Save placement. |
| 6.2 | Top-level `ErrorBoundary` with a local recovery screen (no remote logging) | Offline app — crashes must not white-screen; nothing is sent anywhere. |
| 6.3 | Haptics + accessibility labels on key actions | Production polish. |

## Phase 7 — Play Store readiness

| # | Decision | Why |
|---|----------|-----|
| 7.1 | **No INTERNET permission in release**; added only in the debug manifest for Metro | Backs the "fully offline / no data leaves device" promise; strongest possible Data Safety story. |
| 7.2 | Permissions added: POST_NOTIFICATIONS, USE_BIOMETRIC, VIBRATE, RECEIVE_BOOT_COMPLETED | Needed by reminders/biometric/haptics; boot-completed lets notifee reschedule after reboot. |
| 7.3 | `android:allowBackup="false"` kept | A finance app should not auto-sync its DB to Google cloud backup; users back up explicitly. |
| 7.4 | Release signing reads from gradle properties, falls back to debug key | Project still builds locally without secrets; real signing via `keystore.properties.example`. |
| 7.5 | System font (Roboto), R8/minify left **off** for v1, splash + app icon left as TODO | These need untestable-here native assets/config; correctness first, documented as follow-ups. |

---

## Phase 8 — First real device build (2026-07-20, Redmi 10 / Android 13)

Four issues surfaced only once we built and ran on hardware. All are fixed and pinned.

| # | Symptom | Root cause | Fix |
|---|---------|-----------|-----|
| 8.1 | Gradle: `Failed to install: build-tools;35.0.0` | `@dr.pogodin/react-native-fs` pins Build-Tools 35 internally; Gradle couldn't auto-install it (license not pre-accepted) | Installed `build-tools;35.0.0` + `platforms;android-35` via `sdkmanager` |
| 8.2 | Codegen: `setToolbarMenuElementOptions must be of type React.ElementRef<>` | `^4.11.1` resolved to **react-native-screens 4.26.2**, too new — its codegen spec uses a format RN 0.81's codegen can't parse | Pin screens to an exact version |
| 8.3 | C++: `'Shared' is deprecated ... [-Werror]` | Dropping to screens **4.11.1** was too *old* — its C++ uses an API RN 0.81 deprecated, and warnings are errors | **Pinned `react-native-screens` to exactly `4.16.0`** — matched by release date to RN 0.81 (Aug 2025) and verified in-source: uses `std::shared_ptr<const ShadowNode>` and has no `setToolbarMenuElementOptions` |
| 8.4 | **App installed but crashed ~2s after opening** | `Exception in HostObject::get for prop 'OPSQLite': TurboModuleInteropUtils$ParsingException — TurboModule system assumes returnType == void iff the method is synchronous`. op-sqlite's native module cannot be parsed by the **New Architecture** TurboModule interop layer | **`newArchEnabled=false`** in `android/gradle.properties` (classic architecture; RN 0.81 fully supports it and every library here works on it) |

Also hardened while diagnosing 8.4: `src/services/lock.ts` was constructing
`ReactNativeBiometrics` at **module scope**, which runs during startup (App.tsx imports it) —
a native failure there would crash before React could render, uncatchable by the ErrorBoundary.
It is now lazily `require`d and constructed inside a `try/catch`, so biometrics degrading just
disables that feature instead of killing the app.

**Lesson for this project:** pin native-module versions exactly (no `^`) — a caret silently
pulled in a screens version built for a newer React Native.

---

---

## Phase 9 — Reports export: PDF/CSV/JSON (2026-08-20, v1.5.0)

| # | Decision | Why |
|---|----------|-----|
| 9.1 | `react-native-html-to-pdf` pinned **exactly `0.12.0`**, not the current `1.x` line | `npm view` showed 1.0.0–1.3.0 (published 2025-09) were a full rewrite to a TurboModule-only spec (`NativeHtmlToPdfSpec` / `TurboModuleRegistry.getEnforcing`) — installed it, inspected the generated Android source, and found the same shape of interop failure documented in Phase 8.4 for op-sqlite, which `newArchEnabled=false` exists specifically to avoid. Downloaded and inspected the `0.12.0` tarball instead: it's a plain `ReactContextBaseJavaModule` bridge module (`RNHTMLtoPDFModule.java`), no TurboModule spec, empty `AndroidManifest.xml` (no permissions), writes only to the app cache dir. Verified end-to-end with a real `assembleRelease` build before committing to the approach. |
| 9.2 | PDF rendered via HTML + this library's native WebView-print pipeline, not a hand-rolled `PdfDocument`/Canvas native module | Automatic, correct pagination across pages comes for free from the Android print framework; a hand-rolled Canvas layout would mean re-deriving page-break/text-measurement logic that this library already gets right, for a one-off report generator that isn't on any hot path. |
| 9.3 | Day-precision range queries (`listTransactionsInRange`, `getSummaryInRange`, `getExpenseBreakdownInRange`) added as siblings to the existing month-aligned ones, rather than changing `getRangeSummary`/`getExpenseBreakdownByRange` | Those two are still used by `ReportsScreen`'s on-screen period selector, which is intentionally month-aligned (`'YYYY-MM'` prefix matching) — the export sheet needed an arbitrary day-level `[start, end]` window (esp. for "Custom"), which is a different comparison shape (`>= start AND < end+1day`), not a drop-in replacement. |

---

## Known follow-ups (need a device / designer, can't be done/verified in this headless env)

- **On-device QA**: run the app on a real Android device and exercise every flow (no Android SDK here, so only `tsc` + Metro bundle are verified).
- **App icon**: generate an adaptive launcher icon from a designed Tally logo (`assets/icon.png` is a starting point). Splash screen is now fully implemented (v1.4.3).
- **R8/ProGuard**: enable `enableProguardInReleaseBuilds` and add keep rules if any native lib needs them (test the release AAB after enabling).
- **Play Console**: Data Safety form (declare "no data collected/shared"), privacy policy URL, store listing assets, content rating.

---

## Phase 10 — First Google Play Store testing release (2026-09-09, v1.0.0)

| # | Decision | Why |
|---|----------|-----|
| 10.1 | `package.json` version reset from `1.6.0` to `1.0.0` for the first Play upload | The pre-Play internal iteration count (1.0.0 → 1.6.0) has no meaning to Play or to end users seeing the listing for the first time; a public product's version history conventionally starts at 1.0.0 at first release. `versionCode` is still fully derived from this (`10000`), preserving the existing always-increasing, never-hand-edited convention in `android/app/build.gradle` — no override needed. |
| 10.2 | `MANAGE_EXTERNAL_STORAGE`/`WRITE_EXTERNAL_STORAGE`/`READ_EXTERNAL_STORAGE` stripped from `android/app/src/release/AndroidManifest.xml` (same `tools:node="remove"` pattern already used for `INTERNET`/`SCHEDULE_EXACT_ALARM`) | `MANAGE_EXTERNAL_STORAGE` is one of Play's most restricted permissions — it requires a Permissions Declaration Form and is normally approved only for apps whose *core* purpose is file management. Tally is a finance/habit tracker; the permission only backs one convenience feature (auto-backup surviving an uninstall), so it was not worth the rejection/review-delay risk on the very first submission. Verified every JS/Kotlin call site (`isPermissionGranted`, `hasAllFilesAccess`, `performBackup`, `tryAutoRestore`) already treats "not granted" as "feature unavailable" and returns cleanly — no crash, no data corruption — so this was a manifest-only change with zero code changes needed. Manual Backup & Restore and Export are untouched (they never used this permission). Debug/sideloaded builds are unaffected — only the Play release drops it. |
| 10.3 | Generated a real upload keystore (PKCS12, `tally-upload`, 10000-day validity) and wired it via `TALLY_UPLOAD_STORE_FILE`/`_PASSWORD`/`_ALIAS`/`_KEY_PASSWORD` in `~/.gradle/gradle.properties` (user-level, never committed) | `android/app/build.gradle`'s release `signingConfig` already falls back to the debug key when these properties are absent — exactly the escape hatch the project was built with (see `android/keystore.properties.example`, `BUILD.md` §7). No app code or build script changes were needed, only supplying the properties Gradle already looks for. |
| 10.4 | Build run with `--no-daemon` on this pass | The host is an 8GB machine already under real memory pressure (browser tabs, IDE, an idle Gradle daemon) at the time of this release. A one-shot `--no-daemon` build avoids leaving a second long-lived 2GB-capable JVM resident after the build finishes; sequencing (bundle first, verify after, no emulator boot) kept peak memory lower on a machine that could not safely run a full on-device QA pass in this session. |
| 10.5 | `applicationId` changed to `com.tally_money_and_habit_tracker.app`; Gradle `namespace` (and every `.kt` file's `package` declaration under `android/app/src/main/java/com/tally/app/`) left as `com.tally.app` | `com.tally.app` was already taken on Play Console when the frontend dev tried to create the listing. `applicationId` (Play's globally-unique id) and `namespace` (the internal Kotlin/R-class package) are independent AGP settings — Android has supported them differing since AGP 7. Changing only `applicationId` avoided moving/renaming 4 Kotlin files (`MainActivity`, `MainApplication`, `TallyBackupModule`, `TallyBackupPackage`) and re-verifying native module registration, for zero functional benefit. `AndroidManifest.xml`'s relative `android:name=".MainActivity"` etc. still resolve correctly since they resolve against `namespace`, not `applicationId`. `src/services/lock.ts`'s keychain service string (`'com.tally.app.pin'`) is an arbitrary in-app key, unrelated to either identifier — left untouched. |

