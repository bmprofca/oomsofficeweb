# OOMS v4 Client — Project Context

## Project Overview

**Name:** OOMS (Office Operations Management System) v4 — Client Frontend  
**Type:** React single-page application (SPA)  
**Purpose:** Business management platform for CA / accounting / tax firms. Manages tasks, billing, clients, staff, ledger, finance vouchers, attendance, and more.

---

## Tech Stack

| Layer      | Technology                                                                      |
| ---------- | ------------------------------------------------------------------------------- |
| Framework  | React (functional components + hooks)                                           |
| Styling    | Tailwind CSS                                                                    |
| Animations | Framer Motion (`motion`, `AnimatePresence`)                                     |
| Icons      | `react-icons` (fi, pi, tb, md, hi, bs, fa6, ai)                                 |
| HTTP       | Native `fetch` (most APIs); `axios` for some multipart uploads (e.g. `/upload`) |
| Toasts     | `react-hot-toast` (`toast.success` / `toast.error`) on several settings flows   |
| Auth       | localStorage tokens passed as request headers                                   |

---

## Project Structure

```
src/
├── pages/                      # Full-page route components
│   ├── billing-view.js         # Billing management (pending / generated / non-billable)
│   ├── task-create.js          # Task creation form (~2386 lines)
│   ├── task-display.js         # Task list & management
│   ├── task-profile.js         # Individual task details
│   ├── client-view.js          # Client list
│   ├── client-create.js        # Client creation form
│   ├── client-profile.js       # Client detail page (tabs: Ledger, Billing, Tasks…)
│   ├── staff-display.js        # Staff list
│   ├── staff-profile.js        # Staff detail page
│   ├── staff-attendance.js     # Staff attendance tracking
│   ├── dashboard.js            # Main dashboard
│   ├── login.js                # Login page
│   ├── bank-account.js         # Bank account management
│   ├── payment-display.js      # Payment transactions list
│   ├── sale-display.js         # Sales list
│   ├── purchase-display.js     # Purchase list
│   ├── expense-display.js      # Expense list
│   ├── received-display.js     # Received payments list
│   ├── journal-display.js      # Journal entries
│   ├── contra-display.js       # Contra entries
│   ├── capital-accuont.js      # Capital account
│   ├── finance-report.js       # Finance reports
│   ├── finance-voucher-entry.js# Finance voucher entry
│   ├── discount.js             # Discount management
│   ├── lead.js                 # Lead management
│   ├── broadcast.js            # Broadcast messages
│   ├── office-assistance.js    # Office assistance
│   ├── settings.js             # Settings hub / routing
│   └── settings/
│       ├── app-setting.js      # Branch app settings (tabs: details, logo, signature, invoice address)
│       └── invoice-setting.js    # Invoice prefix settings (example of `getHeaders` + `fetch`)
│
├── components/                 # Shared/reusable components
│   ├── header.js               # Header + Sidebar navigation
│   ├── payment-send.js         # Payment send modal
│   ├── payment-received.js     # Payment received modal
│   ├── email-selection.js      # Email picker modal
│   ├── mobile-selection.js     # WhatsApp/mobile picker modal
│   ├── DateRangePicker.js      # Custom date range picker
│   ├── DateFilter.js           # Date filter component
│   ├── PortalDatePicker.js       # Portal date picker (single + range)
│   ├── delete-confirmation.js  # Delete confirm modal
│   ├── menus.js                # Menu definitions
│   ├── state-district-select.js # India state + district `<select>`s (shared; calls `/utils/states-and-districts`)
│   ├── SearchableSelect.js     # Async searchable select
│   ├── SearchableSelectStatic.js # Static searchable select
│   ├── create-ledger-modal.js  # Ledger creation modal
│   ├── contra.js               # Contra form component
│   ├── journal.js              # Journal form component
│   ├── sales-form.js           # Sales entry form
│   ├── purchase-form.js        # Purchase entry form
│   ├── expense-form.js         # Expense entry form
│   ├── discount-form.js        # Discount entry form
│   ├── myProfile.js            # User profile component
│   └── PasswordGroupFirms.js   # Password/firm group management
│
├── ClientComponents/           # Components scoped to client-profile page
│   ├── LedgerTab.js            # Ledger tab (transactions, date range, opening balance)
│   ├── BillingTab.js           # Billing tab in client profile
│   ├── TaskTab.js              # Tasks tab in client profile
│   ├── RecurringTab.js         # Recurring tasks tab
│   ├── FirmsTab.js             # Firms tab in client profile
│   ├── DocumentsTab.js         # Documents tab
│   ├── NotesTab.js             # Notes tab
│   ├── ChattingTab.js          # Chat tab
│   ├── QuotationTab.js         # Quotation tab
│   ├── AutomationTab.js        # Automation tab
│   ├── PasswordTab.js          # Password tab
│   └── SearchComponent.js      # Search within client profile
│
└── utils/
    ├── api-controller.js       # API base URL: https://server.ooms.in/api/v1
    ├── get-headers.js          # Auth headers from localStorage
    └── body-scroll-lock.js     # Scroll lock utility
```

