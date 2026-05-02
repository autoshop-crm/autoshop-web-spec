# Autoshop Core API: описание работы и интеграций

Дата: 2026-04-22  
Статус: рабочий backend-MVP, не финальный production API

## 1. Главный принцип взаимодействия

Да, взаимодействие с системой должно строиться через наши endpoint-ы `autoshop-core`, а не через прямые обращения фронта/клиента к UMAPI или Carreta.

Правильная схема:

```text
Frontend / Postman / Mobile / Admin UI
        |
        v
Autoshop Core API
        |
        |-- PostgreSQL: клиенты, машины, заказы, склад, лояльность
        |-- Redis: кеш ответов внешних API
        |-- UMAPI: автокаталог, артикулы, аналоги, OEM/каталожные данные
        |-- Carreta: цены поставщика, наличие, сроки, заказ у поставщика
```

Почему так:

- ключи UMAPI и Carreta не уходят на фронт;
- Core нормализует разные ответы внешних сервисов в наш формат;
- Core кеширует ответы в Redis;
- Core делает retry при временных сбоях;
- Core централизованно обрабатывает ошибки;
- в будущем Core сможет добавить роли, аудит, историю закупок и бизнес-правила без изменения внешних клиентов.

Фронт не должен знать, как устроен UMAPI или Carreta. Для фронта есть только наше API.

## 2. Базовый URL и запуск

Локально:

```text
http://localhost:8080
```

Поднять инфраструктуру:

```bash
docker compose up -d postgres redis
```

Запустить Core с локальным профилем:

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

Проверить состояние:

```bash
curl http://localhost:8080/actuator/health
```

Ожидаемый ответ:

```json
{
  "status": "UP"
}
```

## 3. Локальные секреты

Реальные ключи хранятся только локально:

```text
src/main/resources/application-local.properties
```

Файл добавлен в `.gitignore` и не должен попадать в GitHub.

Нужные поля:

```properties
app.umapi.api-key=
app.carreta.api-key=
app.carreta.test-orders-enabled=true
```

Для GitHub есть только безопасный пример:

```text
src/main/resources/application-local.properties.example
```

В production лучше передавать значения через env:

```text
APP_UMAPI_API_KEY
APP_CARRETA_API_KEY
APP_CARRETA_TEST_ORDERS_ENABLED
```

## 4. Безопасность текущего API

На текущем этапе API открыт:

```text
anyRequest().permitAll()
```

Это удобно для локальной разработки, но не подходит для production.

Перед реальным деплоем нужно добавить:

- JWT/auth;
- роли `ADMIN`, `MANAGER`, `MECHANIC`, `RECEPTIONIST`;
- разграничение прав на закупку, приемку, скидки, лояльность;
- аудит действий менеджеров;
- rate limit на внешние интеграции.

## 5. Внешние интеграции

### 5.1. UMAPI

Назначение: автокаталог и подбор деталей.

Core использует UMAPI для:

- поиска артикула;
- получения аналогов;
- получения каталожной информации;
- получения данных, по которым работник может выбрать нужную деталь.

Важно про поиск по названию: в документации UMAPI нет простого глобального endpoint-а вида "найти артикул по названию детали" без контекста автомобиля. Текущий реализованный в Core endpoint работает по артикулу/OEM:

```http
GET /api/parts/external/search?articleNumber={articleNumber}&brand={brand}
```

Это значит, что сценарий "работник просто написал `масляный фильтр`, не зная артикул" сейчас не закрыт полностью текущей реализацией.

Как UMAPI предлагает получать артикул без знания OEM:

1. Сначала выбирается транспортное средство.
2. Затем выбирается категория или продуктовая группа детали.
3. После этого UMAPI возвращает конкретные артикулы для выбранной модификации автомобиля.

Документация UMAPI содержит для этого каталоговый путь:

| Шаг | UMAPI endpoint | Что дает |
|---:|---|---|
| 1 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Manufacturers?type=PC&popular=true` | марки автомобилей |
| 2 | `GET /v2/autocatalog/{languageCode}-{regionCode}/ModelSeries?type=PC&MFA_ID={manufacturerId}` | модели/серии производителя |
| 3 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Passangers?type=PC&MS_ID={modelSeriesId}` | модификации пассажирского авто |
| 4 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Categories?type=PC&ID={modificationId}` | дерево категорий деталей |
| 5 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Fuse?type=PC&ID={modificationId}` | продуктовые группы для нечеткого поиска по названию |
| 6 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Products?type=PC&CATEGORY_ID={categoryId}&ID={modificationId}` | продуктовые группы внутри категории |
| 7 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Articles?type=PC&PT_IDS={productGroupIds}&ID={modificationId}&limit=10&offset=0` | конкретные артикулы |

