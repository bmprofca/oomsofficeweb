# App shell layout — full-width content

> **Purpose of this file:** Tag this doc whenever creating or fixing a page that uses `Header` + `Sidebar`. An agent reading only this file should wire the content area so it uses the **full remaining width** next to the sidebar (no wasted gutter from wrong padding).

> **Canonical reference pages:** [`task-display.jsx`](../src/pages/task-display.jsx), [`branch-setting.jsx`](../src/pages/settings/branch-setting.jsx), [`dashboard.jsx`](../src/pages/dashboard.jsx)

---

## Mental model (read this first)

```
┌──────────┬────────────────────────────────────────────┐
│ Sidebar  │  Content (fills ALL leftover width)        │
│ 260px    │  inset = sidebar width only                │
│ or 80px  │  + small page margins (mx-*), not max-w    │
└──────────┴────────────────────────────────────────────┘
```

**One sentence:** Content left-padding must **exactly** match the sidebar width (`260` expanded / `80` minimized). Wrong padding (e.g. `pl-72`, `lg:pl-64`) leaves empty space or overlaps the sidebar.

Sidebar widths (from `components/header.js`):

| State | Width | Tailwind inset |
|-------|-------|----------------|
| Expanded | `260px` | `md:pl-[260px]` |
| Minimized | `80px` | `md:pl-20` (5rem = 80px) |

Header is fixed at `h-16` → content always needs `pt-16`.

---

## Hard rules (do not violate)

1. **Use this inset only:**
   ```js
   const contentInset = isMinimized ? "md:pl-20" : "md:pl-[260px]";
   // className={`pt-16 transition-all duration-300 ease-in-out ${contentInset}`}
   ```
2. **Breakpoint is `md:`** — same as the desktop sidebar. Do **not** use `lg:pl-*` for the main shell inset.
3. **Never use these for the main content shell:**
   - `md:pl-72` / `pl-72` (288px — too wide; wastes space)
   - `lg:pl-64` / `md:pl-64` (256px — mismatches 260px sidebar)
   - Shell-level `max-w-7xl mx-auto` / `max-w-6xl mx-auto` on operational list/dashboard pages
4. **Pass both props to Header and Sidebar:**
   ```jsx
   <Header
     mobileMenuOpen={mobileMenuOpen}
     setMobileMenuOpen={setMobileMenuOpen}
     isMinimized={isMinimized}
     setIsMinimized={setIsMinimized}  // REQUIRED — without this, collapse toggle breaks
   />
   <Sidebar
     mobileMenuOpen={mobileMenuOpen}
     setMobileMenuOpen={setMobileMenuOpen}
     isMinimized={isMinimized}
     setIsMinimized={setIsMinimized}
   />
   ```
5. **Persist minimize state** the same way as other pages:
   ```js
   const [isMinimized, setIsMinimized] = useState(() => {
     const saved = localStorage.getItem("sidebarMinimized");
     return saved ? JSON.parse(saved) : false;
   });
   useEffect(() => {
     localStorage.setItem("sidebarMinimized", JSON.stringify(isMinimized));
   }, [isMinimized]);
   ```
6. **Full width means:** after the sidebar inset, the page content grows with the viewport. Prefer `w-full` / flex column — avoid centering the whole app in `max-w-7xl mx-auto` for operational list/dashboard pages.

---

## Canonical shell (copy this)

```jsx
<div className="min-h-screen bg-gray-50">
  <Header
    mobileMenuOpen={mobileMenuOpen}
    setMobileMenuOpen={setMobileMenuOpen}
    isMinimized={isMinimized}
    setIsMinimized={setIsMinimized}
  />
  <Sidebar
    mobileMenuOpen={mobileMenuOpen}
    setMobileMenuOpen={setMobileMenuOpen}
    isMinimized={isMinimized}
    setIsMinimized={setIsMinimized}
  />

  <div
    className={`pt-16 transition-all duration-300 ease-in-out ${
      isMinimized ? "md:pl-20" : "md:pl-[260px]"
    }`}
  >
    {/* Optional card shell — still full remaining width */}
    <div className="h-full flex flex-col mx-2 sm:mx-4 md:mx-8 my-3 md:my-4">
      {/* page content */}
    </div>
  </div>
</div>
```

### Margins vs max-width

| Pattern | When to use |
|---------|-------------|
| `mx-2 sm:mx-4 md:mx-8` | Default page gutters (task list, dashboard, reports) — content still uses full leftover width |
| `px-3 md:px-4` inside a card | Inner padding only |
| `max-w-xl mx-auto` | **Narrow** dialogs / empty states / single forms only — never the whole app shell |
| `max-w-7xl mx-auto` on main | Avoid for full-bleed operational pages; it caps width and leaves side empty space |

---

## Common bugs and fixes

| Symptom | Cause | Fix |
|---------|--------|-----|
| Content too narrow; gray strip next to sidebar | `md:pl-72` or extra large padding | Use `md:pl-[260px]` |
| Content underlaps / cramped vs sidebar | `lg:pl-64` or wrong breakpoint | Use `md:pl-[260px]` |
| Sidebar won’t expand/collapse | `setIsMinimized` not passed to `Header` | Pass `setIsMinimized={setIsMinimized}` |
| Minimize works but content doesn’t shift | Content inset not bound to `isMinimized` | Same ternary as above |
| Page looks “centered” and short | Outer `max-w-* mx-auto` on shell | Remove; use full width + `mx-*` gutters only |

---

## Checklist for new / fixed pages

- [ ] `Header` + `Sidebar` both receive `isMinimized` and `setIsMinimized`
- [ ] Main wrapper: `pt-16` + `md:pl-20` / `md:pl-[260px]`
- [ ] No `pl-72`, `lg:pl-64`, or shell-level `max-w-7xl mx-auto`
- [ ] `sidebarMinimized` read/written in `localStorage`
- [ ] Mobile: no forced left padding below `md` (sidebar is overlay)

---

## Reference pages (already correct)

- `src/pages/task-display.jsx`
- `src/pages/settings/branch-setting.jsx` (`contentInset` helper)
- `src/pages/dashboard.jsx` (aligned to this pattern)
- `src/pages/billing-view.jsx`
- Most list pages under `src/pages/*-display.jsx`

When fixing a page that “doesn’t use full width,” first compare its main `className` inset to this doc — that is almost always the bug.

Also see: [`account-profile.md`](./account-profile.md) (My Profile must follow this shell).
