# Project Structure

## Major folders

- `src/pages/` - Full route-level screens
- `src/components/` - Shared UI and utility components
- `src/ClientComponents/` - Client profile tab-specific modules
- `src/utils/` - API base and auth header helpers

## Commonly referenced screens

- `pages/client-profile.js`
- `pages/billing-view.js`
- `pages/settings/branch-setting.jsx`
- `pages/office-assistance/*`

## Finance register screens

Canonical shell/actions: sale + purchase (flat full-width, portal ⋮, Download/Share). See [`finance-registers.md`](./finance-registers.md).

- `pages/sale-display.jsx` — Sale register
- `pages/purchase-display.jsx` — Purchase register
- `pages/received-display.jsx` — Received (`GET /transaction/report/receive`)
- `pages/payment-display.jsx` / `contra-display.jsx` / `journal-display.jsx` / `expense-display.jsx`
- `pages/discount.jsx` — Discount register
- `pages/bank-account.js` — Bank accounts (`GET /transaction/bank/list`)
- `pages/capital-accuont.js` — Capital accounts
- `pages/finance-voucher-entry.js` — Finance entry hub (create modals)

Shared modals: `components/Modals/CreateTransactions.js`, `EditTransactions.js`, `ViewTransactions.js`, `DocumentShareModal`.

## Commonly referenced shared components

- `components/header.js`
- `components/DateFilter.js`
- `components/state-district-select.js` (CustomSelect-based)
- `components/CustomSelect.js`
- `components/PasswordGroupFirms.js`

