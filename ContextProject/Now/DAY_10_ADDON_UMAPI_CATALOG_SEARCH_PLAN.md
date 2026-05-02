# Day 10 Addon: UMAPI catalog search без знания артикула

Дата: 2026-04-22  
Основание: `DAY_10_2026-04-18_DETAILED_PLAN.md` + `CORE_API_DESCRIPTION.md`  
Цель addon: добавить в backend удобный каталоговый сценарий, чтобы работник мог искать деталь по названию в контексте автомобиля, а не помнить OEM/артикул наизусть.

## 1. Почему нужен addon

Текущая Day 10 реализация закрывает важный, но не полный сценарий:

```text
Известен OEM/артикул -> Core ищет UMAPI аналоги -> Core ищет Carreta цены
```

Но в реальной работе мастер часто знает не артикул, а смысл детали:

- `масляный фильтр`;
- `тормозные колодки передние`;
- `датчик кислорода`;
- `ремень генератора`;
- `стойка стабилизатора`;
- `свечи зажигания`.

UMAPI по документации не дает простого глобального endpoint-а "найти артикулы по названию детали" без контекста автомобиля. Правильный путь такой:

```text
Автомобиль -> модификация UMAPI -> категория/продуктовая группа -> артикулы -> Carreta цены
```

Значит, Core должен добавить отдельный каталоговый слой поверх UMAPI, который будет удобен для фронта и работника.

## 2. Главное бизнес-решение

Работник не должен ходить в UMAPI напрямую и не должен знать структуру UMAPI endpoint-ов.

Для фронта должен быть простой backend-flow:

```text
1. Выбрать/подтвердить автомобиль.
2. Если автомобиль еще не привязан к UMAPI modificationId, привязать.
3. Ввести название детали.
4. Получить группы деталей.
5. Выбрать группу.
6. Получить артикулы.
7. Передать выбранный артикул в поиск цен Carreta.
```

Для Core это превращается в отдельный API-контракт:

```text
Frontend -> Core catalog endpoints -> UMAPI
Frontend -> Core supplier endpoints -> Carreta
```

## 3. Что уже есть в проекте

Уже реализовано:

- `integration/umapi` package;
- `UmapiClient`;
- `RestClientUmapiClient`;
- UMAPI properties;
- retry executor;
- Redis JSON cache;
- внешний поиск по артикулу:

```http
GET /api/parts/external/search?articleNumber={articleNumber}&brand={brand}
```

- Carreta quote search:

```http
GET /api/procurement/supplier-quotes/search?query={articleNumber}
```

Не хватает:

- endpoint-ов выбора автомобиля в UMAPI;
- endpoint-а поиска продуктовых групп по названию;
- endpoint-а получения артикулов по выбранной группе;
- сохранения UMAPI идентификаторов в `vehicle`;
- DTO/mapper/cache для новых UMAPI ответов;
- тестов полного сценария.

## 4. UMAPI endpoint-ы, которые нужны

Нужные endpoint-ы из UMAPI Autocatalog:

