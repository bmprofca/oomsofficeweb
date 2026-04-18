# billing-view.js Notes

## Purpose

Billing management for three streams:

- Pending
- Generated
- Non-billable

## Core endpoints

- `GET /billing/list/pending`
- `GET /billing/list/generated`
- `GET /billing/list/nonbillable`
- `POST /billing/generate/billable`
- `POST /billing/generate/nonbillable`
- `GET /billing/stats`

## Important conventions

- Uses `page_no` and `limit` query params
- Skeleton rows shown while loading
- Portal action menu pattern used to avoid clipping
- AppDialog pattern preferred for confirmations
- Tab switching clears stale data before refetch

