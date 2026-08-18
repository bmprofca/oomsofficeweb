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

## Bulk import

- The bulk client import modal lives in [`Modals/BulkImportClientsModal.jsx`](../src/components/Modals/BulkImportClientsModal.jsx) (shared, reusable).
- `client-create.jsx` renders it via `<BulkImportClientsModal open={showBulkModal} onClose={…} />`.
- Props: `open` (boolean), `onClose` (callback), optional `onImported` (callback with result data).
- The modal handles file parsing (SheetJS CDN), column mapping, preview (`/client/import?preview=true`), and commit (`/client/import`).
- All bulk state (file, mappings, preview, errors) is internal to the modal — the parent only controls open/close.

## Uniqueness rules

- **PAN number** is the only unique constraint — unique per branch (checked on create, edit, and bulk import).
- **Mobile and email** may be duplicated across clients in the same branch.
- The PAN check on the create form (`checkPanAvailability`) shows an inline warning + existing-client modal when a match is found.

## Notes

- The old hardcoded local state/district list was removed from the main address step.
- Business-address selectors in the same page may still have their own local dropdown logic unless separately refactored.
