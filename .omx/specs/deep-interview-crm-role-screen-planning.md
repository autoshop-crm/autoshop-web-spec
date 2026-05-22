# Deep Interview Spec — CRM Staff Role Screen Planning

## Metadata
- Profile: `standard`
- Rounds: `6`
- Final ambiguity: `~12%`
- Threshold: `20%`
- Context type: `brownfield`
- Context snapshot: `.omx/context/crm-role-screen-planning-20260513T224023Z.md`
- Transcript: generated under `.omx/interviews/`

## Clarity Breakdown
| Dimension | Score | Notes |
|---|---:|---|
| Intent | 0.90 | Clear priority: repair transparency + staff coordination |
| Outcome | 0.84 | Staff order page should become the operational center by role |
| Scope | 0.90 | Focus on role-based visibility in order page + admin settings |
| Constraints | 0.74 | Several business and scope constraints are explicit |
| Success | 0.72 | Practical staff outcomes are defined |
| Context | 0.88 | Backend contract and role model are well understood |

## Intent
Сделать staff CRM более пригодным для реальной мастерской работы за счёт:
- прозрачности ремонта внутри команды;
- согласованности между механиком, менеджером и ресепшеном;
- уменьшения переключений контекста на экране заказа;
- подготовки базы для будущего клиентского UX, не реализуя его сейчас.

## Desired Outcome
Первая реализация должна превратить экран заказа в role-aware рабочий центр:
- `MECHANIC` быстро понимает, какая машина перед ним, что уже заказано, какие работы назначены, какие детали нужны;
- `MANAGER` видит потребности, текущую сумму, нестандартные работы и может назначать/переназначать механика;
- `RECEPTIONIST` легко создаёт и оформляет заказ с клиентом и машиной;
- `ADMIN` получает superset staff-возможностей и отдельную зону CRM-настроек.

## In Scope
- Переработка состава и видимости блоков на `Order Detail` для разных staff-ролей.
- Определение role-based действий и read/edit access по staff-ролям.
- Добавление/уточнение механического рабочего блока:
  - контекст клиента и машины без технических id;
  - список уже назначенных работ;
  - добавление стандартных и нестандартных работ;
  - связка с notify/approval flow, если это допустимо backend-contract’ом.
- Использование существующего parts search/list внутри order detail как staff-блока для механика/менеджера.
- Отдельная CRM settings зона для `ADMIN`:
  - стандартные услуги и цены;
  - loyalty enable/visibility/config.
- Подробный реализационный план для staff-perspective.

## Out of Scope / Non-goals
- Не менять `client UI` в этой фазе.
- Не строить новый `dashboard`.
- Не менять текущий `search/list` запчастей, если он уже хорошо реализован.
- Не строить полноценный `ERP` по работам и `line items`.
- Не перепроектировать все staff-экраны с нуля.

## Decision Boundaries
### OMX may decide without confirmation
- Порядок блоков на экране заказа.
- Группировку действий `notify client` / `request approval` / `add work`.
- Техническую декомпозицию плана и этапов внедрения.

### Must confirm with user
- Точные видимости элементов по ролям.
- Точные доступности/редактируемости по ролям.
- Role matrix для `MANAGER`, `MECHANIC`, `RECEPTIONIST`, `ADMIN`.

## Constraints
- Использовать backend contract из `ContextProject/Now/CRM_FRONTEND_IMPLEMENTATION_REPORT_RU.md` как source of truth.
- Для нового staff UI опираться на CRM endpoints, а не legacy shim endpoints.
- Не смешивать текущую staff-фазу с клиентским будущим проектом.
- Для timeline/approval/loyalty уважать уже существующую server-side semantics.
- Сохранять текущую архитектуру экранов там, где пользователь просит “оставить всё как есть”.

## Testable Acceptance Criteria
1. Экран заказа отображает разные данные и разные действия в зависимости от staff-роли.
2. Механик видит понятный human-readable контекст заказа: клиент, машина, текущие работы, детали.
3. Менеджер видит отдельный финансовый блок и может работать с назначением механика и ценой нестандартных работ.
4. Ресепшен может быстро создать заказ, привязать клиента/машину и добавить стандартные услуги.
5. Администратор имеет superset staff-возможностей и отдельное меню настроек CRM.
6. Ни один из non-goals не затронут в первой фазе.

## Role Cores
- `MECHANIC`: контекст машины + работы + допработы + детали.
- `MANAGER`: потребности заказа + назначение механика + финансовый контроль.
- `RECEPTIONIST`: создание заказа + клиент/машина + стандартные услуги.
- `ADMIN`: полное staff-управление + CRM settings.

## Assumptions Exposed + Resolutions
- Assumption: нужен новый набор staff-экранов. Resolution: нет, ядро MVP — переработка `Order Detail` и `Admin Settings`.
- Assumption: клиентский flow надо учитывать сразу. Resolution: нет, client UI отложен в отдельный проект.
- Assumption: parts workspace needs redesign. Resolution: нет, existing parts search/list should be reused.

## Pressure-pass Findings
Revisited earlier scope assumption and forced a boundary:
- Initially the request could imply a broad CRM redesign.
- After pressure, the user clarified a much narrower and more actionable scope: keep existing shell, change order-page visibility/blocks by role, plus admin settings.

## Brownfield Evidence vs Inference
### Evidence from repository artifact
- Backend contract already defines role model, order statuses, loyalty semantics, timelines, approvals, and parts flow in `ContextProject/Now/CRM_FRONTEND_IMPLEMENTATION_REPORT_RU.md`.
- Existing parts search/list is already considered good by the user and should remain unchanged.

### Inference
- The highest-value first delivery is likely a role-based `Order Detail` composition layer rather than broad navigation redesign.
- Manager-specific pricing of custom works may require additional UI state/modeling even if backend line-items are simplified.

## Technical Context Findings
- `crmStatus` is the correct status source for new CRM surfaces.
- `serviceLines` are a read-model, not full ERP lines.
- Timeline and approval flows already exist and can be surfaced selectively.
- Loyalty visibility is server-driven and must remain role-aware.

## Handoff Recommendation
Recommended next step: `$ralplan` or direct planning artifact consumption, using this spec as the requirements source of truth.
