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

## Quick preset short codes

- `td` = Today
- `yd` = Yesterday
- `tm` = This month
- `lm` = Last month
- `tw` = This week
- `lw` = Last week
- `fy` = This financial year
- `lf` = Last financial year
