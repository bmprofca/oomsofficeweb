# LedgerTab Reference

## Scope

Client ledger transactions + opening balance flows.

## Key features

- Opening balance row always present
- Date range filtering
- Transaction details modal
- Page size + pagination + page jump

## Opening balance APIs

- `GET /transaction/get-opening-balance`
- `POST /transaction/set-opening-balance`

## Pagination baseline pattern

- `currentPage`, `itemsPerPage`, `totalItems`, `totalPages`
- reset page to 1 on filter/limit change
- show range summary + prev/next + jump input

