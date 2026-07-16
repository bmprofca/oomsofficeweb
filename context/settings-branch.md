# Branch Settings (`branch-setting.jsx`)

**Route:** `/settings/branch-setting`  
**File:** `src/pages/settings/branch-setting.jsx`  
**Lazy export:** `BranchSettings` in `src/app/lazyRoutes.js`  
**Settings hub card:** `src/pages/settings.jsx` → link `/settings/branch-setting`

Renamed from legacy **App settings** (`app-setting`). There is no `/settings/app-setting` redirect.

---

## Tabs

Segmented control (icon + label): **Details**, **Logo**, **Signature**, **Invoice**, **GST Config**.

Follow typography / card density from `typography.md`:

- Page title: `text-base md:text-lg font-bold text-gray-800`
- Section titles: `text-sm font-bold text-gray-800`
- Labels: `text-xs font-semibold`
- Body / inputs: `text-sm`
- Micro badges: `text-[10px]`
- Use **`gray-*`** only (do not mix `slate-*`)
- Card shell: `rounded-lg border border-gray-200 shadow-sm`, header `px-3 py-2.5 md:px-4`
- Primary actions / active tabs: **indigo** (`bg-indigo-600`), not dark gray-900

Save bars on Details / Invoice / GST Config are **normal** (not sticky).

Shell inset: follow [`layout.md`](./layout.md) — `md:pl-[260px]` / `md:pl-20` via `contentInset`.

---

## Data load

- **`GET /settings/branch/details`** — headers from `getHeaders()`
- Response `data`: `basic`, `image`, `invoice`, **`gst_config`**
- Mapper: **`applyBranchDetailsData(data)`** → form state, logo/sign URLs, `panVerified` / `gstVerified`, GST applicable + date

Initial load uses full-page **`loading`** + skeleton. Per-action flags: `detailsSaving`, `logoUploading`, `signUploading`, `invoiceSaving`, `gstSaving`.

---

## Details tab — update profile

- **`PUT /settings/branch/details`** (JSON + `getHeaders()`)

```json
{
  "name": "...",
  "legal_name": "...",
  "address": {
    "address_line_1": "...",
    "address_line_2": "...",
    "city": "...",
    "state": "...",
    "pincode": "...",
    "country": "India"
  },
  "mobile": { "mobile_1": "...", "mobile_2": "..." },
  "email": { "email_1": "...", "email_2": "..." },
  "pan": { "pan": "..." },
  "gst": { "gst": "..." }
}
```

### Field rules

- **`legal_name`** — editable; included in every update payload.
- **Country** — UI shows read-only `"India"`; payload always `"India"`.
- **PAN / GST lock** — if `basic.pan.is_pan_verified` / `basic.gst.is_gst_verified`:
  - Inputs are `readOnly` + `disabled`
  - Client **omits** `pan` / `gst` from the PUT body
  - Server also rejects/ignores changes when verified
- Branch-level **tax rate %** is **not** edited here (env `TAX_RATE` on server). See [`gst-change.md`](./gst-change.md).
- Branch **GSTIN** (`basic.gst.gst`) is identity only — not the GST applicable switch.

### Selects

- State / district: **`StateDistrictSelect`** → wraps **`CustomSelect`** (`src/components/CustomSelect.js`)
- Fetches **`GET /utils/states-and-districts`** with `getHeaders()`
- Changing state clears district

### Icon inputs

When an icon sits inside an input (email, pincode), use a dedicated class with **`pl-10 pr-3`** — do **not** stack `px-3` + `pl-*` (Tailwind `px` overrides left padding and text sits under the icon).

---

## Logo & Signature tabs

1. Pick or drag-drop image (`file.type.startsWith('image/')`, max 5MB).
2. Pre-upload via **`uploadOneSaasFileUrl`** (`src/utils/onesaas-upload.js`) → public URL in `logoPublicUrl` / `signPublicUrl` + object-URL preview.
3. Persist on submit (URL only; no second binary upload):
   - **`POST /settings/branch/logo`** — `{ "logo": "<url>" }`
   - **`POST /settings/branch/sign`** — `{ "sign": "<url>" }`
4. Server stores files on B2 under `media/branch/logo/` and `media/branch/sign/` as **`{branch_id}.{ext}`** (prior extensions deleted on replace). Client displays proxy URLs (`/proxy/media/...`).

---

## Invoice tab

- **`POST /settings/branch/invoice-address`** — `{ "address": "<string>" }`
- On success, sync textarea from `data.address` (`null` → `""`).

---

## GST Config tab

Controls branch GST policy (not GSTIN). Pair with [`gst-change.md`](./gst-change.md).

- **`PUT /settings/branch/gst-config`**

```json
{
  "gst_applicable": "0" | "1",
  "gst_applicable_after": "YYYY-MM-DD" | null
}
```

### Rules

- Checkbox → `gst_applicable` `"1"` / `"0"`.
- Date via **`DatePickerField`** (`PortalDatePicker`) — required when applicable is on.
- When GST is turned **off**, client sends `gst_applicable_after: null`; server stores **NULL**.
- Rate % is **not** editable here (server `TAX_RATE` env).
- Also loadable from `GET /settings/branch/details` → `data.gst_config`.

Also supported on `PUT /branch/:branch_id` with the same two fields (admin branch API).

---

## Shared dependencies

| Piece | Path |
|-------|------|
| State / district | `src/components/state-district-select.js` |
| Searchable select | `src/components/CustomSelect.js` |
| Date picker | `src/components/PortalDatePicker.js` |
| Pre-upload helper | `src/utils/onesaas-upload.js` |
| Auth headers | `src/utils/get-headers.js` |
| API base | `src/utils/api-controller.js` |
| Toasts | `react-hot-toast` |
| Layout shell | [`layout.md`](./layout.md) |
| GST product rules | [`gst-change.md`](./gst-change.md) |

---

## Server touchpoints (related)

- `SERVER/routes/settings.js` — branch details GET/PUT, logo, sign, invoice address, **`PUT /branch/gst-config`**
- `SERVER/routes/branch.js` — branch CRUD + `gst_applicable` / `gst_applicable_after` on GET/PUT
- `SERVER/helpers/b2Storage.js` / `mediaUrl.js` — branch logo/sign keys and proxy URLs
- `SERVER/context/gst-change.md` — GST calculation rules
- Migration: drop per-row tax rate columns (see server GST context); keep `branch_list.gst_applicable*`
