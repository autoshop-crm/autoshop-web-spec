# Автозапчасти: API и работа с ними на frontend

Дата: 2026-05-12

## Цель документа
Этот документ описывает backend API по автозапчастям в `autoshop-core`, чтобы frontend мог корректно реализовать:
- список и поиск запчастей;
- создание и редактирование складских позиций;
- обновление остатков;
- добавление запчастей в заказ;
- поиск внешних запчастей;
- работу с каталогом UMAPI по автомобилю или по заказу.

Документ собран по текущему коду backend и ориентирован на frontend-интеграцию.

---

# 1. Роли доступа

Доступ к parts API определяется в security-конфигурации.

Источник:
- `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:94`
- `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:95`
- `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:96`
- `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:97`

## READ endpoints по запчастям
Доступны ролям:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

Это относится к:
- `GET /api/parts`
- `GET /api/parts/{id}`
- `GET /api/parts/external/search`
- `GET /api/parts/catalog/**`
- `GET /api/orders/{orderId}/parts`
- `GET /api/orders/{orderId}/parts/catalog/**`

## WRITE endpoints по запчастям и складу
Доступны ролям:
- `ADMIN`
- `MANAGER`

Это относится к:
- `POST /api/parts`
- `PUT /api/parts/{id}`
- `PUT /api/parts/{id}/stock`
- `DELETE /api/parts/{id}`

## Работа с запчастями внутри заказа
Права немного шире.

### Просмотр запчастей заказа
Доступны:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Добавление / изменение / удаление запчастей заказа
Доступны:
- `ADMIN`
- `MANAGER`
- `MECHANIC`

`RECEPTIONIST` не может менять состав запчастей заказа.

---

# 2. Основные части parts API
Функциональность делится на 5 блоков:

1. локальный склад запчастей;
2. запчасти внутри заказа;
3. внешний поиск запчастей;
4. каталог UMAPI по автомобилю;
5. каталог UMAPI по заказу.

---

# 3. Локальный склад запчастей

Основной controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/PartController.java:24`

## 3.1 Создать запчасть
### Endpoint
- `POST /api/parts`

### Доступ
- `ADMIN`
- `MANAGER`

### Request body

```json
{
  "brand": "BOSCH",
  "name": "Oil Filter",
  "articleNumber": "OF-12345",
  "cost": 550.00
}
```

### Поля
- `brand` — optional, max `20`
- `name` — required, max `50`
- `articleNumber` — required, max `30`
- `cost` — required, `>= 0`

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/PartCreateDTO.java:13`

### Что делает backend
- нормализует `articleNumber` в uppercase;
- проверяет уникальность `articleNumber`;
- создаёт запчасть со стартовыми значениями:
  - `stockQuantity = 0`
  - `reservedQuantity = 0`

Источник логики:
- `src/main/java/com/vladko/autoshopcore/parts/service/PartServiceImpl.java:30`

### Response
Возвращает `PartResponseDTO`.

Пример:

```json
{
  "id": 10,
  "brand": "BOSCH",
  "name": "Oil Filter",
  "articleNumber": "OF-12345",
  "cost": 550.00,
  "stockQuantity": 0,
  "reservedQuantity": 0,
  "availableQuantity": 0,
  "createdAt": "2026-05-12T09:00:00Z",
  "updatedAt": "2026-05-12T09:00:00Z"
}
```

### Frontend рекомендации
- после создания сразу перечитать карточку или список;
- `articleNumber` на frontend лучше показывать как case-insensitive input, потому что backend сам нормализует его;
- если backend вернёт conflict по артикулу, надо показывать пользователю понятную ошибку типа `Артикул уже существует`.

---

## 3.2 Получить запчасть по id
### Endpoint
- `GET /api/parts/{id}`

### Доступ
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Response
Возвращает `PartResponseDTO`.

### Когда нужен фронту
- карточка запчасти;
- открытие страницы редактирования;
- детальный просмотр из заказа.

---

## 3.3 Поиск / список локальных запчастей
### Endpoint
- `GET /api/parts`

