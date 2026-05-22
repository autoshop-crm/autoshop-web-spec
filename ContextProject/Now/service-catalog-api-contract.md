# Service Catalog API Contract

Этот документ описывает контракт взаимодействия фронтенда с API каталога услуг и групп услуг.

Цель: чтобы фронтенд мог без догадок реализовать экран настроек CRM для:
- создания группы услуг;
- получения списка групп;
- создания конкретной услуги;
- обновления конкретной услуги;
- получения списка услуг.

Все примеры ниже основаны на текущей реализации бэкенда.

## Base URL

- Backend base URL: `/api/service-catalog`

Примеры ниже даны относительно этого префикса.

## Авторизация

Все endpoints этого раздела доступны только пользователю с ролью `ADMIN`.

Необходимо передавать header:

```http
Authorization: Bearer <token>
```

## Content-Type

Для `POST` и `PUT` использовать:

```http
Content-Type: application/json
```

## Naming convention

Бэкенд ожидает JSON поля в `camelCase`.

Правильно:
- `basePrice`
- `categoryId`
- `defaultDurationMinutes`
- `inspectionItems`

Неправильно:
- `base_price`
- `category_id`
- `default_duration_minutes`
- `inspection_items`

---

# 1. Группы услуг

## 1.1 Создать группу услуг

### Request

`POST /categories`

### Body

```json
{
  "name": "Техническое обслуживание",
  "displayOrder": 10,
  "active": true
}
```

### Fields

- `name` — `string`, обязательное, не пустое, максимум `100` символов
- `displayOrder` — `number | null`, необязательное
- `active` — `boolean | null`, необязательное, если не передано — станет `true`

### Success Response

`201 Created`

```json
{
  "id": 1,
  "name": "Техническое обслуживание",
  "displayOrder": 10,
  "active": true
}
```

### Validation Notes

Запрос вернёт `400 Bad Request`, если:
- `name` отсутствует;
- `name` пустая строка;
- `name` длиннее `100` символов.

---

## 1.2 Получить список групп услуг

### Request

`GET /categories?activeOnly=true`

### Query Params

- `activeOnly` — `boolean`, необязательный, по умолчанию `true`

### Success Response

`200 OK`

```json
[
  {
    "id": 1,
    "name": "Техническое обслуживание",
    "displayOrder": 10,
    "active": true
  },
  {
    "id": 2,
    "name": "Диагностика",
    "displayOrder": 20,
    "active": true
  }
]
```

### Frontend Usage

Этот endpoint нужно использовать:
- для загрузки списка групп в селекте;
- для отображения списка групп в настройках;
- перед созданием услуги, если пользователь должен выбрать группу.

---

# 2. Услуги

## 2.1 Создать услугу

### Request

`POST /services`

### Minimal Body

Минимально допустимый запрос:

```json
{
  "name": "Замена масла",
  "basePrice": 2500.00
}
```

### Full Body

```json
{
  "name": "Замена масла",
  "description": "Замена масла и масляного фильтра",
  "basePrice": 2500.00,
  "categoryId": 1,
  "active": true,
  "defaultDurationMinutes": 60,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка масляного фильтра"
  ]
}
```

### Fields

- `name` — `string`, обязательное, не пустое, максимум `100` символов
- `description` — `string | null`, необязательное, максимум `255` символов
- `basePrice` — `number`, обязательное, должно быть `>= 0`
- `categoryId` — `number | null`, необязательное
- `active` — `boolean | null`, необязательное, если не передано — станет `true`
- `defaultDurationMinutes` — `number | null`, необязательное
- `inspectionItems` — `string[] | null`, необязательное

### Important Rules

#### Услуга может быть без группы

Если группа не выбрана, можно отправлять:

```json
{
  "name": "Компьютерная диагностика",
  "basePrice": 1500.00,
  "categoryId": null
}
```

Также можно вообще не отправлять `categoryId`.

#### Если группа выбрана

`categoryId` должен ссылаться на реально существующую группу.

Если передать несуществующий `categoryId`, бэкенд вернёт ошибку.

#### Пустые inspection items недопустимы

Нельзя отправлять:

```json
{
  "name": "Замена масла",
  "basePrice": 2500.00,
  "inspectionItems": [""]
}
```

Каждый элемент массива должен быть непустой строкой.

### Success Response

`201 Created`

```json
{
  "id": 5,
  "name": "Замена масла",
  "description": "Замена масла и масляного фильтра",
  "basePrice": 2500.00,
  "active": true,
  "categoryId": 1,
  "categoryName": "Техническое обслуживание",
  "defaultDurationMinutes": 60,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка масляного фильтра"
  ]
}
```

### Common 400 Causes

Запрос на создание услуги вернёт `400 Bad Request`, если:
- `name` отсутствует;
- `name` пустой;
- `basePrice` отсутствует;
- `basePrice` меньше `0`;
- `inspectionItems` содержит пустую строку;
- фронтенд отправляет поля не в `camelCase`, и нужные поля не маппятся в DTO.

### Common Client Mistakes

Частые ошибки на фронте:

1. Отправляется `base_price` вместо `basePrice`
2. Отправляется `category_id` вместо `categoryId`
3. Отправляется `categoryId: ""` вместо `null`
4. Отправляется `basePrice: ""`
5. Отправляется `inspectionItems: [""]`
6. Отправляется `name: "   "`

### Frontend Recommendation

Перед отправкой формы:
- trim для `name`;
- trim для `description`;
- trim для каждого `inspectionItems`;
- удалять пустые элементы из `inspectionItems`;
- если группа не выбрана, отправлять `categoryId: null` или не отправлять поле вообще;
- `basePrice` отправлять числом, а не строкой, если ваша клиентская библиотека позволяет это контролировать.

