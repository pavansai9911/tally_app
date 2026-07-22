# UI Guidelines

Visual and interaction rules for Tally. Tokens live in `src/theme/`; this explains how to use
them and which mistakes to avoid.

---

## 1. Colour

Defined in `src/theme/colors.ts` as three palettes: `lightColors`, `darkColors` and a fixed
`lockColors` (the lock screen is always dark by design).

| Token | Meaning |
|---|---|
| `neutral0` | Page background. **Inverts** — white in light, near-black in dark. |
| `neutral50 / 100 / 200 / 300` | Sunken surfaces, dividers, disabled states. |
| `neutral400 / 500 / 600` | Secondary and tertiary text. |
| `neutral900` | Primary text. **Inverts** — near-black in light, near-white in dark. |
| `accent500 / 600 / accentTint` | Brand blue, pressed state, tinted background. |
| `income / expense / warning` (+ `…Tint`) | Semantic money colours and their tinted backgrounds. |
| `surfaceCard / surfaceSunken / surfaceBorder / surfaceOverlay` | Card, inset, hairline, scrim. |
| `heatEmpty…heatFull` | Habit heatmap intensities. |

### The inversion trap — read this before styling
`neutral900` and `neutral0` **swap** between themes. That is useful, but it caused several
real bugs:

- ❌ `backgroundColor: neutral900` + `color: '#FFFFFF'` → in dark mode a near-white card with
  white text. Invisible.
- ✅ **Inverting pill/chip:** `backgroundColor: neutral900` + `color: colors.neutral0`. Both
  invert together, so it reads correctly in both themes.
- ✅ **Card that must stay dark in both themes** (Home and Accounts hero):
  `isDark ? colors.neutral200 : colors.neutral900` with white text.
- ❌ Hard-coded `#13161A` text on a tinted tile → unreadable on dark tints. Use `neutral900`.

**Rule: never hard-code a colour that has to adapt, and check every change in both themes.**

---

## 2. Typography

`src/theme/typography.ts`, weight-based on the system font (no bundled family).

`display` · `h1` · `h2` · `h3` · `body` · `bodyMedium` · `bodySmall` · `bodySmallMedium` ·
`caption` · `amountLarge` · `amountMedium` · `button`

- Amounts use the `amount*` styles.
- Section labels use `caption` uppercase in `neutral400`.
- Never set a `fontFamily`.
- Amounts that can grow (e.g. the Home mini-stats) use `numberOfLines={1}` with
  `adjustsFontSizeToFit` inside a `flex: 1, minWidth: 0` box so long values shrink instead of
  overflowing.

---

## 3. Spacing, radius, elevation

From `src/theme/tokens.ts`: spacing `s1…s10` (4→40), radius `sm…full`, elevation `e0…e3`.

Conventions in use:
- Screen horizontal padding **24**; compact/modal headers **20**.
- Card padding **16**; hero card **20**.
- Card radius `lg`; hero/bottom sheets `xl`+; pills/chips fully rounded.
- Row vertical padding **14** with a `0.5` `surfaceBorder` divider (omit on the last row).
- Scrollable screens with a floating element need bottom clearance (Home uses **104**).

---

## 4. Components

Shared kit in `src/components/ui.tsx` — use these rather than re-styling:
`Button` (primary/secondary/destructive/destructiveSolid/ghost), `Card`, `Input`, `Chip`,
`SegmentOption`, `ToggleSwitch`, `ProgressBar`, `EmptyState`.

Other shared pieces: `charts.tsx` (donut, grouped bar, trend line, heatmap, progress ring),
`DateTimeField` (`DateField` / `TimeField`), `SwipeTabView`, `SuccessOverlay` + `FadeInView`,
`ErrorBoundary`, `assistant/*`.

- **Buttons:** 52px tall, radius `lg`, `0.85` pressed opacity. Primary actions are full width.
- **Cards:** `surfaceCard` with a `0.5` `surfaceBorder` outline.
- **Empty states:** icon in a circular sunken badge, title, one explanatory line, optional action.

---

## 5. Motion

All animation uses the built-in `Animated` API with `useNativeDriver: true` wherever the
property allows (SVG geometry is the exception and must use `false`).

| Interaction | Motion |
|---|---|
| Screen push | `slide_from_right`, 260ms |
| Modal | `slide_from_bottom` |
| Bottom tab switch | cross-fade |
| Inner tabs | `SwipeTabView` paging + `FadeInView` content fade |
| Save success | `SuccessOverlay` — spring circle, popping tick, ~2.2s hold |
| List/card entrance | `FadeInView` (fade + 12px rise, ~260ms) |
| Chips | staggered scale/fade, 45ms apart |
| Press feedback | scale to ~0.92 or opacity 0.85 |

**Do not invent new motion** — reuse these primitives so the app feels consistent.
Never animate layout properties inside long lists.

---

## 6. Navigation & bottom bar

- Four tabs: Home · Money · Habits · Reports. 72px tall, `surfaceCard`, hairline top border,
  accent for the active item.
- Settings is reached from the Home gear, not a tab.
- **Money always reopens Transactions** when its tab is tapped.
- Modal screens use an ✕ on the left and a sticky primary action at the bottom (thumb-reachable),
  not a top-right save.

---

## 7. FAB

- Home hosts the **assistant FAB** (58px, accent, sparkle glyph — deliberately not a `+`).
- List screens host an **add FAB** (56px, `+`).
- Positioned 20–24px from the right/bottom of the screen area, above the tab bar.
- Content must be padded so the FAB never permanently hides anything.

---

## 8. Bottom sheets & dialogs

- Sheets: `surfaceCard`, 26px top radius, grabber, scrim `surfaceOverlay`, slide-up ~280ms.
- The assistant sheet is ~82% height so Home stays visible behind it.
- Destructive confirmations use `Alert` with a `destructive` style and state what is lost.
- **Modals must not be `statusBarTranslucent`** — it breaks Android keyboard avoidance.

---

## 9. Assistant styling

- Header: SVG avatar with an online dot, "Tally Assistant", "Online · works offline", close ✕.
- Assistant bubbles `surfaceSunken` with a squared bottom-left; user bubbles `accent500` with
  white text and a squared bottom-right. Max width 78%.
- Typing indicator: three dots rising in sequence; replies then type in character by character.
- Suggestion chips: accent outline on `accentTint`, **wrapped onto multiple lines** (never a
  horizontal scroller — options must all be visible).

---

## 10. Product tour styling

- Backdrop `rgba(8,10,14,0.82)` with a rounded cut-out (radius 14, 8px padding) around the target
  and a 2px accent ring.
- Tooltip: card with `STEP n OF m`, Skip, title, body, segmented progress bar, Back/Next
  (Finish on the last step).
- The card is placed **below** the highlight when the target is in the upper half, **above**
  when lower; centred when there is no target.
- Positions come from runtime measurement — **never hard-code coordinates**.

---

## 11. Accessibility

- `accessibilityLabel` on every interactive control; `accessibilityRole="button"` where relevant.
- `hitSlop` on small icon buttons.
- Never signal state by colour alone (over-budget shows red **and** an "over" label).
- Respect the system theme by default (`mode: 'system'`).
