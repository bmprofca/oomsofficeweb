# Selection checkboxes — Client View pattern

Reference implementation: `src/pages/client-view.jsx`. The UI uses a reusable **`AnimatedCheckbox`** component: **18×18 px rounded square**, **indigo** active state, **gray** inactive border, animated **checkmark** or **indeterminate dash**, with optional **cross-page “Select all N”** banner and a **floating bulk-action bar**.

Use this document as context when building the same selection UX on other pages.

---

## Dependencies

- `framer-motion`: `motion`, `AnimatePresence` (checkbox scale/tap + check/dash enter/exit + floating bar).
- `react`: `useRef`, `useEffect`, `useState`.

```javascript
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
```

Extract `AnimatedCheckbox` into a shared component (e.g. `src/components/AnimatedCheckbox.jsx`) when reusing across pages — the markup below matches `client-view.jsx` lines ~86–160.

---

## Design specification (match exactly)

| Element | Role | Classes / values |
|--------|------|-------------------|
| **Wrapper** | Click target | `label`: `relative inline-flex items-center group` + **`cursor-pointer`** or **`cursor-not-allowed opacity-60`** when disabled |
| **Native input** | A11y | `input type="checkbox"`: **`sr-only`**, wired to `checked`, `onChange`, `aria-label`, `disabled` |
| **Box (unchecked)** | Default | `motion.span`: **`h-[18px] w-[18px] rounded-[4px] border-2 border-gray-300 bg-white group-hover:border-indigo-400`** |
| **Box (checked / indeterminate)** | Active | Same box + **`border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200`** |
| **Checkmark** | Checked only | `motion.svg` **`h-3 w-3 text-white`**, path stroke **`strokeWidth="1.8"`**, rounded caps/joins |
| **Indeterminate dash** | Partial “Select all” | `motion.span`: **`h-0.5 w-2 rounded-full bg-white`** |
| **Box scale (active)** | Pop on check | `animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}`, **`duration: 0.18`** |
| **Tap feedback** | Press | `whileTap={{ scale: 0.92 }}` (skip when disabled) |
| **Icon enter/exit** | Check / dash | `AnimatePresence mode="wait"`, opacity + scale **`0.12–0.15s`** |
| **Table header column** | Select-all slot | Container: **`w-12 p-3 flex-shrink-0 flex justify-center`** |
| **Table row column** | Per-row slot | Same **`w-12 p-3 flex-shrink-0 flex justify-center`** |
| **Card selected state** | Grid/card view | Append to card: **`ring-2 ring-blue-500`** |
| **Cross-page banner** | All on page selected | **`border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800`**; links **`font-semibold underline hover:text-indigo-950`** |
| **Floating action bar** | Bulk actions | **`fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50`**, enter/exit **`opacity` + `y: 20`**, **`duration: 0.2`** |

**Color summary:** active box = **`indigo-600`** + **`shadow-indigo-200`**; inactive = **`gray-300`** border, hover **`indigo-400`**; check/dash = **white**. Card selection ring = **`blue-500`**. Cross-page banner = **`indigo-50` / `indigo-800`**.

---

## `AnimatedCheckbox` component (copy-paste)

```jsx
const AnimatedCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  const isActive = checked || indeterminate;

  return (
    <label
      className={`relative inline-flex items-center group ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
      />
      <motion.span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-2 transition-colors duration-200 ${
          isActive
            ? 'border-indigo-600 bg-indigo-600 shadow-sm shadow-indigo-200'
            : 'border-gray-300 bg-white group-hover:border-indigo-400'
        }`}
        animate={{ scale: isActive ? [1, 1.12, 1] : 1 }}
        transition={{ duration: 0.18 }}
        whileTap={disabled ? {} : { scale: 0.92 }}
      >
        <AnimatePresence initial={false} mode="wait">
          {indeterminate ? (
            <motion.span
              key="dash"
              className="block h-0.5 w-2 rounded-full bg-white"
              initial={{ opacity: 0, scaleX: 0.4 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0.4 }}
              transition={{ duration: 0.12 }}
            />
          ) : checked ? (
            <motion.svg
              key="check"
              viewBox="0 0 12 12"
              className="h-3 w-3 text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <path
                d="M2.5 6l2.2 2.2 4.8-4.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          ) : null}
        </AnimatePresence>
      </motion.span>
    </label>
  );
};
```

**Props:** `checked` (bool), `indeterminate` (bool, header “select all” when some rows selected), `onChange` (handler), `ariaLabel` (string), `disabled` (bool).

---

## State and handlers (generic pattern)

Client view stores selection in a **`Set`** of ids (not an array). Replace `_id` / `clients` with your entity id field and current page rows.

