# UI Patterns

## Dropdowns inside scrollable tables

- Use portal rendering to `document.body` for row menus if parent has `overflow`
- Position using `getBoundingClientRect()`
- Auto-flip up/down based on viewport space

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

