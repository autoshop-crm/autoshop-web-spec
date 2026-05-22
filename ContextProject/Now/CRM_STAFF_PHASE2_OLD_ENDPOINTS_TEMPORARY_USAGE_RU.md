# CRM Staff Phase 2 — temporary old endpoints still in use

## Purpose
Этот список фиксирует legacy/old endpoint usage, который пока остаётся допустимым после Phase 2, пока конкретные экраны ещё не migrated на CRM read-model surfaces.

## Temporary old endpoint usage
- `GET /api/orders/status/{status}` — всё ещё используется старым `OrdersPage` до Phase 10 migration.
- `GET /api/orders/{id}` — остаётся основным detail endpoint и не считается legacy; используется дальше как core order read endpoint.
- `GET /api/orders/customer/{customerId}` — допустим для customer-linked order history surfaces.
- `GET /api/orders/vehicle/{vehicleId}` — допустим для vehicle-linked order history surfaces.
- existing parts/procurement endpoints under `/api/orders/{id}/parts` and `/api/orders/{id}/requested-parts` остаются рабочими и не требуют immediate rewrite.
- loyalty account endpoint `GET /api/loyalty/accounts/customer/{customerId}` остаётся полезным для current order detail flow alongside new CRM loyalty settings endpoint.

## Migration rule
- Новые CRM list/search/dashboard surfaces должны использовать CRM read-model endpoints.
- Existing pages могут временно жить на старых methods, если для них ещё не выполнена dedicated migration phase.
- UI code должен переходить на mapper boundary even when source endpoint is still old.
