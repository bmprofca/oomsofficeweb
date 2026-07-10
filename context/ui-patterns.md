# UI Patterns

## Dropdowns inside scrollable tables

- Use portal rendering to `document.body` for row menus if parent has `overflow`
- Position using `getBoundingClientRect()`
- Auto-flip up/down based on viewport space
- Finance registers use `z-[10040]` for row menus; details modals use `z-[10050]`
- Mark triggers/menus with `data-*-actions-trigger` and `data-*-actions-menu` for outside-click close
- Support right-click (`onContextMenu`) on `<tr>` to open the same menu as the ⋮ button
- Constants `ACTIONS_MENU_WIDTH` / `ACTIONS_MENU_HEIGHT` size the menu and viewport flip logic

Reference implementations: `received-display.js`, `discount.js`, `bank-account.js`, `capital-accuont.js`.

## Dialogs

- Prefer in-app modal/dialog components over `window.alert` / `window.confirm`
- Support async confirm actions + loading state
- Keep confirm/cancel UX consistent

## Loading

- Prefer skeleton rows/cards for list/table surfaces
- Avoid blocking overlays unless truly necessary

## Sidebar layout consistency

- Respect minimized vs expanded offsets
- Keep fixed bars/overlays aligned with actual content area and sidebar width

