# TransactionTable Quick Context

Component path: `src/components/TransactionTable.js`

## Purpose

Reusable **ledger-style transaction table** (table markup only). Same layout for any party (client, CA, bank, etc.):

- Header row: `#`, Date, Particulars, Type, Voucher No, Debit, Credit, Balance, optional Action
- **Opening balance** row (from props)
- **Loading** skeleton rows OR **empty** state OR **data** rows
- **Total** row (debit / credit / closing balance from props)

Pagination, page chrome, filters, and modals stay in the parent. Wrap this component in your own card and place `TablePagination` (or equivalent) **below** the table if needed.

## Default export: `TransactionTable`

### Props

| Prop | Type | Default | Notes |
|------|------|---------|--------|
| `transactions` | `array` | `[]` | Rows from `/transaction/list` (or same shape). Each row should have `transaction_id`, `transaction_date`, `transaction_type`, type-specific amounts, `particular`, `invoice_no`, etc. |
| `loading` | `boolean` | `false` | Initial / full-page style loading |
| `fetching` | `boolean` | `false` | e.g. refetch while keeping layout |
| `openingBalance` | `object` | `{ debit: 0, credit: 0, balance: 0 }` | First summary row |
| `summary` | `object` | `{ totalDebit: 0, totalCredit: 0, closingBalance: 0 }` | Footer totals row |
| `currentPage` | `number` | `1` | Used for row index: `(currentPage - 1) * itemsPerPage + index + 1` |
| `itemsPerPage` | `number` | `20` | Page size for row numbering |
| `onActionClick` | `(event, transactionId) => void` | — | Called from the ⋮ button; use to open menus / modals. Ignored if `showActionColumn` is false |
| `showActionColumn` | `boolean` | `true` | Set `false` for read-only ledgers |
| `emptyTitle` | `string` | `'No transactions found'` | Empty state title |
| `emptySubtitle` | `string` | `'No transactions available…'` | Empty state subtitle |
| `className` | `string` | `''` | Extra classes on the `overflow-x-auto` wrapper |
| `tableClassName` | `string` | `'w-full text-sm'` | Classes on `<table>` |

When `loading` **or** `fetching` is true, skeleton rows are shown (empty state is not shown until not busy).

## Named exports (use outside the table)

### `getTransactionAmounts(transaction)`

Reads debit / credit / balance from the API row:

- Prefers the object keyed by `transaction.transaction_type` (e.g. `payment`, `sale`)
- Falls back to `transaction.payment`

Returns `{ debit, credit, balance }`. Use this in the parent when computing **`summary`** from the same list the table displays.

### `formatLedgerCurrency(amount)`

`en-IN` number format, 2 decimals, `Math.abs` applied (display helper).

### `formatLedgerDate(dateString)`

Short date for the Date column (`en-IN` locale).

### `getLedgerTransactionTypeIcon(type)`

Returns a React icon for menu keys: `RECEIVE`, `PAYMENT`, `SALE`, `PURCHASE`, `EXPENSE`, `JOURNAL`. Handy for “Add transaction” dropdowns next to the table.

### `getLedgerPaymentModeIcon(mode)`

Returns a small icon for payment mode strings: `cash`, `bank`, `cheque`, `online`, `card`, default.

## Transaction row shape (expected by the table)

The component does not fetch data; it renders whatever you pass. Amounts follow the **type-named** payload pattern:

```json
{
  "transaction_id": "…",
  "transaction_date": "2026-05-01T10:00:00",
  "transaction_type": "payment",
  "invoice_no": "INV-001",
  "payment": { "debit": 0, "credit": 1000, "balance": 5000 },
  "particular": { "type": "…", "remark": "…", "details": {}, "sale_items": [] },
  "create_by": { "name": "…", "email": "…" }
}
```

`particular` drives the **Particulars** column (sale items, bank details, create_by + remark, or fallback to formatted `transaction_type`).

## Usage (with pagination in parent)

```jsx
import TransactionTable, {
  getTransactionAmounts,
  formatLedgerCurrency,
  formatLedgerDate,
} from '../components/TransactionTable';
import TablePagination from '../components/TablePagination';

// In parent: compute summary with getTransactionAmounts when building summary state

<div className="bg-white rounded-xl border overflow-hidden">
  <TransactionTable
    transactions={transactions}
    loading={loading}
    fetching={fetching}
    openingBalance={openingBalance}
    summary={summary}
    currentPage={currentPage}
    itemsPerPage={itemsPerPage}
    onActionClick={(e, transactionId) => { /* open menu */ }}
  />
  <TablePagination
    page={currentPage}
    limit={itemsPerPage}
    total={totalItems}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    onLimitChange={setItemsPerPage}
  />
</div>
```

## Notes

- **Does not** include `TablePagination`, filters, or modals—only the scrollable table.
- For **read-only** views: `showActionColumn={false}` and omit `onActionClick`.
- Reuse **`formatLedgerCurrency` / `formatLedgerDate`** in modals by importing the same helpers (or alias them locally as `formatCurrency` / `formatDate`).
