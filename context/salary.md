# Staff salary & payslip (client)

## Salary tab

- UI: `CLIENT/src/staff/SalaryTab.js`
- Profile: `staff-profile.jsx` tab `salary` → `username` prop

### Behaviour

- Assign **fixed** / **flexible** via `SalaryAssignmentModal` (create / edit / view / delete).
- Fixed: expected + grace, OT/fine, day offs, break. Flexible: monthly minutes (shift × 30, editable), break only.
- All assignment fields editable; soft-delete supported.

## Bonus / Fine tab

- UI: `CLIENT/src/staff/BonusFineTab.js`
- Modal: `CLIENT/src/components/Modals/BonusFineModal.jsx`
- Profile: tab `bonus-fine`

### Behaviour

- Create / edit / delete **bonus** or **fine** for a specific salary month (`month` + `year`).
- Remark is free-text (required).
- Multiple entries per month allowed.
- On payslip preview/generate/PDF: month bonuses add to **earnings**, month fines subtract in **deductions**.
- Payable = attendance net + bonuses − fines.

### API

- `GET /salary/bonus-fine/list?username=&type?=`
- `POST /salary/bonus-fine/create` `{ username, type, month, year, amount, remark }`
- `POST /salary/bonus-fine/update` `{ entry_id, type?, month?, year?, amount?, remark? }`
- `POST /salary/bonus-fine/delete` `{ entry_id }`

Table: `staff_bonus_fine` (`20260803_staff_bonus_fine.sql`).

## Payslip tab

- UI: `CLIENT/src/staff/StaffPayslip.js`
- Profile: tab `payslip`
- Preview modal: `CLIENT/src/components/Modals/PayslipPreviewModal.jsx`

### Behaviour

- Pick month (`PortalMonthPicker`) → **Preview & generate** opens modal with attendance summary, bonus/fine, and payable amount → confirm posts to ledger.
- Generate credits staff ledger via reserved expense **Salary** (`is_reserved = 1`), same pattern as Discount.
- Table lists **all years**, `ORDER BY year DESC, month DESC`, with client pagination (no year filter).
- **Regenerate** appears on a row only when posted `amount` ≠ current payable (`payable_amount` from attendance + bonus − fine). Confirm in modal updates the existing invoice/transaction/expense/payslip.
- **Download** appears when regenerate is not needed (amounts match). Streams a PDF via `GET /salary/payslip/download?payslip_id=`.
- Transaction date = month end, or today if month end is in the future.
- Compact denser layout aligned with `layout.md` / `typography.md` table baselines.

### API

- `GET /salary/payslip/list?username=` (optional `year=`; returns `payable_amount`, `needs_regenerate`)
- `POST /salary/payslip/preview` `{ username, month, year }`
- `POST /salary/payslip/generate` `{ username, month, year }`
- `GET /salary/payslip/download?payslip_id=` → PDF blob

Requires subscription feature `salary-management`.

