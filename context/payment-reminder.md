# Client payment reminder — Client context

> **Purpose:** Tag when wiring payment reminders from client list, debtors list, or client profile. Pair with [`SERVER/context/payment-reminder.md`](../../SERVER/context/payment-reminder.md).

---

## Mental model

```
Eligible clients (balance > 0)
        ↓
ClientPaymentReminderModal  →  channels (WhatsApp / Email / SMS)
        ↓
POST /client/payment-reminder  { usernames[] | is_all: true, channels }
```

**Modal:** `src/components/Modals/ClientPaymentReminderModal.jsx`

---

## When to show the reminder control

Only if **`Number(balance) > 0`** (debit / receivable). Never for zero or credit balances.

---

## Call sites

| Surface | File | Pattern |
|---------|------|---------|
| Client list (table / cards / floating bar) | `src/pages/client-view.jsx` | Single client or bulk (`usernames` / `is_all`) |
| Debtors list | `src/DashboardComponents/quick-stats-details.js` | Same modal; creditors do not get reminder |
| Client profile header | `src/pages/client-profile.jsx` | Bell next to balance when `> 0` |

### Modal props

```jsx
<ClientPaymentReminderModal
  isOpen={…}
  onClose={…}
  onSuccess={…}           // optional refresh / clear selection
  clients={[{ username, name, balance, email, mobile, country_code }]}
  isAll={false}           // true → body { is_all: true } (server loads all branch debtors)
/>
```

Supports either `clients` array or legacy single `client` prop.

---

## UI conventions

- Bell button: violet → fuchsia gradient, same as client list / debtors.
- Bulk bar on client list: Payment Reminder only (Send Message / Export removed from selection bar).
- Debtors: select-all-page + “Select all X across pages” banner before bulk reminder.

---

## Do not

- Open reminder for `balance <= 0`
- Re-add old inline / confirm email-only reminder modals on client list or debtors
