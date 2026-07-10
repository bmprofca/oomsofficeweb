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

Used on `received-display.js`, `discount.js`, `bank-account.js`, `capital-accuont.js`.

- Prefer `table-fixed` with explicit `%` column widths when removing columns would leave uneven gaps.
- Received register column widths: `# 4%`, `Date 10%`, `Particulars 26%`, `Voucher 12%`, `Amount 12%`, `Received At 20%`, `Actions 10%`.
- Inline skeleton rows inside `<tbody>` while `listLoading` (not full-page overlay).
- Row hover: `hover:bg-blue-50/30` (or page accent).
- Amount columns: right-aligned, `tabular-nums`, ₹ prefix.
- Date columns: `DD/MM/YYYY` in cells.
- Row ⋮ menu + right-click both open the same portal action dropdown.

Full register patterns: `finance-registers.md`.
