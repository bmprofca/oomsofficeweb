# Selection toggles (“checkbox”) — Billing View pattern

Reference implementation: `src/pages/billing-view.js` (pending bills table). The UI uses **pill / iOS-style toggles** (not native `<input type="checkbox">`) with **indigo** active state, **gray** inactive state, **white** thumb, and **`FiCheckCircle`** when on.

Use this document as context when building the same selection UX on other pages.

---

## Dependencies

- `framer-motion`: `motion`, `AnimatePresence` (for thumb spring + bottom bar).
- `react-icons/fi`: **`FiCheckCircle`** (inside toggles when selected), **`FiXCircle`** (dropdown “Deselect”, “Clear” in bar), **`FiInfo`** (selection bar hint).

```javascript
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';
```

---

## Design specification (match exactly)

| Element | Role | Classes / values |
|--------|------|-------------------|
| **Track (Select All)** | Header “select all” | Container: `relative w-8 h-4 rounded-full transition-colors duration-300` + **`bg-indigo-600`** if on, **`bg-gray-300`** if off |
| **Thumb (Select All)** | Sliding circle | `absolute top-0.5 w-3 h-3 bg-white rounded-full shadow` + position **`left-4`** when on, **`left-0.5`** when off |
| **Check icon (Select All)** | Only when on | Wrapper: `absolute inset-0 flex items-center justify-center`. Icon: **`FiCheckCircle`** `w-1.5 h-1.5 text-white absolute left-1` |
| **Track (row)** | Per-row toggle | `relative w-7 h-3.5 rounded-full transition-colors duration-300 flex-shrink-0` + same **`bg-indigo-600` / `bg-gray-300`** |
| **Thumb (row)** | Smaller thumb | `absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow` + **`left-3.5`** on / **`left-0.5`** off |
| **Check icon (row)** | Same as header | Same **`FiCheckCircle`** `w-1.5 h-1.5 text-white absolute left-1` |
| **Thumb motion** | Spring | `layout` on thumb `motion.div` with `transition={{ type: 'spring', stiffness: 500, damping: 30 }}` |
| **Row tap** | Row toggle only | `whileTap={{ scale: 0.95 }}` on the row toggle `motion.button` |
| **Selected row background** | Table row | Append when selected: **`bg-indigo-50/50`** (with existing hover: `group hover:bg-gray-50/50 …`) |
| **“N selected” pill** (table toolbar) | Count next to title | Badge: **`w-6 h-6 … bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold`**. Label: **`text-sm text-gray-600`** “selected” |
| **Select All label** | Button text | Wrapper button: **`flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900`** |

**Color summary:** active = **`indigo-600`**, inactive track = **`gray-300`**, thumb = **white + shadow**, check = **white** on track. Selection accents = **`indigo-50/50`** row, **`indigo-100` / `indigo-700`** count badge.

---

## State and handlers (generic pattern)

Replace `task_id` / `displayData` with your entity id and current page rows.

```javascript
const [selectedItems, setSelectedItems] = useState([]); // array of string | number ids
const [selectAll, setSelectAll] = useState(false);

const handleToggleSelect = (id) => {
    setSelectedItems((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
};

const handleSelectAll = () => {
    if (selectAll) {
        setSelectedItems([]);
    } else {
        setSelectedItems(displayData.map((item) => item.task_id)); // use your id field
    }
    setSelectAll(!selectAll);
};

// Keep “Select All” toggle in sync when user toggles rows manually
useEffect(() => {
    if (selectedItems.length === 0) {
        setSelectAll(false);
    } else if (selectedItems.length === displayData.length) {
        setSelectAll(true);
    }
}, [selectedItems, displayData.length]);

// Clear selection when page or filter context changes (billing clears on tab + page)
useEffect(() => {
    setSelectedItems([]);
    setSelectAll(false);
}, [pagination.page_no, selectedBillType]); // adapt to your filters
```

---

## UI snippets (copy-paste aligned with billing-view)

