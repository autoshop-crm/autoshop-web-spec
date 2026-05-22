# CRM Staff Frontend — phased implementation plan based on current codebase

## 1. Цель документа
Этот документ объединяет:
- backend/UI контракт из `ContextProject/Now/CRM_FRONTEND_IMPLEMENTATION_REPORT_RU.md:1`;
- продуктовые выводы из `ContextProject/Now/CRM_STAFF_ROLE_SCREEN_IMPLEMENTATION_PLAN_RU.md:1`;
- deep-interview спецификацию из `.omx/specs/deep-interview-crm-role-screen-planning.md:1`;
- реальный текущий контекст frontend-кодовой базы.

Цель — получить **большой последовательный план реализации средней сложности**, где каждая фаза:
- логически завершена;
- опирается на готовый результат предыдущей;
- не ломает уже реализованные части;
- учитывает текущие ограничения моделей, API и экранов.

---

## 2. Deepsearch summary по текущей кодовой базе

### Primary locations
- Главный роутинг и composition root: `src/app/App.tsx:13`, `src/app/App.tsx:71`
- Глобальная staff-навигация по ролям: `src/layouts/AppLayout.tsx:33`
- Список заказов: `src/pages/orders/OrdersPage.tsx:13`
- Детальная страница заказа: `src/pages/orders/OrderDetailsPage.tsx:75`
- Форма создания заказа: `src/pages/orders/OrderCreatePage.tsx:13`
- Доменные типы frontend: `src/types/models.ts:1`
- API заказов: `src/api/ordersApi.ts:11`
- API запрошенных деталей: `src/api/orderRequestedPartsApi.ts:26`
- Utility role guards: `src/utils/roles.ts:3`
- Utility статусов заказа: `src/utils/orderStatus.ts:3`

### Related files
- `src/pages/dashboard/DashboardPage.tsx:20` — текущий role-aware dashboard
- `src/api/employeesApi.ts:4` — employee directory для assign flows
- `src/api/loyaltyApi.ts:4` — loyalty account loading
- `src/components/CustomerLookupField.tsx:71` — готовый customer search/select primitive
- `src/utils/orderPartsMapper.ts:1` — агрегация parts overview
- `src/components/SectionCard.tsx:1` — текущий основной layout primitive для блоков
- `src/components/StatusChip.tsx:1` — статусы в таблицах и карточках

### Usage patterns
1. **Role gating уже есть, но coarse-grained**
   - Навигация скрывает разделы по ролям через `navConfig` + `hasAnyRole`: `src/layouts/AppLayout.tsx:33`, `src/layouts/AppLayout.tsx:69`
   - Dashboard скрывает/показывает крупные карточки по ролям: `src/pages/dashboard/DashboardPage.tsx:29`
   - `OrderDetailsPage` уже содержит несколько флагов доступа (`canAssignEmployee`, `canUpdateEstimate`, `canManageProcurement`), но они задают только грубый action-level access, а не полноценную role-aware композицию экрана: `src/pages/orders/OrderDetailsPage.tsx:115`

2. **Orders frontend пока живёт в legacy-simple модели**
   - В типах `Order` есть только `status`, но нет `crmStatus`, `legacyStatus`, `plannedVisitAt`, `serviceLines`, `intakeNotes`, `bookingChannel`, `requiresOwnerApprovalForEveryExtraWork` и других полей из нового контракта: `src/types/models.ts:89`
   - Utility `orderStatuses` знает только `NEW | IN_PROGRESS | COMPLETED | CANCELLED`: `src/utils/orderStatus.ts:3`
   - `OrdersPage` фильтрует только по старому статусу и показывает `customerId`/`vehicleId` как сырые идентификаторы: `src/pages/orders/OrdersPage.tsx:13`, `src/pages/orders/OrdersPage.tsx:83`