| Шаг | Endpoint | Назначение |
|---:|---|---|
| 1 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Manufacturers?type={type}&popular={popular}` | получить производителей/марки ТС |
| 2 | `GET /v2/autocatalog/{languageCode}-{regionCode}/ModelSeries?type={type}&MFA_ID={manufacturerId}` | получить модельные серии |
| 3 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Passangers?type={type}&MS_ID={modelSeriesId}` | получить модификации легковых авто |
| 4 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Categories?type={type}&ID={modificationId}` | получить дерево категорий |
| 5 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Fuse?type={type}&ID={modificationId}` | получить продуктовые группы для нечеткого поиска |
| 6 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Products?type={type}&CATEGORY_ID={categoryId}&ID={modificationId}` | получить продуктовые группы внутри категории |
| 7 | `GET /v2/autocatalog/{languageCode}-{regionCode}/Articles?type={type}&PT_IDS={productTypeIds}&ID={modificationId}&SUP_ID={supplierId}&limit={limit}&offset={offset}` | получить конкретные артикулы |

MVP для удобного поиска можно сделать без `Categories` и `Products`, если использовать `Fuse`:

```text
Manufacturers -> ModelSeries -> Passangers -> Fuse -> Articles
```

Почему `Fuse` важен:

- возвращает `PT_ID`, `DES`, `NORM_DES`;
- позволяет искать продуктовую группу по названию;
- не требует сначала руками выбирать дерево категории;
- лучше подходит для UX "мастер вводит название детали".

## 5. Ограничения и допущения

### 5.1. Тип транспорта

Для MVP берем только легковые автомобили:

```text
type=PC
```

В будущем можно добавить:

- `CV`;
- `Motorcycle`;
- `Engine`;
- `Axle`.

Но сейчас `Vehicle` домен проекта ближе всего к легковым авто, поэтому `PC` достаточно.

### 5.2. Поиск по VIN

В текущем UMAPI Autocatalog endpoint-ах, которые мы разобрали, нет очевидного VIN decode endpoint-а. Поэтому не закладываем автоматическую привязку по VIN как обязательную часть MVP.

VIN остается полезным полем нашей базы, но UMAPI modification выбирается через:

```text
Марка -> модель/серия -> модификация
```

### 5.3. Глобального поиска детали по названию нет

Нельзя обещать UX:

```text
Пользователь ввел "фильтр" -> система нашла все фильтры для всех машин
```

Корректный UX:

```text
Пользователь открыл заказ конкретной машины -> ввел "фильтр" -> система ищет группы деталей для этой модификации
```

## 6. Предлагаемый UX для работника

### 6.1. Первый вход по автомобилю

Если у автомобиля еще нет UMAPI привязки:

1. Работник открывает заказ.
2. Фронт видит, что у `vehicle.umapiModificationId = null`.
3. Фронт показывает шаг привязки:
   - марка;
   - модель;
   - модификация.
4. Работник выбирает модификацию.
5. Core сохраняет UMAPI ids в `vehicle`.

После этого автомобиль больше не требует повторного выбора.

### 6.2. Повторная работа с тем же автомобилем

Если у автомобиля уже есть UMAPI привязка:

1. Работник открывает заказ.
2. Фронт сразу показывает поле поиска детали.
3. Работник вводит `масляный фильтр`.
4. Core ищет product groups через `Fuse`.
5. Работник выбирает группу.
6. Core получает артикулы через `Articles`.
7. Работник выбирает артикул.
8. Менеджер ищет цены и закупает через Carreta.

### 6.3. UX fallback

Если поиск по названию не дал результата:

- показать дерево категорий `Categories`;
- дать работнику выбрать категорию вручную;
- затем получить `Products`;
- затем получить `Articles`.

Это важно, потому что названия могут отличаться: `лямбда-зонд` vs `датчик кислорода`, `колодки` vs `комплект тормозных колодок`.

## 7. Изменения в БД

Нужно расширить таблицу `vehicle`.

Создать Liquibase файл:

```text
src/main/resources/db/changelog/db.changelog-1.5-vehicle-umapi-catalog.sql
```

Добавить в `db.changelog-master.yaml`.

Поля:

```sql
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_type VARCHAR(20);
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_manufacturer_id INTEGER;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_manufacturer_name VARCHAR(100);
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_model_series_id INTEGER;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_model_series_name VARCHAR(150);
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_modification_id INTEGER;
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_modification_name VARCHAR(255);
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_engine_description VARCHAR(255);
ALTER TABLE vehicle ADD COLUMN IF NOT EXISTS umapi_catalog_linked_at TIMESTAMP;
```

Индекс:

```sql
CREATE INDEX IF NOT EXISTS ix_vehicle_umapi_modification_id
ON vehicle (umapi_modification_id);
```

Почему храним именно в `vehicle`:

- привязка относится к конкретной машине клиента;
- заказы уже связаны с `vehicle`;
- следующий заказ по этой же машине сможет переиспользовать UMAPI modification;
- мастеру не придется каждый раз выбирать модификацию.

## 8. Изменения в entity и DTO автомобиля

### 8.1. `Vehicle`

Добавить поля:

```java
private String umapiType;
private Integer umapiManufacturerId;
private String umapiManufacturerName;
private Integer umapiModelSeriesId;
private String umapiModelSeriesName;
private Integer umapiModificationId;
private String umapiModificationName;
private String umapiEngineDescription;
private Instant umapiCatalogLinkedAt;
```

### 8.2. `VehicleResponseDTO`

Добавить те же поля в response, чтобы фронт понимал:

- автомобиль уже привязан к UMAPI или нет;
- какая модификация выбрана;
- нужно ли показать flow выбора модификации.

### 8.3. Отдельный DTO для привязки

Создать:

```text
src/main/java/com/vladko/autoshopcore/vehicle/dto/VehicleCatalogLinkDTO.java
```

Поля:

```java
@NotBlank
private String type;

