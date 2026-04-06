# OOMS v4 Client — Project Context

## Project Overview

**Name:** OOMS (Office Operations Management System) v4 — Client Frontend  
**Type:** React single-page application (SPA)  
**Purpose:** Business management platform for CA / accounting / tax firms. Manages tasks, billing, clients, staff, ledger, finance vouchers, attendance, and more.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React (functional components + hooks) |
| Styling | Tailwind CSS |
| Animations | Framer Motion (`motion`, `AnimatePresence`) |
| Icons | `react-icons` (fi, pi, tb, md, hi, bs, fa6, ai) |
| HTTP | Native `fetch` with `AbortController` for cancellation |
| Auth | localStorage tokens passed as request headers |

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
│   └── settings.js             # Settings
│
├── components/                 # Shared/reusable components
│   ├── header.js               # Header + Sidebar navigation
│   ├── payment-send.js         # Payment send modal
│   ├── payment-received.js     # Payment received modal
│   ├── email-selection.js      # Email picker modal
│   ├── mobile-selection.js     # WhatsApp/mobile picker modal
│   ├── DateRangePicker.js      # Custom date range picker
│   ├── DateFilter.js           # Date filter component
│   ├── DatePickerComponent.js  # Single date picker
│   ├── delete-confirmation.js  # Delete confirm modal
│   ├── menus.js                # Menu definitions
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
    ├── api-controller.js       # API base URL: https://api.ooms.in/api/v1
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
https://api.ooms.in/api/v1
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
        if (e.name === 'AbortError') return;
    } finally {
        if (seq === seqRef.current) setLoading(false);
    }
}, [deps]);
```

### Sidebar minimized state
Persisted in `localStorage` key `sidebarMinimized`. All pages read this to apply `lg:pl-20` (minimized) or `lg:pl-72` (expanded) left padding.

### SkeletonPulse component
Used for loading placeholders:
```jsx
const SkeletonPulse = ({ className = '' }) => (
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
- **Pagination**: Always visible, with limit selector; changing limit resets to page 1
