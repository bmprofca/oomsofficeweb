# Tabs

## Tab UI expectations

- Segmented control look for high-level tab switching where possible
- Keep icon + label alignment consistent
- Active state should be obvious (color + background + weight)

## Behavioral conventions

- On tab switch:
  - clear stale table data quickly (`setData([])` pattern)
  - trigger fetch for active tab
- Preserve route-friendly tab IDs in URL when page supports it

## Spacing and typography

- Compact headings and metadata text
- Uniform action button sizing across tab content
- Avoid oversized paddings in tab panels

