# Header notifications — Client context

> **Purpose:** Tag when changing the navbar bell / notification panel. Pair with [`SERVER/context/task-list.md`](../../SERVER/context/task-list.md) (`GET /task/notifications`).

---

## Mental model

```
Header bell (HeaderNotifications.jsx)
        ↓
GET /task/notifications?limit=20
        ↓
Tasks where ca_approval = complete
  AND status NOT IN (complete, cancel)
        ↓
Click row → /task/profile/:task_id/details
```

| File | Role |
|------|------|
| `src/components/HeaderNotifications.jsx` | Bell, badge count, panel list |
| `src/components/header.js` | Renders `<HeaderNotifications />` |

---

## Behaviour

- Badge shows only when `count > 0` (no always-on rose dot).
- Poll every **60s**; refresh again when the panel opens.
- Cancelled tasks (`status = cancel`) are excluded. Completed tasks are excluded.
- Empty state: “You're all caught up” / “No CA-approved open tasks right now.”

---

## Do not

- Put always-on decorative unread dots when count is 0
- Include `cancel` or `complete` task statuses in this feed
