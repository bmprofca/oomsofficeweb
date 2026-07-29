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

## Firm groups from client profile

Client **Firms** tab (`src/ClientComponents/FirmsTab.js`) can add/remove firms on groups without leaving the profile.

| Action | API |
|--------|-----|
| List memberships | Included on `GET /client/details/firms/list?username=&search=` → each firm has `groups: [{ group_id, group_name, is_active }]`. Firms tab loads all statuses. |
| Branch groups picker | `GET /group/list?page=1&limit=200` (active only) |
| Sync firm groups | `POST /group/group-firms/set-firm-groups` `{ firm_id, group_ids: [group_id, …] }` — adds missing + soft-deletes removed |
| Add | `POST /group/group-firms/add-firms` `{ group_id, firm_ids: [firm_id] }` |
| Remove | `DELETE /group/group-firms/remove` `{ group_id, firm_ids: [firm_id] }` |
| Create with groups | `POST …/firms/create` body may include `groups: [group_id, …]` |
| Edit firm | `POST …/firms/edit` updates firm fields only — does not accept/modify groups |

**UI:** group chips on each firm (chip ✕ removes), violet **Manage groups** modal (`FirmGroupsManageModal.jsx`) with TaskCreate-style dual list (available ↔ assigned), and multi-select on **Add firm** only (not Edit).

**Do not** send `groups` on firm edit — use Manage groups / `set-firm-groups` instead.

---

## Do not

- Treat list 404 / missing group as an empty firm list
- Use payment-reminder `is_all` for group-wide sends
- Show reminder when `balance <= 0`
