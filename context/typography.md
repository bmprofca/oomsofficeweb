# Typography & Table Text Baseline

Shared typography rules for admin tables and dense list views.  
**Primary reference:** Task list table in `src/pages/task-display.js` (`renderCellContent`) + `src/TaskComponent/TaskTable.js`.

---

## Font family

- **Default:** Tailwind `font-sans` (browser stack: `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, sans-serif).
- **No custom webfont** is applied on the task table — inherit from the app root.
- **Monospace:** use `font-mono` only for IDs, codes, voucher numbers (not used in task table body).

---

## Task table — quick reference

| Element | Size | Weight | Color | Notes |
|--------|------|--------|-------|-------|
| Column header | `text-[11px]` | `font-bold` | `text-gray-700` | `uppercase tracking-wide`, left-aligned |
| Row index `#` | `text-[11px]` | `font-bold` | `text-gray-800` | Serial number column |
| Default cell body | `text-sm` (14px) | `font-medium` | `text-gray-700` | Most field values |
| Primary link / title | `text-sm` | `font-semibold` | `text-gray-800` → `hover:text-indigo-600` | Client name, service name |
| Empty placeholder | `text-sm` | — | `text-gray-400` | `-` when no value |
| Fees / amount chip | `text-xs` | `font-semibold` | `text-indigo-700` on `bg-indigo-50` | `px-2 py-0.5 rounded border border-indigo-200` |
| Status pill | `text-xs` | `font-medium` | status-colored bg/text | `px-3 py-1 rounded-full` |
| Micro badge (CA/Agent/In-Out) | `text-[10px]` | `font-semibold` | semantic colors | `px-1.5 py-0.5 rounded` or `rounded-full` |
| Staff avatar initial | `text-xs` | `font-bold` | `text-white` | Inside `w-8 h-8` circle |
| Mobile card title | `text-xs` | `font-semibold` / `font-bold` | `text-gray-800` | Compact mobile layout |
| Empty state title | `text-sm` | `font-medium` | `text-gray-500` | |
| Empty state subtitle | `text-xs` | — | `text-gray-400` | `mt-1` |

---

## Task table — layout & spacing

### Page / card shell (`task-display.js`)

```txt
Outer page:     min-h-screen bg-gray-50
Main card:      bg-white rounded-lg shadow-sm border border-gray-200
Card margin:    mx-2 sm:mx-4 md:mx-8 my-3 md:my-4
Card header:    px-3 md:px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white
Page title:     text-base md:text-lg font-bold text-gray-800
Page subtitle:  text-xs text-gray-500
```

### Table container (`TaskTable.js`)

```txt
Root:           flex-1 flex flex-col overflow-hidden bg-white
Scroll body:    flex-1 overflow-auto
Desktop min-w:  min-w-[960px]
Sticky header:  sticky top-0 z-10
```

### Grid columns (desktop)

- Fixed leading columns: `48px` (checkbox) + `48px` (# index).
- Dynamic columns: `minmax(130px–210px, 1fr)` depending on content (see `getGridTemplateColumns` in `TaskTable.js`).
- Layout: CSS Grid with `gridTemplateColumns`, **not** `<table>`.

### Header row

```txt
Classes:  sticky top-0 z-10 grid items-center border-b border-gray-200
          bg-gradient-to-r from-gray-50 to-white
Cell:     p-3 font-bold text-gray-700 text-[11px] uppercase tracking-wide text-left
Divider:  border-l border-gray-100 (between columns, not on first checkbox col)
```

### Body rows

```txt
Row:      grid items-center border-b border-gray-100 transition-colors group
Default:  bg-white hover:bg-gray-50
Selected: bg-indigo-50/30 hover:bg-indigo-50/50
Cell:     p-3 min-w-0 text-left border-l border-gray-100
Multi-line cell inner stack: flex flex-col items-start gap-2
Separator inside cell:       border-b border-gray-100 my-1
```

### In-out row highlights (task-specific)

- Self (GET IN): `bg-emerald-700/20 hover:bg-emerald-700/25` (selected: `/25` → `/30`).
- Other user: `bg-amber-700/20 hover:bg-amber-700/25`.
- Selected ring on mobile cards: `ring-2 ring-emerald-600` / `ring-amber-600` / `ring-indigo-500`.

---

## Task table — cell content patterns

Use these class bundles when building new tables to match task-display.

### Standard text cell (IDs, firm, created-by, billing)

```txt
text-gray-700 font-medium text-sm
```

### Clickable primary label (service name)

```txt
font-semibold text-gray-800 text-sm hover:text-indigo-600 transition-colors text-left
```

### Client name row (with avatar)

```txt
Avatar:  w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-sm
Icon:    w-3.5 h-3.5 text-white
Name:    font-semibold text-gray-800 text-sm group-hover:text-indigo-600
Layout:  flex items-center gap-2
```

### Icon + value row (mobile, email, dates)

```txt
Wrapper: flex items-center gap-1.5 text-gray-700 font-medium text-sm
Icon:    w-3.5 h-3.5 text-gray-400 flex-shrink-0  (or w-3 h-3 for tighter cols)
```

### Fees chip

```txt
inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold
bg-indigo-50 text-indigo-700 border border-indigo-200
```

### Status pill (clickable)

```txt
inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
+ semantic bg/text (see Status colors below)
hover:opacity-90 transition-opacity
```

### Due-days / urgency text

```txt
text-sm font-semibold
Overdue:     text-red-600
≤ 7 days:    text-orange-600
Otherwise:   text-green-600
```

### Micro tags (CA, Agent, GET IN/OUT)

```txt
CA:     text-[10px] font-semibold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded
Agent:  text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded
In-out: text-[10px] font-semibold px-2 py-0.5 rounded-full + border
        Self:  bg-emerald-50 text-emerald-700 border-emerald-200
        Other: bg-amber-50 text-amber-700 border-amber-200
```

### Compliance flag

```txt
text-xs font-medium
Yes: text-green-600 | No: text-gray-400
```

### Row action menu trigger

```txt
w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200
flex flex-col items-center justify-center space-y-0.5
Dots: w-1 h-1 rounded-full bg-gray-600
```

---

## Task table — status colors

| Status | Classes |
|--------|---------|
| Unassign | `bg-blue-100 text-blue-700` |
| In process | `bg-orange-100 text-orange-700` |
| Pending from client | `bg-purple-100 text-purple-700` |
| Pending from department | `bg-yellow-100 text-yellow-700` |
| Complete | `bg-green-100 text-green-700` |
| Cancel | `bg-red-100 text-red-700` |
| Default | `bg-gray-100 text-gray-700` |

---

## Task table — filter toolbar (above table)

```txt
Filter bar:     bg-gray-50 border-b border-gray-200 px-4 py-3
Search input:   text-sm text-gray-700 py-2 pl-10 pr-3 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-indigo-500
Toolbar btn:    text-sm font-medium px-3 py-2 rounded-lg
Primary btn:    bg-indigo-600 text-white hover:bg-indigo-700
Secondary btn:  border border-gray-300 text-gray-700 hover:bg-gray-100
```

---

## Task table — empty & loading states

### Empty

```txt
Container: flex items-center justify-center py-12 text-gray-500 px-4
Icon wrap: w-14 h-14 bg-gray-100 rounded-full mb-3
Title:     text-gray-500 font-medium text-sm
Subtitle:  text-gray-400 text-xs mt-1
```

### Skeleton row

```txt
Row:   flex items-center border-b border-gray-100 animate-pulse p-3
Bar:   h-3 bg-gray-200 rounded (width ~3/4)
Gap:   space-y-2 inside column placeholders
```

---

## Font size scale (app-wide)

| Token | px (default) | Typical use |
|-------|----------------|-------------|
| `text-[10px]` | 10 | Micro badges, in-out tags, export menu section labels |
| `text-[11px]` | 11 | **Task table headers**, row `#`, compact metadata |
| `text-xs` | 12 | Chips, pills, helper text, mobile labels, subtitles |
| `text-sm` | 14 | **Default table body**, toolbar buttons, inputs |
| `text-base` | 16 | Page/card titles on task page |
| `text-lg` | 18 | Page title at `md+` breakpoint |

---

## Font weight usage

| Class | Use |
|-------|-----|
| `font-medium` | Default readable cell values (`text-gray-700`) |
| `font-semibold` | Links, fees chips, due-day emphasis, column-adjacent labels |
| `font-bold` | Table headers, row index, avatar initials, page titles |

---

## Text color hierarchy (gray scale — task table)

| Role | Classes |
|------|---------|
| Primary content | `text-gray-800` |
| Body / secondary | `text-gray-700` |
| Muted / icons | `text-gray-400`, `text-gray-500` |
| Empty / disabled | `text-gray-400` |
| Interactive accent | `text-indigo-600` (hover on links) |
| Page subtitle | `text-gray-500` |

---

## Applying on other pages

When building a new data table (e.g. Branch Services, Compliance list):

1. **Headers:** `p-3 text-[11px] font-bold text-gray-700 uppercase tracking-wide text-left` on `bg-gradient-to-r from-gray-50 to-white` with `border-b border-gray-200`.
2. **Body cells:** `p-3 text-sm font-medium text-gray-700` unless the cell is a link (`font-semibold text-gray-800`) or a chip (see above).
3. **Row:** `border-b border-gray-100 bg-white hover:bg-gray-50` (or `hover:bg-indigo-50/30` for softer admin tables).
4. **Column dividers:** `border-l border-gray-100` between grid/table columns.
5. **Badges:** prefer `text-xs font-semibold` with light bg + matching border; micro meta uses `text-[10px]`.
6. **Do not** mix `slate-*` and `gray-*` in the same table — task table uses **`gray-*`** throughout.

---

## LoanTab baseline (legacy reference)

Earlier baseline from `src/staff/LoanTab.js` — still valid for finance/ledger screens that use **slate** palette:

- Header cells: `text-xs font-semibold text-slate-600 uppercase tracking-wider`
- Body: mostly `text-sm`; index often `text-xs`
- Labels: `text-xs font-semibold text-slate-600`
- Primary text: `text-slate-800` / `text-slate-700`
- Debit/Credit semantic colors: blue/orange/emerald/rose variants

Prefer the **Task table (gray)** baseline above for operational list pages unless the screen is finance-specific.
