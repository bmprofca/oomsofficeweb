# Auth and API

## Base URL

- `https://api.ooms.in/api/v1`

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

