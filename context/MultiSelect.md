# MultiSelectInput Quick Context

Component path: `src/components/MultiSelectInput.js`

## Purpose
Reusable custom multi-select with:
- checkbox-style options
- optional search
- optional select/deselect all
- controlled/uncontrolled usage
- optional selection limit
- auto chip fit (`+N more` when overflow)

## Core Props
- `options`: array of options
- `value`: selected values array (controlled)
- `defaultValue`: selected values array (uncontrolled)
- `onChange(values, selectedOptions)`: callback on change
- `placeholder`: input placeholder
- `showSearch`: `true/false`
- `showSelectActions`: `true/false` (Select All / Deselect All)
- `has_limit`: `true/false` (enable limit check)
- `maxSelection`: number (used only when `has_limit=true`)
- `closeOnSelect`: `true/false`
- `disabled`: `true/false`
- `valueKey`, `labelKey`, `colorKey`: map custom option shape
- `className`: wrapper class

## Option Shape
Default expected keys:
```js
{ value: "in process", label: "In Process", color: "#2563eb" }
```
If keys differ, pass mapping props (`valueKey`, `labelKey`, `colorKey`).

## Usage (Controlled)
```jsx
<MultiSelectInput
  options={statusOptions}
  value={filters.status}
  onChange={(values) => setFilters((p) => ({ ...p, status: values }))}
  showSearch={true}
  showSelectActions={true}
  has_limit={true}
  maxSelection={3}
/>
```

## Notes
- When `has_limit=false`, `maxSelection` is ignored.
- Input height stays fixed; chips auto-fit in one row, overflow shown as `+N more`.
