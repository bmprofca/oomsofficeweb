# Invoice settings & PDF download — Client context

> **Purpose:** Tag when changing invoice settings UI, PDF download/share from ledgers/registers, or generate API usage. Pair with [`SERVER/context/invoice.md`](../../SERVER/context/invoice.md), [`ledger-tab.md`](./ledger-tab.md), and [`finance-registers.md`](./finance-registers.md).

---

## Generate API (always this path)

```
POST /invoice/generate
```

Body example:

```json
{ "invoice_id": "<id>", "type": "sale", "response": "pdf" }
```

- Expect a **PDF blob** when `response: "pdf"` (download via object URL / save).
- Do **not** call `/invoice/generate-invoice` (removed on server).

Register `type` values used from list pages:

| Page | `type` |
|------|--------|
| `sale-display.jsx` | `sale` |
| `purchase-display.jsx` | `purchase` |
| `received-display.jsx` | `receive` |
| Ledgers / other | match row `transaction_type` (normalized) |

Also used from: ledger tabs (Client / CA / Agent), journal, billing, bank / capital menus.

---

## Share API

```
POST /invoice/share
```

Body: `{ invoice_id, type, channels }` — opens via `DocumentShareModal`.

| Register | Share when |
|----------|------------|
| Sale | `sale_type === 'client'` |
| Purchase | party `client` or `ca` |
| Received | `payment_from.type === 'client'` |

Server resolves the recipient client/CA from the transaction parties; toast a clear message if the party is not shareable.

---

## When to show Download

List rows from `GET /transaction/list` include:

| Field | Meaning |
|-------|---------|
| `downloadable` | `true` only if `invoice_id` exists **and** type is generate-supported |

Supported types: **sale, purchase, payment, receive, journal, expense**.

- Opening balance / contra / unsupported types → hide Download.
- Details modal (`ViewTransactions.js`): hide Download when `downloadable === false` (or missing invoice).

Same rule for CA / Agent ledger action menus. Task ledger reuses Client ledger. Staff ledger has no action Download menu.

On **Sale / Purchase / Received** registers, Download is offered when `invoice_id` exists (generate-supported types).

---

## Action menu height (conditional Download)

When Download is omitted, do **not** keep a fixed menu height (e.g. 120px for 3 items) — that leaves empty gap.

Pattern (Client / CA / Agent `LedgerTab.js`):

- `itemCount = 2 + (downloadable ? 1 : 0)` (Details + Edit [+ Download])
- `menuHeight ≈ 8 + itemCount * 36` for placement math
- Menu style: `height: 'auto'`, `overflow-hidden`
- Portal + fixed positioning (see [`action-button.md`](./action-button.md))

Sale / Purchase / Received voucher menus typically use **4** items: Details, Edit, Download, Share (`itemCount: 4`).

---

## Invoice settings UI

**File:** `src/pages/settings/invoice-setting.jsx`

### Format tab

- Type filter: **buttons** for format types only (`invoiceFormatTypes`): sale, purchase, payment, receive, journal, expense.
- Do **not** offer contra (or other non-generate types) on the format tab.
- Activate updates local `active_format` only (avoid full refetch that remounts cards).
- `FormatCard` is `memo`’d so preview close does not remount all cards.
- Hide raw `format_id` on cards.

### Prefix tab

- Broader `invoicePrefixTypes` (opening balance, contra, loan, etc.) — numbering still needs those.
- Prefix type filter + create-modal type: **`CustomSelect`**, not a native `<select>`.

---

## Register pages (Sale / Purchase / Received)

Canonical row actions (see [`finance-registers.md`](./finance-registers.md)):

1. **Details**
2. **Edit** (`finance_entry_edit`)
3. **Download** — `POST /invoice/generate` + blob save
4. **Share** — `DocumentShareModal` → `POST /invoice/share`

Prefer Download over a separate “View Invoice” navigation link when the generate API covers the type.

Sale details/footer also wire Download/Share via `ViewTransactionModalManager` / `SaleDetailsModal`. Purchase same with `PurchaseDetailsModal`.

---

## Key files

| Path | Role |
|------|------|
| `pages/settings/invoice-setting.jsx` | Formats + prefixes |
| `ClientComponents/LedgerTab.js` | Download + menu height |
| `CAComponents/LedgerTab.js` / `AgentComponents/LedgerTab.js` | Same pattern |
| `components/Modals/ViewTransactions.js` | Details Download / Share / Edit |
| `components/Modals/DocumentShareModal` | Share channel UI |
| `pages/sale-display.jsx` | Sale PDF + share |
| `pages/purchase-display.jsx` | Purchase PDF + share |
| `pages/received-display.jsx` | Receive PDF + share |
