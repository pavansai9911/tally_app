# Tally — Product Showcase Video Brief

**Purpose:** a ~120-second, 16:9, captions-only (no voiceover) product film that shows what
**Tally** is and what was built — for managers and event screens. Feed this file to an AI
animator (e.g. claude.ai → Design Labs → Animate) **together with the screenshots listed in the
Screenshot Manifest**, named exactly as specified so scenes map to the right screen.

> One-liner: **Tally — track your money and habits, beautifully, and entirely offline.**

---

## 0. How to use this file

1. Capture the screenshots in the **Screenshot Manifest** (§6). Use the **exact file names** — the
   storyboard refers to them literally, so the animator never guesses which screen is which.
2. Provide **both light and dark** versions of each screen (both are used; a few scenes morph
   between them to show theming).
3. Paste/upload this whole file as the creative brief. If the tool needs a single short prompt
   instead of a full brief, use the **Condensed Prompt** in §8.
4. If the tool has a hard limit (max clips, no text overlays, etc.), keep scenes **S1, S2, S7,
   S12, S13, S14** — they carry the story on their own.

---

## 1. Deliverable specs

| Spec | Value |
|---|---|
| Duration | ~120 seconds |
| Aspect ratio | 16:9 landscape (1920×1080) |
| Style | Screens shown inside a modern Android phone mockup (punch-hole, rounded corners) on a branded background |
| Narration | **None.** On-screen caption text + music bed only |
| Captions | Short (3–6 words), animated fade + rise, placed beside/below the device |
| Emphasis | Breadth of features + production-grade polish (light engineering callouts near the end) |
| Frame rate | 30fps min (60fps preferred for smooth motion) |
| Look | Clean, premium, confident. Fintech-meets-consumer. Lots of negative space |

---

## 2. Brand & motion style guide

**Use Tally's real palette** (do not invent colours). Backgrounds and accents below are the
actual app tokens.

**Accent (primary / brand):**
- Light: `#3D5AFE` (indigo-blue) · deep `#2A40D9` · tint `#EEF1FF`
- Dark: `#5B79FF` · tint `#1B2040`

**Semantic:**
- Income (green): light `#1A9E6B` / dark `#34C28A`
- Expense (red): light `#E0473F` / dark `#FF6259`
- Net / info: `#5B79FF`

**Surfaces / backgrounds:**
- Light theme: page `#FFFFFF`, sunken `#F7F8F9`, text near-black `#13161A`
- Dark theme: page `#15171A`, card `#1F2227`, sunken `#16181C`, text off-white `#F4F6F8`
- **Hero balance card is deep near-black with white text in BOTH themes** — a signature element.

**Backgrounds for the video canvas (behind the phone mockup):**
- Light scenes: soft off-white → very light indigo gradient (`#FFFFFF` → `#EEF1FF`), a faint
  accent glow behind the device.
- Dark scenes: charcoal → deep indigo gradient (`#15171A` → `#1B2040`), subtle accent glow.

**Type (captions):** clean geometric/neo-grotesque sans (Inter / Helvetica Now / SF feel).
Weight 600–700 for headlines, 400–500 for sub-lines. Tight tracking. White on dark, `#13161A`
on light.

