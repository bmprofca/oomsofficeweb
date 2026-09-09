# Staff list & staff view — Client context

> **Purpose:** Tag when changing `/settings/staff-list`, `/staff/view`, add-staff invite, or staff status OTP. Pair with [`SERVER/context/staff.md`](../../SERVER/context/staff.md). Row ⋮: [`action-button.md`](./action-button.md). Modals: [`modal.md`](./modal.md). Pagination: [`tables.md`](./tables.md). Shell: [`layout.md`](./layout.md). Salary/payslip on the profile: [`salary.md`](./salary.md).

---

## Mental model

```
/settings/staff-list  →  settings StaffList (permissions + status toggle)
/staff/view           →  ViewStaff (invitation, balance, profile/ledger)
        ↓
POST /settings/staff/check-user  (email or mobile)
POST /settings/staff/create
        ↓
Status: ConfirmActionModal → send OTP → StaffStatusOtpModal
```

| Page / piece | File |
|--------------|------|
| Settings staff list | `src/pages/settings/staff-list.jsx` |
| Staff view | `src/pages/staff-display.jsx` |
| Staff profile | `src/pages/staff-profile.jsx` |
| Add / invite modal | `src/components/Modals/AddStaffModal.jsx` |
| Status OTP modal | `src/components/Modals/StaffStatusOtpModal.jsx` |
| Confirm (activate/deactivate) | `src/components/ConfirmActionModal.jsx` |
| Row ⋮ menu | `src/pages/broadcast/email/EmailActionMenu.jsx` |
| Pagination | `src/components/TablePagination.js` |
| Shared dialog | `src/components/common/Modal.jsx` |

Lazy routes: `StaffList`, `ViewStaff`, `ViewStaffProfile` in `src/app/lazyRoutes.js`.

---

## Shared add-staff modal

`AddStaffModal` is self-contained (owns check-user + create). Used on **both** staff-list and staff/view. Do not duplicate a local find-user modal.

- **Step 1 — Find:** Email / Mobile tabs. Email payload `{ email }`. Mobile: `+91` prefix, 10 digits, payload `{ mobile }`.
- **Step 2 — Designate:** shows found user, `CustomSelect` designation, `POST /settings/staff/create` `{ username, designation }`.
- Fade-only open/close (`duration: 0.18`). Portal to `document.body`.
- While APIs run, **skeleton** in the body matching the real layout (not a spinner). Footer buttons also skeleton while busy.

---

## Status change (OTP)

Do **not** send OTP on toggle click.

1. Confirm modal (`ConfirmActionModal`): Activate = `tone="primary"`, Deactivate = `tone="warning"`, icon `FiPower`.
2. On confirm: `POST /settings/staff/change-status/send-otp` `{ username, status: 'active'|'deactive' }`.
3. OTP modal (`StaffStatusOtpModal`): 6-digit OTP → `PUT /settings/staff/change-status` `{ username, status, otp }`.

OTP goes to the **session admin’s** registered mobile (login SMS channel), not the staff’s. Skeleton in the OTP body while sending.

Resend OTP calls send-otp again (no second confirm).

---

## Settings staff list (`/settings/staff-list`)

- Shell: [`layout.md`](./layout.md) (`md:pl-[260px]` / `md:pl-20`).
- Columns: checkbox, Staff (avatar + name + C/O + designation), Contact (phone + mail icons), Permission chips, **Invitation** (Accepted / Pending), Status toggle, Actions.
- Staff name: indigo, **no underline** on hover; navigates to `/staff/view/profile/:username/profile`.
- Invitation badges match `/staff/view` (green Accepted / amber Pending).
- Status toggle opens the confirm → OTP flow (toggle does not flip until OTP succeeds).
- Row ⋮ (`EmailActionMenu`, no tooltip): View Profile, Change Permission.
- Filters: search (debounced) + permission role + active/inactive on one row.
- Pagination: `TablePagination`, current default **10** rows.
- Change-permission modal: shared `Modal` (fade). Body skeleton while `GET /settings/permissions/user-permissions` loads (role card, grant-all, accordion rows — not a spinner).
- Checkboxes: `AnimatedCheckbox`, centered in header and rows.

---

## Staff view (`/staff/view`)

- Same add-staff + status OTP flow as the settings list.
- Columns: #, Staff (avatar + name), Contact, Invitation, Status, Balance, Actions.
- Profile image from list API `profile.image`; initials fallback (`StaffAvatar`).
- Pending staff: name is not a profile link; mobile hidden; balance `N/A`; ⋮ is Resend Invitation + Set Active/Deactive.
- Accepted staff ⋮: View Profile, Ledger, Set Active/Deactive.
- Pagination: `TablePagination`, default **20** rows (`defaultRows={20}`).
- Do not use a custom in-table dropdown / `createPortal` menu — use `EmailActionMenu`.
- Do not wrap the page in `max-w-7xl`.

---

## Do not

- Invite by email only — mobile lookup must stay in the modal **and** `POST /check-user`.
- Send status OTP before the confirmation modal.
- Put `hover:underline` on staff names.
- Show a spinner in add-staff / permission / OTP bodies while the API is in flight — use layout-matching skeletons.
- Add hover tooltips on ⋮ (`aria-label="Actions"` only).
- Restart **SERVER** after `staff.js` / OTP / check-user changes (`node server.js` is not nodemon).