Самый близкий механизм к поиску по названию - `Fuse`. Он возвращает продуктовые группы с полями `PT_ID`, `DES`, `NORM_DES`. То есть Core может сделать наш удобный endpoint "поиск группы детали по названию", но внутри это будет не глобальный поиск артикула, а поиск продуктовой группы в рамках уже выбранной модификации автомобиля.

Клиент обращается не в UMAPI, а сюда:

```http
GET /api/parts/external/search
```

Текущая стадия реализации: в Core уже есть артикульный поиск/аналоги через UMAPI. Каталоговый путь "машина -> категория -> группа детали -> артикулы" еще нужно добавить отдельными endpoint-ами.

### 5.2. Carreta

Назначение: цены, наличие, сроки поставки и заказ у поставщика.

Core использует Carreta для:

- поиска предложений по OEM/артикулу;
- расчета рекомендованной цены продажи;
- создания заказа у поставщика;
- тестового режима заказа через `app.carreta.test-orders-enabled=true`.

Клиент обращается не в Carreta, а сюда:

```http
GET /api/procurement/supplier-quotes/search
POST /api/procurement/purchase-orders
```

Важно: у Carreta есть IP allowlist. Для локальной проверки в кабинете Carreta нужно добавить публичный IP машины, с которой Core выходит в интернет.

## 6. Рекомендуемый бизнес-сценарий

### Сценарий: подбор детали и закупка

1. Работник открывает заказ клиента.
2. Если работник знает OEM/артикул или он уже есть в заказе/старой детали, он ищет деталь через Core:

```http
GET /api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10
```

3. Core обращается в UMAPI, получает варианты/аналоги, кеширует ответ.
4. Работник выбирает подходящую деталь.
5. Менеджер ищет цены поставщика через Core:

```http
GET /api/procurement/supplier-quotes/search?query=90915YZZE1
```

6. Core обращается в Carreta, получает цену закупки, наличие, сроки, считает рекомендованную продажную цену.
7. Менеджер выбирает предложение и подтверждает закупку.
8. Core создает заказ поставщику через Carreta.
9. После прихода детали менеджер делает приемку на склад:

```http
POST /api/procurement/stock-receipts
```

10. Складской остаток детали увеличивается в нашей базе.

### Сценарий: работник не знает артикул

Это нормальный рабочий случай. Мастер обычно не должен помнить OEM наизусть.

Правильный будущий flow:

1. Работник открывает заказ.
2. Core уже знает автомобиль из заказа: марка, модель, VIN/госномер, клиент.
3. Если в нашей базе уже сохранен UMAPI `modificationId`, Core использует его.
4. Если `modificationId` еще не сохранен, работник выбирает автомобиль через каталог UMAPI: марка -> модель -> модификация.
5. Работник вводит привычное название детали: `масляный фильтр`, `колодки`, `датчик кислорода`.
6. Core вызывает UMAPI `Fuse` по выбранной модификации и ищет подходящие продуктовые группы.
7. Работник выбирает группу детали.
8. Core вызывает UMAPI `Articles` и получает реальные артикулы/OEM.
9. Дальше Core ищет цены в Carreta уже по найденному артикулу.

Упрощенно:

```text
Заказ -> Автомобиль -> UMAPI modificationId -> поиск группы детали -> артикулы -> Carreta цены
```

Что нужно хранить у нас:

- у автомобиля желательно сохранять `umapiType`, например `PC`;
- `umapiManufacturerId`;
- `umapiModelSeriesId`;
- `umapiModificationId`;
- человекочитаемое название модификации;
- опционально двигатель, год, мощность, кузов.

Без этого работнику каждый раз придется заново выбирать модификацию автомобиля, а это неудобно.

## 7. Endpoint-ы интеграции деталей и закупки

### 7.1. Поиск детали во внешнем каталоге

```http
GET /api/parts/external/search?articleNumber={articleNumber}&brand={brand}&limit={limit}&offset={offset}
```

Источник данных: UMAPI.

Параметры:

| Параметр | Обязательный | Описание |
|---|---:|---|
| `articleNumber` | да | OEM/артикул детали |
| `brand` | нет | бренд производителя |
| `limit` | нет | от 1 до 100, по умолчанию 10 |
| `offset` | нет | смещение, по умолчанию 0 |

Пример:

```bash
curl 'http://localhost:8080/api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10'
```

Ответ:

```json
{
  "articleNumber": "90915YZZE1",
  "brand": "TOYOTA",
  "cached": false,
  "fallback": false,
  "cachedAt": "2026-04-22T09:00:00Z",
  "cacheExpiresAt": "2026-04-22T15:00:00Z",
  "items": [
    {
      "source": "UMAPI",
      "umapiArticleId": 123456,
      "articleNumber": "90915YZZE1",
      "brandId": 100,
      "brand": "TOYOTA",
      "name": "Oil filter",
      "shortDescription": "Engine oil filter",
      "status": "ACTIVE",
      "mediaFile": null
    }
  ]
}
```

Поля кеша:

| Поле | Значение |
|---|---|
| `cached=false` | ответ получен из внешнего API прямо сейчас |
| `cached=true` | ответ взят из Redis |
| `fallback=true` | внешний API временно недоступен, Core отдал последний кеш |

### 7.1.1. Будущие endpoint-ы для поиска без знания артикула

Эти endpoint-ы еще не реализованы в Core, но именно они нужны для нормальной работы мастера, который не знает OEM наизусть.

Рекомендуемый API-контракт Core:

```http
GET /api/parts/catalog/manufacturers?type=PC&popular=true
GET /api/parts/catalog/model-series?type=PC&manufacturerId={manufacturerId}
GET /api/parts/catalog/modifications?type=PC&modelSeriesId={modelSeriesId}
GET /api/parts/catalog/categories?type=PC&modificationId={modificationId}
GET /api/parts/catalog/product-groups/search?type=PC&modificationId={modificationId}&query={partName}
GET /api/parts/catalog/articles?type=PC&modificationId={modificationId}&productGroupIds={ids}&supplierId={supplierId}&limit=10&offset=0
```

Как это будет выглядеть для фронта:

1. Фронт показывает автомобиль из заказа.
2. Если у автомобиля нет `umapiModificationId`, фронт дает выбрать марку, модель и модификацию.
3. Работник вводит название детали.
4. Core ищет подходящие группы через UMAPI `Fuse`.
5. Фронт показывает варианты вроде `Масляный фильтр`, `Воздушный фильтр`, `Тормозные колодки`.
6. Работник выбирает группу.
7. Core получает артикулы через UMAPI `Articles`.
8. Фронт показывает детали с брендом, артикулом, описанием, картинкой.
9. Менеджер запускает поиск цены через Carreta.

Пример будущего поиска группы:

```http
GET /api/parts/catalog/product-groups/search?type=PC&modificationId=123456&query=масляный%20фильтр
```

Пример ответа:

```json
{
  "type": "PC",
  "modificationId": 123456,
  "query": "масляный фильтр",
  "items": [
    {
      "productGroupId": 7,
      "name": "Масляный фильтр",
      "normalizedName": "масляный фильтр",
      "score": 0.98
    }
  ]
}
```

Пример будущего получения артикулов:

```http
GET /api/parts/catalog/articles?type=PC&modificationId=123456&productGroupIds=7&limit=10
```

Пример ответа:

```json
{
  "type": "PC",
  "modificationId": 123456,
  "productGroupIds": [7],
  "items": [
    {
      "umapiArticleId": 987654,
      "articleNumber": "90915YZZE1",
      "brand": "TOYOTA",
      "name": "Масляный фильтр",
      "oeCodes": ["90915YZZE1"],
      "eanCodes": [],
      "mediaFile": null
    }
  ]
}
```

После этого артикул `90915YZZE1` можно передавать в:

```http
GET /api/procurement/supplier-quotes/search?query=90915YZZE1
```

### 7.2. Поиск предложений поставщика

```http
GET /api/procurement/supplier-quotes/search?query={articleNumber}
```

Источник данных: Carreta.

Пример:

```bash
curl 'http://localhost:8080/api/procurement/supplier-quotes/search?query=90915YZZE1'
```

Ответ:

```json
{
  "query": "90915YZZE1",
  "provider": "CARRETA",
  "cached": false,
  "fallback": false,
  "cachedAt": "2026-04-22T09:00:00Z",
  "cacheExpiresAt": "2026-04-22T09:30:00Z",
  "quotes": [
    {
      "provider": "CARRETA",
      "sourceCode": "MAIN",
      "requestedCode": "90915YZZE1",
      "articleNumber": "90915YZZE1",
      "brand": "TOYOTA",
      "name": "Oil filter",
      "description": "Original replacement part",
      "cross": false,
      "purchasePrice": 1200.00,
      "currency": "RUB",
      "quantityRaw": ">50",
      "availableQuantityParsed": null,
      "minOrderQuantity": 1,
      "deliveryDaysMin": 1,
      "deliveryDaysMax": 3,
      "supplyProbabilityPercent": 95,
      "recommendedSalePrice": 1500.00,
      "marginAmount": 300.00,
      "fetchedAt": "2026-04-22T09:00:00Z",
      "expiresAt": "2026-04-22T09:30:00Z"
    }
  ]
}
```

Пояснения:

- `purchasePrice` - цена закупки у поставщика;
- `recommendedSalePrice` - наша рекомендованная цена продажи;
- `marginAmount` - разница между продажной ценой и закупкой;
- `quantityRaw` - строка наличия от Carreta, например `500`, `<10`, `>50`, `Есть`;
- `availableQuantityParsed` заполняется только когда количество можно точно распарсить;
- `deliveryDaysMin` и `deliveryDaysMax` - диапазон поставки.

### 7.3. Создание заказа поставщику

```http
POST /api/procurement/purchase-orders
```

Источник внешнего действия: Carreta.

Назначение: создать заказ поставщику или проверить расчет закупки без внешнего заказа.

Тело запроса:

```json
{
  "quote": {
    "positionSignature": "signature-from-carreta",
    "articleNumber": "90915YZZE1",
    "brand": "TOYOTA",
    "name": "Oil filter",
    "purchasePrice": 1200.00,
    "deliveryDaysMin": 1,
    "deliveryDaysMax": 3,
    "minOrderQuantity": 1,
    "quantityRaw": ">50"
  },
  "quantity": 2,
  "salePrice": 1500.00,
  "clientComment": "order-123",
  "createExternalOrder": true
}
```

Ответ:

```json
{
  "provider": "CARRETA",
  "externalOrderId": 12345,
  "externalOrderNumber": "A-12345",
  "externalStatus": 1,
  "externalStatusDisplay": "Ожидает оплаты",
  "articleNumber": "90915YZZE1",
  "brand": "TOYOTA",
  "name": "Oil filter",
  "quantity": 2,
  "purchaseUnitPrice": 1200.00,
  "saleUnitPrice": 1500.00,
  "purchaseTotal": 2400.00,
  "saleTotal": 3000.00,
  "externalOrderCreated": true,
  "testMode": true
}
```

Важно:

- `salePrice` не может быть ниже `purchasePrice`;
- `quantity` должен соответствовать ограничениям Carreta: `minOrderQuantity`, `<N`, `>N`, точное количество;
- если `app.carreta.test-orders-enabled=true`, заказ создается в тестовом режиме Carreta;
- если `createExternalOrder=false`, Core считает суммы, но не создает внешний заказ.

Текущий технический зазор: поиск предложений Carreta пока не отдает наружу `positionSignature`, хотя Carreta требует его для создания внешнего заказа. Для полноценного UI-сценария нужно добавить в ответ поиска безопасный `quoteToken` или `positionSignature`, либо сохранять найденные предложения в нашей БД/Redis и создавать заказ по внутреннему `quoteId`.

### 7.4. Приемка детали на склад

```http
POST /api/procurement/stock-receipts
```

Назначение: увеличить остаток существующей детали на складе.

Тело запроса:

```json
{
  "targetPartId": 1,
  "receivedQuantity": 5,
  "salePrice": 1500.00
}
```

Ответ: обновленная деталь.

```json
{
  "id": 1,
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00,
  "stockQuantity": 15,
  "reservedQuantity": 2,
  "availableQuantity": 13,
  "createdAt": "2026-04-20T10:00:00Z",
  "updatedAt": "2026-04-22T09:00:00Z"
}
```

Важно: сейчас приемка работает по уже существующей детали `targetPartId`. Автоматическое создание новой детали при приемке пока не реализовано.

## 8. Endpoint-ы склада и деталей

### 8.1. Создать деталь в локальном справочнике

```http
POST /api/parts
```

```json
{
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00
}
```

### 8.2. Получить деталь