**Motion principles (match the app's own feel — it makes the film read as authentic):**
- Easing: **ease-out cubic** for entrances (fast start, gentle settle). No linear moves.
- Content **cascades** in (list rows, tiles stagger ~40–60ms apart).
- Numbers **count up** to their value (balance, totals).
- The donut chart **draws in clockwise**; bars **grow up from the baseline**; the trend line
  **draws left→right** — these are the app's real chart animations, so lean into them.
- Device transitions: gentle push/slide or a soft cross-dissolve. Keep camera moves subtle
  (slow push-in ≤5%). Never spin or bounce the phone.
- Captions: fade + 12px rise in, fade out. Never more than one caption on screen at a time.

**Do:** keep it calm, confident, premium; let each screen breathe 1.5–2s before moving.
**Don't:** cheesy transitions, neon glows beyond the accent, more than ~2 fonts, cramped captions.

---

## 3. Narrative arc (~120s)

Hook → the two things it does (money + habits) → the tour (log, accounts, reports, habits) →
the differentiator (offline AI assistant) → the trust/engineering close → brand end card.

Tone: "a small, private app that quietly does a lot — and is genuinely well made."

---

## 4. Scene-by-scene storyboard

> Times are targets; the animator may nudge ±1s for music. Each scene names the exact
> screenshot(s) it uses. "Morph" = smoothly cross-dissolve the light version into the dark
> version of the same framed screen.

### S1 — Cold open / title · 0:00–0:07
- **Visual:** Branded background (dark → indigo gradient). The wordmark **"Tally"** draws/fades
  in centre, accent `#5B79FF`. A thin underline sweeps in.
- **Caption (sub):** "Money + habits. Entirely offline."
- **Motion:** wordmark scales up 96%→100% with ease-out; underline wipes L→R.
- **Transition:** wordmark lifts up and the first phone slides in from below.

### S2 — Home, the hub · 0:07–0:16
- **Screens:** `01-home-light.png`
- **Caption:** "One home for it all."
- **Motion:** phone rises in; inside, the balance **counts up**, the Income/Expense/Net tiles
  stagger in, then Budgets → Today's habits → Recent transactions cascade down.
- **Transition:** hold 1.5s, then morph to dark.

### S3 — Theming showcase · 0:16–0:22
- **Screens:** `01-home-light.png` → **morph** → `01-home-dark.png`
- **Caption:** "Stunning in light and dark."
- **Motion:** slow cross-dissolve between the two themes of the *same* screen; a small sun→moon
  glyph can wipe across to sell the switch.
- **Transition:** push left to Money.

### S4 — Track money · 0:22–0:32
- **Screens:** `02-money-dark.png`
- **Caption:** "Every expense, income & transfer."
- **Motion:** transaction rows cascade in; the Income and Expense summary cards pop; briefly
  highlight the **Expense card border** (it doubles as a quick filter) then settle.
- **Transition:** cross-dissolve to Add.

### S5 — Log in seconds · 0:32–0:40
- **Screens:** `03-add-expense-light.png`
- **Caption:** "Log it in seconds."
- **Motion:** an amount appears typing into the big ₹ field; the Expense/Income/Transfer segmented
  control slides its highlight; category chips fade in a cascade.
- **Transition:** push to Account.

### S6 — Accounts, balanced · 0:40–0:48
- **Screens:** `04-account-dark.png`
- **Caption:** "Balanced to the rupee."
- **Motion:** account balance counts up; the IN / OUT cards slide in; rows cascade. Optionally a
  tiny callout dot on a "Transfer" row.
- **Transition:** cross-dissolve to Reports.

### S7 — Reports: where money goes (HERO MOMENT) · 0:48–1:00
- **Screens:** `05-reports-breakdown-light.png`
- **Caption:** "See where it all goes."
- **Motion:** the **donut draws in clockwise** (let this breathe — it's the signature animation);
  the legend items + the **"Remaining"** line fade in one by one; the "This month" period pill
  and the Income/Expense/Net/Savings tiles settle. Slow 3% push-in on the donut.
- **Transition:** morph to dark, slide up to trends.

### S8 — Reports: trends · 1:00–1:08
- **Screens:** `06-reports-trends-dark.png`
- **Caption:** "Trends that tell the story."
- **Motion:** the Income-vs-Expense **bars grow up** with a slight L→R cascade; the balance
  **line draws left→right** and the tip dot lands. 
- **Transition:** push to the all-categories screen.

### S9 — Drill into everything · 1:08–1:15
- **Screens:** `07-all-categories-light.png`
- **Caption:** "Drill into every category."
- **Motion:** category rows cascade; each **percentage bar fills** to its width; a finger-tap
  ripple on the top row hints at "tap to open".
- **Transition:** cross-dissolve to Habits.

### S10 — Build habits · 1:15–1:24
- **Screens:** `08-habits-today-dark.png` → **morph** → `09-habit-detail-light.png`
- **Caption:** "Build streaks. Break bad ones."
- **Motion:** the daily progress bar fills; a streak **flame/⚡ pulses**; then morph to a habit
  detail where the calendar/streak count animates in.
- **Transition:** push to Reports-Habits.

### S11 — Consistency, visualized · 1:24–1:31
- **Screens:** `10-reports-habits-light.png`
- **Caption:** "Consistency, visualized."
- **Motion:** the **heatmap cells fill in** week by week (green intensities); the streak
  leaderboard rows slide in.
- **Transition:** cinematic cross-dissolve to the assistant (music lifts here).

### S12 — The offline assistant (DIFFERENTIATOR) · 1:31–1:43
- **Screens:** `11-assistant-dark.png`
- **Caption 1:** "Just talk to it."  →  **Caption 2:** "100% offline. On-device."
- **Motion:** chat bubbles animate in sequence — a user message ("I spent 500 on food"), the
  assistant's reply typing in, then a success check. The green "Online · works offline" status
  can subtly pulse. This is the wow beat — give it room.
- **Transition:** quick, confident cut to the trust montage.

### S13 — Private & built to last (ENGINEERING) · 1:43–1:53
- **Screens (quick cuts, ~2.5s each):** `13-settings-dark.png`, `12-categories-light.png`
- **Caption sequence (badge-style, snappy):**
  - "No internet permission."
  - "No accounts. No tracking."
  - "Encrypted backup — survives a reinstall."
- **Motion:** faster cadence than the rest; each caption snaps in as a small pill/badge. Show the
  Settings privacy/backup area and the colourful Categories screen. Keep it crisp, not rushed.
- **Transition:** pull back / dissolve to the end card.

### S14 — Brand close · 1:53–2:00
- **Visual:** the branded background returns; a **fan/stack of 3–4 phone screens** (home, reports,
  assistant) arcs in behind the wordmark **"Tally"**.
- **Caption (main):** "Tally — private by design."
- **Caption (credit, small):** "Designed & built by **[Your Name]**."
- **Motion:** wordmark settles centre; screens gently drift; a soft accent glow resolves; hold
  ~2s on the end card.

---

## 5. Music & pacing

- **Mood:** modern, refined, optimistic tech-product music. Warm synths + light percussion; not
  aggressive EDM. Think premium consumer-app launch film.
- **Arc:** gentle build through the tour → **lift at S11→S12** (the assistant) → confident,
  clean resolve at the end card.
- **Pacing:** calm and premium for S2–S11 (each screen breathes 1.5–2s); slightly quicker,
  punchier for the trust montage S13; settle for S14.
- **Sound design (optional):** soft UI ticks on the number count-ups and the donut draw; a single
  satisfying "success" chime at the assistant check (S12). No heavy whooshes.

---

## 6. Screenshot Manifest — capture these (exact file names)

Provide **both** `-light.png` and `-dark.png` for each numbered screen unless noted. Use screens
**with real data** (not empty states). Portrait, full resolution, PNG. Same device for all.

| # | File names (light / dark) | Screen & what it must show |
|---|---|---|
| 01 | `01-home-light.png` · `01-home-dark.png` | **Home dashboard** with the dark balance hero (a healthy balance, the account+period dropdowns, Income/Expense/Net), at least one **Budget progress** bar, 1–2 **Today's habits**, and 3–4 **Recent transactions**. |
| 02 | `02-money-light.png` · `02-money-dark.png` | **Money → Transactions** list with the green **Income** and red **Expense** summary cards populated, and several category-led rows (category as the title, time · note beneath). |
| 03 | `03-add-expense-light.png` · `03-add-expense-dark.png` | **Add transaction** on the Expense tab: a typed amount, the Expense/Income/Transfer segmented control, a chosen category, account, date/time, note. |
| 04 | `04-account-light.png` · `04-account-dark.png` | **Account detail** (Home hero → Accounts → an account): the balance, the **IN / OUT** filter cards with amounts, and a list including at least one **transfer**. |
| 05 | `05-reports-breakdown-light.png` · `05-reports-breakdown-dark.png` | **Reports → Money**: the **Expense breakdown donut** with the legend showing top categories **and the "Remaining" line**, the period pill ("This month"), and the Income/Expense/Net/Savings tiles. |
| 06 | `06-reports-trends-light.png` · `06-reports-trends-dark.png` | **Reports → Money** scrolled to **Income vs Expense** (bar chart) and **Balance trend** (line chart), both with data. |
| 07 | `07-all-categories-light.png` · `07-all-categories-dark.png` | **Expense breakdown (all categories)** screen — opened from "Remaining" or the donut centre: the full list of categories with **percentage bars** and amounts. |
| 08 | `08-habits-today-light.png` · `08-habits-today-dark.png` | **Habits → Today** with several habits, the daily progress bar, and visible **streak** counts (⚡). |
| 09 | `09-habit-detail-light.png` · `09-habit-detail-dark.png` | **A habit's detail** showing the streak number and the month calendar / check-ins. |
| 10 | `10-reports-habits-light.png` · `10-reports-habits-dark.png` | **Reports → Habits**: the consistency **heatmap** with filled cells and the **streak leaderboard**. |
| 11 | `11-assistant-light.png` · `11-assistant-dark.png` | **Tally Assistant** chat with a real exchange visible (e.g. a user "I spent 500 on food" and the assistant's reply / a success), showing the "Online · works offline" status. |
| 12 | `12-categories-light.png` · `12-categories-dark.png` | **Categories** list (Money → Categories) — colourful category icons, a good long list to show breadth. |
| 13 | `13-settings-light.png` · `13-settings-dark.png` | **Settings** showing the Privacy/offline note **or** the **Automatic backup** + **Send feedback** rows (the trust story). |

**Optional bonus (nice-to-have, single theme is fine):**
- `14-budgets-light.png` · `14-budgets-dark.png` — the Budgets list with progress bars.
- `15-lock-dark.png` — the PIN lock screen (it's always dark) — good for the "private" beat.

**Capture tips:**
- Populate realistic data first — either enter a few weeks of transactions/habits, or use
  **Settings → Developer tools → Seed sample data** (then delete it after capturing if you like).
- Keep the **status bar clean and consistent** across shots (same time/battery, no clutter) — or
  crop it uniformly.
- Shoot each screen in **light mode, then flip to dark** and reshoot the identical state, so the
  morph scenes line up perfectly.
- Export at the device's native resolution (PNG). Don't downscale.

---

## 7. Global rules for the animator

- **Every screen sits inside the same phone mockup** for consistency; only the wallpaper/gradient
  behind it changes with light/dark scenes.
- **One caption at a time**, in the safe margin (never covering key UI).
- **Respect the palette** in §2 for backgrounds, captions and any added accents. Do not recolour
  the screenshots.
- Keep the phone **upright and stable**; motion lives in the *content* and the *captions*, plus a
  very slow push-in. No gimmicky 3D flips.
- Total on-screen text should be readable in ~1.5s each. If in doubt, fewer words.

---

## 8. Condensed Prompt (fallback, if the tool wants one short prompt)

> Create a premium 120-second 16:9 product-showcase video for **Tally**, an offline personal
> money + habits app. Show each provided screenshot inside a modern Android phone mockup on a
> clean gradient background (light scenes: white→#EEF1FF; dark scenes: #15171A→#1B2040), brand
> accent #3D5AFE / #5B79FF, income green #1A9E6B, expense red #E0473F. No voiceover — use short
> animated captions + a refined, optimistic tech-product music bed. Motion is calm and premium
> with ease-out easing: numbers count up, list rows cascade, the donut chart draws in clockwise,
> bars grow up, the trend line draws left-to-right. Order: (1) title "Tally — money + habits,
> entirely offline"; (2) Home dashboard; (3) light→dark theme morph of Home; (4) Money
> transactions; (5) Add transaction; (6) Account with IN/OUT; (7) Reports donut breakdown incl.
> "Remaining" (hero moment); (8) Income-vs-Expense bars + balance trend; (9) all-categories
> breakdown; (10) Habits + streaks; (11) habit heatmap + leaderboard; (12) the offline AI
> assistant chat ("just talk to it — 100% offline", the wow beat); (13) fast trust montage: "no
> internet permission", "no accounts, no tracking", "encrypted backup survives a reinstall"; (14)
> brand end card "Tally — private by design. Designed & built by [Your Name]." Use the uploaded
> screenshots named 01-home … 13-settings (each -light/-dark) in that order.

---

*Palette and animations in this brief are taken from Tally's actual design tokens and in-app
motion, so the film mirrors the real product.*
