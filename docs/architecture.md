# Architecture

How Tally is put together and how the modules talk to each other.
Rules and rationale live in [../CLAUDE.md](../CLAUDE.md).

---

## 1. Layers

```
┌──────────────────────────────────────────────────────────┐
│ Screens  (src/screens)                                   │  compose UI, no persistence
│   onboarding · lock · home · money · habits · reports · settings
├──────────────────────────────────────────────────────────┤
│ Shared UI (src/components) · Theme (src/theme)           │  reusable, themed
│   ui kit · charts · SwipeTabs · ConfirmDialog · overlays │
│ Cross-cutting: src/tour  (spotlight product tour)        │
├──────────────────────────────────────────────────────────┤
│ Services (src/services)                                  │  behaviour / side effects
│   lock · notifications · recurring · backup · seed · startup
│ Assistant (src/assistant)  engine · intents · flows · nlu · tools
├──────────────────────────────────────────────────────────┤
│ Data (src/db)                                            │  the only place SQL lives
│   driver adapter → migrations → typed queries per domain │
├──────────────────────────────────────────────────────────┤
│ SQLite (op-sqlite) — on-device, offline                  │
└──────────────────────────────────────────────────────────┘
```

**Dependency direction is strictly downward.** Screens may call services and db; services may
call db; db calls nothing above it. Nothing outside `src/db/driver.ts` imports op-sqlite.

---

## 2. Application lifecycle

`App.tsx` drives four phases:

```
loading ──▶ onboarding ──▶ unlocked
   └──────▶ locked ──────▶ unlocked
```

On start it: opens the DB (running migrations and seeding default categories), applies the saved
currency, runs startup tasks, then decides whether to lock. It only enters `locked` when a real
credential exists, so a misconfigured state can never lock the user out.

Provider order: `ErrorBoundary → SafeAreaProvider → ThemeProvider → NavigationContainer → TourProvider → RootNavigator`.
The tour sits inside the navigator so it can spotlight tab bar items and switch tabs.

**Startup tasks** (`services/startup.ts`): process due recurring rules (blocking, so the
dashboard shows correct totals) then rebuild habit reminders in the background.

---

## 3. Data layer (`src/db`)

| File | Role |
|---|---|
| `driver.ts` | `SqlDb` adapter over op-sqlite. Isolates the driver, sanitises `undefined` binds, tolerates differing result shapes. |
| `database.ts` | Connection handle, migration runner (`PRAGMA user_version`), default seeding, `settings` helpers, `buildUpdate` whitelist helper. |
| `schema.ts` | Ordered `MIGRATIONS` + default categories. Append-only. |
| `accounts.ts` `transactions.ts` `moneyMeta.ts` `habits.ts` | Typed queries per domain. |
| `index.ts` | Barrel re-export — screens import from `@/db`. |

Balances are **derived**, never stored: `listAccounts()` computes
`starting_balance + income − expense − transfers out + transfers in`. A transfer is a single row
carrying both `account_id` and `to_account_id`, so it can never half-apply.

---

## 4. Assistant (`src/assistant`)

```
Chat UI ──depends only on──▶ AssistantEngine (interface, types.ts)
                                    ▲
                    ┌───────────────┴────────────────┐
             RuleAssistantEngine              OpenAiEngine (future)
                    └───────────────┬────────────────┘
                                    ▼
                     ASSISTANT_TOOLS (actions.ts)
                                    ▼
                             src/db  (real writes)
```

| File | Role |
|---|---|
| `types.ts` | `AssistantEngine`, `AssistantTool`, message/reply shapes. The UI knows only this. |
| `actions.ts` | 19 tools with `name` + `description` + typed `parameters` — deliberately the OpenAI function-calling schema. |
| `intents.ts` | 47 configured intents → tool, flow, or static reply. Pure config. |
| `nlu.ts` | Offline scoring + entity extraction (amounts, category hints). |
| `flows.ts` | 8 guided slot-filling conversations with dynamic chips from real user data. |
| `ruleEngine.ts` | Turn handling: cancel → active flow → one-shot free text → intent → fallback. |
| `index.ts` | `createAssistantEngine()` — **the swap point**. |

Migration path to an LLM is in [../CLAUDE.md §11](../CLAUDE.md).

---

## 5. Product tour (`src/tour`)

| File | Role |
|---|---|
| `TourProvider.tsx` | Context + spotlight overlay (SVG mask cutting a rounded hole out of a dim layer), animated geometry, adaptive tooltip, persistence. |
| `TourTarget.tsx` | Wraps an element and registers a `measureInWindow` handle. |
| `steps.ts` | The 12-step script. |

Per step the provider: switches tab if required → looks up the target handle → measures →
asks the host screen to scroll if the target is outside the comfortable viewport → re-measures →
animates the spotlight → fades in the tooltip. Screens register a scroller; the navigator
registers a tab switcher. If a target is missing (e.g. an empty section) it degrades to a centred
card so the tour can never stall.

---

## 6. Services

| Service | Responsibility |
|---|---|
| `lock.ts` | PIN hashing/verification via keychain, biometric prompts, lock/biometric flags. |
| `notifications.ts` | Habit reminder scheduling (daily / per-weekday), channel + sound, rebuild-on-launch, diagnostics. |
| `recurring.ts` | Inserts due auto-add transactions, catching up every missed occurrence. |
| `backup.ts` | JSON export/restore of all tables (excludes the PIN salt) and CSV export. |
| `seed.ts` | Developer sample-data generator; records created ids so a re-run replaces rather than duplicates. |
| `startup.ts` | Orchestrates per-launch work. |

---

## 7. Navigation

Bottom tabs (Home · Money · Habits · Reports), each Money/Habits/Reports tab owning a native
stack; Settings sits on the root stack above the tabs.

- Transitions are configured once in `RootNavigator` (`slide_from_right`, modals
  `slide_from_bottom`, tabs cross-fade, **Settings fades**).
- The **Money tab resets to Transactions** on every tab press (even a repeat tap).
- Inner tabs use `SwipeTabs` (paging ScrollView with a scroll-driven sliding indicator) —
  horizontal only, so each page keeps its own vertical scroll without gesture conflicts.
- App-wide confirmations run through `ConfirmProvider` / `useConfirm` (`components/ConfirmDialog`)
  instead of the OS `Alert`, so they are theme-aware and message copy can be context-specific.

---

## 8. Theme

`ThemeProvider` exposes `colors`, `isDark`, `mode`, typography, spacing, radius and elevation.
Mode (`light` / `dark` / `system`) is persisted in `settings` and loaded at startup. Colour
semantics and pitfalls are documented in [ui_guidelines.md](ui_guidelines.md).

---

## 9. Cross-cutting utilities

| Module | Role |
|---|---|
| `utils/format.ts` | Local-time date keys, date/time labels, currency formatting — no `Intl`, no UTC. |
| `utils/currency.ts` | Supported currencies + module-level active currency. |
| `utils/haptics.ts` | Safe wrapper (never throws). |
| `utils/iconMap.ts` | Design icon names → Feather glyphs; category colour palette. |
| `constants/app.ts` | `APP_VERSION` from `package.json`. |
| `components/ErrorBoundary` | Local-only crash recovery screen (nothing is reported anywhere). |
