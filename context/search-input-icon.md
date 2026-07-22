# Search input with leading icon

Tag this file when placeholder or typed text **overlaps** a search icon inside a text input.

## Symptom

- A `FiSearch` (or similar) icon sits inside the input on the left.
- Placeholder text and/or typed value render **on top of** the icon instead of starting after it.

## Root cause

Tailwind shorthand `px-3` sets **both** `padding-left` and `padding-right`. If the input also has `pl-9`, whichever utility wins in the generated CSS controls left padding — often `px-3` (12px), which is not enough room for the icon.

**Broken pattern:**

```jsx
const TOOLBAR_INPUT = "w-full px-3 py-2 ...";

<div className="relative">
  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  <input className={`${TOOLBAR_INPUT} pl-9`} placeholder="Search..." />
</div>
```

Adding `pl-9` after `TOOLBAR_INPUT` does **not** reliably fix the overlap when `TOOLBAR_INPUT` contains `px-3`.

## Fix

Use **explicit** left/right padding on icon search inputs. Do **not** combine `px-*` with `pl-*` on the same element.

### Standard pattern (absolute icon)

```jsx
<div className="relative">
  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
  <input
    type="text"
    placeholder="Search..."
    className="w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
  />
</div>
```

### Padding cheat sheet

| Icon position | Icon size | Suggested input padding |
|---------------|-----------|-------------------------|
| `left-3` (12px) | `w-4 h-4` (16px) | `pl-9` (36px) — ~8px gap after icon |
| `left-3` | `w-3.5 h-3.5` | `pl-9` |
| `left-2.5` (10px) | `w-4 h-4` | `pl-8` or `pl-9` |
| `left-3` | `w-5 h-5` (20px) | `pl-10` or `pl-11` |

Rule of thumb: **icon left offset + icon width + ~8px gap** → round up to nearest Tailwind `pl-*` step.

### Shared constants (office-assistance pages)

When a page has both plain toolbar inputs **and** search-with-icon inputs, split constants:

```jsx
// Plain selects / inputs — symmetric padding
const TOOLBAR_INPUT =
  "w-full px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none";

// Search inputs with absolute FiSearch icon
const TOOLBAR_SEARCH_INPUT =
  "w-full pl-9 pr-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none placeholder:text-gray-400";
```

Use `TOOLBAR_INPUT` on `<select>` and plain `<input>` elements.  
Use `TOOLBAR_SEARCH_INPUT` only inside a `relative` wrapper with an absolute left icon.

**Reference:** `services.jsx` already bakes `pl-9 pr-3` into its `TOOLBAR_INPUT` because every toolbar field there is a search input.

## Alternative: flex row (no absolute positioning)

Used in combobox-style search fields (`CreateTransactions.js`, `PasswordTab.js`):

```jsx
<div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
  <FiSearch className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none" />
  <input
    type="text"
    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
    placeholder="Search..."
  />
</div>
```

No `pl-*` needed — the icon is a sibling, not overlaid.

## Checklist when fixing a page

1. Find `<FiSearch className="absolute ..." />` (or similar) inside a `relative` wrapper.
2. Inspect the sibling `<input>` classes for `px-*` conflicting with `pl-*`.
3. Replace with explicit `pl-9 pr-3` (adjust if icon size/position differs).
4. Keep `pointer-events-none` on the icon so clicks focus the input.
5. Verify placeholder **and** typed text clear the icon.

## Known reference implementations (correct)

| File | Notes |
|------|-------|
| `components/header.js` | Global header search — `pl-9 pr-12` |
| `DashboardComponents/TaskDetailedPage.js` | Toolbar search — `pl-9 pr-3` |
| `pages/task-display.jsx` | Filter search — `pl-10 pr-3` |
| `pages/office-assistance/complianceShared.jsx` | Employee picker — `pl-8 pr-3`, icon at `left-2.5` |
| `pages/office-assistance/services.jsx` | `TOOLBAR_INPUT` uses `pl-9 pr-3` |
| `pages/office-assistance/compliance.jsx` | Fixed — search uses explicit `pl-9 pr-3` |

## Pages likely needing the same fix

Search for `FiSearch` + `absolute` and check whether the input uses `px-3` or a shared constant that includes `px-3`:

- `pages/office-assistance/compliance.jsx` — fixed
- Any page using `${SOME_INPUT_WITH_PX3} pl-9`
- Any page copying `TOOLBAR_INPUT` from `compliance.jsx` (with `px-3`) onto a search field

## Agent instructions

When the user tags this file and reports overlapping placeholder text:

1. Locate the search input + icon pair.
2. Remove conflicting `px-*` from that input.
3. Apply `pl-9 pr-3` (or adjust per padding table).
4. Optionally introduce `TOOLBAR_SEARCH_INPUT` if the file already has a `TOOLBAR_INPUT` constant with `px-3`.
5. Do **not** change non-search toolbar fields unless asked.
