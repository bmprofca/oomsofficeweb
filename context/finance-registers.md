# Finance Registers (Frontend)

Reference for finance **voucher / register** list pages. Canonical UX: **Sale** and **Purchase** — flat full-width shell, portal ⋮ actions, create/edit via transaction modals, invoice Download/Share where supported.

> Tag this file when changing any finance register list page. Also tag [`layout.md`](./layout.md), [`action-button.md`](./action-button.md), [`invoice.md`](./invoice.md), [`modal.md`](./modal.md).

## Pages

| Register | File | Notes |
|----------|------|--------|
| Sale | `src/pages/sale-display.jsx` | **Canonical** — flat table, portal actions, task-sale edit guard |
| Purchase | `src/pages/purchase-display.jsx` | Same shell/actions as sale |
| Received | `src/pages/received-display.jsx` | Same shell/actions; share = client only |
| Payment | `src/pages/payment-display.jsx` | Edit + details Edit; Download/Share as wired |
| Contra | `src/pages/contra-display.jsx` | Edit uses `raw_data` (not flattened row) |
| Journal | `src/pages/journal-display.jsx` | Edit uses `raw_data` |
| Expense | `src/pages/expense-display.jsx` | Edit + details Edit |
| Discount | `src/pages/discount.jsx` | Edit + details Edit |
| Bank | `src/pages/bank-account.js` | Account list (not voucher register) |
| Capital | `src/pages/capital-accuont.js` | Account list |

Older notes used `.js` filenames; prefer `.jsx` where the file exists.

---

## Shared shell (full width + flat table)

Follow [`layout.md`](./layout.md):

```jsx
<div className={`pt-16 transition-all … ${isMinimized ? 'md:pl-20' : 'md:pl-[260px]'}`}>
  <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
    {/* stats */}
    {/* register panel — NOT a heavy card */}
  </div>
</div>
```

### Do / don’t

| Do | Don’t |
|----|--------|
| `mx-2 sm:mx-4 md:mx-8` gutters | Shell `max-w-7xl mx-auto` / `px-4 sm:px-6 lg:px-8` as only width control |
| Flat panel: `rounded-lg border border-slate-200/80 bg-white/70` | `rounded-2xl … shadow-lg` white card wrapping the whole table |
| Sticky toolbar: `from-slate-100/90 via-white to-indigo-50/40` | Nested card + card for toolbar + table |
| Alternating rows `bg-white` / `bg-slate-50/70`, hover `hover:bg-indigo-50/40` | Only soft `hover:bg-blue-50/20` without zebra |

### Toolbar

- Title + search + `DateRangePickerField` (quick keys `tw/lw/lm/tm/lf/fy`, default `tm`)
- Export dropdown + Create (gate with `finance_entry`)
- Debounce search ~300–500ms; reset page on filter/limit change

### Pagination

- Prefer `TablePagination` with options including **20** default on list pages that already use it
- Purchase may use default 10 — match the page’s existing API limit when changing

---

## Row actions (portal ⋮)

Follow [`action-button.md`](./action-button.md). Canonical implementation: `sale-display.jsx` / `purchase-display.jsx`.

### Requirements

1. Trigger: `FiMoreVertical`, `aria-label="Actions"` only — **no** hover tooltip
2. Portal to `document.body`, `position: fixed`, `z-[99999]`, `height: 'auto'`
3. Placement: prefer **top → bottom → right → left**, then clamp into viewport
4. Recalc on resize + scroll; close on outside click, Escape
5. Size menu from **real item count** (`menuHeight ≈ 8 + itemCount * 36`)

### Standard voucher actions (Sale / Purchase / Received)

| Action | Behavior |
|--------|----------|
| **Details** | Open register details modal (or `ViewTransactionModalManager`) |
| **Edit** | `EditTransactionModalManager`; require `finance_entry_edit` |
| **Download** | `POST /invoice/generate` PDF blob (see [`invoice.md`](./invoice.md)) |
| **Share** | `DocumentShareModal` → `POST /invoice/share` |

Opening Edit (or Download/Share) must **close** the details modal and the ⋮ menu first.

### Type-specific notes

| Register | Edit payload | Download `type` | Share gate |
|----------|--------------|-----------------|------------|
| Sale | sale list row; task sales → navigate task profile (`Edit (Task)`) | `sale` | Client sales only |
| Purchase | purchase list row | `purchase` | Client or CA |
| Received | receive list row | `receive` | Client only (`payment_from.type === 'client'`) |
| Contra / Journal | **`record.raw_data \|\| record`** — flattened list row is not enough for the edit form | — | — |
| Payment / Expense / Discount / Journal | same edit modal pattern; details footer should offer Edit when permitted | as applicable | as applicable |

