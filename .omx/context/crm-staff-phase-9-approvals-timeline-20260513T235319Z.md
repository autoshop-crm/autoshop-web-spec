# Context Snapshot — CRM Staff Phase 9 Approvals + timeline

- Task statement: Выполнить `Phase 9 — approvals + timeline` поверх role-aware detail page.
- Desired outcome: Заменить placeholders approvals/timeline на реальные блоки с данными и действиями, не ломая уже добавленные manager/mechanic workflows.
- Known facts/evidence:
  - Phase 2 already added `orderApprovalApi` and `orderTimelineApi`.
  - Phase 6/7 already load approvals into `OrderDetailsPage` and partly use them.
  - Timeline is still a placeholder, and approvals area is only partially materialized.
- Constraints:
  - Preserve current status/estimate/parts/loyalty/files behavior.
  - Respect role-aware visibility from Phase 3 policy.
  - Keep frontend robust to `detailsJson` being a string.
- Unknowns/open questions:
  - Some timeline event detail rendering will remain generic until dedicated formatting is introduced.
  - Approval state presentation may still evolve in later UX phases.
- Likely codebase touchpoints:
  - `src/pages/orders/OrderDetailsPage.tsx`
  - `src/api/orderTimelineApi.ts`
  - `src/pages/orders/components/*`
  - `src/types/models.ts`
