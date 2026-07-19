# Client profile page — Client context

> **Purpose:** Tag when working on `client-profile.jsx`, profile header balance, tab shell, or ledger wiring from the client profile. Pair with [`ledger-tab.md`](./ledger-tab.md), [`payment-reminder.md`](./payment-reminder.md), and [`SERVER/context/client-balance.md`](../../SERVER/context/client-balance.md).

> **Layout shell:** Follow [`layout.md`](./layout.md). This page is a **full-width** operational page (no shell `max-w-7xl`).

---

## Mental model

```
Route: /client/profile/:username/:tab
        ↓
GET /client/details/profile?username=…   → header (name, status, balance, guardian, DOB, phone, email)
        ↓
Tab content (Firms, Ledger, Task, …) — each tab loads its own APIs
```

**Page:** `src/pages/client-profile.jsx`  
**Routes:** `src/index.js` — `/client/profile/:username` and `/client/profile/:username/:tab`

---

## Shell / layout rules

1. Content inset: `pt-16` + `md:pl-20` / `md:pl-[260px]` (same as task-display).
2. Inner wrapper: `w-full px-2 sm:px-4 md:px-8 py-4 md:py-6` — **no** `max-w-7xl mx-auto`.
3. **No breadcrumb** above the profile summary (removed intentionally).
4. Pass `setIsMinimized` to both `Header` and `Sidebar`; persist `sidebarMinimized` + `tabsMinimized` in `localStorage`.

---

## Profile header

| Element | Source | Notes |
|---------|--------|-------|
| Name / Active badge | `clientData` from details API | |
| Balance | `apiData.transactional.balance` | INR (`₹`), keep minus for credit balances |
| Reminder bell | Shown when `balance > 0` and `task_fees_view` | Opens `ClientPaymentReminderModal` |
| Guardian | `guardian_type`/`care_of` + `guardian_name` | |
| DOB | Stored as `en-GB` (`dd/mm/yyyy`) after fetch | Use `formatDate` that **accepts already-formatted** `dd/mm/yyyy` — do not re-parse with `new Date("19/07/2026")` (Invalid Date) |
| Phone / Email | basic fields | |

### Refresh after ledger transactions

```jsx
<LedgerTab
  clientUsername={username}
  clientName={clientData.name}
  onProfileRefresh={() => fetchClientData(username, { silent: true })}
/>
```

`fetchClientData(username, { silent: true })` skips the full-page loading skeleton so only the header balance updates.

---

## Loading skeleton

While `loading === true`, render **`ClientProfilePageSkeleton`** (same file) — not a spinner.

Mirrors exact layout:

1. Summary card (avatar, name, balance, 4 info tiles)
2. Tabs bar (compact or expanded from `tabsMinimized`)
3. Basic-details-style content cards

`BasicDetailsTab` also has its own field-grid skeleton when `loading` is passed in (used if that tab mounts while loading).

---

## Tabs

Static `profileTabs` in the page (Basic Details, Firms, Password, Quotation, Task, Billing, Ledger, Notes, Compliance, Documents, Chatting, Automation).

- Ledger tab icon: **`InrIcon`** (`₹`), not `FiDollarSign`.
- Compact vs expanded toggle persists as `tabsMinimized`.

---

## Currency

- Profile header and ledger amounts use **₹** / `en-IN` formatting.
- Shared helpers: `formatLedgerCurrency` / `formatLedgerCurrencyPlain` in `src/components/TransactionTable.js`.
- Pass **plain** formatter into CreateTransactions modals (they already prefix `₹`).

---

## Do not reintroduce

- Breadcrumb (`Clients › name › tab`)
- Shell-level `max-w-7xl mx-auto`
- Dead API `GET /client/profile/:username` (404; removed from LedgerTab)
- Dollar icons for Ledger tab / cash payment mode in ledger UI

---

## Related files

| Area | Path |
|------|------|
| Page | `src/pages/client-profile.jsx` |
| Ledger | `src/ClientComponents/LedgerTab.js` |
| Reminder modal | `src/components/Modals/ClientPaymentReminderModal.jsx` |
| Firms shared modal | `src/components/Modals/FirmsDetailsModal.jsx` |
| Currency / table | `src/components/TransactionTable.js` |
