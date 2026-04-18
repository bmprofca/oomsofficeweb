# app-setting.js Notes

## Tabs

- Details
- Logo
- Signature
- Invoice

## Main detail fetch

- `GET /settings/branch/details`

## Update endpoints

- `PUT /settings/branch/update`
- `POST /settings/branch/logo`
- `POST /settings/branch/sign`
- `POST /settings/branch/invoice-address`

## Shared dependencies

- `state-district-select.js` for state/district selection
- `POST /upload` pattern for pre-upload image and URL storage

