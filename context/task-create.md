# Task Create Modal — Context & Usage Guide

Use this document when wiring **Create Task** from any page (client profile, CA profile, dashboard, service pages, etc.).

The task create flow is a **single global modal**, not a full page. One form, one API, reusable everywhere via `useTaskCreate()`.

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  index.js                                                   │
│  └── <TaskCreateProvider>     ← wraps entire app router     │
│        ├── <Routes> … pages                                 │
│        └── <TaskCreateModal>  ← portal, always mounted      │
│              └── <TaskCreateForm layout="modal" />          │
└─────────────────────────────────────────────────────────────┘

Any page:
  const { openTaskCreate } = useTaskCreate();
  openTaskCreate({ ca: 'username', onSuccess: refresh });
```

| Layer           | File                                              | Role                                                  |
| --------------- | ------------------------------------------------- | ----------------------------------------------------- |
| Provider / hook | `src/context/TaskCreateProvider.js`               | `openTaskCreate`, `closeTaskCreate`, `isOpen`         |
| Modal shell     | `src/components/Modals/TaskCreateModal.js`        | Header (steps), scrollable body, footer (nav buttons) |
| Form logic      | `src/pages/task-create/TaskCreateForm.js`         | 5-step wizard, submit, success dialog                 |
| Prefill / lock  | `src/pages/task-create/taskCreatePrefill.js`      | Maps prefill → form state + locked fields             |
| Constants       | `src/pages/task-create/taskCreateConstants.js`    | `STEPS`, validation, helpers                          |
| Step UI         | `src/pages/task-create/steps/*.js`                | Clients, Service, Subtasks, Team, Notes               |
| Resources       | `src/pages/task-create/useTaskCreateResources.js` | Loads services, groups, staff, years                  |
| Legacy route    | `src/pages/task-create/TaskCreateRoute.js`        | `/task/create` → opens modal, redirects to dashboard  |

**API (unchanged):** `POST /task/create` with the same payload shape as the former full page.

**Permission:** `task_create` — modal shows “Access Denied” if the user lacks it.

---

## Modal layout

Follows `context/modal.md`:

- **Header (fixed):** title, close button, 5-step indicator
- **Body (scrollable):** current step form content
- **Footer (fixed):** Previous / Next Step / Create Task
- **Size:** `max-w-7xl`, viewport height capped (`max-h-[calc(100vh-…)]`)
- **Portal:** rendered to `document.body` at `z-[220]`
- **Close:** backdrop click, X button, or `Escape`

After successful create, a **second overlay** (success summary) appears above the modal (`z-[260]`) with task counts and “View tasks” / “Create another”.

---

## Setup (already done)

`TaskCreateProvider` is registered in `src/index.js` inside `<BrowserRouter>`:

```jsx
<BrowserRouter>
  <TaskCreateProvider>
    <Routes>…</Routes>
  </TaskCreateProvider>
</BrowserRouter>
```

Do **not** mount another `TaskCreateModal` on individual pages. Use the hook only.

---

## `useTaskCreate()` API

```js
import { useTaskCreate } from "../context/TaskCreateProvider";

const { openTaskCreate, closeTaskCreate, isOpen } = useTaskCreate();
```

### `openTaskCreate(options)`

| Option                 | Type               | Description                                                                  |
| ---------------------- | ------------------ | ---------------------------------------------------------------------------- |
| **Prefill fields**     | see below          | Passed at top level **or** inside `prefill: { … }`                           |
| `onSuccess`            | `(result) => void` | Called after API success. `result` has `message`, `count`, `tasks`, `stats`. |
| `onNavigateToTaskList` | `() => void`       | “View tasks” in success dialog. Modal closes first, then this runs.          |

Top-level prefill keys are merged into one prefill object:

```js
// These are equivalent:
openTaskCreate({ ca: "john_ca", caName: "John" });
openTaskCreate({ prefill: { ca: "john_ca", caName: "John" } });
```

### `closeTaskCreate()`

Programmatically closes the modal (rarely needed; backdrop/X handle it).

### `isOpen`

`true` while the modal is visible.

---

## Prefill options

Any field you pass is **pre-selected** and **locked** (not editable) by default.

| Key          | Type                | Behaviour                                                                                     |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------- |
| `client`     | `string` (username) | Fetches firms via `GET /client/details/firms/list?username=…`, selects all, locks firm picker |
| `firms`      | `array`             | Firm objects `{ firm_id, firm_name, client? }` — selected & locked                            |
| `firm_ids`   | `string[]`          | IDs only; optional `firmNames: { [id]: 'Label' }` for display                                 |
| `groups`     | `array`             | `{ group_id, name, remark?, firm_count? }` — selected & locked                                |
| `group_ids`  | `string[]`          | IDs; resolved against loaded groups list                                                      |
| `service`    | `object`            | `{ service_id, name, fees? }` — selected & locked                                             |
| `service_id` | `string`            | Resolved against service list; fees auto-filled when available                                |
| `ca`         | `string` (username) | CA pre-selected on step 4 & locked                                                            |
| `caName`     | `string`            | Display name for CA (optional)                                                                |
| `agent`      | `string` (username) | Agent pre-selected & locked                                                                   |
| `agentName`  | `string`            | Display name for agent (optional)                                                             |
| `fees`       | `string \| number`  | Pre-fill fees (step 2)                                                                        |
| `due_date`   | `string`            | Pre-fill due date (step 2)                                                                    |

### Unlocking prefilled fields

```js
openTaskCreate({
  ca: "john_ca",
  unlock: ["ca"], // allow user to change CA
});
```

### Force lock / unlock via object

```js
openTaskCreate({
  prefill: {
    service_id: "…",
    locked: { service: true, firms: false },
  },
});
```

---

## Wizard steps

| Step | Title          | Required validation                          |
| ---- | -------------- | -------------------------------------------- |
| 1    | Firms & Groups | At least one firm **or** one group           |
| 2    | Services       | Service, fees, due date; AY/FY if toggled on |
| 3    | Sub tasks      | Optional                                     |
| 4    | CA & Team      | CA, agent, employees optional                |
| 5    | Notes          | Attachments, text notes, voice optional      |

Step indicator in the header allows jumping **back** or to earlier completed steps. Forward jumps validate intermediate steps.

---

## API payload (submit)

Submitted by `TaskCreateForm` to `POST /task/create`:

```json
{
  "firms": ["firm_id", "…"],
  "groups": ["group_id", "…"],
  "service": {
    "service_id": "…",
    "fees": 0,
    "due_date": "YYYY-MM-DD",
    "has_financial_year": false,
    "financial_years": [],
    "has_assisment_year": false,
    "assisment_years": []
  },
  "subtasks": [
    { "type": "service", "service_id": "…" },
    { "type": "text", "content": "…" }
  ],
  "assignment": {
    "staff": ["username", "…"],
    "ca": "",
    "agent": ""
  },
  "notes": {
    "text": ["…"],
    "attachments": [{ "name": "", "remark": "", "url": "" }],
    "voice": ["url", "…"]
  }
}
```

---

## Examples (from existing code)

### Dashboard — open with no prefill

```js
// src/pages/dashboard.js
const { openTaskCreate } = useTaskCreate();

openTaskCreate({
  onNavigateToTaskList: () => navigate("/task/view"),
});
```

### Task list — open from toolbar

```js
// src/pages/task-display.js
openTaskCreate({
  onNavigateToTaskList: () => navigate("/task/view"),
});
```

### Client profile Tasks tab — lock client firms

```js
// src/ClientComponents/TaskTab.js
openTaskCreate({
  client: clientUsernameTrimmed,
  onSuccess: () => {
    fetchTasks();
    fetchTaskStatistics();
  },
  onNavigateToTaskList: () =>
    navigate(
      `/task/view?username=${encodeURIComponent(clientUsernameTrimmed)}`,
    ),
});
```

### CA profile Tasks tab — lock CA

```js
// src/ClientComponents/TaskTab.js (caUsername mode)
openTaskCreate({
  ca: caUsernameTrimmed,
  onSuccess: () => {
    fetchTasks();
    fetchTaskStatistics();
  },
  onNavigateToTaskList: () => navigate("/task/view"),
});
```

### CA profile page (new integration pattern)

```js
import { useTaskCreate } from "../../context/TaskCreateProvider";
import { checkPermissionSync } from "../../utils/permission-helper";

const { openTaskCreate } = useTaskCreate();

<button
  type="button"
  disabled={!checkPermissionSync("task_create")}
  onClick={() =>
    openTaskCreate({
      ca: caUsername,
      caName: profile?.name,
      onSuccess: () => refetchTasks(),
    })
  }
>
  New Task
</button>;
```

### Service page — lock service only

```js
openTaskCreate({
  service_id: service.service_id,
  onSuccess: () => loadServiceTasks(),
});
```

### Group page — lock group

```js
openTaskCreate({
  groups: [
    {
      group_id: group.group_id,
      name: group.name,
      firm_count: group.firm_count,
    },
  ],
  onSuccess: () => refresh(),
});
```

### Multiple prefill values

```js
openTaskCreate({
  client: "client_username",
  ca: "ca_username",
  service_id: "svc_123",
  onSuccess: (result) => console.log(`Created ${result.count} tasks`),
});
```

---

## Legacy route `/task/create`

Menu and header still link to `/task/create`. `TaskCreateRoute` opens the modal and replaces the URL with `/dashboard` so the user stays in the app shell with the modal on top.

Prefer `openTaskCreate()` directly on new pages instead of navigating to `/task/create`.

---

## Checklist — add Create Task to a new page

1. Import the hook:
   ```js
   import { useTaskCreate } from "<relative>/context/TaskCreateProvider";
   ```
2. Call `useTaskCreate()` inside your component (must be under `TaskCreateProvider`).
3. Guard the button with `checkPermissionSync('task_create')` or `check('task_create')`.
4. Call `openTaskCreate({ … })` with any prefill keys relevant to that page.
5. Pass `onSuccess` to refresh local lists/stats after create.
6. Optionally pass `onNavigateToTaskList` for the success dialog CTA.
7. Do **not** import or render `TaskCreateModal` directly on the page.

---

## File map (form internals)

```
src/pages/task-create/
├── TaskCreateForm.js          # Main form + submit + success dialog
├── TaskCreateStepIndicator.js # Step circles (used in modal header)
├── TaskCreateFooter.js        # Previous / Next / Create buttons
├── TaskCreateRoute.js         # Legacy /task/create handler
├── taskCreateConstants.js     # STEPS, validateStep, initialForm
├── taskCreatePrefill.js       # buildLockedFields, firm/group/service helpers
├── useTaskCreateResources.js  # API data loading
├── SearchablePickField.js     # Service / CA / agent pickers
├── task-create.css            # Page gradient (modal body background)
└── steps/
    ├── ClientsStep.js         # Firms & groups (supports lockedFields)
    ├── ServiceStep.js
    ├── SubtasksStep.js
    ├── TeamStep.js
    └── NotesStep.js
```

---

## Notes for future work

- **Remount on prefill change:** Modal passes `key={JSON.stringify(prefill)}` to `TaskCreateForm` so a new open with different prefill resets state cleanly.
- **Do not use the old `CreateTask.js` modal** — it was removed; this is the only implementation.
- **Shared picker:** `SearchablePickField` is also imported by `ServiceRequestApproveModal.js`; changes there affect both flows.
- **Success flow:** “Create another” re-applies the same prefill if the modal was opened with one.