---

## Authentication

Auth data is stored in `localStorage` and injected as request headers by `getHeaders()`:

```js
{
  'Content-Type': 'application/json',
  'username': localStorage.getItem('user_username'),
  'token':    localStorage.getItem('user_token'),
  'branch':   localStorage.getItem('branch_id'),
}
```

Returns `null` if any field is missing (triggers auth error handling in callers).

---

## API Base URL

```
https://server.ooms.in/api/v1
```

All API calls are prefixed with this URL. Import: `import API_BASE_URL from '../utils/api-controller'`

---

## Common Patterns Used Across the App

### Abort-safe data fetching

```js
const abortRef = useRef(null);
const seqRef = useRef(0);

const fetchData = useCallback(async () => {
  abortRef.current?.abort();
  const ac = new AbortController();
  abortRef.current = ac;
  const seq = ++seqRef.current;
  setLoading(true);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (seq !== seqRef.current) return; // stale response guard
    // ...
  } catch (e) {
    if (e.name === "AbortError") return;
  } finally {
    if (seq === seqRef.current) setLoading(false);
  }
}, [deps]);
```

### Sidebar minimized state

Persisted in `localStorage` key `sidebarMinimized`. All pages read this to apply `lg:pl-20` (minimized) or `lg:pl-72` (expanded) left padding. **Keep main content left padding and any fixed/offset UI** (e.g. bulk bars, wide cards) **in sync with the real sidebar width** (`md:` / `lg:` breakpoints and px values) so content does not sit under the drawer; some pages (e.g. **`billing-view.js`**) use explicit pixel offsets (`288px` / `80px`) where `pl-*` alone is not enough.

### SkeletonPulse component

Used for loading placeholders:

