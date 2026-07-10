# Auth and API

## Base URL

- `https://server.ooms.in/api/v1`

## Header contract (via `getHeaders()`)

```js
{
  "Content-Type": "application/json",
  "username": localStorage.getItem("user_username"),
  "token": localStorage.getItem("user_token"),
  "branch": localStorage.getItem("branch_id")
}
```

## Notes

- If any auth field is missing, `getHeaders()` can return `null`.
- Upload endpoints commonly use `axios` + `FormData` and merge auth headers.

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
