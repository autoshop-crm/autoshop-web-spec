# Context Snapshot — CRM Staff Phase 4 Order detail foundation refactor

- Task statement: Выполнить `Phase 4 — Order details foundation refactor` на базе Phase 0–3.
- Desired outcome: Разделить монолитный `OrderDetailsPage` на container/view structure и section components, сохранив текущие рабочие flows и подготовив page к role-aware composition.
- Known facts/evidence:
  - First major surface fixed in Phase 0: `src/pages/orders/OrderDetailsPage.tsx`.
  - Phase 3 produced section/action contract in `src/domain/crm/orderDetailPolicy.ts`.
  - Current page still contains coarse-grained role checks and mixed concerns.
- Constraints:
  - Do not break parts procurement, files, loyalty, status updates, estimate update.
  - Keep behavior backward-safe while changing structure.
  - Avoid full Phase 5 role redesign in this phase.
- Unknowns/open questions:
  - Exact boundary between section props and container responsibilities may evolve after extraction.
  - Some current UI blocks may still need temporary raw props before full view-model normalization.
- Likely codebase touchpoints:
  - `src/pages/orders/OrderDetailsPage.tsx`
  - new components under `src/pages/orders/components` or similar
  - `src/domain/crm/orderDetailPolicy.ts`
