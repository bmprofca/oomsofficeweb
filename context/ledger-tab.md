# LedgerTab Reference

> **Purpose:** Tag when changing client ledger UI, opening balance, Share/Download ledger PDF, post-transaction profile balance sync, or row Download / action menu. Pair with [`client-profile.md`](./client-profile.md), [`invoice.md`](./invoice.md), [`TransactionTable.md`](./TransactionTable.md), and [`SERVER/context/ledger-report.md`](../../SERVER/context/ledger-report.md).

## Scope

Client ledger transactions + opening balance + statement share/download flows.

**Component:** `src/ClientComponents/LedgerTab.js`  
Also wrapped from task profile via `src/TaskComponent/LedgerTab.js` → same `ClientLedger`.  
CA / Agent mirrors: `CAComponents/LedgerTab.js`, `AgentComponents/LedgerTab.js` (same Download / menu rules).

## Key features

- Opening balance row always present
- Date range filtering (`DateRangePickerField`)
- Transaction details modal (`ViewTransactionModalManager`)
- Create flows via `TransactionModalManager` (Receive, Payment, Sale, Purchase, Expense, Journal)
- Page size + pagination + page jump (`TablePagination`)
- Currency: **₹** via `formatLedgerCurrency` / plain via `formatLedgerCurrencyPlain`
- Row action menu: **Details**, **Edit**, and **Download** only when `downloadable` is true
- Header **Share** button: portal dropdown (**Download** PDF | **Share** via channels)

## Share / Download ledger statement

| Action | Behavior |
|--------|----------|
| Share → Download | `GET /transaction/download/ledger?party_type=client&party_id=…&from_date=…&to_date=…&format=pdf` |
| Share → Share | Opens `DocumentShareModal` (editable mobile/email, prefilled from client) → `POST /transaction/ledger/share` with `{ channels, mobile, email }` |

**UI pieces**

- `src/components/Modals/DocumentShareModal.jsx` — compact header; WhatsApp / Email cards; recipient inputs only for available channels; when available, WhatsApp shows provider (OneChatting / WhatsApp Web / OOMS System) and Email shows SMTP name from `/utils/notification-availability`. `onSend({ channels, mobile, email })`. SMS is not supported.
- Prefill: `clientMobile` / `clientEmail` props from client profile (or task client profile).
- Share dropdown is a **portal** anchored to the Share button (`shareAnchorRef`). Reposition on `scroll` (capture) + `resize`; close on outside click / Escape (same pattern as row action menu).

**Permissions:** Share/Download gated by `task_fees_view` (same as viewing ledger fees).

**Do not**

- Position the Share menu once and leave it fixed while the page scrolls
- Hardcode channel availability — load from server like payment reminder
- Send only to profile contacts — always pass modal mobile/email in the share payload (server prefers payload, falls back to profile if omitted)

## Particulars / remarks (table)

Long remarks must **wrap** (no ellipsis). Implemented in `TransactionTable` `getParticularsDisplay` — see [`TransactionTable.md`](./TransactionTable.md).

### Sale rows

- **Primary (larger):** service name(s) from `particular.sale_items`, joined with `, ` when more than one.
- **Secondary (smaller):** firm name from `particular.firm.firm_name` when the sale has a linked firm.
- Remark wraps underneath when present.
- List API (`GET /transaction/list`) attaches both `sale_items` and `particular.firm`. Ledger PDF mirrors the same order (services line, then firm line).

## Download / generate invoice (per row)

- List rows include `downloadable` from `GET /transaction/list` (server: `invoice_id` + supported type).
- Download calls `POST /invoice/generate` with `{ invoice_id, type, response: 'pdf' }` — not `/invoice/generate-invoice`.
- Supported types: sale, purchase, payment, receive, journal, expense (opening balance → no Download).
- Action menu height must track visible items (`itemCount = 2 + (downloadable ? 1 : 0)`); use `height: 'auto'` so hiding Download does not leave a gap. See [`invoice.md`](./invoice.md) and [`action-button.md`](./action-button.md).

## Props (important)

| Prop | Use |
|------|-----|
| `username` / `clientUsername` / `clientId` | Party id = **username** string |
| `clientName` | Subtitle in ledger header |
| `onProfileRefresh` | Called after successful create / opening-balance save / manual refresh so parent profile balance updates |

## Party id

Use **`username`** as `party_id` for list / opening-balance / ledger download-share APIs.

**Removed:** `GET /client/profile/:username` (endpoint gone → 404). Do not restore that fetch.

## Opening balance APIs

- `GET /transaction/get-opening-balance?party_type=client&party_id=…`
- `POST /transaction/set-opening-balance`

## After transaction success

`CreateTransactions` already POSTs; `onSubmit` handler should:

1. Close modal / clear bank selection  
2. `fetchTransactions()`  
3. `onProfileRefresh?.()`  

Do not fake-delay or duplicate success toasts beyond what the modal already shows.

## Pagination baseline pattern

- `currentPage`, `itemsPerPage`, `totalItems`, `totalPages`
- reset page to 1 on filter/limit change
- show range summary + prev/next + jump input

## Staff ledger

**Component:** `src/staff/LedgerTab.js` (same pattern as Client / CA).

- `GET /transaction/list?party_type=staff&party_id=…`
- Opening balance: `party_type=staff`
- Shared `TransactionTable` + `TablePagination` + date range + add transaction + downloadable action menu
- Wired from `staff-profile.jsx` with `username` / `staffData` (no fake sample entries)
- Statement Share/Download PDF is currently **client** ledger–focused on the server share route