3. **OrderDetailsPage уже богатая, но не role-centered**
   - На странице уже есть блоки “Основная информация”, “Финансы”, “Операции по заказу”, “Loyalty”, “Запчасти заказа”, “Файлы заказа”: `src/pages/orders/OrderDetailsPage.tsx:409`, `src/pages/orders/OrderDetailsPage.tsx:422`, `src/pages/orders/OrderDetailsPage.tsx:436`, `src/pages/orders/OrderDetailsPage.tsx:472`, `src/pages/orders/OrderDetailsPage.tsx:491`, `src/pages/orders/OrderDetailsPage.tsx:612`
   - Это сильная база для эволюции: экран уже существует и уже умеет finance, parts, files, loyalty, status updates.
   - Но блоки ориентированы скорее на CRUD/операции, чем на сценарии `MECHANIC / MANAGER / RECEPTIONIST`.

4. **OrderCreatePage сильно уже backend-contract-а**
   - Сейчас форма создаёт заказ только через `customerId`, `vehicleId`, `employeeId`, `problem`: `src/api/ordersApi.ts:4`, `src/pages/orders/OrderCreatePage.tsx:84`
   - Нет `plannedVisitAt`, `plannedSlotMinutes`, `bookingChannel`, `intakeNotes`, `selectedServiceIds`, `immediateDropOff`: они нужны по backend-report, но пока отсутствуют во frontend-модели и API payload.
   - Поле сотрудника пока вообще вводится как свободный `Employee ID`: `src/pages/orders/OrderCreatePage.tsx:147`

5. **Parts flow уже самый зрелый кусок staff order experience**
   - Есть vehicle-scoped parts search, requested parts, quotes, receiving, overview aggregation: `src/pages/orders/OrderDetailsPage.tsx:491`, `src/api/orderRequestedPartsApi.ts:26`
   - Это прямо совпадает с пользовательским требованием “не трогать search/list запчастей — он уже хорошо реализован”.

6. **Некоторых новых CRM surface’ов в коде ещё нет вообще**
   - Поиск по `/api/crm/orders/search` отсутствует.
   - `queue-summary` отсутствует.
   - timeline отсутствует.
   - approvals отсутствуют.
   - service catalog отсутствует.
   - CRM loyalty settings отсутствуют.
   - Отдельная admin CRM settings зона отсутствует.

### Key insights
- Лучший путь — **не переписывать orders flow**, а расширить существующий `OrderDetailsPage` до role-aware operational center.
- Текущий frontend ещё не перешёл на новую CRM domain model, поэтому любая UI-работа без Phase 1 domain alignment быстро упрётся в неверные типы и неполные API payloads.
- Самый безопасный порядок работ: сначала **модель и контракты**, потом **role matrix и composition**, потом **обогащение order detail**, потом **create flow**, потом **admin settings**, и только после этого вторичные read-model surfaces.

---

## 3. Главные ограничения текущей базы

### 3.1. Типы сильно отстают от backend-контракта
Сейчас `Order` и related models не покрывают новую CRM-реальность:
- нет `crmStatus` / `legacyStatus`;
- нет booking-полей;
- нет service lines;
- нет timeline DTO;
- нет approval DTO;
- нет loyalty settings DTO;
- нет service catalog DTO.

Следствие:
- нельзя корректно спроектировать новый staff UI только “на компонентах”; сначала нужен новый domain layer.

### 3.2. Статусы во frontend пока старые
- `src/utils/orderStatus.ts:3` знает только 4 старых статуса.
- Backend report требует целый CRM enum и раздельную логику staff/client/legacy.

Следствие:
- любые dashboard/list/detail redesign без статусов сломают семантику и badge logic.

### 3.3. Список заказов пока не CRM read-model
- Используется `GET /api/orders/status/{status}`, а не `/api/crm/orders/search`: `src/api/ordersApi.ts:24`
- Нет paging, queue-summary, employee filter, planned date filters, search query.

Следствие:
- новый staff shell рано или поздно потребует migration списка заказов, но это не должно опережать перестройку domain model.