### 1) Toolbar: “N selected” + Select All

```jsx
{showSelectionMode && selectedItems.length > 0 && (
    <div className="flex items-center gap-2">
        <div className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 rounded-md text-xs font-bold">
            {selectedItems.length}
        </div>
        <span className="text-sm text-gray-600">selected</span>
    </div>
)}

{showSelectionMode && (
    <div className="flex items-center gap-2">
        <button
            type="button"
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
            <div
                className={`relative w-8 h-4 rounded-full transition-colors duration-300 ${
                    selectAll ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
            >
                <motion.div
                    className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow ${
                        selectAll ? 'left-4' : 'left-0.5'
                    }`}
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
                {selectAll && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                    </div>
                )}
            </div>
            <span>Select All</span>
        </button>
    </div>
)}
```

`showSelectionMode` in billing is `selectedBillType === 'pending'` — gate toggles the same way on your page.

### 2) Row toggle (first column, beside row index)

```jsx
const isSelected = selectedItems.includes(item.task_id);

<motion.tr
    className={`group hover:bg-gray-50/50 transition-colors duration-150 ${
        showSelectionMode && isSelected ? 'bg-indigo-50/50' : ''
    }`}
>
    <td className="py-3 px-4">
        <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded text-xs font-medium text-gray-700 flex-shrink-0">
                {rowNum}
            </div>
            {showSelectionMode && (
                <motion.button
                    type="button"
                    onClick={() => handleToggleSelect(item.task_id)}
                    className={`relative w-7 h-3.5 rounded-full transition-colors duration-300 flex-shrink-0 ${
                        isSelected ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                    whileTap={{ scale: 0.95 }}
                >
                    <motion.div
                        className={`absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full shadow ${
                            isSelected ? 'left-3.5' : 'left-0.5'
                        }`}
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                    {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <FiCheckCircle className="w-1.5 h-1.5 text-white absolute left-1" />
                        </div>
                    )}
                </motion.button>
            )}
        </div>
    </td>
</motion.tr>
```

### 3) Dropdown actions: Select / Deselect (same icons as billing)

```jsx
<button
    type="button"
    className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
    onClick={() => handleToggleSelect(item.task_id)}
>
    {isItemSelected ? (
        <>
            <FiXCircle className="w-4 h-4 mr-3 text-red-500" />
            Deselect
        </>
    ) : (
        <>
            <FiCheckCircle className="w-4 h-4 mr-3 text-emerald-500" />
            Select
        </>
    )}
</button>
```

### 4) Fixed bottom selection bar (optional; billing pending + count > 0)

Same **visual language**: count chip **`h-8 w-8 … rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-sm`**, slate copy, amber hint with **`FiInfo`**, **Clear** uses **`FiXCircle`** `h-4 w-4 text-slate-500` on outline button. See `billing-view.js` lines ~1594–1675 for full markup (includes `AnimatePresence`, `motion.div`, sidebar offset `left: isMinimized ? '80px' : '260px'`, and `z-[46]`).

---

## Layout note (billing)

When the bottom bar is shown, the main column adds bottom padding so content is not hidden:

```javascript
style={{
    paddingBottom:
        selectedBillType === 'pending' && selectedItems.length > 0 ? '7.5rem' : '0',
}}
```

Mirror this if you use a fixed selection bar.

---

## Checklist for new pages

1. Same **track / thumb / icon** sizes and Tailwind classes as above.  
2. **`motion.div`** thumbs with **spring** `stiffness: 500`, `damping: 30`.  
3. **Indigo** on-state; **gray-300** off-state; **white** thumb; **`FiCheckCircle`** only when on (inside track).  
4. Selected rows: **`bg-indigo-50/50`**.  
5. Toolbar count badge: **`bg-indigo-100 text-indigo-700`**.  
6. Dropdown select lines: **emerald `FiCheckCircle`** / **red `FiXCircle`** for select vs deselect labels.

Do not substitute native checkboxes if the goal is **pixel-consistent** UI with Billing.
