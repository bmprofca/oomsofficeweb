# UI Patterns

## Dropdowns inside scrollable tables

- Use portal rendering to `document.body` for row menus if parent has `overflow`
- Position using `getBoundingClientRect()` with flip/clamp (prefer top → bottom → right → left)
- Finance voucher registers: `z-[99999]`, `height: 'auto'`, `FiMoreVertical` — see [`action-button.md`](./action-button.md)
- Details modals commonly use `z-[10050]`
- Size placement from **real** menu item count (no empty gap when options are hidden)
- Outside click + Escape close; recalc on resize/scroll

Canonical references: `sale-display.jsx`, `purchase-display.jsx`, `received-display.jsx`. Also: bank/capital/discount registers, ledger tabs.

## Dialogs

- Prefer in-app modal/dialog components over `window.alert` / `window.confirm`
- Support async confirm actions + loading state
- Keep confirm/cancel UX consistent

## Loading

- Prefer skeleton rows/cards for list/table surfaces
- Prefer **layout-matching** page skeletons (header + tabs + content bones) over spinners for full pages — see `client-profile.jsx` → `ClientProfilePageSkeleton`
- Avoid blocking overlays unless truly necessary

## Search input with leading icon

When placeholder or typed text overlaps a left-side search icon, see [`search-input-icon.md`](./search-input-icon.md).  
Common mistake: `${TOOLBAR_INPUT} pl-9` where `TOOLBAR_INPUT` includes `px-3` — use explicit `pl-9 pr-3` instead.

## Sidebar layout consistency

- Respect minimized vs expanded offsets
- Keep fixed bars/overlays aligned with actual content area and sidebar width

