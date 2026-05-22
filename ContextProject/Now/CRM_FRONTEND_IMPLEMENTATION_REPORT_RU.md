# CRM Frontend — подробный отчёт по текущему backend-контракту

## Цель документа
Этот документ нужен frontend-команде как практическая спецификация по уже реализованным CRM-возможностям в backend `autoshop-core`.

Фокус:
- что уже есть для **сотрудников**;
- что уже есть для **клиента**;
- какие DTO и enum’ы использовать как source of truth;
- как строить экраны, фильтры, timeline, approvals, loyalty и compatibility mode;
- какие ограничения по ролям и видимости уже enforced на backend.

Документ основан на реальном коде и нужен именно для реализации UI, а не для абстрактного бизнес-описания.

---

## 1. Главная модель заказа

Базовый контракт заказа находится в `src/main/java/com/vladko/autoshopcore/order/dto/OrderResponseDTO.java:20`.

### Поля, которые frontend должен считать основными
- `id`
- `customerId`
- `vehicleId`
- `employeeId`
- `problem`
- `status`
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
- `laborTotal`
- `partsTotal`
- `costsTotal`
- `manualDiscountAmount`
- `pointsDiscountAmount`
- `loyaltyPointsSpent`
- `discountAmount`
- `finalAmount`
- `createdAt`
- `updatedAt`
- `completedAt`
- `serviceLines`

### Критично для frontend
После Phase 10 backend поддерживает **две параллельные проекции статуса**:
- `crmStatus` — реальный CRM-статус;
- `legacyStatus` — безопасная legacy-проекция для старых клиентов;
- `status`:
  - в обычных CRM endpoint’ах обычно равен CRM-статусу;
  - в legacy shim endpoint’ах приводится к legacy-статусу.

Это значит:
- **новый frontend CRM** должен ориентироваться на `crmStatus`;
- `status` можно показывать только если экран работает именно в compatibility-режиме;
- `legacyStatus` полезен для migration/debug/admin view.

См.:
- `src/main/java/com/vladko/autoshopcore/order/dto/OrderResponseDTO.java:20`
- `src/main/java/com/vladko/autoshopcore/order/service/LegacyOrderCompatibilityService.java:42`
- `src/main/java/com/vladko/autoshopcore/order/service/LegacyOrderStatusProjector.java:8`

---

## 2. Статусы заказа: как их использовать в UI

Полный CRM enum: `src/main/java/com/vladko/autoshopcore/order/entity/OrderStatus.java:3`

### CRM-статусы
- `NEW`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `WAITING_FOR_VISIT`
- `ACCEPTED`
- `DIAGNOSIS_IN_PROGRESS`
- `WAITING_FOR_OWNER_APPROVAL`
- `WAITING_FOR_PART`
- `REPAIR_IN_PROGRESS`
- `READY_FOR_OWNER`
- `HANDED_OVER`
- `CANCELLED_NO_SHOW`
- `CANCELLED_BY_CUSTOMER`
- `CANCELLED_INTERNAL`

### Рекомендация для frontend-группировки
#### Для клиентского UI
Показывать не raw enum как есть, а grouped business states:
- `WAITING_FOR_VISIT` → “Запись оформлена”
- `ACCEPTED` → “Автомобиль принят”
- `DIAGNOSIS_IN_PROGRESS` / `REPAIR_IN_PROGRESS` → “В работе”
- `WAITING_FOR_OWNER_APPROVAL` → “Ожидает вашего решения”
- `WAITING_FOR_PART` → “Ожидаем запчасти”
- `READY_FOR_OWNER` → “Готов к выдаче”
- `HANDED_OVER` → “Выдан”
- `CANCELLED_NO_SHOW` / `CANCELLED_BY_CUSTOMER` / `CANCELLED_INTERNAL` → разные причины отмены

#### Для staff UI
Показывать **точный enum** и дополнительно human label.
Это важно для receptionist/manager/mechanic dashboards и queue-сводок.

### Legacy enum
`src/main/java/com/vladko/autoshopcore/order/entity/LegacyOrderStatus.java:3`
- `NEW`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### Правила compatibility projection
Backend маппит CRM → legacy так:
- `WAITING_FOR_VISIT`, `ACCEPTED` → `NEW`
- `DIAGNOSIS_IN_PROGRESS`, `WAITING_FOR_OWNER_APPROVAL`, `WAITING_FOR_PART`, `REPAIR_IN_PROGRESS`, `READY_FOR_OWNER` → `IN_PROGRESS`
- `HANDED_OVER` → `COMPLETED`
- все cancel-like → `CANCELLED`

