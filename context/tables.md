# Tables

## Shared table style direction

- Dense admin-friendly rows
- Visible hover state on row
- Strong header contrast (`text-xs`, uppercase, tracking)
- Status chips/badges for quick scan

## Recommended table behavior

- Keep header fixed style visually consistent across pages
- Show skeleton rows while loading
- Show empty state row when no records
- Preserve pagination footer even when data is sparse (when metadata exists)
- Row action menu/dropdown must auto-position (`down` or `up`) based on viewport space so menu stays fully visible

## Pagination conventions

- Include:
  - range summary (`Showing X to Y of Z`)
  - per-page selector (common options: 5/10/20/50/100, default: `20`)
  - pagination controls, in this order: first, prev, (active page number), next, last
  - jump-to-page input:
    - The input should have no prefilled value (starts empty); user can type a page number and search.
    - To the right of the input, show an Enter icon with a blue background (button), which user can click to jump to the typed page.
    - Keyboard Enter is also supported.
    - Use the "enter" icon from React Icons (e.g., `FiCornerDownLeft` from `react-icons/fi`).
- Changing filters or limit should reset page to `1`

## Finance register tables

Canonical: `sale-display.jsx`, `purchase-display.jsx`, `received-display.jsx` (also payment / contra / journal / expense / discount).

- **No card shell** around the table — flat panel `rounded-lg border border-slate-200/80 bg-white/70` inside full-width gutters ([`layout.md`](./layout.md)).
- Prefer `text-xs` cells with `min-w-*` columns (sale/purchase style) over heavy `table-fixed` % layouts unless a page still needs them.
- Zebra rows: even `bg-white`, odd `bg-slate-50/70`; hover `hover:bg-indigo-50/40`.
- Header: `bg-slate-100/90`, uppercase `text-[10px]` tracking.
- Inline skeleton rows inside `<tbody>` while loading (not only a full-page overlay).
- Amounts: ₹ + badge / `tabular-nums`; dates `DD/MM/YYYY`.
- Row ⋮: portal menu per [`action-button.md`](./action-button.md) (`z-[99999]`); do not rely on in-cell dropdowns clipped by `overflow-x-auto`.

Full register patterns: [`finance-registers.md`](./finance-registers.md).