### 3.4. Order detail page уже перегружена разнородными обязанностями
На одной странице уже живут:
- информация о заказе;
- финансы;
- assignment и status updates;
- loyalty;
- parts procurement;
- files.

Следствие:
- без phase-by-phase decomposition легко получить хаос компонентов.
- нужен промежуточный слой view-model и role-aware section config.

### 3.5. Admin surface практически отсутствует
Сейчас `ADMIN` видит пункт “Сотрудники”: `src/layouts/AppLayout.tsx:39`, но отдельной CRM settings зоны под сервисы/лояльность нет.

Следствие:
- admin work нужно запускать отдельной фазой после стабилизации order domain, чтобы не распараллелить сразу две большие перестройки.

---

## 4. Реализационная стратегия

### Core principle
Первая большая ось реализации:
1. выровнять domain и API слой;
2. описать роли и блоки как explicit frontend contract;
3. перестроить `OrderDetailsPage` в role-aware composition;
4. только потом расширять create/list/admin surfaces.

### Почему именно так
Потому что сейчас код уже содержит рабочие куски, которые не надо ломать:
- routing и auth shell;
- parts procurement flow;
- customer lookup;
- базовые order operations.

Если начать с UI-перестановок без domain alignment, получится экран с временными мапперами, дублированием состояния и быстрым техническим долгом.

---

## 5. Последовательный phased plan средней сложности

## Phase 0 — Planning freeze and source-of-truth alignment
**Цель:** превратить уже собранный контекст в фиксированный execution baseline, прежде чем менять код.

### Что входит
- зафиксировать этот phased plan как основной execution roadmap;
- привязать его к backend-report и role-screen plan;
- отдельно зафиксировать список обязательных role questions для последующего согласования;
- определить, какие backend endpoint’ы уже реально есть и какие frontend payload/model gaps надо закрыть в первую очередь.

### Почему это отдельная фаза
Сейчас требования уже частично ясны, но user explicitly сказал, что точные видимости и доступности надо согласовывать. Значит, перед кодом нужен один стабильный baseline, чтобы фазы не поползли.

### Deliverables
- согласованный phased plan;
- список role-matrix unresolved decisions;
- список required frontend model changes.

### Exit criteria
- есть единый документ порядка работ;
- зафиксировано, что first major surface = `OrderDetailsPage`.

### Phase 0 artifacts
- execution baseline: `ContextProject/Now/CRM_STAFF_PHASE0_EXECUTION_BASELINE_RU.md`;
- unresolved role decisions: `ContextProject/Now/CRM_STAFF_ROLE_MATRIX_OPEN_QUESTIONS_RU.md`;
- required frontend model changes: `ContextProject/Now/CRM_STAFF_REQUIRED_FRONTEND_MODEL_CHANGES_RU.md`.

---

## Phase 1 — CRM domain model alignment
**Цель:** обновить frontend-модель данных под backend CRM contract без массового переписывания UI.

### Что нужно изменить
#### 1. Order model expansion
Расширить `Order` и связанные типы в `src/types/models.ts:89`:
- `crmStatus`
- `legacyStatus`
- `plannedVisitAt`
- `plannedSlotMinutes`
- `bookingChannel`
- `intakeNotes`
- `requiresOwnerApprovalForEveryExtraWork`
- `plannedDropOff`
- `checkedInAt`
- `readyForOwnerAt`
- `handedOverAt`
- `cancelledAt`
- `cancellationReason`
- `serviceLines`

#### 2. New DTO families
Добавить типы для:
- `OrderServiceLineDTO`
- `OrderSearchResponseDTO`
- `OrderQueueSummaryDTO`
- `OrderTimelineEntryResponseDTO`
- approval DTO family
- loyalty settings DTO
- service catalog DTO family

#### 3. Status system update
Пересобрать `src/utils/orderStatus.ts:3` под:
- полный CRM enum;
- human labels;
- grouped business labels для будущего клиентского использования;
- badge color mapping;
- optional legacy projection helper.