```jsx
const SkeletonPulse = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-gray-200/90 ${className}`} />
);
```

### AppDialog — reusable in-app dialog

Defined in `billing-view.js` (and pattern should be reused elsewhere). Replaces `window.alert` and `window.confirm`. Rendered via `createPortal` to `document.body`. Supports:

- `variant`: `'confirm'` | `'warning'` | `'danger'` | `'success'` | `'error'`
- `onConfirm`: async function that returns `{ variant, title, message }` to show a result dialog, or `null`/`undefined` to close
- Loading state (spinner on confirm button, backdrop click blocked)
- Cancel text can be `null` for result-only dialogs

---

## `billing-view.js` — Billing Management Page

### Purpose

Manages billing for completed tasks. Three tabs: **Pending** (tasks awaiting billing), **Generated** (invoices created), **Non-Billable** (tasks marked as non-billable).

### API Endpoints

```
GET  /billing/list/pending        List pending billing tasks
GET  /billing/list/generated      List generated bills
GET  /billing/list/nonbillable    List non-billable tasks
POST /billing/generate/billable   Generate invoice(s) for task IDs
POST /billing/generate/nonbillable Mark task IDs as non-billable
GET  /billing/stats               Billing statistics
```

### Query Parameters for list endpoints

```
page_no     Page number (1-based)
limit       Items per page (5 | 10 | 20 | 50 | 100, default 20)
search      Search string (optional)
service_id  Filter by service (optional)
```

### API Response shape

```json
{
  "success": true,
  "data": [ ...task objects... ],
  "pagination": {
    "page_no": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5,
    "is_last_page": false
  }
}
```

### Task object normalized by `normalizeBillingRow()`

```js
{
  id, task_id,
  service_name, service_id,
  fees, charges_total, tax_rate, tax_value,
  firm_name, firm_id,
  name,               // client name
  client_username,
  pan, file_no,
  mobile, email, country_code,
  create_date, complete_date, due_date,
  bill_status,        // 'pending' | 'generated' | 'nonbillable'
  task_status,
  completer_name, completer_mobile, completer_user_type,
  is_recurring, recurring_type,
  staffs, has_ca, has_agent,
  _raw,               // original API object
}
```

### Tab card counts

Fetched in parallel with `Promise.all` using `limit=1` on each tab endpoint to read `pagination.total`.

### Features implemented

1. **Skeleton loading** — 8 animated `SkeletonPulse` rows shown whenever `loading === true` (on initial load, tab switch, pagination, filter change)
2. **Portal action menu** — Row action menu rendered via `createPortal` to avoid `overflow-x-auto` clipping. Button position captured via `getBoundingClientRect()`. Auto-detects viewport space to open upward or downward.
3. **Confirmation dialogs** — All `window.confirm` / `alert` replaced with `AppDialog` modal. Variants: generate bill (warning), non-billable (danger), success/error results.
4. **Single task generation** — "Generate Bill" option in row action menu (Pending tab only). Calls same `/billing/generate/billable` API with a single task ID.
5. **Always-visible pagination** — Pagination bar always shown (no conditional hiding). Shows page info + per-page limit selector (5, 10, 20, 50, 100, default 20). Limit change resets to page 1.
6. **Tab switch data clear** — `setBillingData([])` called on tab card click, so old tab data never flashes while new data loads.
7. **Scroll-close dropdown** — Row dropdown closes on any scroll event (`window.addEventListener('scroll', ..., true)`).

### State key points

- `selectedBillType`: `'pending'` | `'generated'` | `'nonbillable'`
- `billingData`: current page rows (cleared on tab switch)
- `pagination`: `{ page_no, limit, total, total_pages, is_last_page }`
- `selectedItems`: array of selected `task_id`s (only active on pending tab)
- `selectAll`: boolean toggle
- `billingActionLoading`: global loading for API action buttons
- `activeRowDropdown` + `dropdownPos`: portal dropdown control
- `dialog`: AppDialog state (variant, title, message, onConfirm, loading, etc.)

### Bulk action bottom bar

Fixed bar at bottom of screen when items are selected (Pending tab only). Slides in/out with spring animation. Contains: selected count, info note, "Generate bill", "Non-billable", "Clear" buttons. Offset by sidebar width (`left: isMinimized ? 80px : 288px`).

---

## `sale-display.js` — Sales list (Sales Register)

- **Sticky table header:** Block **(1)** — title **Sales Register** + **date range** subtitle (en-dash variants normalized to `-` for display). Block **(2)** — single **`flex-nowrap`** row: **search** (`min-w-0 flex-1` wrapper, input `w-full`, min width ~`8rem`) → **`DateFilter`** (compact via `className`, see `DateFilter.js`) → **Export** dropdown → **Add Sale** (rightmost; search flex fills space so actions stay aligned to the right).
- **Stats** from API **`stats`** (e.g. net / tax / total amounts + count); rupee affordances use **`TbCurrencyRupee`** where used in this page.
- **Pagination:** server-driven list (no client **`slice`** over the full dataset). Footer follows the **Ledger-style** pattern (`meta` / totals, `LIMIT_OPTIONS`, page jump) — align with `LedgerTab.js` when changing limits or filters (reset page 1 on filter/limit change).

---

## `LedgerTab.js` — Client Ledger (in ClientComponents)

### Features

- Transaction list with debit / credit / balance columns
- Opening balance row (always shown, including `₹0.00`)
- `transaction_type` display from API
- `particular` object support (with nested `details` and `remark`)
- Transaction details modal
- Date range picker (card-style trigger, quick filters, inline 2-month calendar)
- Opening balance set/edit modal
  - `GET /transaction/get-opening-balance`
  - `POST /transaction/set-opening-balance`
- Pagination with page size selector (5, 10, 20, 50, 100) and go-to-page input
- Row action menu with "Details" option

### API Response shape for ledger

```json
{
  "opening_balance": { "debit": 0, "credit": 0, "balance": 0 },
  "data": [
    {
      "transaction_type": "payment",
      "payment": { "debit": 500, "credit": 0, "balance": 500 },
      "particular": { "details": {}, "remark": "..." },
      ...
    }
  ]
}
```

---

## `payment-send.js` / `payment-received.js` — Payment Modals

- Larger modal size with gradient header
- Bank selector with details card below (bank name, account number, account holder, balance)
- Cleaner content spacing and footer styling

---

## `header.js` — Header + Sidebar

- Sidebar can be minimized (icon-only) or expanded (icon + label)
- State persisted in `localStorage('sidebarMinimized')`
- No underline on sidebar navigation links (removed default link hover style)
- Props: `mobileMenuOpen`, `setMobileMenuOpen`, `isMinimized`, `setIsMinimized`

---

## `app-setting.js` — Branch / App Settings (`src/pages/settings/app-setting.js`)

Single settings screen with **tabbed sections**: **Details**, **Logo**, **Signature**, **Invoice**. Uses `Header` + `Sidebar`, same sidebar padding pattern as other pages. User feedback uses **`react-hot-toast`** (not `window.alert`).

### Data load

- **`GET /settings/branch/details`** — no query params. Headers from `getHeaders()`.
- Response `data` includes `basic`, `image`, `invoice`. A helper **`applyBranchDetailsData(data)`** maps this into local form state and updates logo/sign URLs and PAN/GST verification flags.

### Details tab — update branch profile

- **`PUT /settings/branch/update`**
- JSON body shape (country always **`"India"`** in payload; country is **not** shown as a field on the UI):

```json
{
  "name": "...",
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
  "gst": { "gst": "...", "gst_rate": "18.00" }
}
```

- `gst_rate` is sent with two decimal places (`Number(select).toFixed(2)`). The UI uses a **select** with **0%, 5%, 18%, 40%** only.
- **PAN / GST verification** labels read `basic.pan.is_pan_verified` and `basic.gst.is_gst_verified` (display only).
- Submit uses local **`detailsSaving`** so the main page skeleton `loading` is not tied to this action.

### State & district fields

- Reusable component: **`src/components/state-district-select.js`** (`StateDistrictSelect`).
- **`GET /utils/states-and-districts`** — no params; **must** send **`getHeaders()`** (same auth as other authenticated routes).
- Response: `{ success, data: [ { name, districts: string[] } ] }`. State dropdown is **before** district; changing state clears district.

### Logo & Signature tabs — upload flow

Matches the pattern in **`DocumentsTab.js`** for generic file upload:

1. User picks or **drag-drops** a file; frontend checks **`file.type.startsWith('image/')`**.
2. **Immediate upload**: **`POST /upload`** with **`FormData`** (`file` field), **`axios`**, headers from **`getHeaders()`**, `Content-Type: multipart/form-data`. Public URL from `response.data.data.url` or `response.data.url`.
3. URL is stored locally (`logoPublicUrl` / `signPublicUrl`) with preview via object URL; toast indicates upload done.
4. **Submit** only calls the branch endpoints with that URL (no second file upload on submit):
   - **`POST /settings/branch/logo`** — body `{ "logo": "<public-url>" }`
   - **`POST /settings/branch/sign`** — body `{ "sign": "<public-url>" }`
5. Success response updates displayed logo/sign URL from `data.logo` / `data.sign`. Per-tab busy state: **`logoUploading`** / **`signUploading`**.

### Invoice tab

- **`POST /settings/branch/invoice-address`** — body `{ "address": "<string>" }`, headers from `getHeaders()` + JSON content type.
- On success, sync textarea from `data.address` when present (including `null` → empty string). Submit uses **`invoiceSaving`**.

### Tab UI

- Tabs are a **segmented control** (gradient container, icon + label, active pill style), not plain bordered buttons.

### Skeleton loading

- Initial **`GET /settings/branch/details`** still drives full-page **`loading`** + skeleton (unchanged pattern for first paint).

---

## `state-district-select.js` — Shared state / district picker

- **File:** `src/components/state-district-select.js`
- **Props:** `selectedState`, `selectedDistrict`, `onStateChange`, `onDistrictChange`, optional `stateLabel`, `districtLabel`, `required`, `selectClassName`.
- Fetches once on mount from **`GET ${API_BASE_URL}/utils/states-and-districts`** with **`getHeaders()`**.
- If headers are missing, fetch fails gracefully (logged); dropdowns stay empty until auth is fixed.
- Use anywhere a form needs India state + district selection.

---

## `DocumentsTab.js` — File upload reference

- Generic upload: **`POST ${API_BASE_URL}/upload`** with `FormData.append('file', file)`, **`axios`**, and `getHeaders()`. Success URL: `response.data.data?.url || response.data.url`.
- **`app-setting.js`** logo/signature pre-upload reuses this contract.

---

## `DateFilter.js` — Shared date filter (`src/components/DateFilter.js`)

- Presets include **This Month**, **Last Month**, and **Custom Dates** (inline from/to inputs when custom is chosen).
- Trigger label uses internal **`selectionTitle`** (preset name); **parent pages** show the **actual range string** (e.g. under “Sales Register” on `sale-display.js`).
- **`onChange`:** callers receive range / filter payload as implemented (including preset metadata where wired).
- **UX / stacking:** menu uses a high **z-index**; outside-close uses **document click (capture)**. Avoid **`overflow-x-auto`** on ancestors that would clip the dropdown; toolbar rows may use **`flex-nowrap`** + width-safe children instead of horizontal scroll on the whole bar.
- **`className` prop:** if non-empty (trimmed), the root is **`relative flex items-center gap-2` + `className`** only — **no** default **`w-full sm:w-auto`**. Use in compact toolbars (e.g. **`className="w-auto max-w-[16rem] shrink-0"`** on `sale-display.js`) so the control does not stretch across the row.

---

## Email Broadcast Module (`src/pages/broadcast/email/*`)

Implemented a full Email Broadcast frontend module with Bootstrap-based admin UI, toast feedback, reusable API layer, and route integration.

### Files added

- `src/pages/broadcast/email/emailApi.js`
- `src/pages/broadcast/email/EmailConfigList.jsx`
- `src/pages/broadcast/email/EmailConfigFormModal.jsx`
- `src/pages/broadcast/email/EmailTemplateList.jsx`
- `src/pages/broadcast/email/EmailTemplateFormModal.jsx`
- `src/pages/broadcast/email/EmailBroadcastList.jsx`
- `src/pages/broadcast/email/EmailBroadcastCreate.jsx`
- `src/pages/broadcast/email/EmailBroadcastDetails.jsx`

### Routing integration

- Added in `src/index.js`:
  - `/broadcast/email/configs`
  - `/broadcast/email/templates`
  - `/broadcast/email`
  - `/broadcast/email/create`
  - `/broadcast/email/details/:broadcast_id`
- Added **Email** tab/cards in `src/pages/broadcast.js` to navigate to this module.

### Dependencies used

- `axios`
- `react-hot-toast`
- `bootstrap`
- `react-bootstrap`

### Auth/header pattern (critical)

- **Aligned to dashboard pattern** by using **`getHeaders()`** in `emailApi.js`.
- Every API request now sends:
  - `username`
  - `token`
  - `branch`
- If auth headers are missing, requests fail early with a clear error.

### API base mount and endpoints

Backend router mount is `/broadcast/email`; all module APIs use this prefix:

#### SMTP Config

- `POST /broadcast/email/config/create`
- `PUT /broadcast/email/config/update`
- `GET /broadcast/email/config/list`
- `GET /broadcast/email/config/details/:config_id`
- `POST /broadcast/email/config/test`
- `PUT /broadcast/email/config/set-default`
- `PUT /broadcast/email/config/change-status`

#### Template

- `POST /broadcast/email/template/create`
- `PUT /broadcast/email/template/update`
- `GET /broadcast/email/template/list`
- `GET /broadcast/email/template/details/:template_id`
- `POST /broadcast/email/template/preview`
- `PUT /broadcast/email/template/change-status`

#### Broadcast

- `POST /broadcast/email/broadcast/create`
- `GET /broadcast/email/broadcast/list`
- `GET /broadcast/email/broadcast/details/:broadcast_id`
- `GET /broadcast/email/broadcast/recipient-list/:broadcast_id`
- `POST /broadcast/email/broadcast/pause`
- `POST /broadcast/email/broadcast/resume`
- `POST /broadcast/email/broadcast/cancel`
- `POST /broadcast/email/broadcast/retry-failed`
- `POST /broadcast/email/broadcast/process-due` (helper included in API layer)

### Backend contract nuances already handled

- **Config create** uses `username` key.
- **Config update** uses `smtp_username` key.
- Template preview payload uses `variables` key (not `variables_json`).
- Pagination helper supports `has_more` in addition to page metadata.
- List screens show empty states + simple prev/next pagination controls.

### Module behavior summary

- SMTP page: list/add/edit/test/set-default/change-status.
- Template page: list/add/edit/preview/change-status; preview renders subject/html/text.
- Broadcast list: status/counters + control actions (pause/resume/cancel/retry).
- Broadcast create: sectioned form with config/template, schedule, timezone, global JSON, recipients table, import textarea, email + JSON validation.
- Broadcast details: master info, template snapshot, counters, recipient status table, control actions.

---

## `TaskComponent/` — Task Detail Tabs

These components live inside `src/TaskComponent/` and are rendered as tabs inside the individual task detail page (`task-profile.js`). All share the same global patterns: `getHeaders()`, `API_BASE_URL`, `react-hot-toast`, `framer-motion` animations, and Tailwind CSS styling.

---

### `NotesTab.js`

#### Purpose

Displays and manages notes attached to a task. Notes can be of three types: **Text**, **File attachment**, or **Voice recording**.

#### API Endpoints

```
GET  /task/details/notes        Fetch notes list (params: task_id, search, page, limit)
POST /task/details/notes/add    Add a new note
```

#### Key state

- `activeFilter`: `'all'` | `'text'` | `'file'` | `'voice'` — drives list filter tabs
- `notes`, `notesLoading`, `totalNotes`, `currentPage`, `hasMore`
- `showAddModal`, `newNote` — add note form state
- `isRecording`, `recordingBlob`, `recordingSeconds` — voice recording state

#### Implemented behaviours

1. **Single unified `useEffect`** with debounce for `task_id` and `searchTerm` changes (prevents duplicate API calls on mount).
2. **`openAddModal()`** pre-selects `newNote.type` based on `activeFilter`:
   - `'all'` or `'text'` → `'text'`
   - `'file'` → `'file'`
   - `'voice'` → `'voice'`
3. **Add note modal layout** — `flex flex-col` container with `flex-shrink-0` header/footer and `flex-1 min-h-0 overflow-y-auto` body, so header and footer are always visible regardless of content length.
4. **`getEmptyNoteForm()`** and **`clearRecordingState()`** helpers for clean state resets.

---

### `SubTaskTab.js`

#### Purpose

Manages subtasks for a task. Subtasks can be of type `"text"` (free text) or `"service"` (linked to a service).

#### API Endpoints

```
GET  /task/details/subtask/list           List subtasks (task_id)
POST /task/details/subtask/add            Add subtask(s)
PUT  /details/subtask/update              Update subtask content
PUT  /details/subtask/status              Change subtask status (separate endpoint)
DELETE /task/details/subtask/delete       Delete subtask
```

#### Status options

`pending` | `complete` | `cancel`

#### Key behaviours

1. **Subtask types displayed as** `"service"` (API type `"task"`) or `"text"`.
2. **`service_id` hidden** in the table for subtasks with `type="task"`.
3. **Status changes** call `PUT /details/subtask/status` with body `{ task_id, subtask_id, status }`. Status is **not** part of the edit modal.
4. **Edit modal** (`PUT /details/subtask/update`) — sends `{ task_id, subtask_id, subtasks: [{ type, text?, service_id? }] }`. No `status` field in body.
5. **Details modal** — opened by `FiInfo` button in action column. Shows all subtask fields except backend-only IDs (`subtask_id`, `service_id`, `task_id`, etc.). Uses `isHiddenDetailKey()` + `buildSubtaskDetailRows()`.
6. **Custom confirm modal** for delete/status-change confirmations (replaces `window.confirm`).
7. **`react-hot-toast`** for all API success/error feedback. No modal alerts for API responses.

#### Payload shapes

```js
// PUT /details/subtask/status
{ task_id, subtask_id, status }

// PUT /details/subtask/update
{ task_id, subtask_id, subtasks: [{ type: 'text'|'service', text?, service_id? }] }
```

---

### `StaffTab.js`

#### Purpose

Displays staff assigned to a task and provides an assignment UI with a two-box transfer layout.

#### API Endpoints

```
GET  /settings/staff/list           All branch staff (paginated, limit 100, fetched until last page)
GET  /task/details/staff/list       Staff currently assigned to the task
PUT  /task/details/staff/update     Assign/unassign staff (full replace: send remaining usernames)
```

#### Key state

- `staffList` — currently assigned staff (task)
- `allBranchStaff` — all staff in the branch (loaded once on tab open, paginated loop)
- `selectedStaff` — array of usernames in the assignment modal (right-box)
- `tableSelectedRows` — array of usernames selected in the assigned staff table (for bulk delete)
- `deleteConfirm` — `{ label: string, usernames: string[] } | null`
- `viewStaff` — staff object for the view details modal

#### Staff fetching

On tab mount, two parallel fetches run:

1. `fetchStaffList()` — loads currently assigned staff for this task.
2. `fetchAllBranchStaff()` — loops `GET /settings/staff/list?limit=100&page=N` until `meta.is_last_page === true`. Standardised through `mapBranchStaffItem()`.

#### Assignment modal (two-box transfer UI)

- **Available Staff** (left box): all branch staff not in `selectedStaff`, filtered by search
- **Selected Staff** (right box): staff currently selected for assignment
- Transfer buttons (`FiArrowRight` / `FiArrowLeft`) are vertically centred between the two boxes
- Staff items fade in/out (`AnimatePresence`) on selection/deselection
- Submitting with an empty `selectedStaff` array shows a confirmation modal before calling the API

#### Assign API payload

```js
PUT /task/details/staff/update
{ task_id, staff_ids: [username1, username2, ...] }
```

#### Multi-select table (assigned staff)

- First column: `AnimatedCheckbox` — custom framer-motion checkbox (handles `checked` and `indeterminate` states)
- Header checkbox: select all / deselect all visible rows; reflects indeterminate state when some rows are selected
- Selected rows highlighted with `bg-indigo-50`
- `tableSelectedRows` resets when `staffList` changes

#### Bulk action bar

- Appears (via `AnimatePresence`) when `tableSelectedRows.length > 0`
- Shows count, "Clear" button, and `bg-red-600` "Delete Selected (N)" button
- Disabled while API is in flight

#### Delete logic (unified — `performDelete`)

```js
// DRY helper used for single AND bulk delete
performDelete(usernamesToRemove) {
  const remaining = staffList
    .map(m => m.username)
    .filter(u => !usernamesToRemove.includes(u));
  executeAssignStaff(remaining); // calls PUT /task/details/staff/update
}
```

- Single-row delete → `requestDelete([member.username])`
- Bulk delete → `requestDelete(tableSelectedRows)`
- Both route through a custom `deleteConfirm` confirmation modal before executing

#### View Staff modal (eye button)

- Width `max-w-xl`, height capped at `90vh`, fixed header/footer, scrollable body
- Header text: "Assigned Staff Details"
- Body starts with a compact profile strip (avatar initials, name, designation badge)
- Details in `grid grid-cols-1 sm:grid-cols-2` using `DetailRow` helper (only renders if value is present)
- Scrollbar hidden: `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
- No blue gradient banner

---

### `DetailsTab.js`

#### Purpose

Displays and manages core task details: firm, service, fees, tax, CA, agent, dates, status, and billing.

#### API Endpoints

```
GET  /service/list                          Load service options (on mount)
GET  /task/details/search?query=...         Search firms (debounced)
GET  /task/details/ca/search?query=...      Search CA (debounced)
GET  /task/details/agent/search?query=...   Search agents (debounced)
PUT  /task/change-status                    Change task status
PUT  /task/edit/:task_id                    Edit task details
POST /billing/generate/billable             Generate invoice
POST /billing/generate/nonbillable          Mark as non-billable
```

#### Status options

```js
[
  "in process",
  "pending from client",
  "pending from department",
  "complete",
  "cancel",
];
```

`'unassign'` is **not** a valid option and is excluded.

#### Status change rules

- Status `'complete'` → locked once set. Dropdown is replaced with a static green badge. No further status changes allowed.
- Status `'cancel'` or `'complete'` → shows a **confirmation modal** before calling the API. Other statuses change immediately.
- Confirmation modal is green-themed for `complete`, red-themed for `cancel`.
- `handleStatusChange(newStatus)` intercepts → sets `statusConfirm`. `executeStatusChange(newStatus)` performs the actual API call.

#### Edit modal

- Triggered by "Edit Task" button → `showEditModal = true`
- Width `max-w-3xl`, height capped at `92vh`, fixed header/footer, scrollable body (`overflow-y-auto [scrollbar-width:thin]`)
- `editForm` state holds all editable fields: `firm_id`, `firmOption`, `service_id`, `fees`, `tax_rate`, `has_ca`, `ca_id`, `caDisplay`, `has_agent`, `agent_id`, `agentDisplay`, `due_date`, `target_date`

#### Edit API payload

```js
PUT /task/edit/:task_id
{
  firm_id, service_id, fees, tax_rate,
  ca: { has_ca, ...(has_ca && { ca_id }) },
  agent: { has_agent, ...(has_agent && { agent_id }) },
  due_date,   // "YYYY-MM-DD"
  target_date // "YYYY-MM-DD"
}
```

`ca_id` and `agent_id` are only included in the payload when `has_ca`/`has_agent` is `true`.

#### Billing status logic

| `billing_status` | Meaning                  |
| ---------------- | ------------------------ |
| `'pending'`      | Bill generation pending  |
| `'complete'`     | Bill (invoice) generated |
| `'non billable'` | Marked as non-billable   |

- **Generate Bill section** is shown only when `taskData.status === 'complete'` **AND** `taskData.billing_status === 'pending'`
- When `billing_status === 'complete'`, `invoice_no` is displayed in the view
- Billing status badge colours: `complete` = green, `non billable` = blue, `pending` = amber

#### Billing confirmation modal

- Opened by "Generate Bill" or "Generate Non Billable" buttons → `setBillingModal('bill' | 'nonbillable')`
- Modal layout: `flex flex-col`, `maxHeight: '90vh'`, `flex-shrink-0` header/footer, `flex-1 min-h-0 overflow-y-auto` body (prevents header/footer from going off-screen)
- Shows fee breakdown (Base Fees, Tax, Total) for billable; strikethrough for non-billable
- Amber warning notice before confirming
- `handleConfirmBilling()` calls the appropriate endpoint, shows toast, updates `taskData` locally on success

#### Conditional field locking (`billGenerated`)

When `billing_status === 'complete' || 'non billable'`:

- An amber warning banner is shown at the top of the edit modal body
- **Editable**: `fees`, CA toggle + search, Agent toggle + search
- **Locked** (replaced with `LockedField` component with lock icon): Firm, Service, Tax Rate, Due Date, Target Date

#### Input enhancements

- **Fees / Tax Rate**: `type="text" inputMode="decimal"` (no spinners, no scroll-to-change). Dynamic "Total Amount" preview shown when `fees > 0`: `fees * (1 + tax_rate/100)`, formatted with `toLocaleString('en-IN')`.
- **Service select**: Searchable custom dropdown (client-side filter of `services` array).
- **Firm search results**: Show Firm name (bold), Client name, Mobile, File No, PAN No in a 2×2 grid.
- **CA / Agent**: Toggle switches (`h-6 w-10`) to enable/disable. When enabled, searchable input with clear button and detailed results.

#### Helper components (local to this file)

```jsx
InfoPair; // View mode: label + value row with border-b
SectionTitle; // Section header with icon + title
LockedField; // Read-only field in edit modal with lock icon
```

---

## Naming Conventions

- Page components: `PascalCase` named export, default export at bottom
- API path constants: `SCREAMING_SNAKE_CASE` (e.g. `BILLING_GENERATE_BILLABLE`)
- State variables: `camelCase`
- CSS: Tailwind utility classes only (no custom CSS files)
- Date formatting: `DD Mon YYYY` (e.g. `06 Apr 2026`)
- Currency: Indian Rupee `₹` symbol, `toLocaleString` for formatting

---

## Important UX Patterns

- **Dropdowns in tables**: Always use `createPortal` + `position: fixed` with `getBoundingClientRect()` to avoid `overflow-x-auto` clipping
- **Auto-flip dropdown**: Check `window.innerHeight - rect.bottom` vs estimated dropdown height; open upward if insufficient space below
- **Loading states**: Show skeleton rows (not spinner overlay) during data fetch
- **Tab switches**: Clear data immediately (`setData([])`) before new fetch to avoid stale data flash
- **Confirmations**: Use `AppDialog` modal, never `window.confirm` or `window.alert`
- **Fetch cancellation**: Use `AbortController` + sequence counters to handle race conditions
- **Pagination**: Prefer a consistent footer (range text, page size, prev/next, optional “go to page”); changing limit resets to page 1. Canonical layout: **Ledger pagination footer** (`src/ClientComponents/LedgerTab.js`) — full spec in the section below.

---

## UI reference: Ledger pagination footer (`src/ClientComponents/LedgerTab.js`)

Use this when implementing the same table footer on other pages. Source: lines ~1099–1169 (footer JSX), state ~275–280, effects ~314–324, fetch meta ~370–374, handlers ~626–641.

### Role

Footer sits **below the scrollable `<table>`** (inside the card). It shows:

1. **Range summary** — “Showing _start_ to _end_ of _total_ entries”
2. **Page size** — `<select>` bound to `itemsPerPage` with fixed options
3. **Prev / current / total / next** — bordered buttons + highlighted current page pill
4. **Go to page** — number input + submit (“Go”) to jump

### State

| State           | Typical initial        | Notes                                                        |
| --------------- | ---------------------- | ------------------------------------------------------------ |
| `currentPage`   | `1`                    | 1-based; sent to API as `page_no`                            |
| `totalPages`    | `1`                    | Set after fetch: `Math.max(1, Math.ceil(total / limit))`     |
| `totalItems`    | `0`                    | From API `meta.total`                                        |
| `itemsPerPage`  | `20`                   | Drives `limit` query param                                   |
| `LIMIT_OPTIONS` | `[5, 10, 20, 50, 100]` | Constant; map to `<option>`s                                 |
| `pageJumpInput` | `''`                   | Controlled string for “go to”; cleared after successful jump |

### API response (ledger)

```js
const meta = response.data.meta || {};
const total = meta.total ?? 0;
const limit = meta.limit ?? itemsPerPage;
setTotalItems(total);
setTotalPages(Math.max(1, Math.ceil(total / limit)));
```

Other list APIs should expose **total count** and **applied limit** (or `total_pages` directly). List request uses `page_no=${currentPage}&limit=${itemsPerPage}`.

### Effects

- **Reset to page 1** when date filters or `itemsPerPage` change: `useEffect(() => { setCurrentPage(1); }, [fromDate, toDate, itemsPerPage]);`
- **Refetch** when `currentPage`, `itemsPerPage`, filters, or parent id (e.g. `clientProfile?.id`) change.

### Handlers

```js
const handlePageChange = (newPage) => {
  const page = Math.max(1, Math.min(totalPages, Math.floor(newPage)));
  if (page >= 1 && page <= totalPages) {
    setCurrentPage(page);
    setPageJumpInput("");
  }
};

const handlePageJump = (e) => {
  e.preventDefault();
  const page = parseInt(pageJumpInput, 10);
  if (!isNaN(page)) {
    handlePageChange(page);
  }
};
```

Limit select: `onChange={(e) => setItemsPerPage(Number(e.target.value))}`. Prev/next: `handlePageChange(currentPage ± 1)` with `e.stopPropagation()` on click if inside a clickable wrapper.

### Visibility (ledger)

```jsx
{!loading && !fetchingTransactions && (transactions.length > 0 || totalItems > 0) && totalPages > 0 && (
  /* footer */
)}
```

### “Showing X to Y”

- `start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1`
- `end = Math.min(currentPage * itemsPerPage, totalItems)`

### Layout / Tailwind (summary)

- Container: `border-t border-slate-200 px-6 py-4 bg-white`
- Flex: `flex flex-col sm:flex-row items-center justify-between gap-4`
- Left: range (`text-sm text-slate-600`) + “Show” + `<select id="limit-select">` (`border-slate-200`, `focus:ring-2 focus:ring-indigo-500`) + “per page”
- Right: Prev/Next buttons (bordered slate, disabled styles); current page `bg-indigo-600 text-white rounded-lg min-w-[2.5rem]`; `/` + total pages; `<form onSubmit={handlePageJump}>` with number input (`min={1}` `max={totalPages}` `w-14`) and indigo text “Go” button

### Checklist for a new page

1. Mirror state + `LIMIT_OPTIONS` (or your limits).
2. Parse list response meta → `totalItems` / `totalPages`.
3. Query `page_no` + `limit` from `currentPage` / `itemsPerPage`.
4. Reset page to `1` when limit or major filters change.
5. Reuse footer JSX pattern; swap loading/row guards and accent color if needed.