### Create / edit wiring

| Piece | Path |
|-------|------|
| Create forms | `components/Modals/CreateTransactions.js` (`SaleForm`, `PurchaseForm`, `TransactionModalManager`, …) |
| Edit switcher | `components/Modals/EditTransactions.js` → `EditTransactionModalManager` |
| Shared register details | `components/Modals/ViewTransactions.js` (`SaleDetailsModal`, `PurchaseDetailsModal`, …) |
| Document share UI | `components/Modals/DocumentShareModal` |

Permissions: `finance_report` (page), `finance_entry` (create), `finance_entry_edit` (edit), `finance_balance_view` (show amounts vs `*.*`).

---

## Sale Register (`sale-display.jsx`)

- Stats: count, net, tax, total
- Details via `ViewTransactionModalManager` (`modalType="SALE"`) with Edit / Download / Share footer
- Task-origin sales: list may include `task_id`; edit goes to `/task/profile/{id}/details`
- Backend edit: `PUT /sale/edit` (rejects `is_task = '1'`)

---

## Purchase Register (`purchase-display.jsx`)

- Stats: count, total amount
- Flat shell + portal actions identical to sale
- Details via `ViewTransactionModalManager` (`modalType="PURCHASE"`)
- Backend edit: `PUT /purchase/edit` (`executeEditPurchase`)
- List enrichment: `purchase_id`, `items`, `calculation` as needed for edit/view

---

## Received Register (`received-display.jsx`)

### API

- `GET /transaction/report/receive`
- Query: `page_no`, `limit`, `from_date`, `to_date`, optional `search`

### Stats

- Received entries — `stats.count`
- Total received — `stats.amount` (date-range scoped)

### Table

Prefer sale/purchase-style columns (`text-xs`, `min-w-*`, centered cells) — **not** a heavy `table-fixed` % card layout.

| Column | Notes |
|--------|-------|
| Sl No | Serial |
| Date | `DD/MM/YYYY` |
| Particulars | Party name + type badge + remark |
| Voucher No | `invoice_no` |
| Amount | ₹ badge |
| Received At | Bank / cash / capital destination |
| Actions | Portal ⋮ |

**Received By** stays in `ReceivedDetailsModal` only (not a table column).

### `payment_to` display (`getReceivedAtInfo`)

```js
payment_from: { type, details }  // sender (client, ca, staff, …)
payment_to:   { type, details }  // receiver (bank or capital)
```

| `payment_to.type` | `details.type` | Primary label | Badge | Subtitle |
|-------------------|----------------|---------------|-------|----------|
| `bank` | `cash` | `details.holder` | `cash` | — |
| `bank` | `savings` / `current` / `loan` | `details.bank` | account type | `details.account_no` |
| `capital` | — | `details.name` | `capital` | — |

### Row actions

Same as purchase: **Details**, **Edit**, **Download** (`type: 'receive'`), **Share** (client only). Prefer PDF Download over a separate “View Invoice” link.

### Modals

- `ReceivedDetailsModal` — local portal modal (`modal.md`)
- Create/edit: `TransactionModalManager` / `EditTransactionModalManager` (`modalType="RECEIVE"`)
- Share: `DocumentShareModal`

---

## Payment / Contra / Journal / Expense / Discount

Shared edit UX (aligned with sale/purchase):

1. Row ⋮ **Edit** gated by `finance_entry_edit`
2. Details modal footer **Edit** (same gate); opens edit and closes details
3. `onSubmit` / success → close edit modal + refetch list
4. Contra & Journal: pass **`raw_data`** into `EditTransactionModalManager`

Discount: `handleEditSuccess` must close edit modal **and** refresh (not refresh-only).

---

## Bank / Capital

Account list screens; keep portal actions + pagination. Not required to mirror voucher Download/Share unless product asks.

---

## Components reused

| Component | Path |
|-----------|------|
| `TablePagination` | `src/components/TablePagination.js` |
| `DateRangePickerField` | `src/components/PortalDatePicker.js` |
| `TransactionModalManager` / forms | `src/components/Modals/CreateTransactions.js` |
| `EditTransactionModalManager` | `src/components/Modals/EditTransactions.js` |
| `ViewTransactionModalManager` | `src/components/Modals/ViewTransactions.js` |
| `DocumentShareModal` | `src/components/Modals/DocumentShareModal` |

## Related docs

- [`layout.md`](./layout.md) — sidebar inset / full width
- [`action-button.md`](./action-button.md) — ⋮ menu physics
- [`invoice.md`](./invoice.md) — generate + share
- [`modal.md`](./modal.md) — details modal layout
- [`tables.md`](./tables.md) — table density
- [`SERVER/context/invoice.md`](../../SERVER/context/invoice.md) — generate/share API
