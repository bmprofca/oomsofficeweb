# Task list display — Client context

> **Purpose:** Tag when changing status/fees cells on task tables (list, OD/D7 detailed, client/staff/CA/agent profile tabs). Pair with [`SERVER/context/task-list.md`](../../SERVER/context/task-list.md).

---

## Features covered

1. **Complete date under status** — when `status === 'complete'`, show formatted `complete_date` below the status pill.
2. **Compliance period under fees** — for compliance tasks, show period label below fees.

---

## Shared helpers

| Helper | Path |
|--------|------|
| Complete date resolve | `src/utils/taskCompleteDate.js` → `getTaskCompleteDateValue`, `isTaskCompleteStatus` |
| Compliance period label | `src/utils/taskCompliancePeriod.js` → `getTaskCompliancePeriodLabel` |

Resolve complete date from (in order): `dates.complete_date`, `complete_date`, `task_details.complete_date`.

---

## Surfaces

| Surface | File |
|---------|------|
| Task list (+ cards) | `src/pages/task-display.jsx`, `src/TaskComponent/TaskCards.js` |
| OD / D7 / detailed | `src/DashboardComponents/TaskDetailedPage.js` |
| Client / CA / Agent profile tabs | `src/ClientComponents/TaskTab.js` (CA/Agent re-export) |
| Staff profile tab | `src/staff/StaffTaskTab.js` (table + list + grid) |

---

## UI pattern (status cell)

```
[ Status pill ]
[ Complete date ]   ← only if complete + date present (muted xs text)
[ Get-in / Get-out badge ]  ← existing
```

List UI cache key: `taskListViewState_v2` (bumped when list payload shape changed).

---

## Do not

- Show complete date for non-complete statuses
- Invent a second date formatter — use each page’s existing `formatDate`
- Drop compliance period when fees column is hidden without checking inject logic in `task-display`
