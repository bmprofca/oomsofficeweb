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
| POST | `/email/static-template/create` | Create new static template |
| PUT | `/email/static-template/update` | Update existing static template |
| GET | `/email/static-template/active-list` | Fetch paginated list with search/filter |
| GET | `/email/static-template/details/:template_id` | Get single template by ID |
| GET | `/email/static-template/by-type/:template_type` | Get templates by type |
| PUT | `/email/static-template/delete` | Soft delete (set status inactive) |
| PUT | `/email/static-template/set-default` | Set template as default for its type |

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