#### 4. View model introduction
Добавить frontend-level models:
- `OrderListItemViewModel`
- `OrderDetailViewModel`
- `ApprovalRequestViewModel`
- `RequestedPartViewModel`
- `TimelineEntryViewModel`
- `LoyaltySettingsViewModel`
- `MechanicWorkDraftViewModel`
- `ManagerPricingDraftViewModel`

### Почему эта фаза идёт первой
Потому что и `OrdersPage`, и `OrderDetailsPage`, и `OrderCreatePage` сейчас смотрят на слишком бедные модели. Без этого foundation последующие фазы будут лепить бизнес-логику прямо в JSX.

### Dependencies
- только текущий backend contract и существующие страницы.

### Deliverables
- новый typed domain layer;
- новые enum helpers и mappers;
- compile-safe foundation для остальных фаз.

### Exit criteria
- типы покрывают основной backend-report;
- статусы CRM представлены явно;
- старые страницы ещё собираются, даже если ещё не используют все новые поля.

---

## Phase 2 — API layer modernization and mapper boundary
**Цель:** привести API слой к CRM read/write contract и убрать зависимость UI от сырого backend shape.

### Что нужно изменить
#### 1. Orders API expansion
Расширить `src/api/ordersApi.ts:11`:
- `searchCrmOrders(params)` для `/api/crm/orders/search`
- `getQueueSummary()` для `/api/crm/orders/queue-summary`
- `updateOrder(id, payload)` для mutable CRM полей
- `checkInOrder(id)`
- `markNoShow(id)`
- `createDropOff(payload)`
- `getBookings(...)`
- `getDailyBookings(...)`
- `getUnassignedBookings(...)`

#### 2. New API modules
Добавить новые api-модули для:
- `orderTimelineApi`
- `orderApprovalApi`
- `serviceCatalogApi`
- `crmLoyaltySettingsApi`

#### 3. Mapping layer
Создать явный mapper boundary:
- API DTO -> UI view model
- enum -> localized label
- enum -> color/tone
- role -> visible actions

#### 4. Backward-safe adoption
Сделать migration так, чтобы существующие страницы не пришлось переписывать все одновременно.
Например:
- сначала добавить новые методы параллельно старым;
- только потом переводить конкретные страницы на новые read-models.

### Почему эта фаза отдельно от Phase 1
Phase 1 создаёт типы. Phase 2 делает из них рабочий gateway слой. Это разные уровни сложности и их полезно разводить.

### Deliverables
- новый CRM API layer;
- mapper boundary;
- список old endpoints, которые ещё временно используются.

### Exit criteria
- frontend может получать CRM search, queue, approvals, timeline, service catalog и loyalty settings;
- UI больше не обязан читать сырые DTO прямо в компонентах.

---

## Phase 3 — Role matrix and screen composition contract
**Цель:** превратить продуктовые договорённости по ролям в технический contract для компонентов.

### Что нужно сделать
#### 1. Role matrix artifact
Подготовить role matrix по блокам и действиям для:
- `ADMIN`
- `MANAGER`
- `MECHANIC`
- `RECEPTIONIST`

#### 2. Section-level access model
Для каждого блока order screen определить:
- visible;
- editable;
- actionable;
- read-only fields;
- hidden fields;
- disabled-but-visible actions.

#### 3. Composition config
Вынести правила в config/domain слой, а не размазывать их по JSX.
Например:
- `getOrderDetailSectionsForRole(role, orderState)`
- `getOrderActionsForRole(role, orderState)`
- `getFinancialCapabilities(role)`
- `getProcurementCapabilities(role)`

#### 4. Navigation implications
Понять, нужны ли изменения в `AppLayout` после ввода admin settings и новых CRM surfaces: `src/layouts/AppLayout.tsx:33`.

### Почему эта фаза до большого UI refactor
Потому что пользователь прямо попросил согласовывать видимости и доступности. Значит сначала должна появиться role contract model, а потом компоненты.

### Deliverables
- role matrix document;
- access policy config;
- section/action rules.

