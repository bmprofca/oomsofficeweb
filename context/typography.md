# Typography Baseline (from LoanTab)

This file captures the visual baseline from `src/staff/LoanTab.js` for font sizes, weights, and text color hierarchy.

## Font size scale used

- `text-[10px]` - tiny section labels, amount headers, uppercase micro labels
- `text-[11px]` - secondary metadata under headers (invoice/meta lines)
- `text-xs` - labels, helper text, compact chips, small controls
- `text-sm` - default content/body size in tables and form controls
- `text-base` - important amount values in summary cards

## Font weight usage

- `font-medium` - secondary readable content (`text-slate-500/600` labels)
- `font-semibold` - table headers, key values, buttons, chips
- `font-bold` - card headings and key amount/value emphasis
- `font-mono` - voucher/invoice identifiers and amount-input style text

## Text color hierarchy

- **Primary text:** `text-slate-800` / `text-slate-700`
- **Secondary text:** `text-slate-600` / `text-slate-500`
- **Muted text:** `text-slate-400`
- **Inverse on dark headers:** `text-white` with support text `text-indigo-200` / `text-blue-200` / `text-emerald-100`

## Semantic financial colors (LoanTab pattern)

- Debit: `text-blue-600` / `text-blue-700`
- Credit: `text-orange-600` / `text-orange-700`
- Positive/healthy balances: `text-emerald-700`
- Negative/problem balances: `text-rose-700`

## Form text style baseline

- Inputs/selects/textarea: `text-sm`, `text-slate-700`
- Labels: `text-xs font-semibold text-slate-600`
- Compact action buttons: `text-sm font-semibold`

## Table typography baseline

- Header cells: `text-xs font-semibold text-slate-600 uppercase tracking-wider`
- Body cells: mostly `text-sm` (index often `text-xs`)
- Total row: `font-bold` with color-coded totals

