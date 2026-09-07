# Password groups — Client context

> **Purpose:** Tag when changing password-group list UI, firm credentials, add/edit/delete modals, or selection. Pair with [`SERVER/context/password-groups.md`](../../SERVER/context/password-groups.md). Selection UX: [`checkbox.md`](./checkbox.md). Row ⋮ menu: [`action-button.md`](./action-button.md). Modals: [`modal.md`](./modal.md).

---

## Mental model

```
Route: /staff/office-assistance/password-groups
        ↓
GET /assistance/password-group/list
        ↓
Route: /staff/office-assistance/password-group/:group_id/firms
        ↓
GET /assistance/password-group/list-firm-credentials/:group_id
```

| Page | File |
|------|------|
| Groups list | `src/pages/office-assistance/password-group.jsx` |
| Firm credentials | `src/pages/office-assistance/PasswordGroupFirms.jsx` |
| Add credentials modal | `src/components/Modals/PasswordGroupAddCredentialsModal.jsx` |
| API helper | `src/services/passwordGroupService.js` |

Client profile **Password** tab (`src/ClientComponents/PasswordTab.js`) uses the same credential APIs.

---

## Firm search (do not use `/firm/search`)

Add-credentials firm picker uses **`GET /firm/list`** via `searchFirmSelectOptions` (`complianceService.js`).  
`/firm/search` does not exist (404).

Group import uses:

| Action | API |
|--------|-----|
| Pick office group | `GET /group/list` (`search`, `page`, `limit`) — options include `firm_count` |
| Load all firms in group | `GET /group/group-firms/list?group_id=&page=&limit=` (page until last; map `row.firm`) |

---

## Add credentials modal

- Large panel (`max-w-6xl`), portal, fade + light scale.
- **Fixed** title + firm picker (search / import-from-group). **Scroll** only the credential cards.
- Cards in a 1 / 2 / 3 column grid. User types username + password per card, then save.
- Duplicate `firm_id` is skipped. Save loops `POST /assistance/password-group/create-firm-credentials` (one request per card). Partial fail keeps only failed cards.

---

## Credentials table

- `AnimatedCheckbox` in a `w-12` column (not pill toggles).
- Header checkbox: checked / indeterminate from current page.
- Banner when the page is fully selected and `pagination.total > pageLength`: **Select all N credentials** (`selectAllAcrossPages`), same pattern as Client View.
- Bulk delete:
  - Page / manual IDs → `credential_ids[]`
  - Cross-page → `select_all: true`, `group_id`, current `search`
- Selection is a `Set`. Clear on search / `group_id` change, not on page change.
- Status column: Active when API `status` is `true` / `1` / `"1"` / `"true"` / `"active"`.

### Edit status

Edit modal uses `AnimatedCheckbox` (Active / Inactive).  
**Send `'1'` / `'0'`** — do not send a boolean. The list treats only `'1'`-like values as active.

---

## Row actions

Portal + `computeActionMenuPosition` (top → bottom → right → left), `z-[99999]`, fade/scale, `height: auto`.  
No hover tooltip on ⋮ (`aria-label="Actions"` only).  
Items: View, Edit, Copy, Delete. Close on outside click, scroll, resize, Escape.

---

## Do not

- Call `/firm/search`
- Send edit `status` as `true` / `false`
- Filter selected IDs down to the current page (breaks cross-page select-all)
- Put a `ViewportTooltip` on the ⋮ button
