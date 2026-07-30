# Client create form — Client context

> Tag when changing `src/pages/client-create.jsx`, especially the multi-step address form, client image upload, or create payload mapping.

---

## Address selector

- Main client address now uses [`StateDistrictSelect`](../src/components/state-district-select.js).
- Data source: `GET /api/v1/utils/states-and-districts`.
- Order is **State first, then District**.
- District stays disabled until a state is selected.
- Validation still lives in `client-create.jsx` (`errors.state`, `errors.district`).

## Image field

- Client image upload uses `uploadOneSaasFileUrl(file)`.
- The stored `formData.image` value is a returned public URL from the upload service, not a local blob.

## Notes

- The old hardcoded local state/district list was removed from the main address step.
- Business-address selectors in the same page may still have their own local dropdown logic unless separately refactored.