### Exit criteria
- для каждого основного блока заказа известно, кто что видит и делает;
- JSX refactor может опираться на готовые правила, а не на ad hoc if-statements.

---

## Phase 4 — Order details foundation refactor
**Цель:** подготовить `OrderDetailsPage` к role-aware расширению без одновременного внедрения всей новой функциональности.

### Что нужно сделать
#### 1. Decompose monolithic page
Разбить `src/pages/orders/OrderDetailsPage.tsx:75` на подкомпоненты:
- order header
- customer/vehicle summary
- work summary
- finance panel
- operations/actions panel
- parts workspace
- loyalty panel
- files panel
- timeline panel placeholder
- approvals panel placeholder

#### 2. Introduce container/view split
Сделать разделение на:
- page container with data loading and mutations;
- presentational sections with typed props.

#### 3. Normalize data loading
Перестроить загрузку так, чтобы page container собирал единый `OrderDetailViewModel`, а не раздавал JSX сырые API fragments.

#### 4. Preserve existing working flows
Не ломать в этой фазе:
- parts procurement;
- files;
- status updates;
- estimate update.

### Почему эта фаза нужна
Потому что текущая страница уже большая и многозадачная. Если прямо в неё вносить role redesign, стоимость изменений и риск регрессий резко возрастут.

### Deliverables
- компонентно разделённый `OrderDetailsPage`;
- единый view model для страницы;
- подготовленные точки расширения под approvals/timeline/custom works.

### Exit criteria
- page стала архитектурно готовой к role-aware UI;
- существующая функциональность всё ещё работает.

---

## Phase 5 — Role-aware order detail composition
**Цель:** превратить экран заказа в operational surface для разных staff-ролей.

### Что нужно сделать
#### 1. Replace raw identifiers with human-readable context
Вместо технических `customerId` и `vehicleId` показывать:
- ФИО клиента;
- телефон/контакт, если это допустимо по роли;
- полное описание машины;
- ключевые booking/order данные.

#### 2. Rebuild top-of-page information hierarchy
Сверху страницы должны быть:
- статус и ключевые lifecycle markers;
- контекст клиента и автомобиля;
- стартовая проблема и заказанные услуги.

#### 3. Role-specific section visibility
- `MECHANIC`: work context + extra works + requested parts
- `MANAGER`: assignment + financial block + visibility of mechanic notes/custom work
- `RECEPTIONIST`: intake and customer context, limited operational controls
- `ADMIN`: superset всех блоков

#### 4. Action grouping
Сгруппировать действия в понятные кластеры:
- lifecycle
- assignment
- work changes
- procurement
- pricing
- loyalty

### Deliverables
- role-aware `OrderDetailsPage`;
- разный состав блоков и действий по staff-ролям;
- улучшенная visual hierarchy.

### Exit criteria
- экран заказа соответствует основному продуктному направлению из deep-interview;
- role differences видны не только в правах, но и в структуре рабочего experience.

---

## Phase 6 — Mechanic workspace inside order detail
**Цель:** дать механику главный рабочий блок без ухода в отдельный ERP.

### Что нужно сделать
#### 1. Mechanic work block
Добавить блок с:
- исходной проблемой;
- уже заказанными/назначенными работами;
- добавлением стандартной работы;
- добавлением нестандартной работы текстом.

#### 2. Custom work draft flow
Смоделировать draft состояния для:
- текста работы;
- причины/контекста;
- ориентировочной стоимости или пометки “цену задаст менеджер”.

#### 3. Approval trigger bridge
Подготовить UX-связку между:
- механик добавил допработу;
- нужно уведомить клиента;
- при необходимости формируется approval request.

#### 4. Parts integration
Не менять parts search/list архитектурно, а встроить его в mechanic workflow как соседний рабочий блок.

### Зачем эта фаза отдельно
Это самая продуктово-важная staff-роль. Её UX не должен теряться внутри общего refactor order page.

### Deliverables
- mechanic work block;
- custom work draft model;
- связка mechanic work + requested parts.