Источник: `src/main/java/com/vladko/autoshopcore/order/service/LegacyOrderStatusProjector.java:10`

---

## 3. Каналы записи и причины отмены

### Канал записи
`src/main/java/com/vladko/autoshopcore/order/entity/BookingChannel.java:3`
- `PHONE`
- `WALK_IN`
- `WEBSITE`
- `WHATSAPP`
- `INTERNAL`

### Причина отмены
`src/main/java/com/vladko/autoshopcore/order/entity/CancellationReason.java:3`
- `NO_SHOW`
- `CUSTOMER_CANCELLED`
- `CUSTOMER_DECLINED_TO_PROCEED`
- `INTERNAL_SHOP_CANCELLED`
- `DUPLICATE_ORDER`

### Что делать на UI
- Для receptionist/staff — селекты с явной локализацией.
- Для клиента — эти enum’ы лучше не показывать напрямую, а отображать как человекочитаемый текст.

---

## 4. Основные order endpoint’ы для CRM UI

Контроллер: `src/main/java/com/vladko/autoshopcore/order/controller/OrderController.java:21`

### Создание и редактирование
- `POST /api/orders` — создать заказ/запись
- `POST /api/orders/drop-off` — создать immediate drop-off
- `PUT /api/orders/{id}` — редактировать mutable поля

### Получение данных
- `GET /api/orders/{id}`
- `GET /api/orders/customer/{customerId}`
- `GET /api/orders/vehicle/{vehicleId}`
- `GET /api/orders/status/{status}`

### Lifecycle actions
- `PUT /api/orders/{id}/assign`
- `PUT /api/orders/{id}/estimate`
- `PUT /api/orders/{id}/status`
- `PUT /api/orders/{id}/check-in`
- `PUT /api/orders/{id}/no-show`

### Booking views
- `GET /api/orders/bookings?from=&to=`
- `GET /api/orders/bookings/daily?date=YYYY-MM-DD`
- `GET /api/orders/bookings/unassigned?date=YYYY-MM-DD`

### Вывод для frontend
#### Receptionist screens
Можно строить:
- экран создания записи;
- экран прибытия на день;
- экран незакреплённых записей;
- карточку заказа с check-in/no-show действиями.

#### Manager / mechanic screens
Можно строить:
- карточку заказа;
- смену статуса;
- назначение сотрудника;
- обновление сметы.

---

## 5. DTO для создания и обновления заказа

### Создание
`src/main/java/com/vladko/autoshopcore/order/dto/OrderCreateDTO.java:13`

Поля:
- `customerId` — required
- `vehicleId` — required
- `employeeId` — optional
- `problem` — optional текст, max 1000
- `plannedVisitAt` — optional
- `plannedSlotMinutes` — optional
- `bookingChannel` — optional
- `intakeNotes` — optional, max 2000
- `requiresOwnerApprovalForEveryExtraWork` — optional
- `immediateDropOff` — optional
- `selectedServiceIds` — optional массив id услуг

### Обновление
`src/main/java/com/vladko/autoshopcore/order/dto/OrderUpdateDTO.java:13`

Поля:
- `problem`
- `plannedVisitAt`
- `plannedSlotMinutes`
- `bookingChannel`
- `intakeNotes`
- `requiresOwnerApprovalForEveryExtraWork`
- `selectedServiceIds`

### Важно для UX
- если frontend делает booking-first flow, `plannedVisitAt` и `selectedServiceIds` надо считать основными;
- если frontend делает walk-in flow, можно использовать `POST /api/orders/drop-off` или передавать `immediateDropOff=true` как часть сценария.

---

## 6. Service lines в заказе

DTO: `src/main/java/com/vladko/autoshopcore/order/dto/OrderServiceLineDTO.java:8`

Поля:
- `serviceId`
- `serviceName`
- `price`

### Что это значит для UI
Это не полноценная редактируемая line-item модель уровня ERP, а текущий read-модельный срез выбранных услуг.

Подходит для:
- summary блока “Выбранные услуги”;
- предварительной сметы;
- карточки записи/заказа.