@NotNull
private Integer manufacturerId;

@NotBlank
private String manufacturerName;

@NotNull
private Integer modelSeriesId;

@NotBlank
private String modelSeriesName;

@NotNull
private Integer modificationId;

@NotBlank
private String modificationName;

private String engineDescription;
```

### 8.4. Endpoint привязки автомобиля

Добавить в `VehicleController`:

```http
PUT /api/vehicles/{id}/catalog-link
```

Body:

```json
{
  "type": "PC",
  "manufacturerId": 111,
  "manufacturerName": "TOYOTA",
  "modelSeriesId": 222,
  "modelSeriesName": "CAMRY",
  "modificationId": 333,
  "modificationName": "Camry 2.5",
  "engineDescription": "2.5, petrol, 181 hp"
}
```

Response:

```json
{
  "id": 1,
  "brand": "Toyota",
  "model": "Camry",
  "umapiType": "PC",
  "umapiModificationId": 333,
  "umapiModificationName": "Camry 2.5",
  "umapiCatalogLinkedAt": "2026-04-22T10:00:00Z"
}
```

Важно: backend должен позволять перепривязку, потому что работник может ошибиться в модификации.

## 9. Новые integration DTO для UMAPI

Создать package:

```text
src/main/java/com/vladko/autoshopcore/integration/umapi/dto/catalog
```

DTO под внешний UMAPI contract:

```text
UmapiManufacturerResponse.java
UmapiModelSeriesResponse.java
UmapiPassengerModificationResponse.java
UmapiCategoryResponse.java
UmapiFuseProductGroupResponse.java
UmapiProductGroupResponse.java
UmapiCatalogArticlesResponse.java
UmapiCatalogArticleDataResponse.java
```

Минимальные поля:

### 9.1. Manufacturer

```java
private Integer mfaId;
private String manufacturer;
```

Маппинг может потребовать `@JsonProperty`, потому что UMAPI поля обычно uppercase:

```java
@JsonProperty("MFA_ID")
private Integer mfaId;

@JsonProperty("MANUFACTURER")
private String manufacturer;
```

### 9.2. ModelSeries

```java
@JsonProperty("MFA_ID")
private Integer manufacturerId;

@JsonProperty("MANUFACTURER")
private String manufacturer;

@JsonProperty("MS_ID")
private Integer modelSeriesId;

@JsonProperty("MODEL_SERIES")
private String modelSeries;

@JsonProperty("CI_FROM")
private String productionFrom;

@JsonProperty("CI_TO")
private String productionTo;

@JsonProperty("TYPE")
private String type;
```

### 9.3. Passenger modification

```java
@JsonProperty("PC_ID")
private Integer modificationId;

@JsonProperty("PASSENGER_CAR")
private String name;

@JsonProperty("POWER_PS")
private Integer powerPs;

@JsonProperty("CAPACITY_LT")
private BigDecimal capacityLiters;

@JsonProperty("ENGINE_TYPE")
private String engineType;

@JsonProperty("BODY_TYPE")
private String bodyType;

@JsonProperty("FUEL_TYPE")
private String fuelType;
```

### 9.4. Fuse product group

```java
@JsonProperty("PT_ID")
private Integer productGroupId;

@JsonProperty("DES")
private String description;

@JsonProperty("NORM_DES")
private String normalizedDescription;
```

### 9.5. Articles

Переиспользовать существующую модель `UmapiArticleItem`, если она уже покрывает нужные поля. Если нет, добавить отдельный DTO.

Ключевые поля:

```java
ART_ID
ARTICLE_NR
SUP_ID
BRAND
COMPLETE_DES
OE_CODES
EAN_CODES
MEDIA_FILE
```

## 10. Расширение `UmapiClient`

Текущий интерфейс:

```java
List<UmapiBrandRefinementItem> refineBrand(String articleNumber);
UmapiAnalogsResponse findAnalogs(String articleNumber, String brand, int limit, int offset);
UmapiArticleItem getArticle(Integer articleId);
```

Добавить методы:

```java
List<UmapiManufacturerResponse> getManufacturers(String type, boolean popular);

List<UmapiModelSeriesResponse> getModelSeries(String type, Integer manufacturerId);

List<UmapiPassengerModificationResponse> getPassengerModifications(String type, Integer modelSeriesId);

UmapiPassengerModificationResponse getPassengerModification(Integer modificationId);

