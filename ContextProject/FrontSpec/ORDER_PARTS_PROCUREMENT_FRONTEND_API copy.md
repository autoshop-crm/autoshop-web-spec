# Order Parts Procurement Frontend API

Дата: 2026-05-12
Проект: `autoshop-core`
Статус: реализовано на backend

---

# 1. Задача

Этот документ описывает backend-контракт для frontend по новому flow работы с деталями заказа:

- механик ищет нужную деталь;
- если детали нет на локальном складе, она всё равно добавляется в заказ;
- такая деталь живёт отдельным lifecycle до закупки и прихода;
- менеджер выбирает quote, фиксирует цену, переводит деталь в заказ;
- после прихода деталь попадает на склад и одновременно резервируется под заказ.

Важно:
- локальные складские детали и заказные детали — это разные сущности backend;
- на frontend их можно агрегировать в одну таблицу, но в БД это разные строки с разными `id`.

---

# 2. Основная идея модели

Теперь в заказе есть два типа строк:

## 2.1 Локальная деталь
Это старая логика через `OrderPartItem`.

Такая деталь:
- уже существует как `Part` на складе;
- уже имеет цену;
- уже резервируется со склада.

## 2.2 Заказная деталь
Это новая логика через `OrderRequestedPart`.

Такая деталь:
- нужна заказу уже сейчас;
- может ещё не существовать на складе;
- сначала может быть без цены;
- проходит lifecycle закупки.

---

# 3. Статусы заказной детали

`OrderRequestedPart.status`:

- `OUT_OF_STOCK` — нет в наличии, деталь нужна, но ещё не заказана;
- `ORDERED_IN_TRANSIT` — менеджер заказал деталь, цена уже зафиксирована;
- `IN_STOCK_RESERVED` — деталь пришла на склад и зарезервирована под заказ.

Рекомендуемый frontend mapping:

- `OUT_OF_STOCK` → `Нет в наличии`
- `ORDERED_IN_TRANSIT` → `Заказано / в пути`
- `IN_STOCK_RESERVED` → `На складе`

---

# 4. Роли и доступы

## 4.1 Механик
Может:
- просматривать список заказных деталей заказа;
- создавать заказную деталь;
- просматривать общий overview деталей заказа.

Не может:
- запрашивать закупочный переход;
- принимать деталь на склад.

## 4.2 Менеджер
Может всё, что механик, и дополнительно:
- получать quotes;
- переводить деталь в `ORDERED_IN_TRANSIT`;
- принимать деталь на склад.

## 4.3 Receptionist
Может:
- просматривать requested parts;
- просматривать общий overview.

Не может:
- создавать requested parts;
- выполнять закупку и приёмку.

## 4.4 ADMIN
Имеет полный доступ ко всем новым endpoints.

---

# 5. Полный flow для frontend

## 5.1 Сценарий механика

1. Механик ищет аналоги через существующий parts search flow.
2. Видит, есть ли позиция локально.
3. Если позиции локально нет, вызывает создание `requested-part`.
4. После этого деталь уже считается частью заказа.
5. В UI она отображается со статусом `OUT_OF_STOCK`.

## 5.2 Сценарий менеджера

1. Менеджер открывает заказ.
2. Получает список requested parts или общий overview.
3. Для строки со статусом `OUT_OF_STOCK` делает запрос quotes.
4. Выбирает один quote вручную.
5. Отправляет выбранный quote в endpoint `/order`.
6. Backend фиксирует цену и переводит строку в `ORDERED_IN_TRANSIT`.
7. После прихода отправляет `/receive`.
8. Backend пополняет склад, связывает строку с локальной `Part`, резервирует нужное количество и переводит строку в `IN_STOCK_RESERVED`.

---

# 6. Endpoints

## 6.1 Создать заказную деталь

`POST /api/orders/{orderId}/requested-parts`

Роли:
- `ADMIN`
- `MANAGER`
- `MECHANIC`

### Request body

```json
{
  "articleNumber": "OC90",
  "brand": "MAHLE",
  "name": "Oil Filter",
  "umapiArticleId": 123456,
  "matchedLocalPartId": null,
  "quantity": 2
}
```

### Поля

- `articleNumber` — обязательное, строка до `30`
- `brand` — необязательное, строка до `20`
- `name` — обязательное, строка до `100`
- `umapiArticleId` — необязательное, id статьи из UMAPI
- `matchedLocalPartId` — необязательное, если frontend уже знает подходящую локальную деталь
- `quantity` — обязательное, минимум `1`

### Response `201 Created`

