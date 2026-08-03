# Attendance — Client context

> Tag when changing the attendance modal, header entry point, swipe-to-confirm, or today-status UX.  
> Pair with [`SERVER/context/attendance.md`](../../SERVER/context/attendance.md). Modal shell rules: [`modal.md`](./modal.md).

---

## Mental model

```
Header profile menu → Attendance
        ↓
AttendanceModal  →  GET /attendance/today-status
        ↓
Punch / break action → swipe confirm → POST /attendance/…
        ↓
toast + close modal
```

**Modal:** [`src/components/Modals/AttendanceModal.jsx`](../src/components/Modals/AttendanceModal.jsx)  
**Open from:** [`src/components/header.js`](../src/components/header.js) — profile dropdown item **Attendance**, only for non-admin branch role (`resolveBranchRole(...) !== 'admin'` / `branch_role !== 'admin'`). Branch owners (`owned` → role `admin`) do not see it.

---

## Entry point

```jsx
<AttendanceModal
  isOpen={attendanceModalOpen}
  onClose={() => setAttendanceModalOpen(false)}
  branchName={branchLabel}
  branchId={
    selectedCompany?.branch_id || localStorage.getItem("branch_id") || ""
  }
/>
```

- Branch name + id shown in the modal header so staff see which branch the punch applies to.
- Uses `getHeaders()` (includes `branch_id` + `username`).

---

## Modal UX (phase 1)

Follows [`modal.md`](./modal.md):

- Fixed header/footer, scrollable body, hidden scrollbar
- Fade-only open/close (no scale/translate)
- **Does not** close on backdrop click — close via **X** or **ESC** only
- ESC while swipe-confirm pending cancels confirm first; another ESC closes modal

### Body

- Status badge + Work / Break duration totals
- Compact **timeline**: Punch in → breaks (or “No breaks”) → Punch out
- Minimal copy (no instructional hint paragraphs)

### Loading

- Layout-matched **skeleton** for body + footer while `today-status` loads or refresh runs

### Footer actions (by `state`)

| State                           | Actions                                             |
| ------------------------------- | --------------------------------------------------- |
| `not_punched`                   | Punch In                                            |
| `punched_in`                    | Start Break · Punch Out                             |
| `on_break`                      | End Break                                           |
| `punched_out` / `present`       | Close                                               |
| `absent` / `leave` / `half_day` | Close only — office-marked card (no punch timeline) |

Office-marked days (`office_marked` from `GET /attendance/today-status`, or states `absent` | `leave` | `half_day`) show a clear status card so staff can see today’s mark. Punch/break buttons are hidden.

### Swipe to confirm

1. Tap an action → footer shows **Cancel** (left) + **SwipeToConfirm** track (right).
2. Drag circular thumb to ~90% → runs the POST.
3. Success → toast + **close modal**.
4. Failure → toast + swipe resets (nonce remount) so user can retry.
5. Themes: emerald (punch in), rose (punch out), amber (break).

---

## API usage

| Call                           | When                 |
| ------------------------------ | -------------------- |
| `GET /attendance/today-status` | Modal open + refresh |
| `POST /attendance/punch-in`    | Confirm punch in     |
| `POST /attendance/punch-out`   | Confirm punch out    |
| `POST /attendance/break/start` | Confirm start break  |
| `POST /attendance/break/end`   | Confirm end break    |

Body for POSTs: `{ method: 'manual' }`.

## Manage page (day list)

**Route:** `/staff/attendance`  
**Page:** [`src/pages/staff-attendance.jsx`](../src/pages/staff-attendance.jsx)  
**Nav:** Staff Management → Attendance (`staff_view`)

```
Date range picker (default today; single or range) + search + TablePagination (default 100)
        ↓
GET /attendance/day-list?from_date=&to_date=&search=&page=&limit=
        ↓
Table: # + animated select · Date (when range) · staff · status · punch in/out (12h) · breaks (count + total) · approval · manage
        ↓
Select page → optional “Select all N records” (server-side) → Bulk approve → ConfirmActionModal
        ↓
FiClipboard → AttendanceMarkModal (Absent / Present / Half Day / Leave)
        ↓
POST /attendance/manage/mark  → always is_approved = 1
```

- Multi-select uses the same animated square checkboxes as Clients ([`client-view.jsx`](../src/pages/client-view.jsx) `AnimatedCheckbox`): indigo border/fill, check / indeterminate dash, scale tap. Master checkbox in table header; selected rows `bg-indigo-50/50`
- Punch in/out display uses **12-hour** time (`9:05 AM`)
- Date range: when `from_date !== to_date`, a **Date** column appears after `#`; each row is staff×day
- Breaks column shows count and total closed-break duration (`break_total_minutes`)
- **Bulk approve** appears when at least one row is selected; posts `{ items:[{username,date}] }` or `{ select_all:true, from_date, to_date, search }` when “Select all N” is chosen
- Backend approves only punch-in + punch-out complete rows; toast shows done / skipped counts
- Selection clears on date / search change; page-only selection clears on page/limit change unless select-all-across-pages is active
- No attendance row → status badge **Not Marked** (tooltip: treated as absent); counts in Absent summary
- Empty punch/break/approval cells stay blank (no em dash)
- Table uses zebra striping (overridden when selected); single-row mark updates show a row-only skeleton while refresh/date/search reloads show the full table skeleton
- Profile images resolve through the same media-proxy helper path as profile pages (`resolveProfileImageUrl`)
- Present shows in/out via [`Timepicker`](../src/components/Timepicker.js) (prefilled, centered picker with AM/PM)
- Prefill order for Present punch fields: existing punch in/out → else active salary shift start/end from `day-list.active_salary` → else empty
- Avatar uses `resolveProfileImageUrl` (same as the attendance table)
- When `active_salary.amount` exists, mark modal shows day wage: `amount ÷ daysInMonth` (calendar length of selected date’s month); Present = full day, Half day = half, Leave = full day, Absent = ₹0
- Present + `expected_minutes` (or derived hours): OT / fine fields show only when the staff salary has overtime / fine enabled. If salary has them off, OT/fine are not applicable (UI hidden; server ignores apply flags). Amount = (extra|less minutes) × (daily ÷ expected_minutes). Net wage updates live; saved flags go to `/manage/mark`
- **Grace** (`grace_period_minutes` on salary): variance within grace → no OT/fine toggle. Variance beyond grace → full extra/less minutes count (e.g. 8h expected, 15m grace: 8h15 = within grace; 8h16 = 16m OT). Same rule on the server.
- Bulk approve confirm offers Apply Overtime / Apply Fine checkboxes → `apply_overtime` / `apply_fine` on `/manage/bulk-approve`
- Present modal shows break records, per-break duration, punched-time restore chips, and a worked-time badge (`out - in`)
- Times are TIME-only (`HH:mm`), not timestamps
- Skeleton matches table columns while loading
- Username is not shown in the UI
- Personal punch modal remains profile-menu only for non-admin staff (see above)
