# Header global search — Client context

> **Purpose:** Tag when changing the header search field, result panel, or software-module catalog. Pair with [`SERVER/context/utils.md`](../../SERVER/context/utils.md) (`GET /utils/global-search`).

---

## Mental model

```
Header input  (Ctrl+/ shortcut)
        ↓
Left pane: GET /utils/global-search?q=   (clients, firms, tasks, staff, CA, agents)
           Type chips from result groups (All / Clients / Firms / …)
Right pane: filterSoftwareModules()      (static catalog, no API)
        ↓
Click row → navigate(path) and close
```

| File | Role |
|------|------|
| `src/components/HeaderGlobalSearch.jsx` | Input, portal panel, debounce, keyboard |
| `src/data/softwareModules.js` | Module titles, paths, groups, keywords |
| `src/components/header.js` | Renders `<HeaderGlobalSearch />` in the header center |

---

## Panel layout

- Two columns from `md`: **Records** (left) · **Modules** (right). Stacked on small screens.
- Portal + `z-[99999]`. Panel is **~76% of the viewport width**, centered horizontally (not aligned to the header input).
- Empty query: left shows a hint; right shows a short module list.
- `Esc` closes. **Ctrl+/** (or Cmd+/) focuses the field from anywhere.

---

## Records (left)

Each hit: `{ id, title, subtitle, path }`.

| Type | Opens |
|------|--------|
| Client | `/client/profile/:username` |
| Firm | `/client/profile/:username/firms` |
| Task | `/task/:task_id` |
| Staff | `/staff/view/profile/:username` |
| CA | `/staff/office-assistance/ca-profile/:username` |
| Agent | `/settings/agent-profile/:username` |

Debounce **180ms**. Limit **6** per type (server). People types (client / CA / agent) share one `UNION ALL` query. Profile join is on `username` only (no correlated `MAX(id)`). Firms skip the profile join. `ORDER BY` is omitted so `LIMIT` can stop early.

Type chips appear only for groups that have hits. **All** shows every group; picking a type filters the left pane.

---

## Modules (right)

Filter `SOFTWARE_MODULES` by title / group / keywords / path. Prefer prefix matches. Keep this list aligned with `DocumentTitle.js` routes.

---

## Do not

- Call `/firm/search` (does not exist)
- Put a `ViewportTooltip` on the search field
- Lock `document.body` overflow from this panel (dropdown is portaled; page can stay scrollable)
