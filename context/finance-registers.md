# Finance Registers (Frontend)

Reference for finance register pages: **Received**, **Discount**, **Bank**, and **Capital**. These screens share a common layout and interaction model.

## Pages

| Register | File | Route (typical) |
|----------|------|-----------------|
| Received | `src/pages/received-display.js` | Finance → Received |
| Discount | `src/pages/discount.js` | Finance → Discount |
| Bank | `src/pages/bank-account.js` | Finance → Bank accounts |
| Capital | `src/pages/capital-accuont.js` | Finance → Capital accounts |

## Shared layout pattern

Each register page follows the same structure:

1. **Stat cards** — gradient summary cards above the table (count + amount, or type-specific stats for bank).
2. **Card shell** — `rounded-2xl border border-slate-200 bg-white shadow-lg` with sticky toolbar header.
3. **Toolbar** — page icon + title, debounced search (`sm:w-60`), `DateRangePickerField` (`sm:w-56`), primary actions (Add / Export).
4. **Table** — inline skeleton rows while loading; empty state when no records.
5. **`TablePagination`** — default **20** rows/page; options 10/20/50/100.
6. **Row actions** — `createPortal` dropdown (`z-[10040]`), viewport-aware positioning, right-click context menu on rows.
7. **Details modal** — read-only audit/details view opened from row menu (“View Details”).
8. **Dates** — display format `DD/MM/YYYY` via local `formatDisplayDate` / `formatDate` helpers.

### Date range picker defaults (registers)

```js
<DateRangePickerField
  value={{ start: fromDate, end: toDate }}
  onChange={(range) => { setFromDate(range?.start || ''); setToDate(range?.end || ''); }}
  mode="range"
  initialTab="quick"
  defaultQuickKey="tm"
  quickOptionKeys={['tw', 'lw', 'lm', 'tm', 'lf', 'fy']}
  showRangeHint={false}
  showResetButton={false}
  buttonClassName="w-full h-9 ..."
/>
```

### Search

- Debounce **500ms** before API call.
- Reset page to `1` when search or date range changes.

### Portal row action menu

- Constants: `ACTIONS_MENU_WIDTH`, `ACTIONS_MENU_HEIGHT`.
- Position with `getBoundingClientRect()`; flip up/down based on viewport space.
- Close on outside click (`data-*-actions-menu` / `data-*-actions-trigger` selectors).
- Right-click on row opens the same menu as the ⋮ button.

See also: `ui-patterns.md`, `tables.md`, `modal.md`, `datepicker.md`.

---

## Received Register (`received-display.js`)

### API

- `GET /transaction/report/receive`
- Query: `page_no`, `limit`, `from_date`, `to_date`, optional `search` (invoice no. or remark).

### Stat cards

- **Received entries** — `stats.count`
- **Total received** — `stats.amount` (date-range scoped; not search-filtered)

### Table columns

Uses `table-fixed` with percentage widths (no horizontal min-width scroll):

| Column | Width | Notes |
|--------|-------|-------|
| # | 4% | Serial |
| Date | 10% | `DD/MM/YYYY` |
| Particulars | 26% | Party name + type badge + remark |
| Voucher | 12% | `invoice_no` |
| Amount | 12% | Right-aligned ₹ |
| Received At | 20% | Bank/capital/cash destination |
| Actions | 10% | Row menu |

**Received By** was removed from the table; it appears in `ReceivedDetailsModal` only.

### `payment_to` display (`getReceivedAtInfo`)

Party mapping from API:

```js
payment_from: { type, details }  // sender (client, ca, staff, …)
payment_to:   { type, details }  // receiver (bank or capital)
```

Display rules for **Received At**:

| `payment_to.type` | `details.type` | Primary label | Badge | Subtitle |
|-------------------|----------------|---------------|-------|----------|
| `bank` | `cash` | `details.holder` (e.g. “Main Cash”) | `cash` (amber) | — |
| `bank` | `savings` / `current` / `loan` | `details.bank` | account type | `details.account_no` |
| `capital` | — | `details.name` | `capital` (indigo) | — |

