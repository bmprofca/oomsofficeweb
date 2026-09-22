# Help & Support — Client context

> **Purpose:** Tag when changing the Help & Support page, sidebar entry, or contact/FAQ display. Pair with [`SERVER/context/help-support.md`](../../SERVER/context/help-support.md) and [`ADMIN/context/help-support.md`](../../ADMIN/context/help-support.md).

> **Layout shell:** Follow [`layout.md`](./layout.md) for sidebar inset and always pass `setIsMinimized` to `Header`.

---

## Mental model

```
Sidebar → /help-support
        ↓
GET /help-support  (auth)
        ↓
Contact cards (admin-managed) + FAQ accordion (active only)
```

| File | Role |
|------|------|
| `src/pages/HelpSupport.jsx` | Page UI |
| `src/app/lazyRoutes.js` | `HelpSupport` lazy export |
| `src/components/header.js` | Sidebar item **below Subscription** (`/help-support`) |
| `src/data/softwareModules.js` | Global search catalog entry |
| `src/app/DocumentTitle.js` | Title map |

**Route:** `/help-support` (ProtectedRoute; branch-optional like subscription/profile; **not** gated by core subscription).

---

## Behaviour

- **Intro text** comes from contact config (`intro_text`); fallback copy if empty.
- Contact cards: email, phone, WhatsApp, hours, address, website (omit empty).
- FAQs: accordion under contacts; only **active** FAQs from API.
- If platform config status is inactive / not configured → amber empty notice for contacts; FAQs may still show.

---

## Do not

- Hardcode support email/phone/WhatsApp in the client
- Put Help & Support back in the navbar profile menu (it lives in the **sidebar** only)
- Require a paid “core” subscription to open this page