List<UmapiFuseProductGroupResponse> getFuseProductGroups(String type, Integer modificationId);

UmapiCategoriesResponse getCategories(String type, Integer modificationId);

List<UmapiProductGroupResponse> getProducts(String type, Integer categoryId, Integer modificationId);

List<UmapiArticleItem> getArticles(
        String type,
        List<Integer> productGroupIds,
        Integer modificationId,
        Integer supplierId,
        int limit,
        int offset
);
```

Для MVP можно реализовать только:

```java
getManufacturers
getModelSeries
getPassengerModifications
getFuseProductGroups
getArticles
```

`Categories` и `Products` оставить вторым этапом.

## 11. URI mapping в `RestClientUmapiClient`

Добавить private helper:

```java
private String catalogPath(String suffix)
```

Или использовать существующую сборку URI, но не размазывать строки по методам.

Примеры:

```java
GET /v2/autocatalog/{languageCode}-{regionCode}/Manufacturers?type=PC&popular=true
GET /v2/autocatalog/{languageCode}-{regionCode}/ModelSeries?type=PC&MFA_ID=111
GET /v2/autocatalog/{languageCode}-{regionCode}/Passangers?type=PC&MS_ID=222
GET /v2/autocatalog/{languageCode}-{regionCode}/Fuse?type=PC&ID=333
GET /v2/autocatalog/{languageCode}-{regionCode}/Articles?type=PC&PT_IDS=7,8&ID=333&limit=10&offset=0
```

Обязательные правила:

- использовать `X-App-Key`;
- не логировать ключ;
- все timeout/5xx маппить как `ExternalApiUnavailableException`;
- `401/403/402` маппить как external auth/config problem;
- неожиданные 4xx маппить как `ExternalApiContractException`.

## 12. Internal DTO для нашего API

Создать package:

```text
src/main/java/com/vladko/autoshopcore/parts/dto/catalog
```

DTO:

```text
CatalogManufacturerResponseDTO.java
CatalogModelSeriesResponseDTO.java
CatalogModificationResponseDTO.java
CatalogProductGroupSearchResponseDTO.java
CatalogProductGroupResponseDTO.java
CatalogArticleSearchResponseDTO.java
CatalogArticleResponseDTO.java
```

### 12.1. Manufacturer response

```json
{
  "type": "PC",
  "manufacturerId": 111,
  "name": "TOYOTA"
}
```

### 12.2. Model series response

```json
{
  "type": "PC",
  "manufacturerId": 111,
  "modelSeriesId": 222,
  "name": "CAMRY",
  "productionFrom": "2011",
  "productionTo": "2018"
}
```

### 12.3. Modification response

```json
{
  "type": "PC",
  "modelSeriesId": 222,
  "modificationId": 333,
  "name": "Camry 2.5",
  "powerPs": 181,
  "capacityLiters": 2.5,
  "engineType": "Petrol",
  "bodyType": "Sedan",
  "fuelType": "Petrol",
  "displayName": "Camry 2.5, 181 hp, Petrol"
}
```

### 12.4. Product group search response

```json
{
  "type": "PC",
  "modificationId": 333,
  "query": "масляный фильтр",
  "cached": false,
  "fallback": false,
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

### 12.5. Article search response

```json
{
  "type": "PC",
  "modificationId": 333,
  "productGroupIds": [7],
  "cached": false,
  "fallback": false,
  "items": [
    {
      "source": "UMAPI_AUTOCATALOG",
      "umapiArticleId": 987654,
      "articleNumber": "90915YZZE1",
      "brand": "TOYOTA",
      "name": "Масляный фильтр",
      "shortDescription": "Oil filter",
      "oeCodes": ["90915YZZE1"],
      "eanCodes": [],
      "mediaFile": null
    }
  ]
}
```

## 13. Нормализация поиска по названию

Создать:

```text
src/main/java/com/vladko/autoshopcore/integration/umapi/support/CatalogSearchTextNormalizer.java
```

Задачи:

- trim;
- lowercase;
- заменить `ё` на `е`;
- убрать лишние пробелы;
- убрать базовую пунктуацию;
- привести распространенные синонимы.

MVP синонимы:

```text
лямбда зонд -> датчик кислорода
масло фильтр -> масляный фильтр
воздухан -> воздушный фильтр
колодки -> тормозные колодки
стойка стаба -> стойка стабилизатора
```

Но синонимы лучше держать не в огромном if-else, а в небольшом `Map<String, String>` внутри normalizer. Позже можно вынести в таблицу/конфиг.

## 14. Scoring продуктовых групп

`Fuse` вернет список групп. Core должен отранжировать их по query.

Создать:

```text
CatalogProductGroupMatcher.java
```

Простая MVP-логика:

1. exact match normalized query == normalized group name -> `1.0`;
2. group contains query -> `0.9`;
3. query contains group -> `0.85`;
4. all query tokens are present -> `0.75`;
5. some query tokens are present -> `0.4-0.7`;
6. иначе не возвращать или вернуть ниже threshold.

Параметры:

```properties
app.umapi.catalog.product-group-min-score=0.35
app.umapi.catalog.product-group-max-results=20
```

Можно добавить в `UmapiProperties`:

```java
Catalog catalog

public record Catalog(
        BigDecimal productGroupMinScore,
        int productGroupMaxResults,
        Duration vehicleTreeTtl,
        Duration productGroupTtl,
        Duration articleTtl
) {}
```

Если не хочется усложнять properties в MVP, использовать constants:

```java
MIN_SCORE = 0.35
MAX_RESULTS = 20
```

## 15. Redis cache strategy

Новые cache keys:

```text
umapi:catalog:manufacturers:{language}:{region}:{type}:{popular}
umapi:catalog:model-series:{language}:{region}:{type}:{manufacturerId}
umapi:catalog:modifications:{language}:{region}:{type}:{modelSeriesId}
umapi:catalog:fuse:{language}:{region}:{type}:{modificationId}
umapi:catalog:product-groups-search:{language}:{region}:{type}:{modificationId}:{queryHash}
umapi:catalog:articles:{language}:{region}:{type}:{modificationId}:{productGroupIds}:{supplierId}:{limit}:{offset}
```

TTL:

| Данные | TTL |
|---|---:|
| manufacturers | 7d |
| model series | 7d |
| modifications | 7d |
| categories/products/fuse | 24h |
| articles | 6h |
| empty successful result | 15m |

Почему так:

- дерево автомобилей меняется редко;
- список артикулов меняется чаще, но не каждую минуту;
- цены не здесь, цены живут в Carreta и кешируются коротко.

## 16. Новый service layer

Создать package:

```text
src/main/java/com/vladko/autoshopcore/parts/service/catalog
```

Интерфейсы:

```java
public interface VehicleCatalogLookupService {
    List<CatalogManufacturerResponseDTO> getManufacturers(String type, Boolean popular);
    List<CatalogModelSeriesResponseDTO> getModelSeries(String type, Integer manufacturerId);
    List<CatalogModificationResponseDTO> getModifications(String type, Integer modelSeriesId);
}
```

```java
public interface PartCatalogSearchService {
    CatalogProductGroupSearchResponseDTO searchProductGroups(String type, Integer modificationId, String query);
    CatalogArticleSearchResponseDTO searchArticles(String type, Integer modificationId, List<Integer> productGroupIds, Integer supplierId, Integer limit, Integer offset);
}
```

Реализации:

```text
UmapiVehicleCatalogLookupService.java
UmapiPartCatalogSearchService.java
```

Правила:

- controller не вызывает `UmapiClient` напрямую;
- service normalizes input;
- service строит cache key;
- service использует retry;
- service маппит UMAPI DTO в наши DTO;
- service ставит `cached/fallback`.

## 17. REST API для фронта

Создать:

```text
src/main/java/com/vladko/autoshopcore/parts/controller/CatalogPartSearchController.java
```

Base path:

```http
/api/parts/catalog
```

Endpoint-ы:

### 17.1. Manufacturers

```http
GET /api/parts/catalog/manufacturers?type=PC&popular=true
```

### 17.2. Model series

```http
GET /api/parts/catalog/model-series?type=PC&manufacturerId={manufacturerId}
```

### 17.3. Modifications

```http
GET /api/parts/catalog/modifications?type=PC&modelSeriesId={modelSeriesId}
```

### 17.4. Product group search

```http
GET /api/parts/catalog/product-groups/search?type=PC&modificationId={modificationId}&query={query}
```

### 17.5. Articles

```http
GET /api/parts/catalog/articles?type=PC&modificationId={modificationId}&productGroupIds=7,8&supplierId={supplierId}&limit=10&offset=0
```

### 17.6. Order-friendly shortcut

Опционально добавить endpoint, который берет `modificationId` из автомобиля заказа:

```http
GET /api/orders/{orderId}/parts/catalog/product-groups/search?query={query}
GET /api/orders/{orderId}/parts/catalog/articles?productGroupIds=7,8&limit=10
```

Это самый удобный API для фронта в реальном заказе.

Если у автомобиля нет `umapiModificationId`, вернуть:

```http
409 Conflict
```

Message:

```text
Vehicle is not linked to UMAPI catalog modification
```

## 18. Vehicle catalog link API

Добавить в `VehicleController`:

```http
PUT /api/vehicles/{id}/catalog-link
DELETE /api/vehicles/{id}/catalog-link
```

`PUT` сохраняет привязку.  
`DELETE` очищает привязку, если выбрали неправильную модификацию.

### 18.1. Почему нужен DELETE

Ошибки выбора модификации будут. Например:

- не тот двигатель;
- рестайлинг/дорестайлинг;
- другой рынок;
- правый/левый руль;
- коммерческая версия вместо легковой.

Работник/менеджер должен иметь способ сбросить и выбрать заново.

## 19. Связь с Carreta

Каталоговый поиск заканчивается не закупкой, а выбранным артикулом.

Дальше используется уже существующий endpoint:

```http
GET /api/procurement/supplier-quotes/search?query={articleNumber}
```

Новый flow:

```text
CatalogArticleResponseDTO.articleNumber -> SupplierQuoteController.search(query)
```

Если UMAPI article содержит `OE_CODES`, можно добавить кнопку:

```text
Искать цены по основному артикулу
Искать цены по OE-кодам
Искать цены по аналогам
```

Но для MVP:

```text
искать Carreta по выбранному ARTICLE_NR
```

## 20. Связь с локальным складом

При получении артикулов через UMAPI Core может дополнительно подсвечивать, есть ли деталь в локальном складе.

MVP вариант:

- в `CatalogArticleResponseDTO` добавить:

```java
private Integer localPartId;
private Integer localStockQuantity;
private Integer localAvailableQuantity;
```

- искать в `part` по normalized `articleNumber` + `brand`;
- если найдено, заполнить поля;
- если не найдено, оставить `null`.

Но это можно сделать вторым шагом. Первый шаг - получить артикулы стабильно.

## 21. Import во внутренний каталог

После выбора UMAPI article работник/менеджер может создать локальную `Part`.

В Day 10 это уже упоминалось как optional import endpoint. Для нового flow он становится полезнее.

Рекомендуемый endpoint:

```http
POST /api/parts/import/external
```

Body:

```json
{
  "source": "UMAPI_AUTOCATALOG",
  "externalArticleId": 987654,
  "articleNumber": "90915YZZE1",
  "brand": "TOYOTA",
  "name": "Масляный фильтр",
  "cost": 1500.00,
  "initialStockQuantity": 0
}
```

Правила:

- `cost` не брать из UMAPI;
- `stockQuantity` не брать из UMAPI;
- если есть Carreta quote, `cost` может быть рекомендованной продажной ценой, но только после явного выбора менеджера;
- проверять дубликат `articleNumber + brand`.

## 22. Ошибки и HTTP статусы

| Ситуация | HTTP | Message |
|---|---:|---|
| `type` пустой или неизвестный | 400 | `Catalog vehicle type is not supported` |
| `query` пустой | 400 | `Product group query must not be blank` |
| `modificationId` отсутствует | 400 | `Modification id is required` |
| автомобиль не привязан к UMAPI | 409 | `Vehicle is not linked to UMAPI catalog modification` |
| UMAPI ключ не настроен | 503 | `UMAPI API key is not configured` |
| UMAPI auth/payment error | 502 | `UMAPI authentication failed` |
| UMAPI timeout без cache | 503 | `UMAPI is unavailable` |
| UMAPI timeout с cache | 200 | `fallback=true` |

## 23. Пакетная структура

Добавить:

```text
src/main/java/com/vladko/autoshopcore/parts/controller/
└── CatalogPartSearchController.java

src/main/java/com/vladko/autoshopcore/parts/dto/catalog/
├── CatalogManufacturerResponseDTO.java
├── CatalogModelSeriesResponseDTO.java
├── CatalogModificationResponseDTO.java
├── CatalogProductGroupResponseDTO.java
├── CatalogProductGroupSearchResponseDTO.java
├── CatalogArticleResponseDTO.java
└── CatalogArticleSearchResponseDTO.java

src/main/java/com/vladko/autoshopcore/parts/service/catalog/
├── VehicleCatalogLookupService.java
├── PartCatalogSearchService.java
├── UmapiVehicleCatalogLookupService.java
└── UmapiPartCatalogSearchService.java

src/main/java/com/vladko/autoshopcore/integration/umapi/dto/catalog/
├── UmapiManufacturerResponse.java
├── UmapiModelSeriesResponse.java
├── UmapiPassengerModificationResponse.java
├── UmapiFuseProductGroupResponse.java
├── UmapiCategoriesResponse.java
├── UmapiProductGroupResponse.java
└── UmapiCatalogArticlesResponse.java

src/main/java/com/vladko/autoshopcore/integration/umapi/mapper/
├── UmapiVehicleCatalogMapper.java
├── UmapiProductGroupMapper.java
└── UmapiCatalogArticleMapper.java

src/main/java/com/vladko/autoshopcore/integration/umapi/support/
├── CatalogSearchTextNormalizer.java
├── CatalogProductGroupMatcher.java
└── UmapiCatalogCacheKeyFactory.java
```

Расширить:

```text
UmapiClient.java
RestClientUmapiClient.java
UmapiProperties.java
Vehicle.java
VehicleCreateDTO.java или отдельный VehicleCatalogLinkDTO
VehicleResponseDTO.java
VehicleService.java
VehicleServiceImpl.java
VehicleController.java
```

## 24. Тесты

### 24.1. Unit tests

Создать:

```text
CatalogSearchTextNormalizerTest.java
CatalogProductGroupMatcherTest.java
UmapiCatalogCacheKeyFactoryTest.java
UmapiVehicleCatalogMapperTest.java
UmapiProductGroupMapperTest.java
UmapiCatalogArticleMapperTest.java
```

Проверить:

- `ё` -> `е`;
- лишние пробелы;
- uppercase/lowercase;
- синонимы;
- exact match score;
- contains score;
- token score;
- отсечение ниже threshold.

### 24.2. Client tests

Расширить:

```text
RestClientUmapiClientTest.java
```

Проверить:

- `getManufacturers` строит правильный URL;
- `getModelSeries` передает `MFA_ID`;
- `getPassengerModifications` передает `MS_ID`;
- `getFuseProductGroups` передает `ID`;
- `getArticles` передает `PT_IDS`, `ID`, `limit`, `offset`;
- `X-App-Key` есть;
- `401/403/402` -> external bad gateway exception;
- timeout/5xx -> unavailable;
- unexpected 4xx -> contract exception.

### 24.3. Service tests

Создать:

```text
UmapiVehicleCatalogLookupServiceTest.java
UmapiPartCatalogSearchServiceTest.java
```

Проверить:

- первый запрос идет в UMAPI и пишет Redis;
- второй запрос берет Redis;
- при падении UMAPI и наличии cache возвращается `fallback=true`;
- при падении UMAPI без cache возвращается `503`;
- query нормализуется;
- product groups сортируются по score;
- `limit` и `offset` валидируются.

### 24.4. Controller tests

Создать:

```text
CatalogPartSearchControllerTest.java
VehicleCatalogLinkControllerTest.java
```

Проверить:

- happy path endpoint-ов;
- blank query -> 400;
- missing modification id -> 400;
- valid catalog link -> 200;
- reset catalog link -> 204 или 200;
- vehicle not found -> 404.

### 24.5. Integration smoke

После реализации руками проверить:

```bash
curl 'http://localhost:8080/api/parts/catalog/manufacturers?type=PC&popular=true'
curl 'http://localhost:8080/api/parts/catalog/model-series?type=PC&manufacturerId=...'
curl 'http://localhost:8080/api/parts/catalog/modifications?type=PC&modelSeriesId=...'
curl 'http://localhost:8080/api/parts/catalog/product-groups/search?type=PC&modificationId=...&query=масляный%20фильтр'
curl 'http://localhost:8080/api/parts/catalog/articles?type=PC&modificationId=...&productGroupIds=...&limit=10'
```

## 25. Порядок реализации

### Этап 1. Контракт и DTO

- Добавить UMAPI catalog DTO.
- Добавить internal catalog DTO.
- Добавить mapper skeleton.
- Добавить cache key factory.

Критерий готовности:

- проект компилируется;
- DTO не протекают из integration layer в controllers.

### Этап 2. Расширение UMAPI client

- Добавить методы в `UmapiClient`.
- Реализовать методы в `RestClientUmapiClient`.
- Добавить тесты URL/header/error mapping.

Критерий готовности:

- client tests зеленые;
- ключ UMAPI не логируется.

### Этап 3. Vehicle catalog link

- Добавить Liquibase migration.
- Расширить `Vehicle`.
- Расширить `VehicleResponseDTO`.
- Добавить `VehicleCatalogLinkDTO`.
- Добавить service/controller методы для `PUT/DELETE catalog-link`.
- Добавить тесты.

Критерий готовности:

- автомобиль может хранить UMAPI modification;
- фронт может понять, привязан автомобиль или нет.

### Этап 4. Lookup endpoint-ы автомобиля

- Реализовать manufacturers/model-series/modifications.
- Добавить Redis cache.
- Добавить controller.
- Добавить service/controller tests.

Критерий готовности:

- фронт может построить wizard выбора модификации.

### Этап 5. Product group search через Fuse

- Реализовать `getFuseProductGroups`.
- Добавить normalizer.
- Добавить matcher/scoring.
- Добавить endpoint `product-groups/search`.
- Добавить cache.

Критерий готовности:

- по query `масляный фильтр` возвращаются релевантные группы для modification id.

### Этап 6. Articles endpoint

- Реализовать `getArticles`.
- Добавить mapper в `CatalogArticleResponseDTO`.
- Добавить endpoint `/articles`.
- Добавить cache.

Критерий готовности:

- выбранная product group возвращает артикулы с `articleNumber`, `brand`, `name`, `umapiArticleId`.

### Этап 7. Order-friendly shortcut

- Добавить endpoint-ы под `/api/orders/{orderId}/parts/catalog/...`.
- Доставать `vehicle` из заказа.
- Проверять `umapiModificationId`.
- Переиспользовать `PartCatalogSearchService`.

Критерий готовности:

- фронт в карточке заказа может искать деталь без передачи `modificationId` руками.

### Этап 8. Связка с Carreta

- Убедиться, что выбранный `articleNumber` удобно передается в supplier quote search.
- Добавить в response articles поле `supplierQuoteSearchUrl` только если это полезно для фронта.
- Не вызывать Carreta автоматически при каждом article search, чтобы не сжигать лимиты.

Критерий готовности:

- работник выбирает артикул;
- менеджер отдельным действием запускает поиск цен.

## 26. Что не делать в этом addon

- Не делать прямой frontend -> UMAPI.
- Не делать прямой frontend -> Carreta.
- Не обещать глобальный поиск по названию без автомобиля.
- Не создавать закупку автоматически после выбора product group.
- Не записывать UMAPI results в PostgreSQL как cache.
- Не смешивать закупочную цену и клиентскую цену.
- Не добавлять VIN decode, пока нет подтвержденного endpoint-а/провайдера.
- Не усложнять fuzzy search до отдельного поискового движка.

## 27. Acceptance criteria

Addon считается реализованным, если:

- работник может выбрать UMAPI модификацию для автомобиля;
- привязка сохраняется в `vehicle`;
- фронт может проверить, есть ли у автомобиля `umapiModificationId`;
- работник может ввести название детали;
- Core через UMAPI `Fuse` возвращает релевантные product groups;
- работник может выбрать product group;
- Core через UMAPI `Articles` возвращает артикулы;
- выбранный артикул можно передать в существующий Carreta quote search;
- все новые внешние вызовы идут через `UmapiClient`;
- ответы кешируются в Redis;
- при сбое UMAPI работает retry/fallback;
- реальные ключи не попадают в Git;
- есть unit/client/service/controller tests.

## 28. Итоговая целевая схема

```text
Order
  |
  v
Vehicle
  |
  | has umapiModificationId?
  |-- no  -> Catalog wizard: Manufacturers -> ModelSeries -> Passangers -> save link
  |-- yes -> Continue
  |
  v
Worker enters part name
  |
  v
Core /api/parts/catalog/product-groups/search
  |
  v
UMAPI Fuse -> Core scoring -> Product groups
  |
  v
Worker selects product group
  |
  v
Core /api/parts/catalog/articles
  |
  v
UMAPI Articles -> CatalogArticleResponseDTO
  |
  v
Manager searches supplier price
  |
  v
Core /api/procurement/supplier-quotes/search
  |
  v
Carreta quotes -> manager approval -> purchase order
```

Главная мысль: Day 10 дал backend основу для UMAPI/Carreta, а этот addon превращает ее в удобный рабочий сценарий для мастера, который не знает артикулы наизусть.
