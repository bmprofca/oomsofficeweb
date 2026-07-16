# StateDistrictSelect

**File:** `src/components/state-district-select.js`

Reusable India **state + district** pair built on **`CustomSelect`** (not native `<select>`).

## Props

| Prop | Default | Notes |
|------|---------|--------|
| `selectedState` | `''` | Controlled state name string |
| `selectedDistrict` | `''` | Controlled district string (branch settings maps this to **city**) |
| `onStateChange(value)` | — | Receives `''` when cleared |
| `onDistrictChange(value)` | — | Cleared automatically when state changes |
| `stateLabel` | `'State'` | Passed to `CustomSelect` `label` |
| `districtLabel` | `'District'` | Passed to `CustomSelect` `label` |
| `required` | `true` | Shows asterisk; controls clearability |

Legacy `selectClassName` is unused (CustomSelect has its own control styles).

## Data

- **`GET ${API_BASE_URL}/utils/states-and-districts`** with **`getHeaders()`**
- Shape: `{ success, data: [ { name, districts: string[] } ] }`
- Fetched once on mount; districts derived from selected state
- If current district is missing from the list (stale data), it is still offered as an option

## Consumers

- `src/pages/settings/branch-setting.jsx`
- `src/components/Modals/AgentCreateModal.js`
- `src/components/Modals/CaCreateModal.js`

See also: `settings-branch.md`, `CustomSelect.js` usage elsewhere (bank accounts, task create, etc.).