```javascript
const [selectedItems, setSelectedItems] = useState(new Set());
const [selectAll, setSelectAll] = useState(false);
const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);

// Keep header checkbox in sync (including indeterminate)
useEffect(() => {
  if (selectAllAcrossPages) {
    setSelectAll(true);
    return;
  }
  setSelectAll(
    rows.length > 0 && rows.every((item) => selectedItems.has(item._id)),
  );
}, [rows, selectedItems, selectAllAcrossPages]);

const handleItemSelect = (id) => {
  const newSelected = selectAllAcrossPages
    ? new Set(rows.map((item) => item._id))
    : new Set(selectedItems);
  if (selectAllAcrossPages) setSelectAllAcrossPages(false);
  if (newSelected.has(id)) {
    newSelected.delete(id);
  } else {
    newSelected.add(id);
  }
  setSelectedItems(newSelected);
  if (rows.length > 0) {
    setSelectAll(newSelected.size === rows.length);
  }
};

const handleSelectAll = () => {
  if (selectAll) {
    setSelectedItems(new Set());
  } else {
    setSelectedItems(new Set(rows.map((item) => item._id)));
  }
  setSelectAllAcrossPages(false);
  setSelectAll(!selectAll);
};

const effectiveSelectedItems = selectAllAcrossPages
  ? new Set(rows.map((item) => item._id))
  : selectedItems;

const selectedCount = selectAllAcrossPages
  ? pagination.total
  : selectedItems.size;
```

Clear selection after bulk action success or when filters/page change as needed.

---

## UI snippets (copy-paste aligned with client-view)

### 1) Table header — Select all (with indeterminate)

```jsx
<div className="w-12 p-3 flex-shrink-0 flex justify-center">
  <AnimatedCheckbox
    checked={selectAll}
    indeterminate={
      selectedItems.size > 0 && selectedItems.size < rows.length
    }
    onChange={handleSelectAll}
    ariaLabel="Select all"
  />
</div>
```

Mobile sticky header uses the same checkbox beside a section title (`flex items-center gap-2`).

### 2) Table row — first column

```jsx
<div className="w-12 p-3 flex-shrink-0 flex justify-center">
  <AnimatedCheckbox
    checked={selectedItems.has(item._id)}
    onChange={() => handleItemSelect(item._id)}
    ariaLabel={`Select ${item.name || 'item'}`}
  />
</div>
```

Row wrapper: `flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors group bg-white` (no special selected row background in table view — selection is shown on the checkbox only).

### 3) Card / grid view — checkbox + selected ring

```jsx
<motion.div
  className={`bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden ${
    selectedItems.has(item._id) ? 'ring-2 ring-blue-500' : ''
  }`}
>
  <div className="flex items-center gap-2">
    <AnimatedCheckbox
      checked={selectedItems.has(item._id)}
      onChange={() => handleItemSelect(item._id)}
      ariaLabel={`Select ${item.name || 'item'}`}
    />
    {/* row index, avatar, title… */}
  </div>
</motion.div>
```

### 4) Cross-page selection banner (optional)

Show when **`selectAll && pagination.total > rows.length`**:

```jsx
{selectAll && pagination.total > rows.length && (
  <div className="border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-800">
    {selectAllAcrossPages ? (
      <>
        All {pagination.total.toLocaleString()} items are selected.{' '}
        <button
          type="button"
          onClick={() => {
            setSelectedItems(new Set());
            setSelectAll(false);
            setSelectAllAcrossPages(false);
          }}
          className="font-semibold underline hover:text-indigo-950"
        >
          Clear selection
        </button>
      </>
    ) : (
      <>
        All {rows.length.toLocaleString()} items on this page are selected.{' '}
        <button
          type="button"
          onClick={() => setSelectAllAcrossPages(true)}
          className="font-semibold underline hover:text-indigo-950"
        >
          Select all {pagination.total.toLocaleString()} items
        </button>
      </>
    )}
  </div>
)}
```

Pass **`effectiveSelectedItems`** (not raw `selectedItems`) to child table/card components when cross-page mode is on.

### 5) Floating bulk-action bar (optional)

```jsx
<AnimatePresence>
  {selectedCount > 0 && (
    <motion.div
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
        <motion.button
          type="button"
          onClick={onBulkAction}
          className="px-3 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg text-sm font-semibold hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 shadow-xl"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* icon + label; show count on small screens: ({selectedCount}) */}
        </motion.button>
      </div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## Checklist for new pages

1. Use **`AnimatedCheckbox`** — same **18×18**, **`rounded-[4px]`**, **`border-2`** classes.  
2. **`indigo-600`** when checked or indeterminate; **`gray-300`** + hover **`indigo-400`** when off.  
3. Header “Select all”: pass **`indeterminate`** when `0 < selected < pageLength`.  
4. Store ids in a **`Set`**; derive **`selectAll`** from current page rows in **`useEffect`**.  
5. Table: fixed **`w-12`** checkbox column in header and every row.  
6. Cards: **`ring-2 ring-blue-500`** on selected card (not table rows).  
7. Paginated lists: optional cross-page banner + **`selectAllAcrossPages`** + **`effectiveSelectedItems`**.  
8. Bulk actions: **`AnimatePresence`** floating bar at **`z-50`**, clear selection on success.

---

## Alternate pattern: Billing View pill toggles

`src/pages/billing-view.js` uses **iOS-style pill toggles** (not square checkboxes): **`bg-indigo-600` / `bg-gray-300`** tracks, white thumb, **`FiCheckCircle`** inside track, selected table rows **`bg-indigo-50/50`**. See [`billing-view.md`](./billing-view.md) for that API-specific flow. Use **Client View `AnimatedCheckbox`** for list/table pages like clients; use **Billing toggles** only when matching the billing pending-bills UX pixel-for-pixel.
