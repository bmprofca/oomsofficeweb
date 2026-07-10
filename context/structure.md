# Project Structure

## Major folders

- `src/pages/` - Full route-level screens
- `src/components/` - Shared UI and utility components
- `src/ClientComponents/` - Client profile tab-specific modules
- `src/utils/` - API base and auth header helpers

## Commonly referenced screens

- `pages/client-profile.js`
- `pages/billing-view.js`
- `pages/settings/app-setting.js`
- `pages/office-assistance/*`

## Finance register screens

- `pages/received-display.js` — Received register (`GET /transaction/report/receive`)
- `pages/discount.js` — Discount register (`GET /expense/discount/list`)
- `pages/bank-account.js` — Bank accounts (`GET /transaction/bank/list`)
- `pages/capital-accuont.js` — Capital accounts
- `pages/finance-voucher-entry.js` — Finance entry hub (opens `DiscountModal`, payment modals, etc.)

See `finance-registers.md` for shared layout, table, and modal conventions.

## Commonly referenced shared components

- `components/header.js`
- `components/DateFilter.js`
- `components/state-district-select.js`
- `components/PasswordGroupFirms.js`

