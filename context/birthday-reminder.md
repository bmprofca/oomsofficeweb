# Birthday reminder — Client context

> **Purpose:** Tag when wiring birthday wishes from Today's Birthdays (quick stats). Pair with [`SERVER/context/birthday-reminder.md`](../../SERVER/context/birthday-reminder.md). Mirror UX from [`payment-reminder.md`](./payment-reminder.md).

---

## Mental model

```
Today's birthday clients
        ↓
ClientBirthdayReminderModal  →  channels (WhatsApp / Email / SMS)
        ↓
GET  /utils/notification-availability?type=birthday_reminder
POST /client/birthday-reminder  { usernames[] | is_all: true, channels }
```

**Modal:** `src/components/Modals/ClientBirthdayReminderModal.jsx`

---

## Call site

| Surface | File | Pattern |
|---------|------|---------|
| Today's Birthdays | `src/DashboardComponents/quick-stats-details.js` (`type=today-birthday`) | Row action menu + bulk bar |

### Modal props

```jsx
<ClientBirthdayReminderModal
  isOpen={…}
  onClose={…}
  onSuccess={…}           // clear selection after send
  clients={[{ username, name, email, mobile, country_code }]}
  isAll={false}           // true → all clients with birthday today
/>
```

Supports either `clients` array or legacy single `client` prop.

---

## UI conventions

- **Header:** title only (“Today's Birthdays”) — no subtitle, no Total badge.
- **Select-all:** page checkbox + “Select all X across pages” banner (same pattern as debtors).
- **Action column:** ⋮ menu → View Profile + Birthday Reminder.
- **Bulk:** rose “Birthday Reminder (N)” when selection &gt; 0.
- **Modal chrome:** rose/pink gradient (payment reminder uses purple).
- Availability: `GET /utils/notification-availability?type=birthday_reminder` — auto-select available channels.

---

## Username shape

Birthday list rows use `item.personal_details.username` (also accept top-level `username` when mapping payloads).

---

## Do not

- Use payment-reminder `is_all` / debit eligibility for birthdays
- Pass bare variable keys into WhatsApp (server handles; email/SMS still use bare + `{{…}}`)
- Re-introduce “Clients celebrating…” / Total count in the birthday page header