```json
{
  "id": 15,
  "orderId": 3,
  "articleNumber": "OC90",
  "brand": "MAHLE",
  "name": "Oil Filter",
  "umapiArticleId": 123456,
  "matchedLocalPartId": null,
  "requestedQuantity": 2,
  "status": "OUT_OF_STOCK",
  "selectedSupplier": null,
  "selectedQuoteSignature": null,
  "purchasePrice": null,
  "salePrice": null,
  "currency": null,
  "deliveryDaysMin": null,
  "deliveryDaysMax": null,
  "quoteFetchedAt": null,
  "orderedAt": null,
  "receivedAt": null,
  "createdAt": "2026-05-12T00:10:00Z",
  "updatedAt": "2026-05-12T00:10:00Z"
}
```

---

## 6.2 Получить все заказные детали заказа

`GET /api/orders/{orderId}/requested-parts`

Роли:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

### Response `200 OK`

```json
[
  {
    "id": 15,
    "orderId": 3,
    "articleNumber": "OC90",
    "brand": "MAHLE",
    "name": "Oil Filter",
    "umapiArticleId": 123456,
    "matchedLocalPartId": null,
    "requestedQuantity": 2,
    "status": "OUT_OF_STOCK",
    "selectedSupplier": null,
    "selectedQuoteSignature": null,
    "purchasePrice": null,
    "salePrice": null,
    "currency": null,
    "deliveryDaysMin": null,
    "deliveryDaysMax": null,
    "quoteFetchedAt": null,
    "orderedAt": null,
    "receivedAt": null,
    "createdAt": "2026-05-12T00:10:00Z",
    "updatedAt": "2026-05-12T00:10:00Z"
  }
]
```

---

## 6.3 Получить quotes для заказной детали

`GET /api/orders/{orderId}/requested-parts/{requestedPartId}/quotes`

Роли:
- `ADMIN`
- `MANAGER`

Важно:
- backend ищет quotes по `articleNumber` из `OrderRequestedPart`;
- этот endpoint нужен менеджеру перед переводом детали в заказ.

### Response `200 OK`

```json
{
  "query": "OC90",
  "provider": "CARRETA",
  "cached": false,
  "fallback": false,
  "cachedAt": null,
  "cacheExpiresAt": null,
  "quotes": [
    {
      "provider": "CARRETA",
      "sourceCode": "SUPPLIER-1",
      "requestedCode": "OC90",
      "articleNumber": "OC90",
      "brand": "MAHLE",
      "name": "Oil Filter",
      "description": "Oil Filter",
      "cross": false,
      "purchasePrice": 430.00,
      "currency": "RUB",
      "quantityRaw": "10",
      "availableQuantityParsed": 10,
      "minOrderQuantity": 1,
      "deliveryDaysMin": 1,
      "deliveryDaysMax": 3,
      "supplyProbabilityPercent": 90,
      "recommendedSalePrice": 650.00,
      "marginAmount": 220.00,
      "fetchedAt": "2026-05-12T00:20:00Z",
      "expiresAt": "2026-05-12T04:20:00Z"
    }
  ]
}
```

### Как frontend использует quotes

Обычно менеджер:
- показывает список `quotes[]`;
- выбирает одну строку;
- формирует из неё `CarretaQuoteOrderDTO` и отправляет в `/order`.

---

## 6.4 Перевести заказную деталь в статус `ORDERED_IN_TRANSIT`

`POST /api/orders/{orderId}/requested-parts/{requestedPartId}/order`

Роли:
- `ADMIN`
- `MANAGER`

### Request body

```json
{
  "quote": {
    "positionSignature": "carreta-signature-123",
    "articleNumber": "OC90",
    "brand": "MAHLE",
    "name": "Oil Filter",
    "purchasePrice": 430.00,
    "deliveryDaysMin": 1,
    "deliveryDaysMax": 3,
    "minOrderQuantity": 1,
    "quantityRaw": "10"
  },
  "salePrice": 650.00,
  "createExternalOrder": true,
  "clientComment": "Order for work order #3"
}
```

### Поля

- `quote` — обязательный объект выбранного quote
- `salePrice` — обязательная цена продажи, которая попадёт в смету заказа
- `createExternalOrder` — по умолчанию `true`
- `clientComment` — необязательный комментарий

### Что делает backend

На этом шаге backend:
- валидирует статус детали;
- создаёт закупку через procurement flow;
- фиксирует выбранный quote;
- фиксирует цену продажи в `salePrice`;
- пересчитывает финансовые totals заказа;
- меняет статус на `ORDERED_IN_TRANSIT`.

### Response `200 OK`

```json
{
  "id": 15,
  "orderId": 3,
  "articleNumber": "OC90",
  "brand": "MAHLE",
  "name": "Oil Filter",
  "umapiArticleId": 123456,
  "matchedLocalPartId": null,
  "requestedQuantity": 2,
  "status": "ORDERED_IN_TRANSIT",
  "selectedSupplier": "CARRETA",
  "selectedQuoteSignature": "carreta-signature-123",
  "purchasePrice": 430.00,
  "salePrice": 650.00,
  "currency": "RUB",
  "deliveryDaysMin": 1,
  "deliveryDaysMax": 3,
  "quoteFetchedAt": "2026-05-12T00:25:00Z",
  "orderedAt": "2026-05-12T00:25:00Z",
  "receivedAt": null,
  "createdAt": "2026-05-12T00:10:00Z",
  "updatedAt": "2026-05-12T00:25:00Z"
}
```