---

## 2.2 Обновить услугу

### Request

`PUT /services/{id}`

### Example

`PUT /services/5`

```json
{
  "name": "Замена масла Premium",
  "description": "Замена масла, фильтра и базовая проверка",
  "basePrice": 3200.00,
  "categoryId": 1,
  "active": true,
  "defaultDurationMinutes": 75,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка фильтра",
    "Проверка подтеков"
  ]
}
```

### Success Response

`200 OK`

```json
{
  "id": 5,
  "name": "Замена масла Premium",
  "description": "Замена масла, фильтра и базовая проверка",
  "basePrice": 3200.00,
  "active": true,
  "categoryId": 1,
  "categoryName": "Техническое обслуживание",
  "defaultDurationMinutes": 75,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка фильтра",
    "Проверка подтеков"
  ]
}
```

### Notes

- Контракт обновления такой же, как у создания
- Если передать `inspectionItems`, старые пункты будут заменены новым списком полностью
- Если передать `inspectionItems: null`, пункты инспекции будут удалены

---

## 2.3 Получить список услуг

### Request

`GET /services?activeOnly=true`

или

`GET /services?activeOnly=true&categoryId=1`

### Query Params

- `activeOnly` — `boolean`, необязательный, по умолчанию `true`
- `categoryId` — `number`, необязательный

### Success Response

`200 OK`

```json
[
  {
    "id": 5,
    "name": "Замена масла",
    "description": "Замена масла и масляного фильтра",
    "basePrice": 2500.00,
    "active": true,
    "categoryId": 1,
    "categoryName": "Техническое обслуживание",
    "defaultDurationMinutes": 60,
    "inspectionItems": [
      "Проверка уровня масла",
      "Проверка масляного фильтра"
    ]
  }
]
```

### Frontend Usage

Этот endpoint подходит для:
- списка услуг в настройках;
- фильтрации услуг по группе;
- заполнения справочника услуг в CRM.

---

# 3. Формат ошибок

При ошибке бэкенд возвращает JSON следующего вида:

```json
{
  "timestamp": "2026-05-14T05:56:57.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "basePrice: must not be null",
  "path": "/api/service-catalog/services"
}
```

## Поля ответа ошибки

- `timestamp` — время ошибки
- `status` — HTTP status code
- `error` — текстовый статус
- `message` — главное поле для UI и отладки
- `path` — endpoint, на котором произошла ошибка

## Что показывать на фронте

Для первичной отладки и временно для админки можно показывать `message` как есть.

Примеры:
- `name: must not be blank`
- `basePrice: must not be null`
- `inspectionItems[0]: must not be blank`

---

# 4. Рекомендуемый контракт формы на фронте

Рекомендуемая модель формы:

```ts
type ServiceCatalogForm = {
  name: string
  description: string
  basePrice: number | null
  categoryId: number | null
  active: boolean
  defaultDurationMinutes: number | null
  inspectionItems: string[]
}
```

## Нормализация перед submit

Перед `POST`/`PUT` рекомендуется делать:

1. `name = name.trim()`
2. `description = description.trim()`
3. `inspectionItems = inspectionItems.map(trim).filter(notEmpty)`
4. если `categoryId` пустой в UI, преобразовывать в `null`
5. если `defaultDurationMinutes` пустой, преобразовывать в `null`
6. если `basePrice` пустой, не отправлять запрос и показывать валидацию на фронте

Пример нормализованного payload:

```json
{
  "name": "Замена масла",
  "description": "Замена масла и фильтра",
  "basePrice": 2500,
  "categoryId": 1,
  "active": true,
  "defaultDurationMinutes": 60,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка фильтра"
  ]
}
```

---

# 5. Рекомендуемый сценарий загрузки экрана настроек

## При открытии экрана

1. Запросить группы:
   - `GET /api/service-catalog/categories?activeOnly=true`
2. Запросить услуги:
   - `GET /api/service-catalog/services?activeOnly=true`

## При создании услуги

1. Пользователь заполняет форму
2. Фронт нормализует значения
3. Фронт отправляет `POST /api/service-catalog/services`
4. После успеха:
   - либо добавить запись в локальный state;
   - либо перезапросить `GET /api/service-catalog/services`

## При редактировании услуги

1. Фронт открывает текущие данные
2. После изменения отправляет `PUT /api/service-catalog/services/{id}`
3. После успеха обновляет список

---

# 6. Checklist для фронтенда

Перед интеграцией убедиться, что:

- запросы идут на `/api/service-catalog/...`
- поля отправляются в `camelCase`
- `name` всегда непустой
- `basePrice` всегда заполнен
- `categoryId` при отсутствии группы равен `null`, а не `""`
- пустые элементы `inspectionItems` удаляются
- UI показывает `message` из error response

---

# 7. Самые полезные примеры

## Создать группу

```http
POST /api/service-catalog/categories
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "name": "Диагностика",
  "displayOrder": 20,
  "active": true
}
```

## Создать услугу без группы

```http
POST /api/service-catalog/services
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "name": "Компьютерная диагностика",
  "basePrice": 1500.00,
  "categoryId": null,
  "active": true
}
```

## Создать услугу с группой

```json
{
  "name": "Замена масла",
  "description": "Замена масла и фильтра",
  "basePrice": 2500.00,
  "categoryId": 1,
  "active": true,
  "defaultDurationMinutes": 60,
  "inspectionItems": [
    "Проверка уровня масла",
    "Проверка фильтра"
  ]
}
```

## Получить услуги только по группе

```http
GET /api/service-catalog/services?activeOnly=true&categoryId=1
Authorization: Bearer <token>
```

