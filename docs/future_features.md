# Future Features & Ideas

Backlog of deferred work, with enough context to pick it up later without re-deriving anything.
Nothing here is committed to a release.

**Status:** 🔵 planned · 🟡 idea · 🔴 blocked/needs decision

---

## Release readiness (before Play Store)

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **Production signing keystore** | 🔵 | Generate an upload keystore and set the gradle properties — see [BUILD.md](../BUILD.md) §7. Builds currently fall back to the debug key. **Required to publish.** |
| 2 | **Play Console listing** | 🔵 | Data Safety form (declare "no data collected" — accurate, since release builds have no INTERNET permission), privacy policy URL, screenshots, feature graphic, content rating. |
| 3 | **Splash screen** | 🔵 | Currently the default. Wants a branded Android 12+ splash using the Tally mark. |
| 4 | **Enable R8/ProGuard** | 🟡 | `enableProguardInReleaseBuilds` is off for build safety. Enabling shrinks the APK (~62MB) but needs keep rules verified for op-sqlite/notifee/keychain, and a full regression on the minified build. |
| 5 | **ABI splits / App Bundle** | 🟡 | The APK carries 3 ABIs. `bundleRelease` already solves this for Play; useful for sideloaded APKs too. |

## Assistant

| # | Item | Status | Notes |
|---|---|---|---|
| 6 | **OpenAI / LLM engine** | 🔴 | Architecture is ready (see [CLAUDE.md §11](../CLAUDE.md)) — implement `AssistantEngine`, pass `ASSISTANT_TOOLS` as function definitions. **Blocked on a product decision:** it introduces the first network call and changes the offline promise + Data Safety declaration. Should be opt-in with the offline engine as fallback. |
| 7 | Assistant entry point in Settings | 🟡 | Discoverable beyond the Home FAB. |
| 8 | Conversation history across sessions | 🟡 | Deliberately fresh each open today. Would need persistence and a clear-history control. |
| 9 | Voice input | 🟡 | Needs a speech library + microphone permission — weigh against the offline/no-permission stance. |
| 10 | Edit/delete via assistant | 🟡 | Tools currently create and read. Mutating existing records needs careful disambiguation ("which one?"). |
| 11 | Proactive insights | 🟡 | e.g. "you're 90% through the Food budget with 8 days left". Data already exists in `budget_status`. |

## Money

| # | Item | Status | Notes |
|---|---|---|---|
| 12 | Search & filter transactions | 🔵 | Most-requested gap; the list is date-grouped only. Needs an indexed query, not client filtering. |
| 13 | Attach receipt photos | 🟡 | Camera/storage permissions + backup implications (the JSON snapshot would need to carry images). |
| 14 | Split transactions | 🟡 | One payment across multiple categories. Schema change: a child-rows table. |
| 15 | Multi-currency accounts | 🟡 | Today one active currency formats everything. True per-account currency needs stored rates and a conversion policy. |
| 16 | Budget rollover | 🟡 | Carry unspent budget into the next month. |
| 17 | Manual "add now" for non-auto recurring rules | 🔵 | `auto_add = 0` rules are listed but cannot be posted with one tap. |

## Habits

| # | Item | Status | Notes |
|---|---|---|---|
| 18 | Per-week / per-month targets | 🔵 | Schema supports `schedule_target`; the Today view treats them as always-due. |
| 19 | Habit archive view | 🟡 | Archiving exists; archived habits are not browsable. |
| 20 | Richer streak rules | 🟡 | e.g. freeze days / grace periods. |

## Reports

| # | Item | Status | Notes |
|---|---|---|---|
| 21 | Custom date ranges | 🔵 | Fixed to the current month / last 6 months. |
| 22 | Export a report as PDF/image | 🟡 | Share sheet already wired for CSV. |
| 23 | Year-in-review | 🟡 | Seasonal engagement feature. |

## Platform & quality

| # | Item | Status | Notes |
|---|---|---|---|
| 24 | Automated tests | 🔵 | Jest is configured but unused. Highest value: `utils/format` (date/currency edge cases), streak maths, the assistant NLU/engine — all pure functions, no device needed. |
| 25 | Re-evaluate the New Architecture | 🔴 | Blocked on op-sqlite's TurboModule interop. Re-test on a device before flipping. |
| 26 | iOS support | 🟡 | Android-only today; there is no `ios/` project. Most code is portable; native config is not. |
| 27 | Widgets / quick tiles | 🟡 | "Add expense" from the home screen. |
| 28 | Tablet / landscape polish | 🟡 | Layouts are phone-portrait first. |
| 29 | Localisation | 🟡 | Copy is English-only; `format.ts` deliberately avoids `Intl`, so this needs its own approach. |
| 30 | Encrypt the database | 🟡 | Data is app-private and `allowBackup=false`, but SQLCipher would protect a rooted/extracted device. |

## Known trade-offs currently accepted

- **FAB overlays list content** at rest (standard Material behaviour; content can be scrolled
  clear). Alternatives: auto-hide on scroll, or shift it up. Awaiting a product call.
- **Reminders are inexact** (`allowWhileIdle`), so they can land a few minutes late. Deliberate —
  exact alarms require `SCHEDULE_EXACT_ALARM`, which attracts Play policy review.
- **`longest` streak scans from habit creation**, which is O(days) per habit. Fine at current
  scale; revisit if habit counts grow.
