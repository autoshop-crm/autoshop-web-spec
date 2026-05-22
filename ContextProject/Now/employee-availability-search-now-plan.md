# Employee Availability Search — NOW Plan

## Now

Реализовать поиск сотрудников для оформления заказа так, чтобы фронтенд мог:
- искать сотрудников не только по email, но и по роли;
- передавать желаемый слот заказа;
- видеть, свободен ли сотрудник на этот слот;
- понимать причину недоступности;
- безопасно назначать сотрудника без скрытых конфликтов.

Решение должно быть пригодно для роста данных и не должно строиться на N+1 запросах.

---

## Desired Outcome

После реализации пользователь на экране создания/редактирования заказа сможет:
- выбрать роль сотрудника, например `MECHANIC`;
- указать дату/время начала и длительность слота;
- получить список сотрудников, отсортированный по доступности;
- видеть сотрудников как `available` / `busy`;
- при необходимости видеть краткую информацию о конфликте;
- получать серверную валидацию, если сотрудник стал занят между поиском и сохранением.

---

## Scope

Входит в реализацию:
- новый read endpoint для поиска сотрудников по роли и доступности;
- вычисление занятости по слотам заказов;
- сортировка выдачи по доступности и роли;
- серверная защита от конфликтного назначения;
- тесты на поиск и на race-condition-like проверки на уровне сервиса;
- индексы и запросы, рассчитанные на рост объема заказов.

Не входит в первую итерацию:
- полноценные смены, графики работы, выходные, отпуска;
- capacity per mechanic;
- сложное расписание по постам/подъемникам;
- materialized views и отдельные read-model таблицы, если не подтвердится необходимость по нагрузке.

---

## Product Rules

### Rule 1. Что означает “сотрудник свободен”

Сотрудник считается свободным, если у него нет активного заказа, интервал которого пересекается с запрошенным слотом.

### Rule 2. Какие заказы участвуют в проверке занятости

В проверке участвуют только статусы, которые уже считаются booking-like в текущей системе:
- `WAITING_FOR_VISIT`
- `ACCEPTED`
- `DIAGNOSIS_IN_PROGRESS`
- `WAITING_FOR_OWNER_APPROVAL`
- `WAITING_FOR_PART`
- `REPAIR_IN_PROGRESS`
- `READY_FOR_OWNER`

### Rule 3. Формула пересечения слотов

Для запрошенного интервала:
- `requestedStart = plannedVisitAt`
- `requestedEnd = plannedVisitAt + slotMinutes`

Для существующего заказа:
- `existingStart = planned_visit_at`
- `existingEnd = planned_visit_at + planned_slot_minutes`

Конфликт есть, если:
- `existingStart < requestedEnd`
- `existingEnd > requestedStart`

### Rule 4. Null duration

Для первой версии нужно явно зафиксировать поведение, если у заказа `plannedSlotMinutes = null`.

Рекомендуемое правило:
- для поиска доступности не считать такой заказ “безвредным”;
- использовать fallback duration, например из выбранных услуг или системный дефолт;
- если fallback невозможен, считать заказ потенциально конфликтным и помечать его как `busy-unknown-duration`.

### Rule 5. Финальная защита обязательна

Даже если поиск показал, что сотрудник свободен, перед созданием/назначением заказа сервер обязан повторно проверить конфликт.

---

## API Plan

## Endpoint 1. Employee availability search

### Proposal

`GET /api/employees/availability-search`

### Query params

- `query` — необязательный текстовый фильтр
- `roles` — необязательный список ролей, например `MECHANIC,MANAGER`
- `plannedVisitAt` — обязательный `ISO date-time`
- `slotMinutes` — обязательное положительное число
- `limit` — необязательный лимит
- `includeConflictDetails` — необязательный флаг

### Example

```http
GET /api/employees/availability-search?query=pet&roles=MECHANIC&plannedVisitAt=2026-05-20T10:00:00Z&slotMinutes=90&limit=20
```

### Response shape

```json
[
  {
    "id": 7,
    "firstName": "Petr",
    "lastName": "Ivanov",
    "email": "petr@example.com",
    "function": "MECHANIC",
    "available": true,
    "conflictingOrdersCount": 0,
    "nextConflict": null,
    "availabilityReason": "FREE"
  },
  {
    "id": 9,
    "firstName": "Alexey",
    "lastName": "Sidorov",
    "email": "alexey@example.com",
    "function": "MECHANIC",
    "available": false,
    "conflictingOrdersCount": 2,
    "nextConflict": {
      "orderId": 155,
      "plannedVisitAt": "2026-05-20T10:30:00Z",
      "slotMinutes": 60,
      "status": "ACCEPTED"
    },
    "availabilityReason": "HAS_OVERLAPPING_ORDER"
  }
]
```

