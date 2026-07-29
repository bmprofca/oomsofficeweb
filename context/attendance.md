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
**Open from:** [`src/components/header.js`](../src/components/header.js) — profile dropdown item **Attendance** (no inline punch controls).

---

## Entry point

```jsx
<AttendanceModal
  isOpen={attendanceModalOpen}
  onClose={() => setAttendanceModalOpen(false)}
  branchName={branchLabel}
  branchId={selectedCompany?.branch_id || localStorage.getItem('branch_id') || ''}
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

| State | Actions |
|-------|---------|
| `not_punched` | Punch In |
| `punched_in` | Start Break · Punch Out |
| `on_break` | End Break |
| `punched_out` | Close |

### Swipe to confirm

1. Tap an action → footer shows **Cancel** (left) + **SwipeToConfirm** track (right).
2. Drag circular thumb to ~90% → runs the POST.
3. Success → toast + **close modal**.
4. Failure → toast + swipe resets (nonce remount) so user can retry.
5. Themes: emerald (punch in), rose (punch out), amber (break).

---

## API usage

| Call | When |
|------|------|
| `GET /attendance/today-status` | Modal open + refresh |
| `POST /attendance/punch-in` | Confirm punch in |
| `POST /attendance/punch-out` | Confirm punch out |
| `POST /attendance/break/start` | Confirm start break |
| `POST /attendance/break/end` | Confirm end break |

Body for POSTs: `{ method: 'manual' }`.

Expect `data.breaks[]` on status/action responses for the timeline list.
