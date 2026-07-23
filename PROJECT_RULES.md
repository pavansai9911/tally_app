# PROJECT_RULES.md — permanent development rules

Standing rules for every change to Tally. These are not suggestions; if a rule has to be
broken, say so explicitly and explain why in the commit and in [DECISIONS.md](DECISIONS.md).

Background and rationale live in [CLAUDE.md](CLAUDE.md).

---

## 1. Non-negotiables

1. **Never break existing functionality.** Additive by default.
2. **Never remove a feature** unless explicitly asked.
3. **Offline-first is a product promise.** No network calls, no analytics, no tracking, and no
   INTERNET permission in release builds. Adding any of these is a product decision, not a
   technical one.
4. **All data stays on the device.** Nothing is uploaded, ever.
5. **Never weaken security.** The PIN stays a salted hash in the keychain; every
   security-sensitive change stays behind authentication.

## 2. Every change

6. **Typecheck must be clean** — `npm run typecheck` = 0 errors. Not "fewer errors".
7. **Build must succeed** — `npm run apk:android` before calling anything done.
8. **Run the regression checklist** in [CLAUDE.md §13](CLAUDE.md). Actually run it; do not
   assume.
9. **Report honestly.** If something is unverified (e.g. no device available), say so plainly
   rather than implying it was tested.
10. **Bump `package.json` version** for every release build. It is the single source of truth;
    Gradle and the Settings screen both read it.
11. **Update the docs in the same change** — see [CLAUDE.md §14](CLAUDE.md).

## 3. Architecture

12. **Keep business logic out of the UI.** Persistence belongs in `src/db`, behaviour in
    `src/services`. Screens compose and call.
13. **Only `src/db/driver.ts` may touch op-sqlite.**
14. **Never edit a released migration.** Append a new one.
15. **Prefer reusable components** over copy-paste. Second usage ⇒ move it to `src/components`.
16. **Keep swappable seams intact** — notably the assistant's `AssistantEngine` interface and
    tool registry, which exist so an LLM can replace the rule engine without touching the UI.
17. **Aggregate in SQL**, not in JavaScript.

## 4. Native dependencies

18. **Pin native library versions exactly** (no `^`). A caret already cost two failed builds.
19. **Justify every new native dependency.** Prefer a JS solution when the difference is
    cosmetic — each native module is a build and upgrade risk.
20. **Do not re-enable the New Architecture** without verifying op-sqlite on a device first.

## 5. UI/UX

21. **Follow Material Design** and keep production-grade polish.
22. **Never hard-code a colour that must adapt.** Use theme tokens; remember `neutral900`
    inverts between themes.
23. **Check every visual change in both light and dark mode.**
24. **Keep animations consistent** — the shared primitives (`SwipeTabView`, `SuccessOverlay`,
    `FadeInView`, navigator transitions) exist so motion feels the same everywhere. Use them
    instead of inventing new motion.
25. **Native driver for animations** wherever the property allows; no jank, no dropped frames.
26. **Consistent spacing and typography** from `src/theme/tokens.ts` and `typography.ts`.
27. **Never obscure important UI.** Floating elements must leave scroll clearance.
28. **Accessibility labels** on every interactive control.

## 6. Data correctness

29. **Never use `toISOString()` for date keys** — it is UTC and shifts the day.
30. **Never depend on `Intl`** for user-visible dates or numbers.
31. **Tolerate legacy data shapes.** Date-only `occurred_at` rows still exist and must not crash.
32. **No silent guessing with money.** If the destination or amount is ambiguous, ask.
33. **No duplicate records where the domain says one** (e.g. one budget per category).

## 7. Testing on device

34. The phone must be **unlocked** — `adb` cannot dismiss a secured keyguard.
35. **Do not drive the device while someone else is using it**; taps land on whatever moved.
36. Use `adb install -r` so user data is preserved. A full uninstall wipes their data — only
    do it deliberately and say so first.

## 8. Communication

37. **Flag bad requirements.** If an instruction would harm the product, say so before building it.
38. **Explain trade-offs**, not just conclusions.
39. **Record decisions** in [DECISIONS.md](DECISIONS.md) so they are never re-litigated from scratch.