### Sorting rules

Рекомендуемая сортировка результата:
1. `available = true` выше `available = false`
2. сначала сотрудники нужной роли
3. меньшее число конфликтов выше
4. затем `lastName`, `firstName`, `id`

---

## Endpoint 2. Final assignment validation

Нужно добавить повторную серверную проверку при:
- `POST /api/orders`
- `POST /api/orders/drop-off`
- `PUT /api/orders/{id}/assign`
- возможно `PUT /api/orders/{id}` при изменении `employeeId`, `plannedVisitAt`, `plannedSlotMinutes`

Если найден конфликт слотов, сервер должен вернуть ошибку доменного уровня с ясным сообщением.

Пример:
- `409 Conflict`
- `Employee is not available for the selected time slot`

---

## Backend Design Plan

## Phase 1. New read contract

### Goal

Вынести availability search в отдельный endpoint, не ломая текущий email-only поиск.

### Tasks

- добавить новый controller method для availability search;
- добавить новый service method;
- не перегружать существующий `GET /api/employees/search?query=...`;
- сохранить backward compatibility текущего простого поиска.

### Why

Текущий endpoint заточен только под email-prefix и не подходит как универсальный поиск сотрудников на слот.

---

## Phase 2. Query model for availability

### Goal

Сделать один агрегированный запрос, который для набора сотрудников сразу считает признак занятости.

### Tasks

- расширить employee repository или создать read-only custom repository;
- реализовать SQL/JPQL/native query для:
  - фильтра по роли;
  - фильтра по тексту;
  - вычисления пересечений слотов;
  - подсчета конфликтов;
  - возврата краткой conflict info;
- убедиться, что логика не делает запрос по каждому сотруднику отдельно.

### Important

Нельзя делать так:
- получить 50 сотрудников;
- для каждого вызывать отдельный запрос в `orders`.

Это даст N+1 и плохо масштабируется.

---

## Phase 3. Availability domain rules

### Goal

Централизовать правило определения конфликтного слота.

### Tasks

- создать единое правило overlap-check;
- использовать его и в read-path, и в write-path;
- определить политику для `plannedSlotMinutes = null`;
- определить, какие роли считаются assignable;
- определить, должны ли `MANAGER` участвовать в availability search по умолчанию или только по запросу.

### Recommendation

По умолчанию для заказа показывать в первую очередь `MECHANIC`, а `MANAGER` включать только при явном выборе или отдельном фильтре.

---

## Phase 4. Write-side protection

### Goal

Не допустить назначение сотрудника в уже занятый слот.

### Tasks

- перед созданием заказа с `employeeId` проверить слот;
- перед immediate drop-off с `employeeId` проверить слот, если используется planned slot логика;
- перед assign/update повторно проверить конфликт;
- исключать текущий заказ из проверки при update/assign;
- при конфликте возвращать доменную ошибку `409 Conflict`.

### Important

Это обязательная защита от гонок, когда между поиском и сохранением другой оператор уже назначил сотрудника.

---

## Phase 5. DTO and response design

### Goal

Сделать ответ удобным для фронта без дополнительной бизнес-логики в UI.

### Tasks

- добавить response DTO для employee availability search;
- включить поля:
  - базовая карточка сотрудника;
  - `available`
  - `conflictingOrdersCount`
  - `availabilityReason`
  - опционально `nextConflict`
- если надо, добавить `displayName` на backend side, чтобы не собирать имя на фронте.

### Recommendation

На первом этапе не возвращать весь список конфликтующих заказов — только count и ближайший конфликт. Это уменьшит размер ответа.

---

## Database and Query Optimization Plan

## Current schema strengths

Уже есть полезные поля:
- `orders.employee_id`
- `orders.planned_visit_at`
- `orders.planned_slot_minutes`
- `orders.status`

Уже есть индексы:
- `idx_orders_planned_visit_at`
- `idx_orders_status_planned_visit_at`
- `idx_orders_employee_status`

## Gaps

Для overlap-search этого может не хватить при высоком объеме данных, потому что нам нужен поиск по:
- `employee_id`
- `status`
- `planned_visit_at`
- логике вычисляемого конца интервала

## Recommended optimization path

### Step 1

Начать с одного оптимизированного SQL-запроса и существующих индексов.

### Step 2

Если данные растут, добавить индекс, который лучше поддерживает availability query, например по сочетанию:
- `employee_id`
- `planned_visit_at`
- `status`

### Step 3

