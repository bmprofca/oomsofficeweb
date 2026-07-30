# Invoice settings & PDF download — Client context

> **Purpose:** Tag when changing invoice settings UI, PDF download from ledgers/registers, or generate API usage. Pair with [`SERVER/context/invoice.md`](../../SERVER/context/invoice.md) and [`ledger-tab.md`](./ledger-tab.md).

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

Used from (non-exhaustive): ledger tabs (Client / CA / Agent), `sale-display.jsx`, `journal-display.jsx`, billing views, bank / capital transaction menus.

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

---

## Action menu height (conditional Download)

When Download is omitted, do **not** keep a fixed menu height (e.g. 120px for 3 items) — that leaves empty gap.

Pattern (Client / CA / Agent `LedgerTab.js`):

- `itemCount = 2 + (downloadable ? 1 : 0)` (Details + Edit [+ Download])
- `menuHeight ≈ 8 + itemCount * 36` for placement math
- Menu style: `height: 'auto'`, `overflow-hidden`
- Portal + fixed positioning (see [`action-button.md`](./action-button.md))

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

## Sale display

`src/pages/sale-display.jsx`:

- Row action: **Download** via `POST /invoice/generate` (`type: 'sale'`, `response: 'pdf'`).
- Action menu: portal + fixed (avoid table `overflow-x-auto` clipping). Prefer Download over a separate “View Invoice” when generating PDF.

---

## Key files

| Path | Role |
|------|------|
| `pages/settings/invoice-setting.jsx` | Formats + prefixes |
| `ClientComponents/LedgerTab.js` | Download + menu height |
| `CAComponents/LedgerTab.js` / `AgentComponents/LedgerTab.js` | Same pattern |
| `components/Modals/ViewTransactions.js` | Details Download gate |
| `pages/sale-display.jsx` | Sale PDF download |