```http
GET /api/parts/{id}
```

### 8.3. Обновить деталь

```http
PUT /api/parts/{id}
```

```json
{
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00
}
```

### 8.4. Обновить остаток

```http
PUT /api/parts/{id}/stock
```

```json
{
  "stockQuantity": 10
}
```

### 8.5. Удалить деталь

```http
DELETE /api/parts/{id}
```

### 8.6. Поиск деталей в нашей базе

```http
GET /api/parts?articleNumber={articleNumber}&brand={brand}&name={name}&availableOnly={true|false}
```

Пример:

```bash
curl 'http://localhost:8080/api/parts?articleNumber=90915&availableOnly=true'
```

## 9. Endpoint-ы клиентов

### 9.1. Создать клиента

```http
POST /api/customers
```

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79990000000",
  "email": "ivan@example.com"
}
```

### 9.2. Получить клиента

```http
GET /api/customers/{id}
```

### 9.3. Обновить клиента

```http
PUT /api/customers/{id}
```

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79990000000",
  "email": "ivan@example.com"
}
```

### 9.4. Удалить клиента

```http
DELETE /api/customers/{id}
```

### 9.5. Поиск клиентов

```http
GET /api/customers/search?email={email}&phoneNumber={phone}&firstName={firstName}&lastName={lastName}
```

## 10. Endpoint-ы автомобилей

### 10.1. Создать автомобиль

```http
POST /api/vehicles
```

```json
{
  "customerId": 1,
  "brand": "Toyota",
  "model": "Camry",
  "vin": "JTDBE32K123456789",
  "licensePlate": "A123BC777"
}
```

### 10.2. Получить автомобиль

```http
GET /api/vehicles/{id}
```

### 10.3. Получить автомобиль по VIN

```http
GET /api/vehicles/vin/{vin}
```

### 10.4. Получить автомобили клиента

```http
GET /api/vehicles/customer/{customerId}
```

### 10.5. Обновить автомобиль

```http
PUT /api/vehicles/{id}
```

```json
{
  "brand": "Toyota",
  "model": "Camry",
  "vin": "JTDBE32K123456789",
  "licensePlate": "A123BC777"
}
```

### 10.6. Удалить автомобиль

```http
DELETE /api/vehicles/{id}
```

## 11. Endpoint-ы заказов автосервиса

Статусы заказа:

```text
NEW
IN_PROGRESS
COMPLETED
CANCELLED
```

### 11.1. Создать заказ

```http
POST /api/orders
```

```json
{
  "customerId": 1,
  "vehicleId": 1,
  "employeeId": 1,
  "problem": "Oil change and diagnostics"
}
```

### 11.2. Получить заказ

```http
GET /api/orders/{id}
```

### 11.3. Обновить описание проблемы

```http
PUT /api/orders/{id}
```

```json
{
  "problem": "Oil change, diagnostics and brake inspection"
}
```

### 11.4. Назначить сотрудника

```http
PUT /api/orders/{id}/assign
```

```json
{
  "employeeId": 1
}
```

### 11.5. Обновить оценку стоимости

```http
PUT /api/orders/{id}/estimate
```

```json
{
  "laborTotal": 5000.00,
  "discountAmount": 500.00
}
```

### 11.6. Изменить статус

```http
PUT /api/orders/{id}/status
```

```json
{
  "status": "IN_PROGRESS"
}
```

### 11.7. Получить заказы клиента

```http
GET /api/orders/customer/{customerId}
```

### 11.8. Получить заказы автомобиля

```http
GET /api/orders/vehicle/{vehicleId}
```

### 11.9. Получить заказы по статусу

```http
GET /api/orders/status/{status}
```

## 12. Endpoint-ы запчастей внутри заказа

### 12.1. Добавить деталь в заказ

```http
POST /api/orders/{orderId}/parts
```

```json
{
  "partId": 1,
  "quantity": 2
}
```

При добавлении детали Core резервирует количество на складе и пересчитывает сумму запчастей заказа.

### 12.2. Получить детали заказа

```http
GET /api/orders/{orderId}/parts
```

### 12.3. Изменить количество детали в заказе

```http
PUT /api/orders/{orderId}/parts/{itemId}
```

```json
{
  "quantity": 3
}
```

### 12.4. Удалить деталь из заказа

```http
DELETE /api/orders/{orderId}/parts/{itemId}
```

При удалении резерв должен быть освобожден.

