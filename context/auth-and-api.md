# Auth and API

## Base URL

- `https://server.ooms.in/api/v1` (via `API_BASE_URL` / `src/utils/api-controller.js`)

## Header contract — branch-scoped (`getHeaders()`)

Most app APIs require branch context:

```js
{
  "Content-Type": "application/json",
  "username": localStorage.getItem("user_username"),
  "token": localStorage.getItem("user_token"),
  "branch": localStorage.getItem("branch_id")
}
```

File: `src/utils/get-headers.js`

- If any of username / token / **branch_id** is missing, returns `null`.
- Upload endpoints commonly use `axios` + `FormData` and merge auth headers (`getHeaders(true)` omits Content-Type).

## Header contract — account / profile (`getAccountHeaders()`)

Logged-in **user profile** APIs under `/account/*` are **not** branch-scoped:

```js
{
  "Content-Type": "application/json",
  "username": localStorage.getItem("user_username"),
  "token": localStorage.getItem("user_token")
}
```

File: `src/utils/get-account-headers.js`

- Do **not** send `branch` for `/account/profile`, contact OTP, or profile image.
- See [`account-profile.md`](./account-profile.md).

## Login note

Software users authenticate with **OTP** (see `SERVER/routes/auth.js`). There is no branch-ops “change password” on My Profile.

## Finance register endpoints (common)

| Screen | Method | Path |
|--------|--------|------|
| Received list | GET | `/transaction/report/receive` |
| Bank list | GET | `/transaction/bank/list` |
| Discount list | GET | `/expense/discount/list` |
| Discount create | POST | `/expense/discount/create` |
| Discount edit | PUT | `/expense/discount/edit` |
| Discount details | GET | `/expense/discount/details?discount_id=` |

See `finance-registers.md` (frontend) and `SERVER/docs/finance-registers.md` for full contracts.

## Related context

| Topic | File |
|-------|------|
| My Profile /account | [`account-profile.md`](./account-profile.md) |
| Branch Settings | [`settings-branch.md`](./settings-branch.md) |
| GST | [`gst-change.md`](./gst-change.md) |
| Page shell width | [`layout.md`](./layout.md) |
