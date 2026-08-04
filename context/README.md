# Project Context Docs

This folder contains modular context notes for agents. **Tag the relevant file(s)** in chat instead of re-explaining.

## Index (recent / high-signal)

| File | When to tag |
|------|-------------|
| [`subscription.md`](./subscription.md) | Plan status hook, access gates, branch switch overlay (no Premium flash) |
| [`group-firms.md`](./group-firms.md) | Group firms page, not-found UI, balance / last payment / bulk reminder |
| [`client-profile.md`](./client-profile.md) | Client profile page shell, header balance, skeleton, DOB, ledger refresh |
| [`payment-reminder.md`](./payment-reminder.md) | Payment reminder modal (list / debtors / profile / group firms) |
| [`birthday-reminder.md`](./birthday-reminder.md) | Today's Birthdays select/bulk + `ClientBirthdayReminderModal` |
| [`task-list-display.md`](./task-list-display.md) | Complete date under status; compliance period under fees |
| [`ledger-tab.md`](./ledger-tab.md) | Client ledger tab, opening balance, Share/Download PDF, profile balance sync, Download gate |
| [`TransactionTable.md`](./TransactionTable.md) | Shared ledger table; remarks wrap (no ellipsis) |
| [`invoice.md`](./invoice.md) | Invoice settings, PDF generate/share, register Download/Share |
| [`finance-registers.md`](./finance-registers.md) | Sale/purchase/received (+ other) register shell, flat table, ⋮ actions, edit |
| [`layout.md`](./layout.md) | Page shell width, sidebar inset, Header `setIsMinimized` |
| [`gst-change.md`](./gst-change.md) | GST rates, fees payloads, display-only tax |
| [`settings-branch.md`](./settings-branch.md) | Branch Settings tabs (Details, Logo, Sign, Invoice, **GST Config**) |
| [`account-profile.md`](./account-profile.md) | My Profile page, `/account` APIs, contact OTP, `getAccountHeaders` |
| [`attendance.md`](./attendance.md) | Attendance modal, header entry, swipe-to-confirm, today-status timeline |
| [`salary.md`](./salary.md) | Staff salary tab: fixed/flexible, effective_from, one active assignment |
| [`auth-and-api.md`](./auth-and-api.md) | `getHeaders` vs `getAccountHeaders`, base URL |
| [`search-input-icon.md`](./search-input-icon.md) | Search input placeholder/text overlapping leading `FiSearch` icon |
| [`action-button.md`](./action-button.md) | ⋮ action buttons, dropdown menus, viewport-safe floating panels |

## Other files

- `overview.md` - Project purpose and high-level summary
- `tech-stack.md` - Framework, styling, animation, auth, and HTTP stack
- `structure.md` - Source tree and major module locations
- `tables.md` - Table layout and pagination conventions
- `finance-registers.md` - Sale, purchase, received, payment, contra, journal, expense, discount (+ bank/capital)
- `tabs.md` - Tab behavior and segmented-control patterns
- `ui-patterns.md` - Reusable UX patterns (dialogs, dropdowns, skeletons)
- `search-input-icon.md` - Search inputs with a leading icon; fix placeholder/text overlap (`pl-9` vs `px-3`)
- `billing-view.md` - Billing page behavior and API contracts
- `invoice.md` - Invoice settings + PDF generate/share on ledgers and registers
- `state-district-select.md` - State/district picker via CustomSelect
- `task-components.md` - Notes/SubTask/Staff/Details tab reference
- `task-create.md` - Task create flow
- `datepicker.md` - PortalDatePicker / DateRangePickerField
- `modal.md` - Viewport-safe modal pattern (+ AttendanceModal pointer)
- `attendance.md` - Attendance modal / swipe confirm / header entry
- `typography.md` / `ui-patterns.md` / component notes (`checkbox`, `action-button`, etc.)

## Pair with server

| Client | Server |
|--------|--------|
| `subscription.md` | `SERVER/context/subscription.md` |
| `group-firms.md` | `SERVER/context/group-firms.md` |
| `client-profile.md` / `ledger-tab.md` | `SERVER/context/client-balance.md`, `SERVER/context/ledger-report.md` |
| `invoice.md` / `ledger-tab.md` / `finance-registers.md` (Download/Share/edit) | `SERVER/context/invoice.md`, `SERVER/context/ledger-report.md` |
| `payment-reminder.md` | `SERVER/context/payment-reminder.md` |
| `birthday-reminder.md` | `SERVER/context/birthday-reminder.md` |
| `task-list-display.md` | `SERVER/context/task-list.md` |
| `gst-change.md` | `SERVER/context/gst-change.md` |
| `account-profile.md` | `SERVER/context/account-profile.md` |
| `attendance.md` | `SERVER/context/attendance.md` |
| `settings-branch.md` | `SERVER/routes/settings.js` + GST / branch docs |
| `layout.md` | — (client-only) |

See also [`SERVER/context/README.md`](../../SERVER/context/README.md).
