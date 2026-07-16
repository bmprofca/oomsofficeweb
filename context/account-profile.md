# My Profile / Account — Client context

> **Purpose:** Tag when working on `myProfile.js`, profile forms, or contact-change OTP UX. Pair with [`SERVER/context/account-profile.md`](../../SERVER/context/account-profile.md).

> **Layout shell:** Follow [`layout.md`](./layout.md) for sidebar inset (`md:pl-[260px]` / `md:pl-20`) and always pass `setIsMinimized` to `Header`.

---

## Mental model

```
getAccountHeaders()  →  username + token only (NO branch)
        ↓
/account/profile  (+ OTP if email/mobile changed)
        ↓
UI shows profile fields only (no branch role / stats / password)
```

**Page:** `src/components/myProfile.js`  
**Route:** lazy `MyProfile` in `src/app/lazyRoutes.js`

---

## Headers

Use **`getAccountHeaders()`** (`src/utils/get-account-headers.js`) for all `/account/*` calls.

```js
{ username, token, "Content-Type": "application/json" }
```

Do **not** use `getHeaders()` for account profile (it requires `branch_id`).

Exception: `GET /utils/care-of-types` still needs **`getHeaders()`** (branch-validated utils route).

---

## Tabs (keep only these)

| Tab | Content |
|-----|---------|
| Personal | name, email, mobile, gender, DOB, PAN, care_of (select), guardian |
| Address | address lines, village/town, StateDistrictSelect, pincode, country |

**Removed / do not re-add:** Account tab, professional, documents, bank, social, preferences, fake stats, email/phone “verification badges”, password change, country_code input, branch role display.

---

## Field rules

1. **Country code** — never show; never send; never update. Mobile = 10 digits only.
2. **Care of** — `CustomSelect` options from `GET /utils/care-of-types` → `S/O`, `W/O`, `D/O`.
3. **Gender** — `CustomSelect` (`male` / `female` / `other`).
4. **DOB** — `DatePickerField` (`PortalDatePicker`).
5. **State / district** — `StateDistrictSelect`; map district into both `city` and `district` on save if that is the page pattern.
6. **Pincode** — plain input; **no** leading icon inside the field.
7. **Colors** — indigo accents (`bg-indigo-600`), not dark `bg-gray-900` primary actions/tabs.

---

## APIs

| Action | Method | Path | Headers |
|--------|--------|------|---------|
| Load | GET | `/account/profile` | account |
| Save | PUT | `/account/profile` | account |
| Photo | POST | `/account/profile/image` | account — `{ image: url }` after OneSaaS upload |
| Send OTP | POST | `/account/profile/contact/send-otp` | account — `{ field: "email"|"mobile"|"both" }` |
| Verify OTP | POST | `/account/profile/contact/verify-otp` | account — `{ field, otp }` |
| Care-of options | GET | `/utils/care-of-types` | **branch** `getHeaders()` |

### Save + OTP UX

1. User clicks Save.
2. If email and/or mobile changed vs loaded profile → open OTP modal; call `send-otp` with `field`.
3. User enters 6-digit code → optional `verify-otp`, then `PUT` with `contact_otp`.
4. If only non-contact fields changed → `PUT` directly (no OTP).
5. On success, refresh local form state; may sync `user_name` / `user_email` / `user_mobile` in `localStorage`.

Email change → OTP via **SMS to current mobile**.  
Mobile change → OTP via **email to current email**.  
Both → SMS to current mobile (`field: "both"`).

---

## Image upload

Same pattern as branch logo: `uploadOneSaasFileUrl(file)` → `POST /account/profile/image` with that URL.

---

## Checklist

- [ ] `getAccountHeaders` for `/account/*`
- [ ] No branch data in UI
- [ ] No country_code UI/payload
- [ ] OTP gate when email/mobile changes
- [ ] Care-of via CustomSelect + utils API
- [ ] Layout inset + `setIsMinimized` on Header ([`layout.md`](./layout.md))
- [ ] Indigo styling (not gray-900)
- [ ] Initial load uses profile-shaped **skeleton** (`animate-pulse`), not plain “Loading…” text

---

## Key files

| Path | Role |
|------|------|
| `src/components/myProfile.js` | Profile page |
| `src/utils/get-account-headers.js` | Branch-free auth headers |
| `src/utils/get-headers.js` | Branch headers (care-of types only here) |
| `src/components/CustomSelect.js` | Care-of / gender |
| `src/components/PortalDatePicker.js` | DOB |
| `src/components/state-district-select.js` | Address |

Server: [`SERVER/context/account-profile.md`](../../SERVER/context/account-profile.md)