### Exit criteria
- механик может работать с заказом преимущественно на одной странице;
- не требуется ERP-grade line items для базовой полезности.

---

## Phase 7 — Manager coordination and pricing workflow
**Цель:** дать менеджеру инструменты координации и денежного контроля прямо в заказе.

### Что нужно сделать
#### 1. Assignment UX improvement
Заменить низкоуровневое взаимодействие с `employeeId` на нормальный assign control через employee directory.

#### 2. Financial block redesign
Выделить отдельный блок для:
- labor total;
- parts total;
- final amount;
- discounts;
- нестандартных работ, ожидающих цены.

#### 3. Custom work pricing action
Добавить явный manager-only путь, где нестандартная работа, введённая механиком, получает цену/оценку.

#### 4. Procurement oversight
Менеджер должен видеть status requested parts и связанные финансовые последствия, но без разрушения уже готового parts flow.

### Deliverables
- manager-focused finance/assignment experience;
- pricing bridge for custom works;
- clear oversight over order needs.

### Exit criteria
- manager открывает заказ и сразу понимает: кто делает, что нужно, сколько это стоит, что ещё не оценено.

---

## Phase 8 — Receptionist create and intake flow upgrade
**Цель:** привести создание заказа к backend CRM contract и реальной работе ресепшена.

### Что нужно сделать
#### 1. Expand create payload
Обновить `OrderCreatePayload` в `src/api/ordersApi.ts:4` и `OrderCreatePage` так, чтобы поддерживались:
- `plannedVisitAt`
- `plannedSlotMinutes`
- `bookingChannel`
- `intakeNotes`
- `requiresOwnerApprovalForEveryExtraWork`
- `selectedServiceIds`
- `immediateDropOff`

#### 2. Replace raw employee field
Убрать `Employee ID (опционально)` как свободный input: `src/pages/orders/OrderCreatePage.tsx:147`
И заменить на directory-backed selector.

#### 3. Add service selection
Интегрировать service catalog в create form.

#### 4. Intake mode split
Поддержать два сценария:
- booking-first;
- immediate drop-off / walk-in.

### Deliverables
- новая receptionist-friendly create form;
- поддержка standard services;
- booking/intake fields из backend contract.

### Exit criteria
- ресепшен может быстро оформить заказ и передать его в работу без ручных обходов.

---

## Phase 9 — Approvals and timeline integration
**Цель:** сделать согласования и история заказа видимыми частями рабочего процесса.

### Что нужно сделать
#### 1. Approval API + UI
Добавить:
- approval list block;
- create approval request flow;
- statuses and badges;
- связь approval с custom work / parts context.

#### 2. Timeline API + UI
Добавить:
- staff timeline block;
- event rendering;
- safe `detailsJson` parsing strategy;
- actor/event label mapping.

#### 3. Operational surfacing
Показать timeline и approvals так, чтобы они помогали handoff между staff-ролями, а не выглядели как вспомогательный debug-интерфейс.

### Почему эта фаза после order detail refactor
Timeline и approvals — это расширения page architecture. Если внедрять их раньше decomposition/composition phases, получится тяжёлый монолит.

### Deliverables
- approvals block;
- timeline block;
- unified event/action history around the order.

### Exit criteria
- staff видит историю и согласования прямо в карточке заказа;
- approval flow подключён к operational контексту.

---

## Phase 10 — CRM search/list migration to new read-model
**Цель:** перевести список заказов на CRM read-model после стабилизации domain и order detail UX.

### Что нужно сделать
#### 1. Replace old status list page
Перевести `src/pages/orders/OrdersPage.tsx:13` с `/api/orders/status/{status}` на `/api/crm/orders/search`.

#### 2. Add real CRM filters
Поддержать:
- status
- employeeId
- plannedFrom/plannedTo
- q
- page/size/hasMore

#### 3. Humanize list rows
Заменить raw `customerId` / `vehicleId` в таблице: `src/pages/orders/OrdersPage.tsx:83` на readable client/vehicle summary.