Не стоит предполагать, что здесь уже есть:
- quantity;
- line status;
- line-level approval state.

---

## 7. Service catalog для записи и стандартных работ

Контроллер: `src/main/java/com/vladko/autoshopcore/servicecatalog/controller/ServiceCatalogController.java:17`

### Endpoint’ы
- `POST /api/service-catalog/categories`
- `GET /api/service-catalog/categories?activeOnly=true`
- `POST /api/service-catalog/services`
- `PUT /api/service-catalog/services/{id}`
- `GET /api/service-catalog/services?activeOnly=true&categoryId=`

### DTO категорий
`src/main/java/com/vladko/autoshopcore/servicecatalog/dto/ServiceCategoryResponseDTO.java:6`
- `id`
- `name`
- `displayOrder`
- `active`

### DTO услуг
`src/main/java/com/vladko/autoshopcore/servicecatalog/dto/ServiceCatalogItemResponseDTO.java:9`
- `id`
- `name`
- `description`
- `basePrice`
- `active`
- `categoryId`
- `categoryName`
- `defaultDurationMinutes`
- `inspectionItems`

### Как это использовать во frontend
#### Клиентский booking UI
- категория → список услуг;
- можно показывать `defaultDurationMinutes` как ожидаемую длительность;
- можно показывать `basePrice` как ориентир;
- `inspectionItems` удобно использовать как “что входит / что проверяется”.

#### Staff admin UI
- CRUD-категории;
- CRUD-услуги;
- фильтр активных/неактивных;
- группировка по `categoryId`.

---

## 8. CRM search и списки для рабочих экранов

Контроллер: `src/main/java/com/vladko/autoshopcore/order/query/controller/OrderQueryController.java:17`

### Endpoint’ы
- `GET /api/crm/orders/search`
- `GET /api/crm/orders/queue-summary`

### Search params
Из `OrderQueryController` и `OrderQueryServiceImpl`:
- `customerId`
- `vehicleId`
- `status`
- `employeeId`
- `plannedFrom`
- `plannedTo`
- `q`
- `page`
- `size`

Источник search-логики: `src/main/java/com/vladko/autoshopcore/order/query/service/OrderQueryServiceImpl.java:30`

### Search response
`src/main/java/com/vladko/autoshopcore/order/query/dto/OrderSearchResponseDTO.java:10`
- `items: OrderResponseDTO[]`
- `page`
- `size`
- `hasMore`
- `loyaltySettings`

### Queue summary response
`src/main/java/com/vladko/autoshopcore/order/query/dto/OrderQueueSummaryDTO.java:7`
- `waitingForVisit`
- `accepted`
- `diagnosisInProgress`
- `waitingForOwnerApproval`
- `waitingForPart`
- `repairInProgress`
- `readyForOwner`

### Важные особенности для frontend
- Paging пока простой: `page + size + hasMore`, не Spring pageable.
- Search по `q` сейчас привязан к `problem`, а не к широкому full-text.
- `loyaltySettings` приходит прямо в search response — это удобно для staff CRM shell, чтобы сразу решать, показывать loyalty UI или скрывать.

### Рекомендации по staff UI
#### Главный CRM список
Сделать:
- фильтр по статусу;
- фильтр по сотруднику;
- диапазон `plannedFrom/plannedTo`;
- быстрый поиск по `problem`;
- “Показать ещё” / infinite scroll на основе `hasMore`.

#### Dashboard / counters
Использовать `queue-summary` для карточек-метрик и tab counts.

---

## 9. Loyalty: как backend ожидает поведение UI

### Настройки loyalty
DTO: `src/main/java/com/vladko/autoshopcore/loyalty/dto/LoyaltySettingsResponseDTO.java:8`
- `enabled`
- `earnEnabled`
- `spendEnabled`
- `visible`

### Endpoint’ы
- `GET /api/loyalty/settings` — из `src/main/java/com/vladko/autoshopcore/loyalty/controller/LoyaltyController.java:21`
- `GET /api/orders/{orderId}/loyalty` — account/видимость
- `PUT /api/orders/{orderId}/loyalty/apply`
- `DELETE /api/orders/{orderId}/loyalty`

Контроллер order loyalty: `src/main/java/com/vladko/autoshopcore/loyalty/controller/OrderLoyaltyController.java:20`