Helpers:

- `getReceivedAtInfo(item)` — primary display object
- `getReceivedAtBadgeStyle(accountType)` — badge colors
- `getBankTypeInfo(item)` — wrapper for modal/export (backward compatible)
- `getReceivedAtLabel(item)` — plain string for export

Cash example payload:

```json
"payment_to": {
  "type": "bank",
  "details": {
    "bank_id": "...",
    "holder": "Main Cash",
    "type": "cash",
    "remark": ""
  }
}
```

### Row actions

- **View Details** → `ReceivedDetailsModal` (party, received at, received by, audit trail)
- **Edit Received** — permission `finance_entry_edit`
- **View Invoice** — when invoice link exists

Print / WhatsApp / Email were removed from the row menu; toolbar export remains.

### Modals

- `ReceivedDetailsModal` — follows `modal.md` viewport-safe pattern (`z-[10050]`).
- Create/edit via `TransactionModalManager` / `EditTransactionModalManager`.

---

## Discount Register (`discount.js`)

### API

- `GET /expense/discount/list` — list + stats + pagination
- Create/edit via `DiscountModal` → `POST /expense/discount/create`, `PUT /expense/discount/edit`

### Stat cards

- **Discount entries** — `stats.count`
- **Total discount** — `stats.amount`

### Table

Party column shows type badge, party label, care-of subtitle, contact lines. Row actions: View Details, Edit Discount.

### `DiscountDetailsModal`

Read-only modal with party type badge, amount, invoice no., date, remark, create/modify audit.

### Party helpers

- `getDiscountPartyLabel(row)` — display name (bank/capital/client/etc.)
- `getDiscountPartyProfilePath(row)` — deep link to client/CA/agent/staff profile
- `formatCareOfSubtitle(details)` — guardian / care-of line

### `DiscountModal` (`CreateTransactions.js`)

- Exported from `TransactionModalManager` as `discount` type.
- Wired on `finance-voucher-entry.js` for quick create.
- Edit mode via `EditTransactionModalManager` with `editRecord.discount_id`.
- Party types: `client`, `ca`, `staff`, `agent`.
- Payload: `{ party_id, party_type, amount, remark, transaction_date }`.

---

## Bank Register (`bank-account.js`)

### API

- `GET /transaction/bank/list`
- Query: `page_no`, `limit`, optional `search`
- Response includes `stats.by_type` for savings, current, loan, cash.

### Stat cards

Four type cards from `BANK_TYPE_CARDS`:

| Key | Label | Icon |
|-----|-------|------|
| `savings` | Savings | `TbPigMoney` |
| `current` | Current | `TbBuildingBank` |
| `loan` | Loan | `HiOutlineReceiptRefund` |
| `cash` | Cash | `TbCash` |

Each card shows `count` and `balance` from `stats.by_type[key]`.

### Notes

- Refresh shows skeleton only (no success toast).
- Uses `DatePickerField` for some filters (not full date-range register pattern).
- Portal action dropdown + `TablePagination` same as other registers.

---

## Capital Register (`capital-accuont.js`)

Reference implementation for the register shell (stat cards, `TablePagination`, portal row actions). Uses capital-specific APIs from `SERVER/routes/capital.js`.

---

## Components reused

| Component | Path |
|-----------|------|
| `TablePagination` | `src/components/TablePagination.js` |
| `DateRangePickerField` | `src/components/PortalDatePicker.js` |
| `TransactionModalManager` | `src/components/Modals/CreateTransactions.js` |
| `EditTransactionModalManager` | `src/components/Modals/EditTransactions.js` |
| `DiscountModal` | exported from `CreateTransactions.js` |

## Permissions

- `finance_entry_edit` — required for edit actions on received/discount rows (toast “Need Access Permission” when denied).
- Use `useUserPermissions()` + `check('permission_key')`.