---

## 6.5 Принять заказную деталь на склад

`POST /api/orders/{orderId}/requested-parts/{requestedPartId}/receive`

Роли:
- `ADMIN`
- `MANAGER`

### Request body: привязка к уже существующей детали склада

```json
{
  "targetPartId": 44,
  "receivedQuantity": 2,
  "salePrice": 650.00
}
```

### Request body: создать новую локальную деталь на складе

```json
{
  "targetPartId": null,
  "brand": "MAHLE",
  "name": "Oil Filter",
  "receivedQuantity": 2,
  "salePrice": 650.00
}
```

### Поля

- `targetPartId` — необязательный id существующей локальной `Part`
- `brand` — используется, если создаётся новая складская деталь
- `name` — используется, если создаётся новая складская деталь
- `receivedQuantity` — обязательное, минимум `1`
- `salePrice` — необязательное; если не передано, backend возьмёт `salePrice` из requested part

### Важно по текущей реализации

В первой версии backend ожидает:
- `receivedQuantity >= requestedQuantity`

То есть частичная поставка сейчас не поддерживается.

### Что делает backend

- создаёт новую `Part` или использует существующую;
- увеличивает `stockQuantity`;
- резервирует `requestedQuantity` под заказ;
- связывает `OrderRequestedPart` с локальной `Part`;
- ставит статус `IN_STOCK_RESERVED`;
- пересчитывает order totals.

### Response `200 OK`

```json
{
  "id": 15,
  "orderId": 3,
  "articleNumber": "OC90",
  "brand": "MAHLE",
  "name": "Oil Filter",
  "umapiArticleId": 123456,
  "matchedLocalPartId": 44,
  "requestedQuantity": 2,
  "status": "IN_STOCK_RESERVED",
  "selectedSupplier": "CARRETA",
  "selectedQuoteSignature": "carreta-signature-123",
  "purchasePrice": 430.00,
  "salePrice": 650.00,
  "currency": "RUB",
  "deliveryDaysMin": 1,
  "deliveryDaysMax": 3,
  "quoteFetchedAt": "2026-05-12T00:25:00Z",
  "orderedAt": "2026-05-12T00:25:00Z",
  "receivedAt": "2026-05-12T01:10:00Z",
  "createdAt": "2026-05-12T00:10:00Z",
  "updatedAt": "2026-05-12T01:10:00Z"
}
```

---

## 6.6 Общий список всех деталей заказа

`GET /api/orders/{orderId}/parts/overview`

Роли:
- `ADMIN`
- `MANAGER`
- `RECEPTIONIST`
- `MECHANIC`

Это основной endpoint, который удобно использовать на экране заказа.

Он возвращает в одном списке:
- обычные локальные детали заказа;
- заказные детали lifecycle flow.

### Response `200 OK`

```json
{
  "orderId": 3,
  "items": [
    {
      "itemType": "LOCAL",
      "id": 101,
      "orderId": 3,
      "localPartId": 44,
      "articleNumber": "OC90",
      "brand": "MAHLE",
      "name": "Oil Filter",
      "quantity": 1,
      "requestedStatus": null,
      "unitPrice": 650.00,
      "lineTotal": 650.00,
      "availableLocally": true
    },
    {
      "itemType": "REQUESTED",
      "id": 15,
      "orderId": 3,
      "localPartId": null,
      "articleNumber": "OC90",
      "brand": "MAHLE",
      "name": "Oil Filter",
      "quantity": 2,
      "requestedStatus": "ORDERED_IN_TRANSIT",
      "unitPrice": 650.00,
      "lineTotal": 1300.00,
      "availableLocally": false
    }
  ]
}
```

### Поля `items[]`

- `itemType`:
  - `LOCAL` — старая складская строка заказа
  - `REQUESTED` — новая заказная строка lifecycle flow
- `id`:
  - для `LOCAL` это `OrderPartItem.id`
  - для `REQUESTED` это `OrderRequestedPart.id`
- `localPartId`:
  - id локальной `Part`, если она уже есть или уже связана
- `requestedStatus`:
  - только для `REQUESTED`
- `unitPrice`:
  - может быть `null`, если requested part ещё не заказана
- `lineTotal`:
  - может быть `null`, если цены пока нет
- `availableLocally`:
  - `true` для локальной строки;
  - для requested part становится `true`, когда статус `IN_STOCK_RESERVED`

---

# 7. Рекомендуемая frontend-архитектура

