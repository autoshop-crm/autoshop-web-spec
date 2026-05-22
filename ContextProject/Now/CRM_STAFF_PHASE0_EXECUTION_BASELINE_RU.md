# CRM Staff Phase 0 — execution baseline and source-of-truth alignment

## 1. Purpose
Этот документ фиксирует **execution baseline** для staff CRM до начала frontend-реализации.

Он закрывает цели `Phase 0` из `ContextProject/Now/CRM_STAFF_PHASED_IMPLEMENTATION_PLAN_RU.md`:
- замораживает единый порядок работ;
- определяет source-of-truth chain;
- фиксирует unresolved role decisions отдельно от implementation work;
- выделяет первоочередные frontend model и API gaps.

## 2. Phase 0 decision
### 2.1. Frozen execution roadmap
Основным roadmap для реализации staff CRM считается:
- `ContextProject/Now/CRM_STAFF_PHASED_IMPLEMENTATION_PLAN_RU.md`

Начиная с этой точки:
- именно этот phased plan считается главным порядком выполнения;
- Phase 1–12 выполняются относительно него;
- новые идеи можно добавлять только как explicit amendments, а не как неявный scope drift.

### 2.2. First major surface
Первой большой продуктовой surface для staff CRM фиксируется:
- `src/pages/orders/OrderDetailsPage.tsx`

Это означает:
- role-aware redesign начинается с order detail;
- новые staff distinctions сначала отражаются на detail screen;
- dashboard/list/admin additions не должны перехватывать приоритет раньше foundation для order detail.

## 3. Source-of-truth order
### 3.1. Canonical source priority
Источник истины для следующих фаз фиксируется в таком порядке:
1. `ContextProject/Now/CRM_FRONTEND_IMPLEMENTATION_REPORT_RU.md` — backend contract, DTO, endpoint semantics, role constraints, status semantics.
2. `ContextProject/Now/CRM_STAFF_ROLE_SCREEN_IMPLEMENTATION_PLAN_RU.md` — product intent, screen composition direction, role-core scenarios.
3. `.omx/specs/deep-interview-crm-role-screen-planning.md` и `.omx/interviews/crm-role-screen-planning-20260513T230648Z.md` — clarified scope, non-goals, decision boundaries.
4. `ContextProject/Now/CRM_STAFF_PHASED_IMPLEMENTATION_PLAN_RU.md` — execution order and delivery decomposition.
5. Current frontend codebase — implementation constraints and reuse opportunities.

### 3.2. Interpretation rules
Если между источниками возникает конфликт, использовать правила:
- backend contract важнее frontend convenience;
- explicit user/deep-interview boundaries важнее архитектурных догадок;
- phased plan управляет порядком работ, но не переписывает backend semantics;
- legacy frontend поведение не является source of truth, если оно расходится с CRM contract.

## 4. Planning freeze scope
### 4.1. What is frozen now
На этапе freeze считаются зафиксированными:
- приоритет staff perspective над client perspective;
- сохранение общего shell без полного CRM redesign;
- focus на role-aware composition внутри order screen;
- reuse существующего parts search/list без отдельного redesign;
- отложенный client UI;
- отложенный новый dashboard;
- необходимость отдельной admin CRM settings surface;
- порядок high-level фаз из phased plan.

### 4.2. What is not frozen now
На этом этапе **не считаются утверждёнными**:
- точные visibility rules по ролям;
- точные editable states по ролям;
- точные disabled-vs-hidden решения для action buttons;
- окончательная field-level матрица по contact/finance/approval/loyalty данным.

Эти решения вынесены в отдельный unresolved backlog и должны быть подтверждены до полноценной реализации Phase 3.

## 5. Backend endpoint baseline
### 5.1. Endpoints already treated as required for the new staff CRM
Новые staff surfaces должны проектироваться вокруг следующих endpoint groups:
- `/api/crm/orders/search`
- `/api/crm/orders/queue-summary`
- `/api/orders/{id}`
- `/api/orders/{id}/timeline`
- `/api/orders/{id}/approvals`
- `/api/orders/{id}/requested-parts`
- `/api/loyalty/settings`
- `/api/service-catalog/**`
- supporting lookup endpoints: `/api/customers/search`, `/api/customers/{id}`, `/api/employees`, `/api/employees/search`

### 5.2. Current frontend baseline
Текущий frontend ещё не aligned с этим baseline полностью:
- `OrdersPage` живёт на старом `/api/orders/status/{status}` flow;
- CRM search/list read-model отсутствует;
- queue summary отсутствует;
- timeline API layer отсутствует;
- approvals API layer отсутствует;
- service catalog API layer отсутствует;
- CRM loyalty settings API layer отсутствует;
- отдельная admin CRM settings surface отсутствует.

### 5.3. Migration rule
До завершения migration:
- legacy endpoints можно использовать только как transition layer;
- новые role-aware surfaces нельзя проектировать вокруг legacy status model;
- для новых CRM screens главным статусом считается `crmStatus`.

## 6. Required frontend gaps to close first
Первоочередные frontend gaps выделены в отдельный артефакт:
- `ContextProject/Now/CRM_STAFF_REQUIRED_FRONTEND_MODEL_CHANGES_RU.md`

Это Phase 0 фиксирует как обязательный вход в Phase 1 и Phase 2.

## 7. Unresolved role decisions
Список обязательных продуктовых вопросов, которые нельзя silently invent во время UI coding, вынесен в:
- `ContextProject/Now/CRM_STAFF_ROLE_MATRIX_OPEN_QUESTIONS_RU.md`

Правило:
- до подтверждения этих решений implementation может готовить config/matrix scaffolding,
- но не должен объявлять role matrix финальной.

## 8. Exit outcome of Phase 0
Phase 0 считается выполненной, если:
- phased plan зафиксирован как главный execution roadmap;
- source-of-truth order явно определён;
- first major surface = `OrderDetailsPage` закреплён;
- unresolved role questions отделены от implementation;
- first-wave frontend model/API gaps выписаны явно.
