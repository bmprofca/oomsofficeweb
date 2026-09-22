# Sessions & sign-out — Client context

> **Purpose:** Tag when changing the Sessions page, profile “Sessions” link, or navbar sign-out confirmation. Pair with [`SERVER/context/auth-sessions.md`](../../SERVER/context/auth-sessions.md).

> **Confirms:** Use shared [`ConfirmActionModal`](../src/components/ConfirmActionModal.jsx) (animated open/close). See [`modal.md`](./modal.md).

---

## Mental model

```
Profile menu
  ├─ My Profile → /my-profile
  ├─ Sessions   → /sessions
  └─ Sign out   → ConfirmActionModal (+ optional “all sessions”)
        ↓
GET /auth/sessions?status=&page_no=&limit=
POST /auth/sessions/:tokenId/revoke
POST /auth/sessions/revoke-others
POST /auth/logout  { all_sessions }
```

| File | Role |
|------|------|
| `src/pages/Sessions.jsx` | Table + tabs + pagination + revoke confirms |
| `src/components/header.js` | Profile items, Owner badge removed, logout modal |
| `src/components/ConfirmActionModal.jsx` | Shared confirm UI |
| `src/app/lazyRoutes.js` | `Sessions` lazy export |

**Route:** `/sessions` (ProtectedRoute; branch-optional).

---

## Profile dropdown

- **No Owner / role badge** under the name (name + mobile only; tight `mt-0.5` subtitle spacing).
- Items: **My Profile**, then **Sessions** (not Settings / Help).
- Sign out opens `ConfirmActionModal` with checkbox **Logout from all sessions** in `children`.

---

## Sessions page

| Tab | Meaning |
|-----|---------|
| Active (default) | `status = 1` **and** not past `expire_date` |
| Inactive | `status = 0` **or** expired |
| All | No status filter |

- **Table** + `TablePagination` (`page_no` / `limit`).
- Timestamps: human-readable via `toLocaleString('en-IN', …)` (not raw `YYYY-MM-DD HH:mm:ss`).
- Current row badge: **This device**.
- End one session / **End all other sessions** (header, after Refresh) → `ConfirmActionModal` (`tone="danger"`, `icon={FiLogOut}`).

---

## Do not

- Use a one-off plain portal modal for logout/session confirms — reuse `ConfirmActionModal`
- Show expired sessions under Active
- Allow revoking the current session from the table (use Sign out)