### Backend-semantics
Из `src/main/java/com/vladko/autoshopcore/loyalty/service/CrmLoyaltyFacadeImpl.java:18`:
- если `enabled=false`, loyalty полностью operationally выключена;
- если `visible=false`, счёт/баллы надо скрывать;
- если `spendEnabled=false`, списание баллов запрещено;
- если `earnEnabled=false`, начисления после закрытия не будет.

### Рекомендации для frontend
#### Клиентский UI
- если `visible=false`, не показывать loyalty-блок вообще;
- если `visible=true`, можно показывать account/баланс;
- если `spendEnabled=false`, скрывать или disable блок “использовать баллы”.

#### Staff UI
- если `enabled=false`, не показывать operational controls;
- если `visible=true`, показывать read-only информацию даже там, где списание может быть выключено.

---

## 10. Timeline: клиентская и staff версия

Контроллер: `src/main/java/com/vladko/autoshopcore/order/timeline/controller/OrderTimelineController.java:14`

### Endpoint’ы
- `GET /api/orders/{orderId}/timeline`
- `GET /api/orders/{orderId}/timeline/customer`

### DTO
`src/main/java/com/vladko/autoshopcore/order/timeline/dto/OrderTimelineEntryResponseDTO.java:12`
- `id`
- `eventType`
- `actorType`
- `actorId`
- `effectiveStatus`
- `summary`
- `detailsJson`
- `occurredAt`

### Event types
`src/main/java/com/vladko/autoshopcore/order/timeline/entity/OrderTimelineEventType.java:3`
- `ORDER_BOOKED`
- `VEHICLE_CHECKED_IN`
- `APPROVAL_REQUESTED`
- `APPROVAL_APPROVED`
- `APPROVAL_REJECTED`
- `WAITING_FOR_PART_ENTERED`
- `PART_ORDERED`
- `PART_RECEIVED`
- `REPAIR_RESUMED`
- `READY_FOR_OWNER_MARKED`
- `ORDER_CANCELLED`
- `VEHICLE_HANDED_OVER`
- `STATUS_CHANGED`

### Actor types
`src/main/java/com/vladko/autoshopcore/order/timeline/entity/OrderTimelineActorType.java:3`
- `SYSTEM`
- `CUSTOMER`
- `RECEPTIONIST`
- `MECHANIC`
- `MANAGER`
- `ADMIN`
- `AUTOMATION_JOB`

### Ключевая backend-гарантия
`src/main/java/com/vladko/autoshopcore/order/timeline/service/OrderTimelineServiceImpl.java:44`
- customer timeline автоматически **скрывает `STAFF_ONLY` записи**;
- staff timeline возвращает полный список.

### Что это значит для UI
#### Клиентский timeline
Можно смело использовать endpoint `/timeline/customer` без дополнительной бизнес-фильтрации на frontend.

#### Staff timeline
Можно показывать:
- operational history;
- внутренние audit события;
- legacy-derived backfill entries.

### Важная деталь
`detailsJson` — это строка JSON, а не уже распарсенный объект.
Frontend должен быть готов:
- либо просто логировать/скрывать её;
- либо `try/catch JSON.parse(detailsJson)`.

Особенно это важно для backfill-истории, где backend пишет флаги типа `legacyDerived=true`.

---

## 11. Approval flow: что реализовано для extra work / parts

Контроллер: `src/main/java/com/vladko/autoshopcore/order/approval/controller/OrderApprovalController.java:14`

### Endpoint’ы
- `POST /api/orders/{orderId}/approvals`
- `POST /api/orders/{orderId}/approvals/{requestId}/approve`
- `POST /api/orders/{orderId}/approvals/{requestId}/reject`
- `GET /api/orders/{orderId}/approvals`

### Создание approval request
DTO: `src/main/java/com/vladko/autoshopcore/order/approval/dto/OrderApprovalRequestCreateDTO.java:12`

Поля:
- `title`
- `description`
- `laborAmount`
- `partsAmount`
- `requiresApproval`
- `requestedPart`
- `customerContactChannel`

### Запчасть внутри approval
DTO: `src/main/java/com/vladko/autoshopcore/order/approval/dto/ApprovalRequestedPartDTO.java:9`
- `articleNumber`
- `brand`
- `name`
- `umapiArticleId`
- `matchedLocalPartId`
- `quantity`

