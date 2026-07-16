# Branch-level GST — Client context

> **Purpose of this file:** Tag this doc in any future chat when building or changing forms, task UI, billing, sales, quotations, services, or compliance screens. An agent reading only this file should know how the UI must treat GST without re-asking product rules.

> **Server source of truth:** Always pair with [`SERVER/context/gst-change.md`](../../SERVER/context/gst-change.md) for calculation rules, dates, and DB constraints.

---

## Mental model (read this first)

```
User enters FEES only
        ↓
API (server) decides GST using branch flags + document date + TAX_RATE env
        ↓
UI displays tax_rate / tax_value / total FROM THE RESPONSE
```

**One sentence:** The client **never owns** the GST rate. The server owns it. The UI only shows what the API returns.

---

## Hard rules (do not violate)

1. **No tax-rate inputs** — no text fields, selects, or required “Tax Rate (%)” / “GST Rate” controls for branch operations.
2. **No tax-rate in payloads** — never send `tax_rate`, `gst_rate`, or `tax_perc` on create/update (task, service, quotation, compliance, sale, etc.).
3. **Display-only** — render `tax_rate`, `tax_value`, `gst_rate`, `gst_value`, `total` when the API includes them.
4. **Branch GST config UI** — Branch Settings → **GST Config** toggles `gst_applicable` / `gst_applicable_after` via `PUT /settings/branch/gst-config`. Do not invent a second settings surface for the same flags.
5. **GSTIN ≠ GST rate** — firm/branch GST number fields (`gst`, `gst_no`) stay as identity/tax ID inputs. Do not confuse them with rate %.

---

## What the server does (so you can design UI)

GST applies when:

- Branch `gst_applicable = '1'`, **and**
- Document date ≥ `gst_applicable_after`

Rate = server `TAX_RATE` env (typically **18%**).

If not applicable, API usually returns `tax_rate: 0`, `tax_value: 0` (stable shape).

You do **not** need to replicate this logic in React unless building a pure client-side preview that already has fees + an explicit API “preview” endpoint. Prefer trusting the last API response.

---

## UI patterns

### Good

- Fees input (editable when permissions allow)
- Read-only line: `Tax (18%): ₹…` / `GST: ₹…` from `charges` or invoice payload
- Billing confirm modal showing computed tax from task detail API
- Hint text: “GST is applied automatically when applicable for this branch.”

### Bad

- `<select>` of 0 / 5 / 12 / 18 / 28%
- Free-text “Tax Rate (%)”
- Defaulting form state to `tax_rate: 18` and POSTing it
- Client-side “total = fees * 1.18” as the source of truth for save

---

## Payload contracts

### Task edit (`PUT /task/edit/:task_id`)

Send fees (and firm/service/dates/ca/agent). **Omit** `tax_rate`.

```json
{
  "firm_id": "...",
  "service_id": "...",
  "fees": 1000,
  "due_date": "2026-07-01",
  "target_date": "2026-07-01",
  "ca": { "has_ca": false },
  "agent": { "has_agent": false }
}
```

After save, refresh detail (or merge response) so Charges show server-computed tax.

### Branch service add/edit (`POST /service/add`, `PUT /service/edit`)

```json
{ "service_id": "...", "fees": 500, "remark": "..." }
```

Compliance variant may include `due_date` (day of month). **No** `gst_rate`.

List/detail may still **show** `gst_rate` / `gst_value` from API (computed for “today”).

### Quotation create/edit

Items: `{ "service_id", "fees" }` only. Do not require or POST per-item tax rate. Show tax totals if the list/detail API returns them.

### Sale create

Do not require or POST top-level `tax_rate`. Server uses branch settings + `transaction_date` / sale date. UI may show a static note that GST is automatic.

### Compliance firm assign/edit

Payload includes `fees`, schedule fields, staff/ca/agent — **not** `tax_rate`.

### Billing generate

Still `{ task_ids: [...] }` (or existing shape). Tax comes from server at bill time.

---

## Display mapping (common response shapes)

| UI area | Typical API fields |
|---------|-------------------|
| Task Details → Charges | `charges.fees`, `charges.tax_rate`, `charges.tax_value`, `charges.total` |
| Task create service preview | Service object `gst_rate` / `gst_value` (if API sends them) |
| Invoice / sale detail | Header/line tax fields computed by server |
| Billing confirm | Same as task charges |

When `tax_rate === 0`, either hide the tax line or show `0%` — match surrounding screen style; do not invent a rate.

---

## Checklist for new client work

When adding a money form or editing an existing one:

- [ ] Fees (or amount) editable as needed
- [ ] No GST/tax **rate** control
- [ ] Payload excludes `tax_rate` / `gst_rate` / `tax_perc`
- [ ] After mutate, re-fetch or use API totals for display
- [ ] Do not hardcode `18` as a submitted default
- [ ] Firm GSTIN fields untouched (still OK)

---

## Files already aligned (reference)

| Area | Path |
|------|------|
| Branch GST config | `src/pages/settings/branch-setting.jsx` (GST Config tab) |
| Task details | `src/TaskComponent/DetailsTab.js` |
| Task edit modal | `src/TaskComponent/EdittaskModal.js` |
| Services | `src/pages/office-assistance/services.jsx` |
| Compliance form | `src/pages/office-assistance/complianceShared.jsx` |
| Quotation | `src/ClientComponents/QuotationTab.js` |
| Sale / purchase modals | `src/components/Modals/CreateTransactions.js` |
| Task create preview | `src/pages/task-create/steps/ServiceStep.jsx` (display from service; no rate edit) |

If you find a leftover tax-rate input while working nearby, **remove it** and stop sending the field — that is a bug relative to this contract.

---

## Copy you can reuse

> GST is applied automatically by the server when this branch is GST-applicable.

Do not promise a specific % in static copy unless it comes from the API response for that document.
