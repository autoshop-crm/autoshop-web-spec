# Context Snapshot — CRM Staff Phase 7 Manager workflow

- Task statement: Выполнить `Phase 7 — Manager workflow inside order detail` поверх mechanic workspace и role-aware order detail.
- Desired outcome: Дать менеджеру внутри `OrderDetailsPage` отдельный workflow для координации, назначения сотрудника, финансового контроля и работы с mechanic-originated requests.
- Known facts/evidence:
  - Phase 5 already differentiated page composition by role.
  - Phase 6 introduced mechanic workspace and approval request creation.
  - Backend contract allows manager assignment, estimate changes, approval decisions, procurement controls.
- Constraints:
  - Preserve existing mechanic, parts, loyalty, files, status and estimate flows.
  - Avoid building full admin settings or receptionist create flow here.
  - Keep manager UX grounded in current APIs and approval model.
- Unknowns/open questions:
  - There is no dedicated backend endpoint for partial editing of service line economics; manager pricing remains tied to estimate/approval semantics.
  - Employee selection is still ID-based without employee picker enhancement.
- Likely codebase touchpoints:
  - `src/pages/orders/OrderDetailsPage.tsx`
  - `src/pages/orders/components/*`
  - `src/api/orderApprovalApi.ts`
  - `src/types/models.ts`
