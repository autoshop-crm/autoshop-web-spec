# Context Snapshot — CRM Staff Phase 2 API modernization and mapper boundary

- Task statement: Выполнить `Phase 2 — API layer modernization and mapper boundary` с учётом завершённых Phase 0 и Phase 1.
- Desired outcome: Добавить новый CRM API layer и явную mapper boundary, сохранив backward-safe adoption и не forcing массовый rewrite страниц.
- Known facts/evidence:
  - Phase 0 baseline frozen in `ContextProject/Now/CRM_STAFF_PHASE0_EXECUTION_BASELINE_RU.md`.
  - Phase 1 added CRM domain types and status helpers in `src/types/models.ts` and `src/utils/orderStatus.ts`.
  - Phase 2 deliverables in `ContextProject/Now/CRM_STAFF_PHASED_IMPLEMENTATION_PLAN_RU.md` include CRM API modules, mapper boundary, and temporary old-endpoints list.
- Constraints:
  - Не делать крупный UI refactor в этой фазе.
  - Новые CRM methods должны сосуществовать со старыми методами.
  - Mapper boundary должна отделять DTO от UI models.
- Unknowns/open questions:
  - Какие DTO shape детали backend может отдавать дополнительно beyond current docs.
  - Какие новые методы пока не будут использоваться текущими экранами напрямую.
- Likely codebase touchpoints:
  - `src/api/*.ts`
  - `src/types/models.ts`
  - `src/utils/orderStatus.ts`
  - new mapper files under `src/utils` or `src/mappers`
