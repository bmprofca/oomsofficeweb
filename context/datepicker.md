# Datepicker Context

## Purpose

This file stores only the basic use case and overall summary of the shared datepicker behavior.

## Component

- Source: `src/components/PortalDatePicker.js`
- Common usage export: `DateRangePickerField`

## `DateRangePickerField` Props (complete reference)

Based on `src/components/PortalDatePicker.js` in the `DateRangePickerField` section.

- `value`  
  - Type: object (flexible input shape)  
  - Supported keys for start date: `start`, `start_date`, `from`  
  - Supported keys for end date: `end`, `end_date`, `to`

- `onChange`  
  - Type: function  
  - Called on apply with normalized payload:
    - range apply: `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`
    - single apply: `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`

- `placeholder` (default: `'Select date range'`)  
  - Type: string  
  - Used when no valid start date exists.

- `buttonClassName` (default: `''`)  
  - Type: string  
  - Extra classes for trigger button.

- `wrapperClassName` (default: `''`)  
  - Type: string  
  - Extra classes for outer wrapper.

- `popoverClassName` (default: `''`)  
  - Type: string  
  - Extra classes for dialog container.

- `initialTab` (default: `'quick'`)  
  - Type: string  
  - Initial tab shown inside picker.

- `presetSource` (default: `'default'`)  
  - Type: string  
  - Preset source selector passed to `DatePicker`.

- `initialQuickKey`  
  - Type: string  
  - Deprecated prop; still forwarded for compatibility.

- `defaultQuickKey`  
  - Type: string  
  - Preferred default quick preset key.

- `quickOptionKeys`  
  - Type: string[]  
  - Ordered quick preset keys to render.

- `mode` (default: `'both'`)  
  - Type: string (`'single' | 'range' | 'both'`)  
  - For range-only flows (like ledger), use `mode='range'` to hide the `Single date` tab.

- `showRangeHint` (default: `true`)  
  - Type: boolean  
  - Controls helper text shown above the calendar in range tab (`Click to set start/end date`).
  - Set `false` when parent header already shows selected range.

- `showResetButton` (default: `true`)  
  - Type: boolean  
  - Controls visibility of Reset button in modal footer.
  - Reset button is text-only (`Reset`) without icon.

- `minCalendarYear`  
  - Type: number  
  - Minimum year available in calendar.

- `maxCalendarYear`  
  - Type: number  
  - Maximum year available in calendar.

## Basic use case

Use the datepicker to capture a date range (`fromDate`, `toDate`) for:

- filtering list/table data
- report/export range selection
- date-scoped summaries

## Standard integration pattern

1. Keep `fromDate` and `toDate` in page/component state.
2. Render `DateRangePickerField` with those values and update handlers.
3. On change, update range state.
4. Re-fetch/recompute dependent UI using the updated date range.

## Overall behavior summary

- Supports range selection with reusable UI.
- Supports quick preset selections.
- Parent screen controls what happens after selection (API calls, pagination reset, export behavior).
- Selected range should stay visible and drive all date-dependent UI consistently.
- `DateRangePickerField` remembers last selected tab (quick/date range) while mounted.
- If user selects from quick presets, reopening keeps quick tab and preselects the same preset.

## Quick preset short codes

- `td` = Today
- `tom` = Tomorrow
- `n7` = Next 7th day (7th date; if current day is after 7th, picks 7th of next month)
- `eom` = Last day of this month
- `yd` = Yesterday
- `tm` = This month
- `lm` = Last month
- `tw` = This week
- `lw` = Last week
- `fy` = This financial year
- `lf` = Last financial year

## Ledger-specific pattern

Use these settings for ledger UI:

- `mode='range'` (tabs: Quick select + Date range only)
- `quickOptionKeys={['tw','lw','lm','tm','lf','fy']}`
- `defaultQuickKey='tw'`
- `showRangeHint={false}`
- `showResetButton={false}`

This gives ledger-friendly presets and removes redundant hints/actions from the modal.
