# Branch Email: SMTP, Campaign Templates, and Static Notifications

Email is entirely branch-owned. The company does not provide a template picker for notification types.

## Two independent template systems

| System | Table | Use |
|--------|--------|-----|
| **Email Templates** | `email_templates` | User-created templates for campaigns / broadcasts only |
| **Static Templates** | `email_static_templates` | Exactly seven predefined notification types |

There is no mapping table and no link between the two.

### Static types (fixed)

Payment Reminder, Task Create, Payment, Payment Receive, Task Complete, Document Share, Birthday Wish

The branch customizes subject/body and **activates** a type. When a notification is sent and email is selected on the send modal, the active static template of that type is used.

## SMTP

A branch can add multiple SMTP configs. **Only one can be active.** Activating one deactivates the others. All sending (broadcasts and notifications) uses the active config.

---

# Email Template Management System Documentation

## Technology Stack

### Frontend Framework
- **React 19.2.5** - Core UI library
- **React DOM 19.2.5** - DOM rendering

### Styling
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **CSS3** - Custom styles for rich text editor

### Rich Text Editor
- **@tiptap/react v3** - Headless, customizable WYSIWYG editor (React 19 compatible)
- **@tiptap/starter-kit v3** - Essential extensions (bold, italic, lists, headings)
- **@tiptap/extension-placeholder v3** - Placeholder text support
- **@tiptap/extension-link v3** - Hyperlink functionality
- **@tiptap/extension-image v3** - Image embedding support

### HTTP Client
- **Axios v1.7** - Promise-based HTTP requests with interceptors

### Notifications
- **react-hot-toast v2.4** - Toast notifications for user feedback

### Build Tools
- **Webpack** - Module bundler
- **Babel** - JavaScript compiler

### Development Environment
- **Node.js** - JavaScript runtime
- **npm** - Package manager

---

## API Endpoints Used

### Static Templates API (Backend Endpoints)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/broadcast/email/static-template/catalog` | Ensure and return the 7-type catalog (active + inactive) |
| GET | `/broadcast/email/static-template/active-list` | Same as catalog (compat) |
| PUT | `/broadcast/email/static-template/update` | Customize subject/body/status of a catalog type |
| GET | `/broadcast/email/static-template/details/:template_id` | Get single template by ID |
| GET | `/broadcast/email/static-template/by-type/:template_type` | Get the catalog row for a type |
| PUT | `/broadcast/email/static-template/change-status` | Activate or deactivate a notification type |
| PUT | `/broadcast/email/static-template/delete` | Deactivate a type |

### Email Templates API (Legacy/Broadcast)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/broadcast/email/template/create` | Create broadcast template |
| PUT | `/broadcast/email/template/update` | Update broadcast template |
| GET | `/broadcast/email/template/list` | List broadcast templates |
| POST | `/broadcast/email/template/preview` | Preview template with variables |

---

## Component Architecture

### Main Components