### Ответ approval request
DTO: `src/main/java/com/vladko/autoshopcore/order/approval/dto/OrderApprovalRequestResponseDTO.java:13`
- `requestId`
- `orderId`
- `proposalId`
- `approvalType`
- `requestStatus`
- `proposalStatus`
- `requestToken`
- `title`
- `description`
- `laborAmount`
- `partsAmount`
- `totalAmount`
- `requestedAt`
- `expiresAt`
- `customerContactChannel`
- `requestedPart`

### Decision DTO
`src/main/java/com/vladko/autoshopcore/order/approval/dto/OrderApprovalDecisionCreateDTO.java:8`
- `decisionToken` — required
- `comment` — optional

### Approval enums
`src/main/java/com/vladko/autoshopcore/order/approval/entity/OrderApprovalType.java:3`
- `EXTRA_WORK`
- `PART_ONLY`
- `MIXED_SCOPE_CHANGE`

`src/main/java/com/vladko/autoshopcore/order/approval/entity/OrderApprovalRequestStatus.java:3`
- `OPEN`
- `APPROVED`
- `REJECTED`
- `EXPIRED`
- `CANCELLED`

`src/main/java/com/vladko/autoshopcore/order/approval/entity/OrderWorkProposalStatus.java:3`
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `REJECTED`
- `CONVERTED_TO_WORK`
- `CANCELLED`

### Что важно для frontend
#### Для staff
- approval request — это самостоятельный объект списка в карточке заказа;
- `requestToken` backend уже отдаёт, значит frontend может строить customer-decision flow на нём;
- если `requestStatus=OPEN`, надо показывать “ожидаем решение клиента”;
- если `proposalStatus=APPROVED`, work scope уже можно считать согласованным.

#### Для клиента
- клиентский экран решения должен отправлять `decisionToken`;
- approve/reject — отдельные endpoint’ы;
- `comment` поддерживается и для approve, и для reject.

---

## 12. Requested parts и ожидание запчастей

Контроллер: `src/main/java/com/vladko/autoshopcore/parts/controller/OrderRequestedPartController.java:15`

### Endpoint’ы
- `POST /api/orders/{orderId}/requested-parts`
- `GET /api/orders/{orderId}/requested-parts`

### Create DTO
`src/main/java/com/vladko/autoshopcore/parts/dto/OrderRequestedPartCreateDTO.java:14`
- `articleNumber`
- `brand`
- `name`
- `umapiArticleId`
- `matchedLocalPartId`
- `quantity`

### Response DTO
`src/main/java/com/vladko/autoshopcore/parts/dto/OrderRequestedPartResponseDTO.java:13`
- `id`
- `orderId`
- `articleNumber`
- `brand`
- `name`
- `umapiArticleId`
- `matchedLocalPartId`
- `requestedQuantity`
- `status`
- `selectedSupplier`
- `selectedQuoteSignature`
- `purchasePrice`
- `salePrice`
- `currency`
- `deliveryDaysMin`
- `deliveryDaysMax`
- `quoteFetchedAt`
- `orderedAt`
- `receivedAt`
- `createdAt`
- `updatedAt`

### Status enum
`src/main/java/com/vladko/autoshopcore/parts/entity/OrderRequestedPartStatus.java:3`
- `PENDING_CUSTOMER_APPROVAL`
- `OUT_OF_STOCK`
- `ORDERED_IN_TRANSIT`
- `IN_STOCK_RESERVED`
- `INSTALLED`
- `CANCELLED`

### Что это значит для frontend
#### Staff order detail
Нужен отдельный блок “Запрошенные запчасти”, где показываются:
- текущий статус;
- поставщик/котировка;
- цены;
- SLA доставки;
- даты заказа/получения.

#### Client UI
Если вы делаете клиентский экран статуса ремонта, пользователю стоит показывать только безопасную бизнес-интерпретацию:
- “ожидаем согласование”
- “заказана”
- “получена”

Не обязательно выводить внутренние procurement fields (`selectedQuoteSignature`) наружу.

---

## 13. Legacy shim для старых потребителей

Контроллер: `src/main/java/com/vladko/autoshopcore/order/controller/LegacyOrderController.java:13`

### Endpoint’ы
- `GET /api/orders/legacy/{id}`
- `GET /api/orders/legacy/customer/{customerId}`
- `GET /api/orders/legacy/vehicle/{vehicleId}`
- `GET /api/orders/legacy/status/{status}`

