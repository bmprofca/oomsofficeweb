# Action button / action menu behavior

Use this for **table row ⋮ action buttons**, **dropdown action menus**, and any **floating menu panel** anchored to an action control.

## Do not show hover tooltip on the action button

- Do **not** wrap the ⋮ / menu trigger in `ViewportTooltip`.
- Do **not** show hover text such as `"Actions"`.
- Keep `aria-label="Actions"` (or similar) on the button for accessibility only.

## Requirements (menu panel)

1. The floating menu must always stay fully visible inside the current viewport.
2. Its position should be calculated automatically based on available screen space.
3. Preferred order of placement:
   - top
   - bottom
   - right
   - left  
   Use whichever side has enough visible space.
4. If the preferred side does not have enough space, automatically flip to another side.
5. If no side has full space, shift the menu within the viewport so that it remains as visible as possible.
6. Prevent overflow on all screen edges:
   - top edge
   - bottom edge
   - left edge
   - right edge
7. Must work properly inside:
   - tables
   - cards
   - scrollable containers
   - modals
8. Must appear above all UI elements. Use a very high z-index so it is never hidden behind:
   - table body
   - sticky header
   - modal content
   - sidebar
   - other dropdowns
9. Recommended z-index:
   - action menu: `99999`
10. Render using portal / fixed layer so parent `overflow: hidden` does not clip it.
11. On small screens, the menu should remain readable and not go outside screen width.
12. Add small spacing between the action button and the menu.
13. Show with a smooth fade/scale animation.
14. Hide on:
    - outside click
    - scroll (when appropriate)
    - Escape key
15. Recalculate position on:
    - window resize
    - scroll
    - container scroll
    - content size change
16. Placement logic must use the actual visible area, not only a default direction.
17. Do not let the menu block important clickable UI unless intended (menus are interactive by design).
18. Keep the implementation reusable for all action icons/buttons.
19. Final result should feel professional, smart, and adaptive.

## Implementation notes (CLIENT)

- Row action menus: portal + fixed position + flip/clamp (see Groups, Group Firms, OneChatting Configure, Compliance assignment board, Services)
- `ViewportTooltip` is for other controls (e.g. Refresh) — **not** for table action ⋮ buttons
- Tag this file when adding or changing any action-button / action-menu UX
- **Conditional items:** if the menu hides options (e.g. ledger **Download** when `!downloadable`), size placement from the real item count and set menu `height: 'auto'` — never hardcode height for the max item set (that leaves empty gap). Ledger reference: [`ledger-tab.md`](./ledger-tab.md), [`invoice.md`](./invoice.md).
