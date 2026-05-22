# Employee Availability API Contract

Этот документ описывает API под фронтенд для поиска сотрудников с учетом доступности на временной слот заказа.

Цель: дать форме создания/редактирования заказа возможность:
- выбирать сотрудника по роли;
- фильтровать сотрудников по тексту;
- видеть, кто свободен на нужное время;
- понимать, почему сотрудник недоступен;
- корректно обрабатывать серверные ошибки при конфликте слотов.

---

## Base URL

- Backend base URL: `/api/employees`

---

## Авторизация

Для этого API нужен bearer token.

```http
Authorization: Bearer <token>
```

Доступ разрешён ролям:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

---

## Endpoint

## `GET /api/employees/availability-search`

Ищет сотрудников по роли и тексту и одновременно считает их доступность на выбранный слот.

---

## Query Parameters

### `plannedVisitAt`
- тип: `string`
- формат: `ISO 8601 datetime`
- обязательное поле

Пример:
- `2026-05-20T10:00:00Z`

### `slotMinutes`
- тип: `number`
- обязательное поле
- должно быть больше `0`

Пример:
- `60`
- `90`
- `120`

### `roles`
- тип: повторяемый query param или список enum значений
- необязательное поле
- допустимые значения:
  - `ADMIN`
  - `MANAGER`
  - `MECHANIC`
  - `RECEPTIONIST`

Примеры:
- `roles=MECHANIC`
- `roles=MECHANIC&roles=MANAGER`

Если `roles` не передан, backend по умолчанию ищет среди:
- `MECHANIC`
- `MANAGER`

### `query`
- тип: `string`
- необязательное поле
- поиск выполняется по:
  - `firstName`
  - `lastName`
  - `email`
- поиск case-insensitive
- поиск работает по `contains`, а не только по префиксу

Примеры:
- `query=petr`
- `query=ivanov`
- `query=mech@`

### `limit`
- тип: `number`
- необязательное поле
- значение по умолчанию: `20`
- backend ограничивает диапазон `1..100`

---

## Примеры запросов

### Найти механиков на слот

```http
GET /api/employees/availability-search?plannedVisitAt=2026-05-20T10:00:00Z&slotMinutes=90&roles=MECHANIC
```

### Найти механиков и менеджеров на слот

```http
GET /api/employees/availability-search?plannedVisitAt=2026-05-20T10:00:00Z&slotMinutes=90&roles=MECHANIC&roles=MANAGER
```

### Найти механиков по текстовому фильтру

```http
GET /api/employees/availability-search?plannedVisitAt=2026-05-20T10:00:00Z&slotMinutes=60&roles=MECHANIC&query=petr
```

### Уменьшить размер выдачи

```http
GET /api/employees/availability-search?plannedVisitAt=2026-05-20T10:00:00Z&slotMinutes=60&roles=MECHANIC&limit=10
```

---

## Response Format

### Success Response

`200 OK`

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
    "availabilityReason": "FREE",
    "nextConflict": null
  },
  {
    "id": 9,
    "firstName": "Alexey",
    "lastName": "Sidorov",
    "email": "alexey@example.com",
    "function": "MECHANIC",
    "available": false,
    "conflictingOrdersCount": 2,
    "availabilityReason": "HAS_OVERLAPPING_ORDER",
    "nextConflict": {
      "orderId": 155,
      "plannedVisitAt": "2026-05-20T10:30:00Z",
      "slotMinutes": 60,
      "status": "ACCEPTED"
    }
  }
]
```

---

## Response Fields

### Employee fields

- `id` — `number`
- `firstName` — `string`
- `lastName` — `string`
- `email` — `string | null`
- `function` — enum:
  - `ADMIN`
  - `MANAGER`
  - `MECHANIC`
  - `RECEPTIONIST`

### Availability fields

- `available` — `boolean`
  - `true` = сотрудник свободен на слот
  - `false` = есть пересечение с другим заказом

- `conflictingOrdersCount` — `number`
  - количество конфликтующих заказов
  - если `0`, сотрудник считается свободным

- `availabilityReason` — `string`
  - текущее значение:
    - `FREE`
    - `HAS_OVERLAPPING_ORDER`

- `nextConflict` — `object | null`
  - ближайший конфликтующий заказ
  - если сотрудник свободен, значение `null`

### `nextConflict` fields

- `orderId` — `number`
- `plannedVisitAt` — `ISO datetime`
- `slotMinutes` — `number`
- `status` — `OrderStatus`

---

## Sorting Rules

Backend уже сортирует результат для удобства UI.

Порядок:
1. сначала `available = true`
2. затем сотрудники с меньшим числом конфликтов
3. затем по роли
4. затем по `lastName`
5. затем по `firstName`
6. затем по `id`

Это значит, что фронту не нужно дополнительно пересортировывать результат, если устраивает серверный ranking.

---

## What “available” means

Backend считает сотрудника занятым, если найден хотя бы один заказ:
- назначенный на этого сотрудника;
- находящийся в активном booking-like статусе;
- пересекающийся с выбранным временным интервалом.

Используемые статусы:
- `WAITING_FOR_VISIT`
- `ACCEPTED`
- `DIAGNOSIS_IN_PROGRESS`
- `WAITING_FOR_OWNER_APPROVAL`
- `WAITING_FOR_PART`
- `REPAIR_IN_PROGRESS`
- `READY_FOR_OWNER`

---

## UI Recommendations

### Когда вызывать endpoint

Вызывать availability search, когда пользователь уже выбрал:
- дату/время визита;
- длительность слота.

### Когда не вызывать endpoint

Не вызывать availability search, если:
- `plannedVisitAt` ещё не выбран;
- `slotMinutes` пустой или `<= 0`

### Как показывать статус в UI

Рекомендуется:
- `available = true` → зелёный статус `Свободен`
- `available = false` → красный статус `Занят`
- если есть `nextConflict`, показывать:
  - номер заказа
  - время конфликта
  - статус заказа

Пример UX-текста:
- `Свободен`
- `Занят: заказ #155, 10:30, ACCEPTED`