## 7.1 Для механика

На экране заказа можно использовать такой flow:

1. Поиск деталей через существующий search.
2. Если деталь есть на складе:
   - использовать старый flow добавления локальной детали в заказ.
3. Если детали нет на складе:
   - использовать `POST /api/orders/{orderId}/requested-parts`.
4. Для отображения таблицы деталей использовать:
   - либо `GET /api/orders/{orderId}/parts/overview`
   - либо комбинацию старого списка деталей + requested parts.

Рекомендуется использовать именно `overview`.

## 7.2 Для менеджера

На экране заказа:

1. Загружать `GET /api/orders/{orderId}/parts/overview`.
2. Для строк `REQUESTED` со статусом `OUT_OF_STOCK` показывать кнопку `Подобрать quote`.
3. После выбора quote открывать подтверждение цены продажи.
4. Затем вызывать `/order`.
5. Для строк `ORDERED_IN_TRANSIT` показывать кнопку `Принять на склад`.
6. Затем вызывать `/receive`.

---

# 8. Рекомендуемый UI mapping

## 8.1 Таблица деталей заказа

Рекомендуемые колонки:

- `Тип`
- `Артикул`
- `Бренд`
- `Наименование`
- `Количество`
- `Статус`
- `Цена`
- `Сумма`
- `Наличие`
- `Действия`

## 8.2 Правила отображения

### Для `LOCAL`
- статус можно показывать как `На складе`
- цена и сумма всегда заполнены
- действия зависят от старого flow

### Для `REQUESTED / OUT_OF_STOCK`
- цена `—`
- сумма `—`
- наличие `Нет`
- действие: `Получить quotes`

### Для `REQUESTED / ORDERED_IN_TRANSIT`
- цена уже заполнена
- сумма уже заполнена
- наличие `В пути`
- действие: `Принять на склад`

### Для `REQUESTED / IN_STOCK_RESERVED`
- цена заполнена
- сумма заполнена
- наличие `Да`
- можно показывать связанный `localPartId`

---

# 9. Важные ограничения текущей версии

## 9.1 Частичная поставка не поддерживается

В первой версии нельзя принять меньше, чем было запрошено.

То есть:
- если запросили `2`, то принять `1` сейчас нельзя.

## 9.2 Автовыбор лучшего quote не поддерживается

Менеджер выбирает quote вручную.

## 9.3 Отмена закупки не поддерживается

Нет отдельного lifecycle для отмены, возврата или повторного выбора закупки.

## 9.4 Backend не агрегирует одинаковые детали

Если есть две одинаковые детали с одинаковым артикулом:
- backend вернёт две отдельные строки;
- объединение в одну строку — только задача frontend.

---

# 10. Ошибки и ожидания frontend

## 10.1 `404 Not Found`
Возможные причины:
- заказ не найден;
- `requestedPartId` не найден внутри заказа.

## 10.2 `400 Bad Request`
Возможные причины:
- не заполнены обязательные поля;
- `quantity <= 0`;
- `receivedQuantity <= 0`;
- `salePrice <= 0`;
- неправильный payload выбранного quote.

## 10.3 `409 / invalid state`
Возможные причины:
- попытка заказать деталь, которая уже не в `OUT_OF_STOCK`;
- попытка принять деталь, которая не в `ORDERED_IN_TRANSIT`;
- заказ уже в неразрешённом статусе для редактирования.

---

# 11. Что frontend лучше использовать как основной источник данных

Для карточки заказа рекомендуется основной endpoint:

`GET /api/orders/{orderId}/parts/overview`

Почему:
- он уже объединяет локальные и заказные строки;
- не нужно руками склеивать два массива;
- по нему проще строить одну таблицу деталей заказа.

Отдельный `GET /requested-parts` нужен, если:
- хочешь отдельную вкладку только под закупочные строки;
- хочешь отдельно управлять lifecycle запрошенных деталей.

---

# 12. Короткая схема интеграции

## Механик
- ищет деталь;
- если локально нет — создаёт `requested part`;
- видит её в `overview`.

## Менеджер
- получает `overview`;
- по `OUT_OF_STOCK` открывает quotes;
- выбирает quote;
- отправляет `/order`;
- после поставки отправляет `/receive`.

---

# 13. Backend reference

Основные классы реализации:

- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderRequestedPartController.java:15`
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderRequestedPartQuoteController.java:10`
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderRequestedPartProcurementController.java:14`
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderPartsOverviewController.java:13`
- `src/main/java/com/vladko/autoshopcore/parts/service/OrderRequestedPartProcurementServiceImpl.java:23`
- `src/main/java/com/vladko/autoshopcore/parts/service/OrderRequestedPartReceiptServiceImpl.java:25`
- `src/main/java/com/vladko/autoshopcore/order/service/OrderFinancialsService.java:92`