### Доступ
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Query params
- `articleNumber` — optional
- `brand` — optional
- `name` — optional
- `availableOnly` — optional boolean

Источник controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/PartController.java:59`

### Как работает backend
Backend делает фильтрацию по:
- точному `articleNumber` после нормализации в uppercase;
- частичному `brand` без учёта регистра;
- частичному `name` без учёта регистра;
- `availableOnly = true` -> оставляет только позиции, где `stockQuantity - reservedQuantity > 0`

Источник:
- `src/main/java/com/vladko/autoshopcore/parts/service/PartServiceImpl.java:108`

### Важное замечание
Сейчас поиск локальных запчастей реализован через:
- `partRepository.findAll()`
- потом фильтрацию в памяти

Это значит:
- для небольшого склада всё ок;
- при росте данных может потребоваться pagination и поиск на уровне БД.

### Примеры запросов
- `GET /api/parts`
- `GET /api/parts?articleNumber=OF-12345`
- `GET /api/parts?brand=bosch`
- `GET /api/parts?name=filter`
- `GET /api/parts?availableOnly=true`
- `GET /api/parts?brand=bosch&availableOnly=true`

### Response
Возвращает массив `PartResponseDTO[]`.

### Frontend рекомендации
- для таблицы склада удобно использовать этот endpoint как основной список;
- `availableOnly=true` полезно для селектов в заказе;
- для UI-фильтров можно дать отдельные поля: артикул, бренд, название, только доступные.

---

## 3.4 Обновить запчасть
### Endpoint
- `PUT /api/parts/{id}`

### Доступ
- `ADMIN`
- `MANAGER`

### Request body

```json
{
  "brand": "BOSCH",
  "name": "Air Filter",
  "articleNumber": "AF-100",
  "cost": 720.00
}
```

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/PartUpdateDTO.java:12`

### Особенности
- все поля optional;
- обновляются только переданные поля;
- если меняется `articleNumber`, backend проверяет уникальность.

Источник:
- `src/main/java/com/vladko/autoshopcore/parts/service/PartServiceImpl.java:54`

### Frontend рекомендации
- можно делать как полную edit form, так и partial update form;
- если пользователь меняет артикул, важно показать backend conflict message.

---

## 3.5 Обновить остаток на складе
### Endpoint
- `PUT /api/parts/{id}/stock`

### Доступ
- `ADMIN`
- `MANAGER`

### Request body

```json
{
  "stockQuantity": 25
}
```

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/PartStockUpdateDTO.java:11`

### Как работает backend
- принимает только неотрицательное число;
- не позволяет поставить остаток меньше, чем `reservedQuantity`

Если новый `stockQuantity < reservedQuantity`, backend бросает ошибку:
- `Stock quantity cannot be lower than reserved quantity`

Источник:
- `src/main/java/com/vladko/autoshopcore/parts/service/PartServiceImpl.java:84`

### Frontend рекомендации
- на форме обновления склада полезно показывать:
  - `stockQuantity`
  - `reservedQuantity`
  - `availableQuantity`
- перед отправкой можно валидировать на фронте, что новый остаток не меньше зарезервированного, если эти данные уже есть в UI.

---

## 3.6 Удалить запчасть
### Endpoint
- `DELETE /api/parts/{id}`

### Доступ
- `ADMIN`
- `MANAGER`

### Как работает backend
Если запчасть уже используется в заказах, удалить её нельзя.
Backend вернёт conflict с сообщением вроде:
- `Part with id 'X' is already used in orders`

Источник:
- `src/main/java/com/vladko/autoshopcore/parts/service/PartServiceImpl.java:98`

### Frontend рекомендации
- перед удалением спрашивать подтверждение;
- если delete не удался из-за использования в заказах, показывать понятное сообщение, а не просто `500/409`.

---

# 4. Формат локальной запчасти

Основной response DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/PartResponseDTO.java`

Поля:
- `id`
- `brand`
- `name`
- `articleNumber`
- `cost`
- `stockQuantity`
- `reservedQuantity`
- `availableQuantity`
- `createdAt`
- `updatedAt`

### Frontend TypeScript пример

