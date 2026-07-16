# Project Context Docs

This folder contains modular context notes for agents. **Tag the relevant file(s)** in chat instead of re-explaining.

## Index (recent / high-signal)

| File | When to tag |
|------|-------------|
| [`layout.md`](./layout.md) | Page shell width, sidebar inset, Header `setIsMinimized` |
| [`gst-change.md`](./gst-change.md) | GST rates, fees payloads, display-only tax |
| [`settings-branch.md`](./settings-branch.md) | Branch Settings tabs (Details, Logo, Sign, Invoice, **GST Config**) |
| [`account-profile.md`](./account-profile.md) | My Profile page, `/account` APIs, contact OTP, `getAccountHeaders` |
| [`auth-and-api.md`](./auth-and-api.md) | `getHeaders` vs `getAccountHeaders`, base URL |

## Other files

- `overview.md` - Project purpose and high-level summary
- `tech-stack.md` - Framework, styling, animation, auth, and HTTP stack
- `structure.md` - Source tree and major module locations
- `tables.md` - Table layout and pagination conventions
- `finance-registers.md` - Received, discount, bank, capital register pages
- `tabs.md` - Tab behavior and segmented-control patterns
- `ui-patterns.md` - Reusable UX patterns (dialogs, dropdowns, skeletons)
- `billing-view.md` - Billing page behavior and API contracts
- `ledger-tab.md` - Ledger tab behaviors and opening balance flow
- `state-district-select.md` - State/district picker via CustomSelect
- `task-components.md` - Notes/SubTask/Staff/Details tab reference
- `task-create.md` - Task create flow
- `datepicker.md` - PortalDatePicker / DateRangePickerField
- `modal.md` - Viewport-safe modal pattern
- `typography.md` / `ui-patterns.md` / component notes (`checkbox`, `tooltip`, etc.)

## Pair with server

| Client | Server |
|--------|--------|
| `gst-change.md` | `SERVER/context/gst-change.md` |
| `account-profile.md` | `SERVER/context/account-profile.md` |
| `settings-branch.md` | `SERVER/routes/settings.js` + GST / branch docs |
| `layout.md` | — (client-only) |

See also [`SERVER/context/README.md`](../../SERVER/context/README.md).
