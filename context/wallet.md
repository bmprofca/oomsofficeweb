# Wallet recharge & payment request — Client context

> **Purpose:** Tag when changing wallet UI, gateway recharge, or manual payment requests. Pair with Admin [`wallet-payments.md`](../../ADMIN/context/wallet-payments.md) and SERVER wallet/razorpay routes.

---

## Mental model

```
Header wallet balance → /wallet-recharge
        ↓
Gateway pay (Razorpay + platform fee under balance)
OR
/wallet/payment-request (manual bank transfer, no fee)
```

| File | Role |
|------|------|
| `src/pages/WalletRecharge.jsx` | Balance, fee display, Razorpay checkout, txn table |
| `src/pages/WalletPaymentRequest.jsx` | Multi-bank request form + history table |
| `src/components/header.js` | Wallet balance chip |

---

## Behaviour highlights

- Payment-request page is **separate** from recharge (full-width shell per [`layout.md`](./layout.md)).
- CustomSelect / PortalDatePicker + custom validation (`noValidate`) on request form.
- Human-readable dates via `en-IN` locale helpers on the payment-request table.

---

## Do not

- Apply gateway fee to payment-request credits
- Use `w-full` + horizontal `mx-*` together in a way that causes page horizontal scroll
