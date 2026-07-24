# Group firms page — Client context

> **Purpose:** Tag when changing the group firms list UI, reminders, or not-found handling. Pair with [`SERVER/context/group-firms.md`](../../SERVER/context/group-firms.md) and [`payment-reminder.md`](./payment-reminder.md).

---

## Mental model

```
Route: /staff/office-assistance/group-firms/:groupId
        ↓
GET /group/details/:groupId     → 404 → error UI
        ↓
GET /group/group-firms/list     → table (balance, last payment, actions)
```

**Page:** `src/pages/office-assistance/group-firms.jsx`

---

## Load order

1. `fetchGroupDetails()` — if fail/404, set `groupError` and **stop** (do not show empty “Group Firms” table as success).
2. On success, `fetchGroupFirms({ search, page, limit })`.
3. Refresh re-runs details first, then list.

### Error UI

- Title: “Group not found”
- Message: group missing for **selected branch**
- Show `groupId`, **Back to groups**, **Try again**

---

## Table columns

| Column | Notes |
|--------|--------|
| Firm / Client / Contact | Client name links to profile |
| Balance | Ledger link; green/red; blur if no `task_fees_view` |
| Reminder bell | Only if `balance > 0` — opens `ClientPaymentReminderModal` |
| Last Payment Received | Date + period from `client.last_payment` |
| Action | View / Delete |

---

## Selection + bulk actions

When `selectedCount > 0`:

| Button | Behavior |
|--------|----------|
| **Reminder** | Page selection: unique selected clients with `balance > 0`. Select-all-across-pages: `GET /group/group-firms/debtor-clients` then modal. Never `isAll: true` (that is branch-wide). |
| **Delete** | Existing bulk delete modal (`is_all` + search supported server-side) |

Also: Bulk Import, Add Firms.

---

## Modal

```jsx
<ClientPaymentReminderModal
  isOpen={…}
  onClose={…}
  clients={[…]}   // always explicit usernames for this group
  isAll={false}
/>
```

---

## Do not

- Treat list 404 / missing group as an empty firm list
- Use payment-reminder `is_all` for group-wide sends
- Show reminder when `balance <= 0`
