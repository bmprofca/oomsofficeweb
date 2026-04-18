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
  - jump-to-page input
- Changing filters or limit should reset page to `1`
