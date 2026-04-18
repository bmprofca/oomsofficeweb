# Task Components Context

## Covered modules

- `TaskComponent/NotesTab.js`
- `TaskComponent/SubTaskTab.js`
- `TaskComponent/StaffTab.js`
- `TaskComponent/DetailsTab.js`

## Shared expectations

- `getHeaders()` auth pattern
- Toast-based user feedback
- Modal header/footer fixed where long forms exist
- Avoid native alert/confirm for API outcomes

## Important behavior highlights

- Notes: typed notes + voice + file
- Subtasks: separate status update endpoint
- Staff: assign/unassign with bulk actions
- Details: status transitions + billing actions + conditional field locking