```ts
export interface PartDto {
  id: number;
  brand: string | null;
  name: string;
  articleNumber: string;
  cost: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string | null;
  updatedAt: string | null;
}
```

---

# 5. Запчасти внутри заказа

Основной controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderPartItemController.java:23`

Этот API нужен для работы с уже добавленными запчастями в конкретном заказе.

## 5.1 Получить список запчастей заказа
### Endpoint
- `GET /api/orders/{orderId}/parts`

### Доступ
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Response
Возвращает `OrderPartItemResponseDTO[]`.

Поля одного item:
- `id`
- `orderId`
- `partId`
- `articleNumber`
- `brand`
- `name`
- `quantity`
- `unitPrice`
- `lineTotal`

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/OrderPartItemResponseDTO.java:12`

### Frontend рекомендации
- это основной endpoint для таблицы запчастей в заказе;
- `lineTotal` уже приходит готовым, не нужно считать на frontend.

---

## 5.2 Добавить запчасть в заказ
### Endpoint
- `POST /api/orders/{orderId}/parts`

### Доступ
- `ADMIN`
- `MANAGER`
- `MECHANIC`

### Request body

```json
{
  "partId": 10,
  "quantity": 2
}
```

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/OrderPartItemCreateDTO.java:11`

### Что делает backend
- проверяет существование заказа;
- проверяет существование запчасти;
- резервирует количество на складе;
- добавляет строку запчасти в заказ.

### Frontend рекомендации
- для выбора лучше использовать локальный parts lookup с `availableOnly=true`;
- после добавления нужно перечитать список запчастей заказа и, если на экране есть складские остатки, обновить их тоже.

---

## 5.3 Изменить количество запчасти в заказе
### Endpoint
- `PUT /api/orders/{orderId}/parts/{itemId}`

### Доступ
- `ADMIN`
- `MANAGER`
- `MECHANIC`

### Request body

```json
{
  "quantity": 3
}
```

Источник DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/OrderPartItemUpdateDTO.java:11`

### Frontend рекомендации
- после изменения количества нужно обновлять таблицу items;
- на UI удобно давать inline quantity editor.

---

## 5.4 Удалить запчасть из заказа
### Endpoint
- `DELETE /api/orders/{orderId}/parts/{itemId}`

### Доступ
- `ADMIN`
- `MANAGER`
- `MECHANIC`

### Что делает backend
- удаляет строку запчасти из заказа;
- снимает резерв со склада.

### Frontend рекомендации
- после удаления надо перечитать items и остатки.

---

# 6. Внешний поиск запчастей

Controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/ExternalPartSearchController.java:13`

## Endpoint
- `GET /api/parts/external/search`

## Доступ
По security это GET под `/api/parts/**`, значит доступно:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

## Query params
- `articleNumber` — required
- `brand` — optional
- `limit` — optional
- `offset` — optional

Источник controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/ExternalPartSearchController.java:19`

## Response
Возвращает `ExternalPartSearchResponseDTO`:
- `articleNumber`
- `brand`
- `cached`
- `fallback`
- `cachedAt`
- `cacheExpiresAt`
- `items[]`

Каждый `items[]` элемент:
- `source`
- `umapiArticleId`
- `articleNumber`
- `brandId`
- `brand`
- `name`
- `shortDescription`
- `status`
- `mediaFile`

Источники DTO:
- `src/main/java/com/vladko/autoshopcore/parts/dto/ExternalPartSearchResponseDTO.java:13`
- `src/main/java/com/vladko/autoshopcore/parts/dto/ExternalPartCatalogItemResponseDTO.java:10`

## Frontend рекомендации
- использовать как отдельный таб/модал `Внешний поиск`;
- отображать `cached` и `fallback` как технические индикаторы только если это полезно внутренним пользователям;
- `mediaFile` можно использовать для карточки товара, если это валидный URL/путь.

---

# 7. Каталог UMAPI по автомобилю

Controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/CatalogPartSearchController.java:20`

Этот блок нужен для подбора запчастей по привязанному типу автомобиля и модификации.

## 7.1 Получить производителей
### Endpoint
- `GET /api/parts/catalog/manufacturers`

### Query params
- `type` — optional, default `PC`

### Доступ
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

---

## 7.2 Получить модельные серии
### Endpoint
- `GET /api/parts/catalog/model-series`

### Query params
- `type` — optional, default `PC`
- `manufacturerId` — required

---

## 7.3 Получить модификации
### Endpoint
- `GET /api/parts/catalog/modifications`

### Query params
- `type` — optional, default `PC`
- `modelSeriesId` — required

---

## 7.4 Искать товарные группы
### Endpoint
- `GET /api/parts/catalog/product-groups/search`

### Query params
- `type` — optional, default `PC`
- `modificationId` — required
- `query` — required

### Назначение
Этот endpoint нужен для текстового поиска категории детали по выбранной модификации автомобиля.

---

## 7.5 Искать статьи каталога
### Endpoint
- `GET /api/parts/catalog/articles`

### Query params
- `type` — optional, default `PC`
- `modificationId` — required
- `productGroupIds` — required list
- `supplierId` — optional
- `limit` — optional
- `offset` — optional

### Назначение
Получение конкретных каталожных артикулов по выбранным product group.

### Frontend рекомендации по каталогу
Типичный flow:
1. выбрать производителя;
2. выбрать модельную серию;
3. выбрать модификацию;
4. искать product groups по строке;
5. выбрать одну или несколько product groups;
6. загружать articles.

---

# 8. Каталог UMAPI по заказу

Controller:
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderCatalogPartSearchController.java:23`

Эти endpoints удобнее для order page, потому что frontend не обязан руками передавать `type` и `modificationId`.
Backend сам берёт их из автомобиля заказа.

## 8.1 Искать товарные группы по заказу
### Endpoint
- `GET /api/orders/{orderId}/parts/catalog/product-groups/search?query=...`

### Доступ
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Важная проверка backend
Если автомобиль заказа не связан с UMAPI-модификацией, backend вернёт ошибку:
- `Vehicle is not linked to UMAPI catalog modification`

Источник:
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderCatalogPartSearchController.java:64`

## 8.2 Искать статьи каталога по заказу
### Endpoint
- `GET /api/orders/{orderId}/parts/catalog/articles`

### Query params
- `productGroupIds` — required list
- `supplierId` — optional
- `limit` — optional
- `offset` — optional

### Frontend рекомендации
Если пользователь работает внутри order page, лучше использовать именно order-scoped catalog endpoints.
Они проще и уменьшают шанс ошибки на фронте.

---

# 9. Основные frontend-сценарии

## Сценарий A — страница склада запчастей
Подходит endpoint:
- `GET /api/parts`

Действия:
- список;
- фильтрация;
- создание;
- редактирование;
- обновление остатка;
- удаление.

### Рекомендуемые роли UI
- `ADMIN`, `MANAGER` — полный CRUD;
- `RECEPTIONIST`, `MECHANIC` — только просмотр и поиск.

---

## Сценарий B — добавление локальной запчасти в заказ
Рекомендуемый flow:
1. открыть заказ;
2. загрузить текущие items через `GET /api/orders/{orderId}/parts`;
3. искать локальные запчасти через `GET /api/parts?availableOnly=true&...`;
4. добавить выбранную деталь через `POST /api/orders/{orderId}/parts`;
5. перечитать список items.

---

## Сценарий C — поиск внешней запчасти
Рекомендуемый flow:
1. пользователь вводит артикул;
2. frontend вызывает `GET /api/parts/external/search`;
3. показывает результаты как справочный список;
4. при необходимости пользователь находит локальный аналог или создаёт локальную позицию вручную.

---

## Сценарий D — подбор по каталогу по автомобилю/заказу
Если пользователь находится в order page и у заказа корректно привязан UMAPI vehicle context:
- использовать `GET /api/orders/{orderId}/parts/catalog/...`

Если нужен общий справочный экран без заказа:
- использовать `GET /api/parts/catalog/...`

---

# 10. Ошибки и ограничения, которые должен учитывать frontend

## 401 Unauthorized
Пользователь не аутентифицирован.

## 403 Forbidden
У пользователя нет роли для данного действия.

Типичные случаи:
- `RECEPTIONIST` пытается редактировать склад;
- `MECHANIC` пытается создать складскую позицию;
- `RECEPTIONIST` пытается менять items в заказе.

## 404 Not Found
Запчасть, заказ или строка заказа не найдены.

## 409 / conflict-like ошибки
Типичные бизнес-конфликты:
- артикул уже существует;
- запчасть уже используется в заказах и не может быть удалена;
- недостаточно остатка;
- автомобиль заказа не связан с UMAPI-модификацией.

## Валидационные ошибки
Например:
- `quantity < 1`
- `stockQuantity < 0`
- `cost < 0`
- слишком длинные строки

---

# 11. Что важно помнить frontend-разработчику

## 11.1 `availableQuantity` уже рассчитывается backend
Не нужно считать это на фронте вручную, если пришёл `PartResponseDTO`.

## 11.2 `articleNumber` нормализуется backend
Лучше не завязывать фронт на точный регистр.

## 11.3 Поиск локальных запчастей пока без pagination
Если таблица большая, нужно быть готовым в будущем перевести UI на paginated backend.

## 11.4 Для order page лучше использовать order-scoped catalog endpoints
Это проще и надёжнее, чем собирать `modificationId` вручную.

## 11.5 Права на parts не одинаковые
Нужно различать:
- просмотр склада;
- изменение склада;
- изменение items заказа.

---

# 12. Рекомендуемые frontend модели

## Локальная запчасть

```ts
export interface PartDto {
  id: number;
  brand: string | null;
  name: string;
  articleNumber: string;
  cost: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt: string | null;
  updatedAt: string | null;
}
```

## Строка запчасти заказа

```ts
export interface OrderPartItemDto {
  id: number;
  orderId: number;
  partId: number;
  articleNumber: string;
  brand: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
```

## Внешний поиск

```ts
export interface ExternalPartSearchDto {
  articleNumber: string;
  brand: string | null;
  cached: boolean;
  fallback: boolean;
  cachedAt: string | null;
  cacheExpiresAt: string | null;
  items: ExternalPartItemDto[];
}

export interface ExternalPartItemDto {
  source: string | null;
  umapiArticleId: number | null;
  articleNumber: string | null;
  brandId: number | null;
  brand: string | null;
  name: string | null;
  shortDescription: string | null;
  status: string | null;
  mediaFile: string | null;
}
```

---

# 13. Краткий итог
Для frontend по автозапчастям сейчас доступны следующие основные маршруты:

## Локальный склад
- `GET /api/parts`
- `GET /api/parts/{id}`
- `POST /api/parts`
- `PUT /api/parts/{id}`
- `PUT /api/parts/{id}/stock`
- `DELETE /api/parts/{id}`

## Запчасти заказа
- `GET /api/orders/{orderId}/parts`
- `POST /api/orders/{orderId}/parts`
- `PUT /api/orders/{orderId}/parts/{itemId}`
- `DELETE /api/orders/{orderId}/parts/{itemId}`

## Внешний поиск
- `GET /api/parts/external/search`

## Каталог по автомобилю
- `GET /api/parts/catalog/manufacturers`
- `GET /api/parts/catalog/model-series`
- `GET /api/parts/catalog/modifications`
- `GET /api/parts/catalog/product-groups/search`
- `GET /api/parts/catalog/articles`

## Каталог по заказу
- `GET /api/orders/{orderId}/parts/catalog/product-groups/search`
- `GET /api/orders/{orderId}/parts/catalog/articles`

Если frontend строится вокруг order page, лучше опираться на:
- `GET /api/orders/{orderId}/parts`
- `GET /api/orders/{orderId}/parts/catalog/...`
- `POST /api/orders/{orderId}/parts`

Если строится склад/админка, то основной API:
- `GET /api/parts`
- `POST /api/parts`
- `PUT /api/parts/{id}`
- `PUT /api/parts/{id}/stock`