#### 4. Optional queue summary hooks
Подготовить интеграцию `queue-summary` для future dashboard/list counters.

### Почему эта фаза не раньше
Потому что список должен потреблять уже выровненные модели, enum helpers и view mappers из ранних фаз. Иначе будет двойная миграция.

### Deliverables
- CRM-native orders list;
- правильные фильтры;
- pagination and search behavior aligned with backend.

### Exit criteria
- staff orders list больше не опирается на legacy-simple status endpoint.

---

## Phase 11 — Admin CRM settings surface
**Цель:** дать `ADMIN` отдельную зону системной конфигурации CRM.

### Что нужно сделать
#### 1. Navigation extension
Расширить sidebar в `src/layouts/AppLayout.tsx:33` новым admin-only entry для CRM settings.

#### 2. Service catalog management
Добавить управление:
- категориями услуг;
- стандартными услугами;
- ценами;
- active/inactive state.

#### 3. Loyalty settings management
Добавить управление:
- `enabled`
- `visible`
- `earnEnabled`
- `spendEnabled`
- сопутствующими настройками программы.

#### 4. Separation from operational pages
Настройки должны жить отдельно от карточки заказа и не смешиваться с повседневной работой staff.

### Почему эта фаза после core staff surfaces
Потому что admin settings — важная, но не самая критичная часть для ежедневного потока заказа. Её лучше строить на уже стабилизированном domain/API слое.

### Deliverables
- admin CRM settings page(s);
- service catalog CRUD UI;
- loyalty settings UI.

### Exit criteria
- `ADMIN` управляет услугами и loyalty из отдельной зоны, а не обходными путями.

---

## Phase 12 — Hardening, consistency and rollout safety
**Цель:** зафиксировать систему после нескольких функциональных фаз и убрать разнобой.

### Что нужно сделать
- выровнять локализацию label/enum/status во всех staff surfaces;
- выровнять error handling для `409/400/404` бизнес-конфликтов;
- проверить consistency role guards между navigation, screen access и section-level permissions;
- убрать временные старые ветки API usage;
- подготовить ручной regression checklist по ролям.

### Deliverables
- cleaner codebase;
- consistent staff UX;
- rollout checklist.

### Exit criteria
- основные surfaces согласованы по поведению;
- нет критичных разрывов между role gating и screen composition.

---

## 6. Recommended execution order
Если реализовывать строго последовательно, порядок должен быть таким:
1. `Phase 0` — baseline и freeze
2. `Phase 1` — domain model alignment
3. `Phase 2` — API modernization + mappers
4. `Phase 3` — role matrix + composition contract
5. `Phase 4` — order detail foundation refactor
6. `Phase 5` — role-aware order detail composition
7. `Phase 6` — mechanic workspace
8. `Phase 7` — manager workflow
9. `Phase 8` — receptionist create flow
10. `Phase 9` — approvals + timeline
11. `Phase 10` — CRM orders list migration
12. `Phase 11` — admin settings
13. `Phase 12` — hardening

Этот порядок выбран потому, что:
- он минимизирует двойную миграцию типов и API;
- он использует уже сильный `OrderDetailsPage` как основу;
- он не трогает parts flow раньше времени;
- он откладывает второстепенные surfaces до стабилизации главного рабочего экрана.

---

## 7. Scope control: что важно не нарушить
Во всех фазах нужно держать неизменными следующие boundaries:
- не делать новый client UI;
- не перепридумывать текущий parts search/list;
- не превращать staff order page в ERP первого релиза;
- не делать новый dashboard раньше, чем список и order detail будут переведены на CRM domain;
- не кодить точные role visibilities без отдельного согласования role matrix.

---

## 8. Next action after this document
Самый правильный следующий шаг после этого плана:
- подготовить **детальную role matrix по блокам и действиям** как отдельный MD-артефакт;
- затем сразу переходить к `Phase 1` и `Phase 2`, потому что они unblock’ят почти все остальные фазы.
