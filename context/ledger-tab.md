# LedgerTab Reference

> **Purpose:** Tag when changing client ledger UI, opening balance, or post-transaction profile balance sync. Pair with [`client-profile.md`](./client-profile.md).

## Scope

Client ledger transactions + opening balance flows.

**Component:** `src/ClientComponents/LedgerTab.js`  
Also wrapped from task profile via `src/TaskComponent/LedgerTab.js` → same `ClientLedger`.

## Key features

- Opening balance row always present
- Date range filtering (`DateRangePickerField`)
- Transaction details modal (`ViewTransactionModalManager`)
- Create flows via `TransactionModalManager` (Receive, Payment, Sale, Purchase, Expense, Journal)
- Page size + pagination + page jump (`TablePagination`)
- Currency: **₹** via `formatLedgerCurrency` / plain via `formatLedgerCurrencyPlain`

## Props (important)

| Prop | Use |
|------|-----|
| `username` / `clientUsername` / `clientId` | Party id = **username** string |
| `clientName` | Subtitle in ledger header |
| `onProfileRefresh` | Called after successful create / opening-balance save / manual refresh so parent profile balance updates |

## Party id

Use **`username`** as `party_id` for list / opening-balance APIs.

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

## Shared table

`src/components/TransactionTable.js` — amounts, INR formatting, type/payment icons (`InrIcon` instead of `FiDollarSign` for payment/cash).