Если overlap-логика станет узким местом, рассмотреть:
- computed end timestamp;
- функциональный индекс;
- отдельную read-model таблицу занятости;
- PostgreSQL range types и GiST index.

### Recommendation for scale-first design

Если ожидается большой объем слотов и активных заказов, наиболее перспективная архитектура — хранить или вычислять диапазон интервала как first-class значение, а не каждый раз пересчитывать только на лету.

---

## Frontend Integration Plan

## Search UX

Форма заказа должна уметь:
- выбрать дату/время;
- выбрать длительность;
- выбрать роль исполнителя;
- вызвать availability search;
- показать свободных сверху;
- явно подсветить занятых;
- блокировать выбор занятых или требовать явного override, если это допустимо бизнесом.

## Empty state behavior

Если слот ещё не выбран:
- не делать availability search;
- можно показывать только базовый список сотрудников по роли.

## Re-query behavior

При изменении:
- даты/времени;
- длительности;
- роли;
- текстового фильтра

фронт должен перевызывать availability search.

## Display recommendation

Для занятого сотрудника показывать:
- статус `Занят`
- ближайший конфликт: время + номер заказа
- при желании текст `Свободен после 11:30`

---

## Testing Plan

## Unit tests

Покрыть:
- пересечение интервалов;
- отсутствие пересечения на границе;
- null duration policy;
- сортировку `available first`;
- фильтрацию по ролям;
- фильтрацию по тексту.

## Repository tests

Покрыть:
- availability query на PostgreSQL;
- реальные пересечения слотов;
- несколько конфликтов у одного сотрудника;
- исключение текущего заказа при update;
- корректность сортировки и лимита.

## Service tests

Покрыть:
- выдачу DTO для фронта;
- поведение при пустом результате;
- повторную защиту при create/assign/update.

## Integration tests

Покрыть сценарии:
- сотрудник свободен на слот;
- сотрудник занят на слот;
- фронт нашёл свободного, но к моменту сохранения слот занят;
- менеджер и ресепшен могут читать availability search;
- механик может читать availability search, если это разрешено security.

---

## Security Plan

Нужно определить, кто может пользоваться availability search.

Рекомендуемый доступ:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC` — если механик тоже должен видеть доступность команды

Редактирование сотрудников и каталога ролей не требуется.

---

## Risks

## Risk 1. Нет модели смен

Сейчас можно вычислить только “нет пересекающихся заказов”, но нельзя честно сказать, работает ли сотрудник в эту смену.

### Mitigation

В первой версии явно называть это “доступность по заказам”, а не “рабочая смена подтверждена”.

## Risk 2. Null plannedSlotMinutes

Часть заказов может не иметь длительности, и это ломает точность.

### Mitigation

Зафиксировать fallback policy и покрыть тестами.

## Risk 3. N+1 и медленный список сотрудников

Наивная реализация может быть быстрой на dev и плохой в production.

### Mitigation

Сразу делать агрегированный запрос в БД.

## Risk 4. Race condition

Сотрудник может стать занятым после поиска, но до сохранения.

### Mitigation

Повторная серверная проверка перед записью обязательна.

## Risk 5. Непонятный UX для занятых сотрудников

Если показывать занятых без объяснения, пользователь не поймет причину.

### Mitigation

Возвращать `availabilityReason` и ближайший конфликт.

---

## Delivery Sequence

## Iteration 1

- отдельный endpoint availability search;
- фильтр по ролям;
- расчёт `available/busy`;
- сортировка свободных выше занятых;
- write-side validation на create/assign/update;
- базовые тесты.

## Iteration 2

- conflict details в ответе;
- улучшенный ranking;
- оптимизация индексов по фактическим query plans;
- уточнение правил для null duration.

## Iteration 3

- рабочие смены;
- отпуска;
- capacity;
- посты/подъёмники;
- полноценное планирование загрузки команды.

---

## Definition of Done

Задача считается завершенной, когда:
- есть отдельный endpoint availability search;
- можно фильтровать по роли;
- можно передавать слот и получать `available/busy`;
- поиск не делает N+1 по сотрудникам;
- create/assign/update валидируют конфликт слотов на записи;
- есть тесты на overlap-логику и race-like сценарии;
- менеджер и ресепшен могут использовать этот поиск при оформлении заказа;
- UI получает понятный контракт ответа.

---

## Recommended First Implementation Decision

Для первой реализации оптимально выбрать следующий путь:
- не менять старый `/api/employees/search`;
- добавить новый endpoint availability search;
- делать расчёт занятости в одном SQL-запросе;
- возвращать compact response;
- обязательно проверять конфликт повторно на write path.

Это лучше всего соответствует текущей архитектуре проекта и минимизирует риск деградации на больших данных.