## 13. Endpoint-ы лояльности

### 13.1. Получить или создать аккаунт лояльности клиента

```http
GET /api/loyalty/accounts/customer/{customerId}
```

### 13.2. Получить транзакции аккаунта

```http
GET /api/loyalty/accounts/{accountId}/transactions
```

### 13.3. Получить уровни лояльности

```http
GET /api/loyalty/tiers
```

### 13.4. Списать бонусные баллы в заказе

```http
PUT /api/orders/{orderId}/loyalty/spend
```

```json
{
  "points": 500
}
```

### 13.5. Убрать списание баллов из заказа

```http
DELETE /api/orders/{orderId}/loyalty/spend
```

## 14. Формат ошибок

Все основные ошибки возвращаются в едином формате:

```json
{
  "timestamp": "2026-04-22T09:18:23.621610Z",
  "status": 502,
  "error": "Bad Gateway",
  "message": "Carreta authentication failed",
  "path": "/api/procurement/supplier-quotes/search"
}
```

Основные статусы:

| HTTP | Когда возникает |
|---:|---|
| `400 Bad Request` | неправильные параметры, ошибка валидации, неверное количество |
| `404 Not Found` | клиент, машина, заказ, деталь или loyalty account не найдены |
| `409 Conflict` | конфликт состояния, нехватка остатка, нарушение бизнес-правил |
| `502 Bad Gateway` | внешний API вернул ошибку авторизации, валидации или неожиданный контракт |
| `503 Service Unavailable` | внешний API недоступен или не настроен ключ |

## 15. Кеширование и retry

### UMAPI

Кеш поиска:

```properties
app.umapi.cache.search-ttl=6h
```

Retry:

```properties
app.umapi.retry.max-attempts=3
app.umapi.retry.backoff=500ms
```

### Carreta

Кеш поиска:

```properties
app.carreta.cache.search-ttl=30m
```

Retry:

```properties
app.carreta.retry.max-attempts=3
app.carreta.retry.backoff=500ms
```

Логика:

- если ответ есть в Redis, Core отдает кеш;
- если кеша нет, Core идет во внешний API;
- если внешний API временно недоступен, Core повторяет запрос;
- если после retry внешний API недоступен, но есть старый кеш в рамках ключа, Core может вернуть fallback;
- если кеша нет, клиент получает `503`.

## 16. Что уже работает

Готово:

- REST API для клиентов;
- REST API для автомобилей;
- REST API для заказов;
- REST API для склада деталей;
- добавление деталей в заказ с резервированием;
- loyalty API;
- UMAPI client;
- Carreta client;
- Redis cache для внешних поисков;
- retry для внешних API;
- обработка ошибок;
- локальный безопасный конфиг для ключей;
- тесты слоя взаимодействия с API.

## 17. Что еще не финализировано

Нужно доделать:

- авторизация и роли;
- постоянные сущности закупки: `purchase_request`, `supplier_quote`, `purchase_order`;
- сохранение истории выбора поставщика;
- выдача безопасного `quoteToken` для создания заказа из результата поиска Carreta;
- создание новой детали при приемке, если ее еще нет в локальном справочнике;
- endpoint-ы для просмотра истории закупок;
- polling/sync статусов заказов Carreta;
- OpenAPI/Swagger спецификация;
- production-настройки observability и security.

## 18. Самый полезный smoke-test сценарий

```bash
docker compose up -d postgres redis
./gradlew bootRun --args='--spring.profiles.active=local'
```

Проверить Core:

```bash
curl http://localhost:8080/actuator/health
```

Проверить UMAPI:

```bash
curl 'http://localhost:8080/api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10'
```

Проверить Carreta:

```bash
curl 'http://localhost:8080/api/procurement/supplier-quotes/search?query=90915YZZE1'
```

Проверить повторный запрос и кеш:

```bash
curl 'http://localhost:8080/api/procurement/supplier-quotes/search?query=90915YZZE1'
```

Во втором ответе ожидается:

```json
{
  "cached": true
}
```

## 19. Короткий вывод

Core сейчас является центральным API-слоем проекта. Наружные клиенты должны работать только с Core endpoint-ами. UMAPI и Carreta являются внутренними интеграциями Core, а не публичным контрактом для фронта.

Текущая архитектура выбрана правильно: она защищает ключи, упрощает фронт, дает контроль над бизнес-логикой и позволяет дальше спокойно наращивать закупки, склад, роли и аудит.