### Как использовать
Новый CRM frontend **не должен** строиться на этих endpoint’ах.
Они нужны для:
- старых интеграций;
- переходных экранов;
- дебага миграции.

### Практическое правило
- для нового staff/client UI использовать CRM endpoints;
- legacy endpoints использовать только если вы осознанно реализуете совместимый старый экран.

---

## 14. Роли и видимость endpoint’ов

Ролевые ограничения описаны в `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:43`.

### Ключевые роли
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`
- `CUSTOMER`

### Что важно по ролям
#### Заказы
- `GET /api/orders/**` доступен `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`, `CUSTOMER`
- `POST /api/orders` доступен `ADMIN`, `MANAGER`, `RECEPTIONIST`
- `PUT /api/orders/*/assign` — `ADMIN`, `MANAGER`
- `PUT /api/orders/*/estimate` — `ADMIN`, `MANAGER`, `MECHANIC`
- `PUT /api/orders/*/status` — `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`

#### Timeline
- staff timeline `/api/orders/*/timeline` — staff roles
- customer timeline `/api/orders/*/timeline/customer` — staff + customer

#### Approvals
- `GET approvals` — staff + customer
- `POST approval request` — `ADMIN`, `MANAGER`, `MECHANIC`
- `POST approve/reject` — `ADMIN`, `MANAGER`, `CUSTOMER`

#### Requested parts / procurement
- создание requested-part — `ADMIN`, `MANAGER`, `MECHANIC`
- quote/order/receive — в основном `ADMIN`, `MANAGER`

#### Loyalty
- order loyalty mutate — `ADMIN`, `MANAGER`, `RECEPTIONIST`
- loyalty GET — staff роли

#### CRM search
- `/api/crm/orders/**` — `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`

### Что это значит для frontend
Нужно закладывать **role-aware UI**:
- receptionist не должен видеть manager-only action buttons;
- customer не должен видеть staff timeline или procurement actions;
- mechanic может менять estimate/status, но не должен видеть все admin/manage controls.

Backend всё равно защитит, но UX должен быть согласован заранее.

---

## 15. Customer/Employee/Vehicle lookup surfaces

### Customers
Контроллер: `src/main/java/com/vladko/autoshopcore/client/controller/CustomerController.java:16`
- `GET /api/customers/{id}`
- `GET /api/customers/search`

Customer DTO: `src/main/java/com/vladko/autoshopcore/client/dto/CustomerResponseDTO.java:11`
- `id`
- `firstName`
- `lastName`
- `phoneNumber`
- `email`
- `createdAt`
- `updatedAt`

### Vehicles
Vehicle DTO: `src/main/java/com/vladko/autoshopcore/vehicle/dto/VehicleResponseDTO.java:10`
- `id`
- `customerId`
- `brand`
- `model`
- `vin`
- `licensePlate`
- плюс UMAPI-поля для справочной/каталожной интеграции

### Employees
Контроллер: `src/main/java/com/vladko/autoshopcore/employee/controller/EmployeeController.java:15`
- `GET /api/employees`
- `GET /api/employees/search`

Employee DTO: `src/main/java/com/vladko/autoshopcore/employee/dto/EmployeeResponseDTO.java:11`
- использовать для assign/owner lists

### Что строить на frontend
- customer autocomplete/search;
- vehicle picker по customer;
- employee picker для назначения механика.

---

## 16. Ошибки и обработка на frontend

Глобальный handler: `src/main/java/com/vladko/autoshopcore/shared/exception/GlobalExceptionHandler.java:46`

### Типовые статусы
- `400 Bad Request` — validation / illegal argument
- `404 Not Found` — отсутствующий заказ, клиент, vehicle, approval, part и т.д.
- `409 Conflict` — business conflict, stale state, loyalty conflict, part conflict
- `503 Service Unavailable` — проблемы внешнего API/config
- `502 Bad Gateway` — contract/auth/validation проблемы внешнего API

### Ключевой UX-вывод
#### Для форм
Validation ошибки лучше показывать как field/global messages.
Backend уже склеивает field errors в строку.

#### Для lifecycle actions
`409 Conflict` надо считать ожидаемым бизнес-сценарием:
- повторное решение approval;
- invalid transition;
- loyalty disabled/spend conflict;
- part stock conflict.

Нельзя показывать это как “система упала”; нужен бизнес-alert/toast.

---

## 17. Must-have экраны для frontend после этих изменений

### A. Staff CRM shell
1. CRM dashboard
   - queue summary
   - сегодняшние записи
   - orders waiting for approval / part / pickup

2. CRM search/list
   - фильтры по статусу / сотруднику / датам
   - поиск по `problem`
   - пагинация через `page/size/hasMore`

3. Order detail (staff)
   - header с CRM статусом
   - customer/vehicle
   - service lines
   - financial summary
   - lifecycle buttons
   - approvals block
   - requested parts block
   - loyalty block
   - full timeline

4. Booking/create order form
   - customer
   - vehicle
   - service catalog selection
   - planned visit
   - booking channel
   - notes
   - immediate drop-off path

5. Receptionist arrivals screen
   - daily arrivals
   - unassigned bookings
   - check-in
   - no-show

6. Approval workspace
   - create approval request
   - list current approvals
   - state badges

7. Parts/procurement workspace
   - requested parts list
   - part status progression

### B. Client UI
1. My orders list
   - `crmStatus`
   - vehicle
   - short summary
   - next action marker

2. Order detail (customer)
   - status summary
   - safe timeline (`/timeline/customer`)
   - safe service/price summary
   - loyalty section only if visible

3. Approval decision screen
   - title/description
   - labor/parts/total
   - approve/reject
   - comment
   - token-based submit

4. Pickup-ready / waiting states
   - clear UX around `READY_FOR_OWNER`, `WAITING_FOR_PART`, `WAITING_FOR_OWNER_APPROVAL`

---

## 18. Практические рекомендации по реализации

### Что использовать как source of truth
- для нового CRM UI: `crmStatus`
- для timeline клиента: только `/timeline/customer`
- для role gating: backend roles + frontend feature guards
- для loyalty visibility: `loyaltySettings.visible`

### Что не предполагать
- что `status` всегда CRM-статус;
- что `serviceLines` — это полноценные editable work lines;
- что `detailsJson` всегда пустой или всегда JSON-объект;
- что все approval flows partial-item based — сейчас решение идёт на уровне request.

### Что сразу заложить в frontend-модель
Рекомендую завести отдельные TS типы:
- `OrderCrmStatus`
- `LegacyOrderStatus`
- `OrderListItemViewModel`
- `OrderDetailViewModel`
- `ApprovalRequestViewModel`
- `RequestedPartViewModel`
- `TimelineEntryViewModel`
- `LoyaltySettingsViewModel`

И отдельный mapper слой:
- API DTO → UI model
- enum → localized label
- enum → badge color
- role → available actions

---

## 19. Самые важные gotchas

1. `status` и `crmStatus` теперь не одно и то же во всех surface’ах.
2. `detailsJson` в timeline — строка, не объект.
3. customer timeline уже server-side очищен от staff-only записей.
4. loyalty UI обязан уважать `enabled / visible / spendEnabled / earnEnabled`.
5. queue/search endpoints — это отдельный CRM read-model, их лучше использовать для списков, а не пытаться собирать всё из старых `/api/orders/...` endpoint’ов.
6. legacy endpoints есть, но новый frontend не должен на них опираться.
7. approval decision требует `decisionToken`, его нельзя “угадывать”, его надо брать из response approval request.

---

## 20. Рекомендуемая стратегия для Frontend

### Для сотрудников
- Основной shell строить на `/api/crm/orders/search`, `/api/crm/orders/queue-summary`, `/api/orders/{id}`, `/api/orders/{id}/timeline`, `/api/orders/{id}/approvals`, `/api/orders/{id}/requested-parts`, `/api/loyalty/settings`, `/api/service-catalog/**`.

### Для клиента
- Основываться на `/api/orders/{id}`, `crmStatus`, `/api/orders/{id}/timeline/customer`, approval decision endpoint’ах и loyalty visibility rules.

### Для migration-экрана / старого UI
- использовать `/api/orders/legacy/**` только как переходный слой.

---

## 21. Что я бы сделал следующим шагом

Если хочешь, я могу следующим сообщением подготовить ещё 2 артефакта:
1. **frontend-ready JSON/TypeScript contracts** по всем ключевым DTO;
2. **матрицу экранов и действий по ролям**: `CUSTOMER / RECEPTIONIST / MECHANIC / MANAGER / ADMIN`.