### Рекомендуемое поведение выбора

- свободных сотрудников можно выбирать сразу
- занятых сотрудников лучше:
  - либо блокировать в UI;
  - либо показывать, но не давать сохранить заказ без дополнительного действия

---

## Important Backend Constraint

Этот endpoint — только read-model подсказка.

Даже если availability search вернул `available = true`, backend всё равно повторно проверяет конфликт на запись при:
- `POST /api/orders`
- `POST /api/orders/drop-off`
- `PUT /api/orders/{id}/assign`
- `PUT /api/orders/{id}` при изменениях, затрагивающих слот

Это защита от race condition, если за время между поиском и сохранением другой пользователь уже занял сотрудника.

---

## Ошибки этого endpoint

### Missing `plannedVisitAt`

`400 Bad Request`

Пример:

```json
{
  "timestamp": "2026-05-14T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "plannedVisitAt is required",
  "path": "/api/employees/availability-search"
}
```

### Invalid `slotMinutes`

`400 Bad Request`

Пример:

```json
{
  "timestamp": "2026-05-14T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "slotMinutes must be greater than zero",
  "path": "/api/employees/availability-search"
}
```

### Access denied

`403 Forbidden`

Если пользователь не имеет одной из разрешённых ролей.

---

## Ошибки при сохранении заказа

Даже если availability search отработал успешно, на сохранении заказа может прийти ошибка конфликта слота.

### Conflict on create / assign / update

`409 Conflict`

Пример:

```json
{
  "timestamp": "2026-05-14T10:05:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "Employee is not available for the selected time slot",
  "path": "/api/orders"
}
```

### Что делать фронту

Если пришёл такой ответ:
- показать пользователю сообщение;
- повторно запросить `GET /api/employees/availability-search`;
- предложить выбрать другого сотрудника.

---

## Recommended Frontend Types

Пример TypeScript-типа:

```ts
export type EmployeeFunction = 'ADMIN' | 'MANAGER' | 'MECHANIC' | 'RECEPTIONIST'

export type OrderStatus =
  | 'WAITING_FOR_VISIT'
  | 'ACCEPTED'
  | 'DIAGNOSIS_IN_PROGRESS'
  | 'WAITING_FOR_OWNER_APPROVAL'
  | 'WAITING_FOR_PART'
  | 'REPAIR_IN_PROGRESS'
  | 'READY_FOR_OWNER'
  | 'NEW'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'HANDED_OVER'
  | 'CANCELLED_NO_SHOW'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_INTERNAL'

export type EmployeeAvailabilityItem = {
  id: number
  firstName: string
  lastName: string
  email: string | null
  function: EmployeeFunction
  available: boolean
  conflictingOrdersCount: number
  availabilityReason: 'FREE' | 'HAS_OVERLAPPING_ORDER'
  nextConflict: {
    orderId: number
    plannedVisitAt: string
    slotMinutes: number
    status: OrderStatus
  } | null
}
```

---

## Recommended Frontend Request Builder

Пример запроса через `URLSearchParams`:

```ts
const params = new URLSearchParams()
params.set('plannedVisitAt', plannedVisitAt)
params.set('slotMinutes', String(slotMinutes))
params.set('limit', '20')
for (const role of roles) {
  params.append('roles', role)
}
if (query?.trim()) {
  params.set('query', query.trim())
}

const response = await fetch(`/api/employees/availability-search?${params.toString()}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
```

---

## Typical Frontend Flow

### Create order screen

1. Пользователь выбирает дату и время
2. Пользователь выбирает длительность
3. Фронт вызывает availability search
4. Фронт показывает список сотрудников
5. Пользователь выбирает сотрудника
6. Фронт отправляет `POST /api/orders`
7. Если пришёл `409`, фронт перезапрашивает availability search

### Reassign employee flow

1. Пользователь меняет сотрудника у существующего заказа
2. Фронт вызывает availability search на текущий слот заказа
3. Показывает свободных сотрудников
4. Отправляет `PUT /api/orders/{id}/assign`
5. При `409` показывает конфликт и обновляет список

---

## Current Limitations

На текущем этапе backend учитывает только конфликты по заказам.

Backend пока не учитывает:
- рабочие смены;
- выходные;
- отпуска;
- capacity сотрудника;
- загрузку по постам/подъёмникам.

Поэтому `available = true` сейчас означает:
- `у сотрудника нет пересекающегося заказа`

а не:
- `сотрудник гарантированно работает в эту смену`.

---

## Summary

Для формы заказа фронту нужно использовать:
- `GET /api/employees/availability-search` — для подбора сотрудника на слот
- `POST /api/orders` / `POST /api/orders/drop-off` / `PUT /api/orders/{id}/assign` — для финального сохранения

Availability search помогает выбрать кандидата,
но окончательная проверка доступности всё равно происходит на backend при записи.
