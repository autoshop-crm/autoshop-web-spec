# Подробный план на День 10: 18 апреля 2026

Основа плана:
- `ContextProject/Now/FULL_PLAN_TO_2026-05-01.md`
- `ContextProject/Now/DAY_4_2026-04-12_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_5_2026-04-13_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_6_2026-04-14_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_7_2026-04-15_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_9_2026-04-17_DETAILED_PLAN.md`
- текущее состояние `Core` после реализации `Parts` и `Loyalty`

Главная цель дня:
Интегрировать внешний каталог запчастей `UMAPI` и первый официальный price/supplier provider `Carreta` в `Core` так, чтобы модуль `parts` мог искать каталожные артикула, бренды, аналоги и применяемость через UMAPI, получать цены/наличие/сроки поставки через Carreta, безопасно кэшировать результаты в Redis, устойчиво переживать временные ошибки внешних API через retry/fallback и отдавать внутренним клиентам стабильный backend-контракт.

К концу дня `UMAPI` должен быть не "прямым HTTP-вызовом из controller", а отдельным интеграционным слоем, который аккуратно встраивается в уже готовые домены:
- `parts`
- `order`
- `order financials`
- `loyalty`
- будущие Web/Android клиенты

После уточнения цены:
`Carreta` добавляется не как scraper, а как первый официальный supplier adapter. UMAPI отвечает на вопрос "что это за деталь и какие у нее OE/OEM/аналоги", Carreta отвечает на вопрос "где купить, за сколько, сколько есть и какой срок поставки".

---

## Что должно быть готово к концу 18 апреля 2026

- Есть отдельный integration layer для `UMAPI`:
  - configuration properties;
  - HTTP client;
  - request/response DTO внешнего API;
  - internal DTO для собственного API;
  - mapper;
  - service/facade;
  - exceptions;
  - tests.
- Есть отдельный integration layer для `Carreta`:
  - configuration properties;
  - HTTP client;
  - search DTO;
  - order DTO;
  - mapper supplier quote -> internal DTO;
  - безопасная обработка `api_key` в query string;
  - tests.
- Есть Redis cache для результатов поиска:
  - ключи нормализованы;
  - TTL выбран осознанно;
  - cache miss/cache hit работают предсказуемо;
  - не кэшируются невалидные запросы и server errors;
  - negative cache используется только если это безопасно.
- Есть retry-механизм для временных ошибок:
  - network timeout;
  - `429 Too Many Requests`;
  - `5xx`;
  - transient connection errors.
- Есть явные правила, что не ретраится:
  - `400`;
  - `401/403`;
  - невалидные параметры;
  - ошибки маппинга контракта, которые требуют правки кода.
- Есть fallback-поведение:
  - при недоступности UMAPI возвращать свежий cache, если он есть;
  - если свежего cache нет, возвращать понятную ошибку;
  - не подменять внешний каталог внутренним складом молча.
- Есть API внутри `Core` для поиска внешних запчастей:
  - поиск по артикулу/OEM;
  - поиск с учетом бренда, если UMAPI это поддерживает;
  - ответ с нормализованными каталожными позициями и аналогами.
- Есть API внутри `Core` для поиска цен и поставки:
  - поиск Carreta по артикулу/OEM;
  - нормализованный список supplier quotes;
  - цена в рублях;
  - наличие;
  - срок поставки;
  - вероятность поставки;
  - признак аналога.
- Есть точка связывания внешней каталожной позиции с внутренним каталогом:
  - либо только "импортировать external catalog item в Part" как отдельный plan-ready endpoint;
  - либо MVP-реализация через создание/обновление внутренней `Part` и дальнейшее резервирование стандартным механизмом.
- Есть точка связывания supplier quote с закупкой:
  - `PurchaseRequest` создается из заказа после выбора детали мастером;
  - менеджер выбирает конкретное предложение;
  - автоматическое создание заказа в Carreta выполняется только после явного подтверждения менеджером;
  - приемка на склад остается отдельным ручным действием.
- Есть тесты:
  - unit для нормализации ключей и mapper;
  - service tests для cache/retry/fallback;
  - controller tests для HTTP-контракта;
  - integration test с Redis, если хватает времени.
- Есть ручной smoke-сценарий:
  - поиск по артикулу;
  - повторный поиск попадает в Redis;
  - при имитации падения UMAPI ответ берется из cache;
  - при отсутствии cache возвращается корректная ошибка.

---

## Главный результат дня

После Дня 10 `Parts` перестает быть только внутренним складом и получает внешний справочник артикулов/аналогов, но без разрушения уже готовой модели склада и заказов.

Важно:
- `UMAPI` отвечает за внешний каталожный поиск, уточнение бренда, аналоги, OE/EAN-коды и применяемость;
- `Carreta` отвечает за price/availability/supply quote и, опционально, оформление закупочного заказа;
- внутренний `Part` отвечает за собственный склад;
- `OrderPartItem` отвечает за резервирование реальной внутренней запчасти под заказ;
- `OrderFinancialsService` остается единственным местом пересчета финансов заказа;
- `LoyaltyService` продолжает корректировать примененные баллы после изменения totals.

Важно после разбора документации:
текущая Swagger-документация UMAPI Catalog API не показывает endpoint'ы цен, складских остатков и доставки. Поэтому в День 10 нельзя проектировать UMAPI как price/availability provider. Это именно catalog/cross-reference integration. Цена `Part.cost`, `stockQuantity` и `reservedQuantity` остаются внутренними данными AutoShop.

Компенсация этого ограничения:
Carreta API подходит как первый официальный price/supplier provider. Поэтому scraping сайтов в День 10 не нужен и не является рекомендуемым путем.

Главная архитектурная идея дня:
`UMAPI` не должен протечь во все слои проекта. Внешний API может менять поля, статусы, ошибки и rate limits, но внутренний API `Core` должен оставаться стабильным.

---

## Что не делаем в День 10

- Не реализуем автоматическую закупку у поставщика.
- Не списываем и не резервируем внешний склад как внутренний `stockQuantity`.
- Не смешиваем внешние каталожные позиции UMAPI с таблицей `part` без явного решения.
- Не добавляем сложное сравнение всех возможных поставщиков, ранжирование по логистике и маржинальности за пределами Carreta MVP.
- Не строим полноценный procurement module.
- Не делаем Kafka-события по внешним каталожным позициям.
- Не делаем UI в Web/Android.
- Не хардкодим реальные API-ключи в репозиторий.
- Не используем web scraping, пока есть официальный API поставщика.
- Не оформляем реальный заказ у Carreta без явного подтверждения менеджером.

---

## Ключевой контекст проекта на старт Дня 10

Перед реализацией нужно держать в голове фактическое состояние проекта:

- `Core` уже имеет рабочие вертикальные модули:
  - `client`
  - `vehicle`
  - `order`
  - `parts`
  - `loyalty`
- `Parts` уже умеет:
  - хранить внутренние запчасти;
  - искать по `articleNumber`, `brand`, `name`;
  - обновлять остатки;
  - резервировать запчасти под заказ;
  - пересчитывать `partsTotal` через `OrderFinancialsService`.
- `OrderPartInventoryCoordinator` уже связан с:
  - `OrderRepository`;
  - `PartRepository`;
  - `OrderPartItemRepository`;
  - `OrderFinancialsService`;
  - `LoyaltyService`.
- Redis уже есть в инфраструктуре:
  - `docker-compose.yml` содержит `redis`;
  - `application.properties` содержит `spring.data.redis.host/port`;
  - dependency `spring-boot-starter-data-redis` уже подключена.
- HTTP client layer для внешних API пока не выделен.
- Retry dependency пока не подключена.
- Security в `Core` пока открыт, интеграция с `AuthService` идет отдельным днем.
- Procurement/purchase flow пока не выделен:
  - есть внутренний склад `Part`;
  - есть резервирование `OrderPartItem`;
  - но еще нет `PurchaseRequest`, `SupplierQuote`, `PurchaseOrder` и приемки внешней закупки.

Из этого следует:
`UMAPI` и `Carreta` надо добавлять как отдельные integration packages, а procurement-flow держать отдельным слоем, а не как методы внутри `PartServiceImpl`.

---

## Архитектурные решения, которые надо зафиксировать утром

Перед кодингом нужно принять 16 решений и дальше не менять их посреди дня:

1. Где живет код интеграции:
   - рекомендуемый пакет: `com.vladko.autoshopcore.integration.umapi`;
   - рядом с ним можно держать `configuration`, если конфиг общий.
2. Какой клиент используем:
   - рекомендуемый MVP: Spring `RestClient`, потому что `spring-boot-starter-web` уже есть;
   - `WebClient` подключать только если реально нужен reactive/non-blocking сценарий.
3. Какой retry выбираем:
   - рекомендуемый вариант: `spring-retry` + `spring-aspects`;
   - альтернатива: Resilience4j, если нужен circuit breaker уже сейчас.
4. Как включаем Redis cache:
   - или через Spring Cache abstraction;
   - или через явный `RedisTemplate/StringRedisTemplate` с JSON serialization.
5. Что кэшируем:
   - нормализованный internal response, а не сырой внешний JSON;
   - внешний сырой JSON можно логировать/сохранять только при отдельной необходимости.
6. TTL:
   - базовый TTL для catalog search results: `6 часов`, как в overview проекта;
   - для справочников `LanguageCodes`, `RegionCodes`, `Suppliers` можно использовать больший TTL;
   - для цен/остатков TTL сейчас не проектируем, потому что текущая UMAPI Catalog API спецификация их не отдает.
7. Как строим cache key:
   - ключ должен зависеть от normalized `articleNumber`, `brand`, search type и важных фильтров;
   - ключ не должен включать API key или случайные технические headers.
8. Какой внешний поиск делаем первым:
   - поиск по `articleNumber/OEM`;
   - brand/refinement добавляется только если есть в UMAPI contract.
9. Как UMAPI связан с внутренним складом:
   - внешний результат не становится `Part` автоматически;
   - создание внутренней `Part` из external catalog item только явным действием пользователя/API.
10. Как работаем с заказом:
   - в MVP внешний поиск помогает выбрать деталь;
   - резервирование под заказ по-прежнему идет через внутренний `Part` и `OrderPartItem`.
11. Что считаем ошибкой клиента:
   - пустой/слишком короткий артикул;
   - неподдерживаемый фильтр;
   - неверная пагинация/limit.
12. Что считаем внешней ошибкой:
   - timeout;
   - `429`;
   - `5xx`;
   - неожиданный формат ответа.
13. Как Carreta связана с UMAPI:
   - UMAPI дает `ARTICLE_NR`, `BRAND`, `OE_CODES`, `EAN_CODES`;
   - Carreta search получает `q` как OEM/OE или артикул;
   - результаты Carreta не считаются валидными для заказа без подтверждения менеджера.
14. Как работаем с закупкой:
   - мастер создает потребность в детали;
   - менеджер выбирает supplier quote;
   - автоматический Carreta order включается только отдельным action и только после manager approval;
   - для разработки использовать `test=on`.
15. Как защищаем Carreta key:
   - `api_key` хранится только в env/secret manager;
   - полный URL с `api_key` не логируется;
   - в Carreta включается IP allowlist сервера.
16. Как цена попадает в заказ клиента:
   - Carreta `price` = закупочная цена;
   - клиентская цена считается внутри AutoShop через markup/manual approval;
   - `OrderPartItem.unitPrice` фиксирует клиентскую цену на момент резервирования.

Если эти решения не принять утром, интеграция быстро расползется в спор:
- кэшировать raw или DTO;
- создавать ли внутренние детали автоматически;
- где ретраить;
- чем отличается внутренний склад от внешней каталожной позиции.
- можно ли мастеру самостоятельно оформить закупку;
- можно ли внешнюю закупочную цену показывать клиенту напрямую.

---

## Вопросы к UMAPI, которые нужно разобрать следующим сообщением

Следующий шаг должен быть отдельным разбором реального API UMAPI. До него нельзя считать внешний contract финальным.

Нужно выяснить:

1. Base URL:
   - production;
   - sandbox/test, если есть.
2. Auth:
   - API key;
   - bearer token;
   - basic auth;
   - подпись запроса;
   - срок жизни credentials.
3. Основные endpoint'ы:
   - search by article/OEM;
   - brand refinement by article;
   - analogs/cross-reference;
   - article details;
   - article applicability;
   - vehicle catalog navigation;
   - maintenance catalog.
4. Request contract:
   - обязательные параметры;
   - optional filters;
   - pagination;
   - sorting;
   - locale/currency/region.
5. Response contract:
   - part identifier;
   - article;
   - brand;
   - name;
   - UMAPI article id;
   - supplier/manufacturer id;
   - description;
   - media;
   - OE/EAN codes;
   - applicability;
   - analog/cross flags.
6. Error model:
   - коды;
   - body;
   - rate limit response;
   - auth failures.
7. Limits:
   - requests per second/minute/day;
   - max page size;
   - timeout recommendations.
8. Data freshness:
   - как часто обновляются каталожные данные;
   - можно ли кэшировать catalog/cross results 6 часов;
   - есть ли cache headers.
9. Legal/operational constraints:
   - можно ли сохранять results;
   - можно ли показывать supplier/manufacturer data пользователю;
   - есть ли ограничения на хранение медиа/OE/EAN данных.

После этого план Дня 10 можно уточнить на уровне конкретных endpoint'ов и DTO.

---

## Факты из документации UMAPI API

Источник:
- официальная документация: `https://api.umapi.ru/documentation?ngsw-bypass=true`;
- Swagger UI берет OpenAPI 3.0.0 spec из встроенного `swagger-ui-init.js`;
- `info.version`: `2.1.1`;
- production server: `https://api.umapi.ru`.

Security schemes из OpenAPI:
- `appKey`:
  - type: `apiKey`;
  - location: HTTP header;
  - header name: `X-App-Key`.
- `jwtWeb` / `jwt`:
  - type: bearer JWT.

Для нашего backend MVP выбираем `appKey`, потому что это server-to-server интеграция `Core -> UMAPI`.

Общие path-параметры для `Автокаталог`:
- `languageCode`: код языка, default `ru`;
- `regionCode`: код региона, default `WWW`;
- итоговый prefix: `/v2/autocatalog/{languageCode}-{regionCode}`.

Рекомендуемые значения по умолчанию для проекта:
- `languageCode = ru`;
- `regionCode = WWW`;
- `type = PC` для пассажирских авто;
- `limit = 10`;
- `offset = 0`.

Документированные common errors для autocatalog endpoint'ов:
- `400 Bad Request` — синтаксическая/параметрическая ошибка запроса;
- `401 Unauthorized` — нет или неверная аутентификация;
- `402 Payment Required` — тариф/услуга не оплачены;
- `500 Internal Server Error` — внутренняя ошибка UMAPI.

Важно:
- в этой спецификации нет `429 Too Many Requests`, но retry/rate-limit handling все равно оставляем в проектном плане, потому что внешние API часто вводят лимиты не только через OpenAPI;
- `402 Payment Required` нужно обрабатывать отдельно от `401`, чтобы в логах было понятно: ключ есть, но тариф/доступ не позволяет выполнить запрос.

### API key и безопасность

Реальный API key был передан в рабочем чате для локальной разработки и проверки интеграции, но его нельзя сохранять:
- в `application.properties`;
- в markdown-файлах;
- в test fixtures;
- в Dockerfile/docker-compose;
- в GitHub Actions yaml;
- в README;
- в истории git.

В коде и документации используем только placeholder:

```properties
APP_UMAPI_API_KEY=<your-umapi-api-key>
```

Для локального запуска:

```bash
export APP_UMAPI_API_KEY='<your-real-key-only-on-your-machine>'
```

Для сервера:
- каждый владелец deployment покупает/получает свой ключ UMAPI;
- ключ задается через environment variable, secret manager или переменные CI/CD;
- GitHub repository не должен содержать рабочий ключ;
- при случайном попадании ключа в git его нужно немедленно отозвать/перевыпустить в UMAPI.

HTTP header при вызове UMAPI:

```http
X-App-Key: <value from APP_UMAPI_API_KEY>
```

### Endpoint'ы UMAPI, нужные проекту

#### 1. Базовые справочники локали и региона

Используются редко, но полезны для валидации конфигурации и будущего admin/debug endpoint.

| Метод | Endpoint | OperationId | Зачем нам |
|---|---|---|---|
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/LanguageCodes` | `languageCodes` | Проверить доступные языки переводов |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/RegionCodes` | `regionCodes` | Проверить доступные регионы фильтрации |

Минимальный mapping:
- `LanguageCodes`: `LANGUAGES_CODE`, `DESCRIPTION`;
- `RegionCodes`: `COUNTRIES_CODE`, `DESCRIPTION`, `IS_GROUP`.

#### 2. Поиск по артикулу и аналоги

Это главный MVP-сценарий для `Parts`: мастер вводит артикул, backend уточняет бренд и получает аналоги.

| Метод | Endpoint | OperationId | Зачем нам |
|---|---|---|---|
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/BrandRefinement/{article_search}` | `brandRefinementV2` | Уточнить бренд по артикулу перед поиском аналогов |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Analogs/{article_search}` | `articleAnalogsV2` | Найти аналоги по артикулу без бренда |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Analogs/{article_search}/{brand}` | `articleBrandAnalogsV2` | Найти аналоги по артикулу и бренду |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Article/{id}` | `articleV2` | Получить карточку артикула по `ART_ID` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/ArticleLinks/{id}` | `articleLinksV2` | Получить применяемость артикула |

Ключевые параметры:
- `article_search`: номер артикула;
- `brand`: производитель/бренд;
- `id`: UMAPI article id;
- `limit`: default `10`;
- `offset`: default `0`.

Ключевые поля `BrandRefinement`:
- `SEARCH_NUMBER`;
- `DISPLAY_NR`;
- `TYPE`;
- `BRA_ID`;
- `BRAND`;
- `DES`;
- `TITLE`.

Ключевые поля `AnalogsArticleData` / `AnalogsArticleBrandData`:
- `ART_ID`;
- `ARTICLE_NR`;
- `SUP_ID`;
- `BRAND`;
- `COMPLETE_DES`;
- `DES`;
- `STATUS_DATE`;
- `STATUS_DES`;
- `MEDIA_FILE`;
- `PRODUCTS`;
- `MEDIAS`;
- `INFO`;
- `CRITERIAS`;
- `SUPERSEDED`;
- для `AnalogsArticleData` дополнительно встречаются `ARL_DISPLAY_NR`, `ARL_BRA_BRAND`, `ARL_TYPE`.

Рекомендуемый internal DTO:

```json
{
  "umapiArticleId": 123456,
  "articleNumber": "OC90",
  "brandId": 42,
  "brand": "KNECHT",
  "name": "Oil filter",
  "shortDescription": "Фильтр масляный",
  "status": "Normal",
  "mediaFile": "https://...",
  "source": "UMAPI_AUTOCATALOG"
}
```

#### 3. Кроссы

Эти endpoint'ы полезны для более быстрого cross-reference сценария. Их стоит держать отдельным client method, потому что path prefix отличается от autocatalog.

| Метод | Endpoint | OperationId | Зачем нам |
|---|---|---|---|
| `GET` | `/v2/cross/{languageCode}-{regionCode}/BrandRefinement/{article_search}` | `crossBrandRefinement` | Уточнить бренд по артикулу через cross API |
| `GET` | `/v2/cross/{languageCode}-{regionCode}/Analogs/{article_search}/{brand}` | `crossAnalogs` | Получить аналоги через cross API |
| `GET` | `/v2/cross/{languageCode}-{regionCode}/EAN/{article_search}/{brand}` | `crossEAN` | Получить GTIN/EAN по артикулу и бренду |
| `GET` | `/v2/cross/parts/refineBrandDataByArticle/{article_search}` | `refineBrandDataByArticle` | V2 brand refinement без language-region prefix |
| `GET` | `/v2/cross/parts/Analogs/{article_search}/{brand_search}` | `crossPartsAnalogs` | V2 аналоги по артикулу и бренду |
| `GET` | `/v2/cross/parts/Analogs/pro/{article_search}/{brand_search}/{isBan}` | `crossPartsAnalogsNew` | Расширенный V2 поиск аналогов |
| `GET` | `/v2/cross/parts/Analogs/getCrossInfo?article={article}&brand={brand}` | `getCrossInfo` | Расширенная информация по артикулу и бренду |

Для MVP:
- сначала реализовать autocatalog `BrandRefinement` + `Analogs`;
- затем добавить `cross/parts` как fallback или отдельный endpoint;
- не смешивать ответы разных endpoint'ов без поля `source`.

Ключевые поля `CrossBrandRefinement` / `GroupedBrandClass`:
- `article`;
- `articleSearch`;
- `brand`;
- `brandSearch`;
- `title`;
- `img`;
- `type`;
- `catalogId`;
- `brands`.

#### 4. Навигация по автомобилю до списка артикулов

Это второй сценарий после MVP: подобрать деталь не по артикулу, а по автомобилю.

| Метод | Endpoint | OperationId | Зачем нам |
|---|---|---|---|
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Manufacturers?type={type}&popular={popular}` | `manufacturersV2` | Марки/производители ТС |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/ModelSeries?type={type}&MFA_ID={id}` | `modelsV2` | Модельные серии по производителю |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Passangers?type={type}&MS_ID={id}` | `passangersV2` | Модификации пассажирских авто |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Passanger/{id}` | `passangerIdV2` | Детали модификации пассажирского авто |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Categories?type={type}&ID={modificationId}` | `categoriesV2` | Категории запчастей по модификации |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Products?type={type}&CATEGORY_ID={categoryId}&ID={modificationId}` | `productsV2` | Продуктовые группы с производителями |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Products/one?type={type}&CATEGORY_ID={categoryId}&ID={modificationId}` | `productsOneV2` | Продуктовые группы без производителей |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Articles?type={type}&PT_IDS={ids}&ID={modificationId}&SUP_ID={supplierId}&limit={limit}&offset={offset}` | `articlesV2` | Артикулы по продуктовой группе и модификации |

Типы транспорта, которые встречаются в документации:
- `PC`;
- `CV`;
- `Motorcycle`;
- `Engine`;
- `Axle`;
- для manufacturer search также встречаются электрокатегории вроде `E-PC`.

Для AutoShop MVP:
- использовать `PC`;
- commercial/motorbike/engine/axle оставить на будущее.

Ключевые поля:
- `Manufacturer`: `MFA_ID`, `MANUFACTURER`, `TYPE`, `MANUFACTURER_RU`, `COUNTRY`;
- `ModelSeries`: `MFA_ID`, `MANUFACTURER`, `MS_ID`, `MODEL_SERIES`, `CI_FROM`, `CI_TO`, `TYPE`;
- `Passangers`: `PC_ID`, `PASSENGER_CAR`, `POWER_PS`, `CAPACITY_LT`, `ENGINE_TYPE`, `BODY_TYPE`, `FUEL_TYPE`, `ENGINES`;
- `Categories`: `quic`, `root`;
- `Products`: `PT_ID`, `PRODUCT`, `SUP_ID`, `BRAND`;
- `ArticlesData`: `ART_ID`, `ARTICLE_NR`, `SUP_ID`, `BRAND`, `COMPLETE_DES`, `OE_CODES`, `EAN_CODES`, `PARTS_LIST`, `ACCS_LIST`.

#### 5. Коммерческий транспорт, мото, двигатели, оси, кабины

Эти endpoint'ы не нужны для первого MVP автосервиса, но полезны, если проект расширится за пределы пассажирских авто.

| Метод | Endpoint | OperationId |
|---|---|---|
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/CommercialVehicles` | `commercialVehiclesV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/CommercialVehicle/{id}` | `commercialVehicleIdV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Motorbikes` | `motorbikesV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Motorbike/{id}` | `motorbikeIdV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Engines` | `enginesV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Engine/{id}` | `engineIdV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Axles` | `axlesV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/Axle/{id}` | `axleIdV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/DriversCabs` | `driversCabsV2` |
| `GET` | `/v2/autocatalog/{languageCode}-{regionCode}/DriversCab/{id}` | `driversCabIdV2` |

В День 10 эти методы не реализуем, но не блокируем архитектурно:
- тип транспорта должен быть enum/configurable value;
- cache key должен включать `type`, если endpoint зависит от типа.

#### 6. Список производителей запчастей

Endpoint:

```http
GET /v2/autocatalog/{languageCode}-{regionCode}/Suppliers?limit={limit}&offset={offset}
```

OperationId:
- `articleSuppliersV2`.

Смысл:
- это список производителей/брендов запчастей в каталоге, не список продавцов с остатками.

Ключевые поля:
- `SUP_ID`;
- `SUP_BRAND`;
- `SUP_FULL_NAME`;
- `COUNT_ARTICLES`.

#### 7. Каталог ТО

Эти endpoint'ы полезны позже для рекомендаций обслуживания и планового ТО в мобильном приложении.

| Метод | Endpoint | OperationId | Зачем нам |
|---|---|---|---|
| `GET` | `/v1/to/marca` | `goToMarca` | Марки ТС |
| `GET` | `/v1/to/models/{marcaId}` | `goToModel` | Модели ТС |
| `GET` | `/v1/to/modifications/{modelId}` | `goToModification` | Модификации с maintenance/oils/specifications/kits |

Ключевые поля:
- `ToMarca`: `id`, `name`;
- `ToModel`: `id`, `name`, `yearFrom`, `yearTo`, `marcaId`;
- `ToModification`: `id`, `name`, `engineCode`, `fuel`, `horsePower`, `maintenances`, `oils`, `specifications`, `kits`.

В День 10:
- не реализуем как production flow;
- фиксируем как будущий integration slice для "Мой гараж" и рекомендаций ТО.

---

## Факты из документации Carreta API

Источник:
- официальная страница: `https://carreta.ru/prices-and-api/`;
- API base URL: `https://api.carreta.ru`;
- API version prefix: `/v1`;
- формат API: HTTP REST + JSON;
- есть CSV price lists как дополнительный источник данных.

Почему Carreta подходит проекту:
- UMAPI не отдает цены/остатки/сроки поставки;
- Carreta отдает price/availability/delivery fields;
- Carreta имеет официальный API, поэтому на старте не нужен scraping сайтов;
- Carreta поддерживает создание заказа через API, но это нужно включать только после manager approval.

### Доступ и безопасность Carreta

По документации Carreta:
- выполнять запросы могут только зарегистрированные пользователи;
- нужен `api_key`;
- ключ находится в профиле пользователя;
- в профиле можно настроить IP allowlist сервера;
- разрешено добавить до 5 IP-адресов;
- при ошибке доступа API возвращает `401 Unauthorized`.

Особенность:
Carreta передает `api_key` как query parameter, например:

```http
GET https://api.carreta.ru/v1/profile/?api_key=<api_key>
```

Это опаснее, чем header-auth, потому что URL часто попадает в access logs, exception messages, tracing и browser history. Поэтому для нашего проекта обязательно:

- хранить ключ только в env/secret manager;
- не коммитить ключ в `application.properties`, markdown, tests, Docker Compose, GitHub Actions;
- не логировать full URI для Carreta calls;
- делать redaction query parameter `api_key`;
- в error response не возвращать внешний URL;
- в Carreta profile настроить IP allowlist production server;
- для локальной разработки использовать отдельный тестовый/личный ключ, не production key;
- если ключ попал в git/logs, немедленно перевыпустить ключ.

Пример конфигурации без секрета:

```properties
app.carreta.base-url=${APP_CARRETA_BASE_URL:https://api.carreta.ru}
app.carreta.api-key=${APP_CARRETA_API_KEY:}
app.carreta.account=${APP_CARRETA_ACCOUNT:}
app.carreta.test-orders-enabled=${APP_CARRETA_TEST_ORDERS_ENABLED:true}
app.carreta.connect-timeout=${APP_CARRETA_CONNECT_TIMEOUT:2s}
app.carreta.read-timeout=${APP_CARRETA_READ_TIMEOUT:5s}
app.carreta.cache.search-ttl=${APP_CARRETA_CACHE_SEARCH_TTL:30m}
app.carreta.retry.max-attempts=${APP_CARRETA_RETRY_MAX_ATTEMPTS:3}
app.carreta.retry.backoff=${APP_CARRETA_RETRY_BACKOFF:500ms}
```

### CSV-прайсы Carreta

Carreta также публикует прайс-листы:
- формат: `CSV`;
- кодировка: `CP1251`;
- разделитель: `;`;
- обновление: автоматически раз в несколько часов.

В документации на странице есть ссылки на прайсы:
- Новосибирск Опт;
- Новосибирск Розница;
- Новосибирск Наличие;
- отдельный XLS фотокаталога.

Для Day 10:
- CSV не делаем основным путем интеграции;
- фиксируем как fallback/offline import option на будущее;
- если API будет недоступен или лимитирован, можно позже сделать scheduled import прайса в `supplier_quote_cache`/`supplier_price_snapshot`.

### Endpoint'ы Carreta, нужные проекту

#### 1. Проверка профиля

Endpoint:

```http
GET /v1/profile/?api_key={apiKey}
```

Опционально:
- `account` — если клиент работает с несколькими аккаунтами.

Назначение:
- health/config check;
- проверить баланс/город/контакт профиля;
- не использовать на каждый user request, чтобы не шуметь во внешний API.

Response fields:
- `balance` — строка decimal, баланс в рублях;
- `city`;
- `email`;
- `name`;
- `phone`.

#### 2. Поиск запчастей

Endpoint:

```http
GET /v1/search/?api_key={apiKey}&q={query}
```

Опционально:
- `account` — ID аккаунта.

Назначение:
- поиск предложений по OEM/OE-коду, артикулу или кроссу;
- первый production provider для цены/наличия/срока.

Response:

```json
{
  "objects": [
    {
      "_": "<position-signature>",
      "code": "OC47",
      "desc": "",
      "is_cross": false,
      "maker": "KNECHT/MAHLE",
      "min_qty": 1,
      "name": "Фильтр масляный",
      "period_max": 7,
      "period_min": 7,
      "price": "152.02",
      "qty": "500",
      "stat": 97,
      "source": "57"
    }
  ]
}
```

Ключевые поля:
- `_` — подпись позиции, нужна для создания заказа;
- `code` — код запчасти;
- `maker` — производитель;
- `name` — наименование;
- `desc` — описание;
- `is_cross` — является ли позиция заменой;
- `price` — цена в рублях, строка decimal;
- `period_min` / `period_max` — срок поставки в днях;
- `min_qty` — минимальное количество к заказу;
- `qty` — количество в наличии, строка;
- `stat` — вероятность поставки в процентах или `null`;
- `source` — код источника предложения.

Рекомендуемый internal DTO:

```json
{
  "provider": "CARRETA",
  "sourceCode": "57",
  "positionSignature": "<hidden-from-public-response-or-short-lived>",
  "requestedCode": "OC47",
  "articleNumber": "OC47",
  "brand": "KNECHT/MAHLE",
  "name": "Фильтр масляный",
  "description": "",
  "isCross": false,
  "purchasePrice": 152.02,
  "currency": "RUB",
  "quantityRaw": "500",
  "availableQuantityParsed": 500,
  "minOrderQuantity": 1,
  "deliveryDaysMin": 7,
  "deliveryDaysMax": 7,
  "supplyProbabilityPercent": 97,
  "fetchedAt": "2026-04-18T10:00:00Z",
  "expiresAt": "2026-04-18T10:30:00Z"
}
```

Важно:
- `price` — закупочная цена поставщика, не цена клиента;
- `qty` может быть не только числом, но и строками вида `<10`, `>50`, `Есть`;
- `positionSignature` нельзя показывать публичному frontend без необходимости и нельзя логировать как обычный текст, потому что она участвует в создании заказа.

#### 3. Создание заказа у Carreta

Endpoint:

```http
POST /v1/order/?api_key={apiKey}
```

Опционально:

```http
test=on
```

Назначение:
- создать заказ у поставщика.

Для проекта:
- в MVP автоматический заказ у Carreta не делает мастер;
- заказ выполняет только менеджер после review;
- в dev/test использовать `test=on`;
- production order action должен быть отдельной кнопкой с подтверждением.

Тело запроса должно соответствовать полям из search response, плюс `order_qty`.

Минимальный body:

```json
{
  "_": "<position-signature-from-search>",
  "code": "OC47",
  "maker": "KNECHT/MAHLE",
  "name": "Фильтр масляный",
  "price": "152.02",
  "period_min": 7,
  "period_max": 7,
  "min_qty": 1,
  "qty": "500",
  "order_qty": 1,
  "client_comment": "AS-ORDER-123"
}
```

`client_comment`:
- optional;
- до 50 символов;
- удобно использовать как внутренний номер заявки/заказа AutoShop;
- потом по нему можно фильтровать список заказов.

Правила `order_qty`, которые нужно валидировать до вызова Carreta:
- `order_qty` не должно превышать `qty`;
- если `qty` начинается с `<`, то `order_qty` должен быть строго меньше указанного числа;
- если `qty` начинается с `>`, допустим широкий диапазон, но в AutoShop все равно ставим свой разумный лимит;
- если `qty` числовой, `order_qty <= qty`;
- если `qty` содержит `Есть`, точное наличие неизвестно, но Carreta допускает заказ;
- `order_qty` должно быть кратным `min_qty`.

Response behavior:
- success: `201 Created`;
- validation error: `400 Bad Request`;
- auth/access error: `401 Unauthorized`.

#### 4. Получение списка заказов Carreta

Endpoint:

```http
GET /v1/order/?api_key={apiKey}
```

Опционально:
- `page` — номер страницы;
- `client_comment` — фильтр по комментарию; можно передавать несколько раз.

Поведение:
- по умолчанию возвращаются последние 100 заказов;
- остальные можно получать через `page`;
- фильтр по `client_comment` позволяет найти внешние заказы, связанные с нашими `purchase_request`/`purchase_order`.

Response fields:
- `id`;
- `number`;
- `status`;
- `status_display`;
- `comment`;
- `client_comment`;
- `created`;
- `code`;
- `maker`;
- `name`;
- `price`;
- `period_min`;
- `period_max`;
- `order_qty`;
- `total`.

#### 5. Получение заказа Carreta по id

Endpoint:

```http
GET /v1/order/{id}/?api_key={apiKey}
```

Назначение:
- синхронизировать статус конкретной закупки;
- показать менеджеру внешний номер заказа;
- принимать решение о приемке на склад.

#### 6. История действий по заказу

Endpoint:

```http
GET /v1/order/{id}/history/?api_key={apiKey}
```

Response:
- `objects[]`;
- `comment`;
- `created`.

Назначение:
- диагностика спорных закупок;
- audit trail supplier-side событий;
- можно отображать менеджеру, но не клиенту.

### Статусы заказа Carreta

Документированные статусы:

| Статус | Описание | Наше значение |
|---:|---|---|
| `1` | Ожидает оплаты | `WAITING_PAYMENT` |
| `2` | Получен в заказ | `ACCEPTED` |
| `3` | В работе | `PROCESSING` |
| `11` | Принят поставщиком | `SUPPLIER_ACCEPTED` |
| `4` | В пути от поставщика | `IN_TRANSIT_FROM_SUPPLIER` |
| `13` | На складе филиала | `AT_BRANCH_WAREHOUSE` |
| `12` | В пути из филиала | `IN_TRANSIT_FROM_BRANCH` |
| `14` | На складе | `READY_FOR_RECEIPT` |
| `15` | В пути в пункт выдачи | `IN_TRANSIT_TO_PICKUP` |
| `5` | В пункте выдачи | `AT_PICKUP_POINT` |
| `7` | Выдан (Отправлен) | `ISSUED_OR_SHIPPED` |
| `10` | Нет в наличии | `OUT_OF_STOCK` |
| `8` | Отменен | `CANCELLED` |

Для AutoShop:
- `14`, `5`, `7` можно считать кандидатами на "можно принимать на склад", но финальное действие все равно делает менеджер;
- `10` и `8` должны переводить `PurchaseOrder` в проблемное/terminal состояние;
- `1` требует контроля баланса/оплаты.

### Carreta в MVP workflow

Основной flow:

1. Мастер выбирает деталь через UMAPI.
2. Backend получает `ARTICLE_NR`, `BRAND`, `OE_CODES`, аналоги.
3. Backend запускает supplier search в Carreta по:
   - точному артикулу;
   - OE/OEM-коду;
   - выбранным аналогам, если нужно.
4. Система создает `PurchaseRequest` для заказа.
5. Менеджер видит список `SupplierQuote`.
6. Менеджер выбирает quote.
7. Система считает:
   - закупочную цену;
   - рекомендуемую клиентскую цену;
   - маржу;
   - срок поставки.
8. Менеджер подтверждает закупку.
9. Backend вызывает Carreta `POST /v1/order/`:
   - в dev с `test=on`;
   - в production без `test=on` только после явного подтверждения.
10. Backend хранит внешний `carretaOrderId`/`number`/`status`.
11. Менеджер отслеживает статус.
12. После фактического получения детали менеджер делает приемку на склад:
   - создается/обновляется внутренний `Part`;
   - увеличивается `stockQuantity`;
   - после этого можно резервировать деталь в `OrderPartItem`.

Важно:
- purchase order не равен reservation;
- external quantity у Carreta не равен нашему stock;
- клиентская цена не равна закупочной цене Carreta.

---

## Бизнес-допущения Дня 10

После разбора OpenAPI UMAPI для MVP принимаются такие допущения:

- Основной search key: `articleNumber`.
- `articleNumber` нормализуется так же, как во внутреннем `PartServiceImpl`:
  - trim;
  - upper-case;
  - пустое значение запрещено.
- `brand` является уточняющим фильтром, но не обязательным.
- Внешняя каталожная позиция содержит минимум:
  - `umapiArticleId`;
  - `articleNumber`;
  - `brandId`;
  - `brand`;
  - `name`;
  - `shortDescription`;
  - `status`;
  - `mediaFile`;
  - `source`.
- Внешняя карточка артикула может дополнительно содержать:
  - `OE_CODES`;
  - `EAN_CODES`;
  - `PRODUCTS`;
  - `MEDIAS`;
  - `INFO`;
  - `CRITERIAS`;
  - `SUPERSEDED`;
  - применяемость через `ArticleLinks`.
- UMAPI не является источником цен, внутреннего склада, доставки и резервирования.
- Цена `Part.cost` задается вручную внутри AutoShop или будущей отдельной price-provider интеграцией.
- Carreta является первым price-provider:
  - Carreta `price` = закупочная цена;
  - Carreta `qty` = внешнее наличие/доступность, не наш склад;
  - Carreta `period_min/period_max` = срок поставки, не срок ремонта;
  - Carreta `stat` = вероятность поставки, полезна для выбора менеджером.
- Клиентская цена считается внутри AutoShop:
  - `salePrice = purchasePrice + markup`;
  - или вручную подтверждается менеджером;
  - в `OrderPartItem.unitPrice` попадает клиентская цена, а не закупочная.
- В MVP правило markup можно сделать простым:
  - до `1000` рублей: `+35%`;
  - `1000-5000` рублей: `+25%`;
  - выше `5000` рублей: `+15%`;
  - менеджер может переопределить итоговую цену перед добавлением в смету.
- Внешние каталожные позиции не участвуют в `reservedQuantity` и `stockQuantity`.
- Внутренняя `Part` может быть создана из каталожной позиции только через явный endpoint/import action.
- Внешние закупочные предложения Carreta не участвуют в `reservedQuantity` и `stockQuantity`, пока менеджер не выполнит приемку на склад.

---

## Предлагаемая структура пакетов

Рекомендуемая структура UMAPI:

```text
src/main/java/com/vladko/autoshopcore/integration/umapi
├── client
│   ├── UmapiClient.java
│   └── RestClientUmapiClient.java
├── config
│   ├── UmapiProperties.java
│   ├── UmapiClientConfiguration.java
│   ├── UmapiRetryConfiguration.java
│   └── UmapiCacheConfiguration.java
├── dto
│   ├── UmapiSearchRequest.java
│   ├── UmapiSearchResponse.java
│   ├── UmapiArticleResponse.java
│   └── ExternalPartCatalogItemResponseDTO.java
├── exception
│   ├── UmapiClientException.java
│   ├── UmapiUnavailableException.java
│   ├── UmapiAuthenticationException.java
│   ├── UmapiPaymentRequiredException.java
│   ├── UmapiRateLimitException.java
│   └── UmapiContractException.java
├── mapper
│   └── UmapiCatalogItemMapper.java
├── service
│   ├── ExternalPartSearchService.java
│   └── UmapiExternalPartSearchService.java
└── support
    ├── UmapiCacheKeyFactory.java
    └── UmapiArticleNormalizer.java
```

Controller можно выбрать одним из двух способов:

```text
src/main/java/com/vladko/autoshopcore/parts/controller/ExternalPartSearchController.java
```

или:

```text
src/main/java/com/vladko/autoshopcore/integration/umapi/controller/UmapiPartSearchController.java
```

Рекомендуемый вариант для текущего проекта:
- controller держать в `parts/controller`, потому что это user-facing API модуля запчастей;
- весь внешний implementation держать в `integration/umapi`.

Так внешний API не становится частью доменной модели, но endpoint остается в понятной зоне `/api/parts`.

Рекомендуемая структура Carreta:

```text
src/main/java/com/vladko/autoshopcore/integration/carreta
├── client
│   ├── CarretaClient.java
│   └── RestClientCarretaClient.java
├── config
│   ├── CarretaProperties.java
│   ├── CarretaClientConfiguration.java
│   ├── CarretaRetryConfiguration.java
│   └── CarretaCacheConfiguration.java
├── dto
│   ├── CarretaSearchResponse.java
│   ├── CarretaSearchItemResponse.java
│   ├── CarretaOrderCreateRequest.java
│   ├── CarretaOrderResponse.java
│   ├── CarretaOrderHistoryResponse.java
│   └── CarretaProfileResponse.java
├── exception
│   ├── CarretaClientException.java
│   ├── CarretaAuthenticationException.java
│   ├── CarretaValidationException.java
│   ├── CarretaUnavailableException.java
│   └── CarretaContractException.java
├── mapper
│   └── CarretaQuoteMapper.java
└── support
    ├── CarretaCacheKeyFactory.java
    ├── CarretaUriFactory.java
    ├── CarretaSecretRedactor.java
    └── CarretaQuantityParser.java
```

Рекомендуемая структура легкого procurement layer:

```text
src/main/java/com/vladko/autoshopcore/procurement
├── controller
│   ├── SupplierQuoteController.java
│   ├── PurchaseRequestController.java
│   └── PurchaseOrderController.java
├── dto
│   ├── SupplierQuoteResponseDTO.java
│   ├── PurchaseRequestCreateDTO.java
│   ├── PurchaseRequestResponseDTO.java
│   ├── PurchaseOrderCreateDTO.java
│   ├── PurchaseOrderResponseDTO.java
│   └── StockReceiptDTO.java
├── entity
│   ├── PurchaseRequest.java
│   ├── SupplierQuote.java
│   ├── PurchaseOrder.java
│   ├── PurchaseRequestStatus.java
│   └── PurchaseOrderStatus.java
├── repository
│   ├── PurchaseRequestRepository.java
│   ├── SupplierQuoteRepository.java
│   └── PurchaseOrderRepository.java
└── service
    ├── SupplierSearchService.java
    ├── PurchaseRequestService.java
    ├── PurchaseOrderService.java
    ├── MarkupPricingService.java
    └── StockReceivingService.java
```

MVP Day 10 может реализовать не весь procurement package, но структура должна быть зафиксирована сразу, чтобы Carreta не превратилась в методы внутри `PartServiceImpl`.

---

## Предлагаемый API внутри Core

### Поиск внешних каталожных позиций

Endpoint:

```http
GET /api/parts/external/search?articleNumber={articleNumber}&brand={brand}
```

Response DTO:

```json
{
  "articleNumber": "OC90",
  "brand": "KNECHT",
  "cached": true,
  "cacheExpiresAt": "2026-04-18T18:00:00Z",
  "items": [
    {
      "source": "UMAPI_AUTOCATALOG",
      "umapiArticleId": 123456,
      "articleNumber": "OC90",
      "brandId": 42,
      "brand": "KNECHT",
      "name": "Oil filter",
      "shortDescription": "Фильтр масляный",
      "status": "Normal",
      "mediaFile": "https://..."
    }
  ]
}
```

Важно:
- `cached` и `cacheExpiresAt` полезны для диагностики и Web UI;
- если не хочется раскрывать cache internals клиентам, можно оставить эти поля только в logs/actuator/debug, но для разработки они сильно помогают.

### Импорт внешней каталожной позиции во внутренний каталог

Этот endpoint можно сделать в конце дня, если основной поиск уже стабилен.

Endpoint:

```http
POST /api/parts/external/import
```

Request DTO:

```json
{
  "source": "UMAPI_AUTOCATALOG",
  "umapiArticleId": 123456,
  "articleNumber": "OC90",
  "brandId": 42,
  "brand": "KNECHT",
  "name": "Oil filter",
  "cost": 0.00,
  "initialStockQuantity": 0
}
```

Business rule:
- если `articleNumber` уже есть во внутреннем `part`, не создавать дубль;
- `cost` не приходит из UMAPI Catalog API и должен быть задан вручную;
- можно обновить цену только явным решением пользователя;
- `initialStockQuantity` по умолчанию `0`, потому что UMAPI Catalog API не является складом.

### Привязка к заказу

В День 10 лучше не добавлять внешний catalog item напрямую в `OrderPartItem`, потому что текущая модель `OrderPartItem` зависит от внутренней `Part`.

MVP-flow:

1. Пользователь ищет внешнюю деталь.
2. Пользователь импортирует ее во внутренний каталог как `Part`.
3. Если деталь реально закуплена/доступна на собственном складе, обновляет stock.
4. Пользователь резервирует ее под заказ через существующий:

```http
POST /api/orders/{orderId}/parts
```

Так мы сохраняем уже рабочий складской учет и не смешиваем внешние каталожные позиции с внутренними остатками.

### Поиск цен у поставщика Carreta

Endpoint:

```http
GET /api/procurement/supplier-quotes/search?query={oemOrArticle}&provider=CARRETA
```

Дополнительный вариант, если поиск запускается от выбранной UMAPI позиции:

```http
POST /api/procurement/purchase-requests
```

Request DTO:

```json
{
  "orderId": 15,
  "requestedByEmployeeId": 3,
  "umapiArticleId": 123456,
  "articleNumber": "OC90",
  "brand": "KNECHT",
  "oemCode": "11427512300",
  "quantity": 1
}
```

Response DTO supplier quote:

```json
{
  "id": 101,
  "provider": "CARRETA",
  "articleNumber": "OC47",
  "brand": "KNECHT/MAHLE",
  "name": "Фильтр масляный",
  "description": "",
  "isCross": false,
  "purchasePrice": 152.02,
  "currency": "RUB",
  "quantityRaw": "500",
  "availableQuantityParsed": 500,
  "minOrderQuantity": 1,
  "deliveryDaysMin": 7,
  "deliveryDaysMax": 7,
  "supplyProbabilityPercent": 97,
  "recommendedSalePrice": 205.23,
  "marginAmount": 53.21,
  "fetchedAt": "2026-04-18T10:00:00Z",
  "expiresAt": "2026-04-18T10:30:00Z"
}
```

Важно:
- `positionSignature` из Carreta не отдавать публично, если в UI он не нужен;
- если хранить `positionSignature`, то только в `SupplierQuote` и не логировать;
- `recommendedSalePrice` считается AutoShop, а не Carreta.

### Подтверждение закупки менеджером

Endpoint:

```http
POST /api/procurement/purchase-orders
```

Request DTO:

```json
{
  "purchaseRequestId": 77,
  "supplierQuoteId": 101,
  "managerId": 5,
  "quantity": 1,
  "salePrice": 205.23,
  "createExternalOrder": true
}
```

Business rules:
- только менеджер/admin может создавать `PurchaseOrder`;
- `quantity` валидируется по `qty` и `min_qty` Carreta;
- `salePrice >= purchasePrice`;
- в dev/test Carreta order создается с `test=on`;
- production external order требует явного подтверждения;
- если `createExternalOrder=false`, система сохраняет закупку для ручного оформления.

### Приемка на склад

Endpoint:

```http
POST /api/procurement/purchase-orders/{id}/receive
```

Request DTO:

```json
{
  "receivedQuantity": 1,
  "targetPartId": 42,
  "createPartIfMissing": true,
  "stockCost": 152.02,
  "salePrice": 205.23
}
```

Business rules:
- приемку делает менеджер;
- только после приемки увеличивается `Part.stockQuantity`;
- если `Part` отсутствует, можно создать его из UMAPI/Carreta данных;
- после увеличения склада деталь резервируется существующим `POST /api/orders/{orderId}/parts`;
- `OrderPartItem.unitPrice` должен брать клиентскую цену, а не закупочную.

---

## План по блокам дня

### Блок 1. Утренний аудит текущего `Parts` и инфраструктуры

Время: `45-60 минут`

Что сделать:
- Проверить текущий `parts` модуль:
  - `Part`;
  - `PartServiceImpl`;
  - `PartController`;
  - `OrderPartInventoryCoordinator`;
  - `OrderPartItemController`.
- Проверить текущие конфиги:
  - Redis connection;
  - application properties;
  - docker-compose;
  - testcontainers setup.
- Проверить зависимости:
  - Redis уже есть;
  - Spring Web уже есть;
  - retry dependency нет.
- Зафиксировать, где появятся новые классы и какие существующие классы можно не трогать.

Что должно получиться:
- Есть точная стартовая точка дня.
- Нет риска "вшить" UMAPI прямо в `PartServiceImpl`.

### Блок 2. Разбор UMAPI contract и финализация request/response модели

Время: `1-1.5 часа`

Что сделать:
- По документации или примеру ответа UMAPI зафиксировать:
  - endpoint поиска;
  - auth;
  - query params;
  - response fields;
  - error body;
  - rate limits;
  - timeout expectation.
- Составить mapping table:
  - UMAPI field -> internal DTO field;
  - nullable/non-null;
  - default value;
  - validation rule.
- Определить поля, которые нельзя отдавать наружу:
  - internal supplier id;
  - purchase-only fields;
  - debug/raw payload.
- Обновить план DTO после реального API.

Что должно получиться:
- Интеграция пишется по реальному contract, а не по фантазии.

Важно:
Этот блок будет основным после следующего сообщения с разбором API.

### Блок 3. Конфигурация UMAPI

Время: `45-60 минут`

Что сделать:
- Добавить properties:
  - `app.umapi.base-url`
  - `app.umapi.api-key`
  - `app.umapi.language-code`
  - `app.umapi.region-code`
  - `app.umapi.connect-timeout`
  - `app.umapi.read-timeout`
  - `app.umapi.cache.search-ttl`
  - `app.umapi.retry.max-attempts`
  - `app.umapi.retry.backoff`
- Создать `UmapiProperties` через `@ConfigurationProperties`.
- Подключить `@EnableConfigurationProperties`.
- Убедиться, что секреты читаются только из env:
  - `${APP_UMAPI_API_KEY:}`
  - без реальных ключей в git.
- Добавить безопасные default values для локальной разработки.

Пример properties:

```properties
app.umapi.base-url=${APP_UMAPI_BASE_URL:https://api.umapi.ru}
app.umapi.api-key=${APP_UMAPI_API_KEY:}
app.umapi.language-code=${APP_UMAPI_LANGUAGE_CODE:ru}
app.umapi.region-code=${APP_UMAPI_REGION_CODE:WWW}
app.umapi.connect-timeout=${APP_UMAPI_CONNECT_TIMEOUT:2s}
app.umapi.read-timeout=${APP_UMAPI_READ_TIMEOUT:5s}
app.umapi.cache.search-ttl=${APP_UMAPI_CACHE_SEARCH_TTL:6h}
app.umapi.retry.max-attempts=${APP_UMAPI_RETRY_MAX_ATTEMPTS:3}
app.umapi.retry.backoff=${APP_UMAPI_RETRY_BACKOFF:500ms}
```

Что должно получиться:
- Все интеграционные параметры управляются конфигом.
- Проект можно запускать без реального ключа, но UMAPI endpoint должен возвращать понятную ошибку "not configured".

### Блок 4. HTTP client слой

Время: `1-1.5 часа`

Что сделать:
- Создать интерфейс `UmapiClient`.
- Создать реализацию `RestClientUmapiClient`.
- Настроить:
  - base URL;
  - auth header `X-App-Key`;
  - timeout;
  - user-agent/application name;
  - error handler.
- Разделить ошибки:
  - `401/403` -> `UmapiAuthenticationException`;
  - `402` -> `UmapiPaymentRequiredException` или отдельный subtype `UmapiSubscriptionException`;
  - `429` -> `UmapiRateLimitException`;
  - `5xx` -> `UmapiUnavailableException`;
  - unexpected response -> `UmapiContractException`.
- Не возвращать наружу `RestClientException` напрямую.

Что важно понять:
- Внешний API должен быть изолирован за интерфейсом, чтобы tests и fallback не зависели от реального HTTP.
- Внутренние сервисы не должны знать, через что именно вызывается UMAPI.

Что должно получиться:
- Есть маленький, тестируемый HTTP adapter.

### Блок 5. DTO и mapper

Время: `1-1.5 часа`

Что сделать:
- Создать DTO внешнего response ровно под UMAPI contract.
- Создать internal response DTO для собственного endpoint:
  - `ExternalPartSearchResponseDTO`;
  - `ExternalPartCatalogItemResponseDTO`;
- Создать mapper:
  - нормализует article;
  - обрабатывает missing brand/name;
  - маппит `ART_ID`, `ARTICLE_NR`, `SUP_ID`, `BRAND`, `COMPLETE_DES`, `DES`, `MEDIA_FILE`;
  - отбрасывает позиции без артикула или бренда, если они непригодны для MVP;
  - сохраняет `source`, чтобы отличать `UMAPI_AUTOCATALOG` от `UMAPI_CROSS`.
- Зафиксировать сортировку:
  - сначала точное совпадение артикула;
  - потом совпадение бренда;
  - потом наличие имени/описания;
  - или порядок UMAPI, если он уже meaningful.

Что должно получиться:
- UMAPI response преобразуется в стабильный внутренний contract.

### Блок 6. Нормализация запроса и cache key

Время: `45-60 минут`

Что сделать:
- Создать `UmapiArticleNormalizer`.
- Создать `UmapiCacheKeyFactory`.
- Нормализовать:
  - `articleNumber`;
  - `brand`;
  - `languageCode`;
  - `regionCode`;
  - search type;
  - pagination/filter params, если они есть.
- Формат ключа:

```text
umapi:parts:search:v1:lang={LANG}:region={REGION}:mode={MODE}:article={ARTICLE}:brand={BRAND_OR_ANY}:limit={LIMIT}:offset={OFFSET}
```

- Добавить версию ключа `v1`, чтобы можно было безопасно менять формат cache.
- Проверить, что разные формы одного артикула дают один cache key:
  - ` oc90 `
  - `OC90`
  - `oc90`

Что должно получиться:
- Cache не плодит дубли из-за пробелов и регистра.

### Блок 7. Redis cache

Время: `1-1.5 часа`

Что сделать:
- Выбрать реализацию:
  - Spring Cache abstraction для простого TTL;
  - явный Redis service, если нужно хранить metadata `cachedAt/cacheExpiresAt`.
- Рекомендуемый MVP:
  - явный `UmapiSearchCacheService`;
  - хранить normalized internal response JSON;
  - управлять TTL из `UmapiProperties`.
- Настроить serialization:
  - не использовать Java native serialization для DTO;
  - использовать JSON через Jackson serializer.
- Правила cache:
  - cache hit возвращается без HTTP-вызова;
  - successful UMAPI response кэшируется;
  - пустой успешный результат можно кэшировать коротким TTL, если UMAPI rate limited;
  - `401/403` не кэшируется;
  - `5xx` не кэшируется;
  - malformed response не кэшируется.
- Добавить возможность понять источник результата:
  - из live UMAPI;
  - из fresh cache;
  - из fallback cache.

Что должно получиться:
- Повторный поиск не ходит во внешний API без необходимости.

### Блок 8. Retry и timeout policy

Время: `1-1.5 часа`

Что сделать:
- Добавить dependency, если выбран Spring Retry:

```gradle
implementation 'org.springframework.retry:spring-retry'
implementation 'org.springframework:spring-aspects'
```

- Включить retry:
  - `@EnableRetry`;
  - retry только на transient exceptions.
- Настроить:
  - `maxAttempts = 3`;
  - backoff `500ms -> 1s -> 2s`, если доступен multiplier;
  - timeout per request не больше `5s` для MVP.
- Не ретраить:
  - validation errors;
  - auth errors;
  - client contract errors;
  - `404`, если UMAPI так обозначает "не найдено".
- Отдельно обработать `429`:
  - если есть `Retry-After`, учитывать его только в разумном лимите;
  - иначе короткий backoff и fallback к cache.

Что должно получиться:
- Временные сбои UMAPI не ломают пользовательский сценарий с первого раза.

### Блок 9. Service/facade: единая точка внешнего поиска

Время: `1.5-2 часа`

Что сделать:
- Создать `ExternalPartSearchService`.
- Реализовать flow:
  1. validate request;
  2. normalize request;
  3. build cache key;
  4. check Redis;
  5. if hit -> return cached response;
  6. if miss -> call UMAPI with retry;
  7. map response;
  8. save to cache;
  9. return response.
- Реализовать fallback:
  - если UMAPI unavailable и cache есть, вернуть cache с marker `fallback`;
  - если cache нет, бросить понятное exception.
- Не смешивать здесь внутренний склад:
  - internal `PartRepository` можно использовать только для enrichment, если это явно нужно;
  - по умолчанию внешний поиск не зависит от таблицы `part`.

Что должно получиться:
- Внутри проекта появляется один нормальный use-case service для внешнего поиска.

### Блок 10. REST endpoint для внешнего поиска

Время: `45-60 минут`

Что сделать:
- Добавить controller:

```http
GET /api/parts/external/search
```

- Валидация:
  - `articleNumber` required;
  - trim/non-blank;
  - reasonable length limit;
  - `brand` optional.
- HTTP statuses:
  - `200 OK` для найденных и пустых успешных results;
  - `400 Bad Request` для невалидного запроса;
  - `502 Bad Gateway` для сломанного внешнего ответа;
  - `503 Service Unavailable` для недоступного UMAPI без cache;
  - `504 Gateway Timeout`, если timeout явно отличаем.
- Не отдавать наружу API key, raw headers, stacktrace и сырой body ошибки.

Что должно получиться:
- Web/Android смогут искать внешние запчасти через собственный backend, а не напрямую через UMAPI.

### Блок 11. Import external catalog item во внутренний каталог

Время: `1-1.5 часа`

Это optional block, если блоки 1-10 закрыты стабильно.

Что сделать:
- Создать DTO:
  - `ExternalPartImportDTO`.
- Добавить endpoint:

```http
POST /api/parts/external/import
```

- Правила:
  - article нормализуется;
  - если `Part` уже существует, возвращается существующая/обновленная entity по выбранному правилу;
  - если не существует, создается новая `Part`;
  - `stockQuantity` не подставляется из UMAPI автоматически;
  - `cost` не подставляется из UMAPI автоматически, потому что UMAPI Catalog API не отдает цену;
  - если `cost` приходит в import request, это ручное значение AutoShop, а не внешняя цена UMAPI.
- Решить, можно ли импортировать только по `umapiArticleId` через cache:
  - безопаснее принимать полный normalized catalog item и сверять его с последним cache;
  - если cache устарел, требовать повторный search.

Что должно получиться:
- Есть управляемый мост от внешнего каталога к внутреннему складу.

### Блок 12. Carreta client: search quotes

Время: `1-1.5 часа`

Что сделать:
- Создать `CarretaProperties`.
- Создать `CarretaClient`.
- Реализовать:
  - `search(query, account)`;
  - `getProfile(account)`;
  - safe URI builder, который не попадает целиком в logs.
- Настроить:
  - base URL;
  - query parameter `api_key`;
  - optional `account`;
  - timeout;
  - error handler.
- Разделить ошибки:
  - `401` -> `CarretaAuthenticationException`;
  - `400` -> `CarretaValidationException`;
  - `5xx`/timeout -> `CarretaUnavailableException`;
  - unexpected response -> `CarretaContractException`.
- Добавить redaction:
  - `api_key` в logs заменяется на `***`;
  - `positionSignature` не логируется.

Что должно получиться:
- Есть официальный supplier API client без web scraping.

### Блок 13. Carreta mapper, quantity parser и supplier quote DTO

Время: `1-1.5 часа`

Что сделать:
- Создать DTO под Carreta search response:
  - root `objects`;
  - item fields `_`, `code`, `maker`, `name`, `desc`, `is_cross`, `price`, `period_min`, `period_max`, `min_qty`, `qty`, `stat`, `source`.
- Создать internal DTO:
  - `SupplierQuoteResponseDTO`.
- Создать mapper:
  - `price` string -> `BigDecimal`;
  - `period_min/max` -> integer;
  - `stat` -> nullable integer;
  - `qty` raw сохранить как строку;
  - попытаться распарсить numeric qty в `availableQuantityParsed`.
- Создать `CarretaQuantityParser`:
  - `"500"` -> exact `500`;
  - `"<10"` -> less-than `10`;
  - `">50"` -> greater-than `50`;
  - `"Есть"` -> in-stock unknown quantity.
- Добавить validation helper для `order_qty`:
  - не больше доступного exact qty;
  - строго меньше для `<N`;
  - кратно `min_qty`;
  - разумный максимум для `>N` и `"Есть"`.

Что должно получиться:
- Carreta search response превращается в безопасный supplier quote contract для нашего backend.

### Блок 14. Procurement MVP: purchase request и manager review

Время: `1.5-2 часа`

Что сделать:
- Зафиксировать минимальные сущности или хотя бы DTO/service layer:
  - `PurchaseRequest`;
  - `SupplierQuote`;
  - `PurchaseOrder`.
- Если времени мало, начать с DTO + service, а миграции вынести в отдельный follow-up.
- Реализовать flow:
  1. мастер выбирает UMAPI catalog item;
  2. backend создает purchase request;
  3. backend ищет quotes в Carreta по article/OEM;
  4. quotes сохраняются или кэшируются;
  5. менеджер выбирает quote.
- Добавить markup calculation:
  - `purchasePrice`;
  - `recommendedSalePrice`;
  - `marginAmount`;
  - manual override manager'ом.

Что должно получиться:
- Появляется управляемый мост между выбором детали мастером и закупкой менеджером.

### Блок 15. Carreta order creation и status sync

Время: `1.5-2 часа`

Это optional для Day 10, если поиск quotes и manager review уже устойчивы.

Что сделать:
- Реализовать `createOrder`:
  - body строится из сохраненного `SupplierQuote`;
  - добавляется `order_qty`;
  - `client_comment` = внутренний номер `PurchaseRequest`/`PurchaseOrder`;
  - в dev/test добавляется `test=on`.
- Реализовать методы:
  - `getOrder(id)`;
  - `listOrders(page, clientComment)`;
  - `getOrderHistory(id)`.
- Смаппить external statuses в внутренний enum:
  - `WAITING_PAYMENT`;
  - `ACCEPTED`;
  - `PROCESSING`;
  - `SUPPLIER_ACCEPTED`;
  - `IN_TRANSIT`;
  - `READY_FOR_RECEIPT`;
  - `OUT_OF_STOCK`;
  - `CANCELLED`.
- Не делать автоматическую приемку на склад только по статусу Carreta:
  - менеджер должен нажать "Принять на склад";
  - только после этого меняется `Part.stockQuantity`.

Что должно получиться:
- Можно безопасно оформить тестовый заказ и синхронизировать его статус без ручного парсинга сайта.

### Блок 16. Error handling и общий формат ошибок

Время: `45-60 минут`

Что сделать:
- Расширить `GlobalExceptionHandler`.
- Добавить mapping для новых exceptions:
  - `UmapiAuthenticationException`;
  - `UmapiPaymentRequiredException`;
  - `UmapiRateLimitException`;
  - `UmapiUnavailableException`;
  - `UmapiContractException`;
  - `UmapiClientException`;
  - `CarretaAuthenticationException`;
  - `CarretaValidationException`;
  - `CarretaUnavailableException`;
  - `CarretaContractException`;
  - `CarretaClientException`.
- Проверить, что response format остается совместимым с текущим `ErrorResponse`.
- Убедиться, что messages понятны:
  - "External parts catalog is unavailable";
  - "External parts catalog authentication failed";
  - "External parts catalog subscription/payment is required";
  - "External parts catalog rate limit exceeded";
  - "Supplier provider is unavailable";
  - "Supplier provider authentication failed";
  - "Supplier quote is no longer valid".
- Логи должны содержать технические детали, response клиенту - нет.

Что должно получиться:
- Ошибки UMAPI не выглядят как случайный `500`.

### Блок 17. Observability: logs, metrics, health

Время: `45-60 минут`

Что сделать:
- Добавить структурированные logs:
  - normalized article;
  - cache hit/miss;
  - UMAPI latency;
  - Carreta latency;
  - retry attempts;
  - fallback used.
- Не логировать:
  - API key;
  - Carreta `api_key` query parameter;
  - Carreta position signature `_`;
  - полный raw response с потенциально коммерческими данными;
  - персональные данные клиентов.
- Если хватает времени, добавить actuator health indicator:
  - `umapi` status;
  - не делать health check слишком дорогим;
  - лучше проверять легкий endpoint или конфигурационную готовность.
- Metrics candidates:
  - `umapi.search.requests`;
  - `umapi.search.cache.hit`;
  - `umapi.search.cache.miss`;
  - `umapi.search.errors`;
  - `umapi.search.latency`.
  - `carreta.search.requests`;
  - `carreta.search.cache.hit`;
  - `carreta.search.errors`;
  - `carreta.order.create.requests`;
  - `procurement.purchase_request.created`.

Что должно получиться:
- Интеграцию можно диагностировать, когда она падает не у разработчика, а в демо/эксплуатации.

### Блок 18. Тестирование

Время: `2-2.5 часа`

Что сделать:
- Unit tests:
  - normalizer;
  - cache key factory;
  - mapper;
  - retry classification;
  - Carreta quantity parser;
  - markup pricing.
- Service tests:
  - first request calls UMAPI and writes cache;
  - second request uses cache;
  - UMAPI timeout + cache exists -> fallback response;
  - UMAPI timeout + cache absent -> `503`;
  - `401/403` does not retry and does not cache;
  - `5xx` retries;
  - invalid article -> `400`;
  - Carreta search maps price/qty/delivery correctly;
  - Carreta `api_key` is redacted from logs/errors;
  - Carreta `order_qty` validation works for numeric, `<N`, `>N`, `Есть`.
- Controller tests:
  - valid search;
  - blank article;
  - unavailable external catalog;
  - cached/fallback marker if exposed.
  - supplier quote search;
  - purchase request creation;
  - manager order creation in test mode.
- Integration tests:
  - Redis cache with Testcontainers, if current setup allows;
  - otherwise slice/unit tests with fake cache implementation.

Что должно получиться:
- Поведение cache/retry/fallback проверено автоматически, а не только руками.

### Блок 19. Ручной smoke-run

Время: `45-60 минут`

Что сделать:
- Поднять инфраструктуру:

```bash
docker compose up -d postgres redis
```

- Запустить приложение.
- Проверить сценарии:
  1. поиск по валидному артикулу;
  2. повторный поиск по тому же артикулу;
  3. проверка Redis key;
  4. временно сломать UMAPI base URL;
  5. убедиться, что cache fallback работает;
  6. проверить поведение без cache;
  7. импортировать catalog item в `Part`, если optional block реализован.
  8. поискать Carreta quote по артикулу/OEM;
  9. проверить, что `api_key` не попал в logs;
  10. создать purchase request;
  11. создать Carreta test order с `test=on`, если optional block реализован;
  12. выполнить ручную приемку на склад в тестовом сценарии.
- Проверить, что существующие сценарии не сломались:
  - CRUD `Part`;
  - update stock;
  - add part to order;
  - recalculation `partsTotal`;
  - loyalty points refresh after order change.

Что должно получиться:
- Есть уверенность, что UMAPI и Carreta не сломали готовую доменную часть.

---

## Интеграция с существующими модулями

### Parts

Основное место интеграции.

Что добавляем:
- внешний search endpoint;
- optional import endpoint;
- возможно `externalSource`/`externalId` в `Part`, только если это нужно после разбора UMAPI.
- приемка закупки из procurement увеличивает `stockQuantity` через существующие правила склада.

Что не меняем без необходимости:
- `reservedQuantity`;
- `stockQuantity`;
- `OrderPartItem`;
- текущую логику `PartServiceImpl`.

### Order

Order не должен знать о UMAPI напрямую.

Правильный flow:
- external search -> internal `Part` import/update -> existing order part reservation.
- purchase request связывается с `orderId`, но не подменяет `OrderPartItem`.

Так `OrderFinancialsService` продолжает считать totals через `OrderPartItemRepository`, а не через внешний API.

Если нужен более реалистичный workflow, позже можно добавить статус:

```text
WAITING_PARTS
```

Но в Day 10 можно оставить статус заказа как есть, а ожидание детали отражать через `PurchaseRequest/PurchaseOrder`.

### Procurement

Новый легкий доменный слой между `parts` и external supplier APIs.

Что делает:
- хранит потребность в закупке детали под заказ;
- хранит найденные supplier quotes;
- фиксирует выбор менеджера;
- хранит внешний Carreta order id/status;
- запускает приемку на склад.

Что не делает:
- не резервирует деталь под заказ до физического поступления на внутренний склад;
- не меняет `OrderFinancialsService` напрямую;
- не показывает клиенту закупочную цену без расчетной клиентской цены.

### Carreta

Carreta не должен знать о внутренних entity напрямую.

Правильный flow:
- `SupplierSearchService` вызывает `CarretaClient`;
- `CarretaQuoteMapper` превращает response в `SupplierQuote`;
- `PurchaseOrderService` создает внешний order только по manager approval;
- `StockReceivingService` обновляет `Part.stockQuantity` после приемки.

### Loyalty

Loyalty не должен знать о UMAPI или Carreta вообще.

Единственная связь:
- если после импорта и резервирования детали поменялся `partsTotal`, уже существующий flow через `OrderPartInventoryCoordinator` вызывает:
  - `orderFinancialsService.recalculateAfterMutableTotalsChange(order)`;
  - `loyaltyService.refreshAppliedPointsAfterOrderChange(order)`.

### Web/Android

Frontend получает только backend DTO:
- без UMAPI auth;
- без raw external errors;
- без знания provider-specific field names.

Это позволит позже заменить UMAPI или добавить другой catalog/cross provider без переписывания клиентов.

---

## Redis cache design

### Key design

Базовый формат UMAPI:

```text
umapi:parts:search:v1:lang={LANG}:region={REGION}:mode={MODE}:article={ARTICLE}:brand={BRAND_OR_ANY}:limit={LIMIT}:offset={OFFSET}
```

Примеры:

```text
umapi:parts:search:v1:lang=ru:region=WWW:mode=brand-refinement:article=OC90:brand=ANY:limit=10:offset=0
umapi:parts:search:v1:lang=ru:region=WWW:mode=analogs:article=OC90:brand=KNECHT:limit=10:offset=0
```

Если появятся дополнительные фильтры:

```text
umapi:parts:search:v1:lang=ru:region=WWW:mode=articles:type=PC:vehicle=12345:product=678:brand=KNECHT:limit=10:offset=0
```

Базовый формат Carreta:

```text
carreta:quotes:search:v1:account={ACCOUNT_OR_DEFAULT}:query={NORMALIZED_QUERY}
```

Примеры:

```text
carreta:quotes:search:v1:account=default:query=OC47
carreta:quotes:search:v1:account=default:query=11427512300
```

### TTL policy

Рекомендация:
- UMAPI catalog search result: `6h`;
- UMAPI empty successful result: `15-30m`;
- Carreta quote search result: `15-30m`, потому что цена/наличие меняются чаще каталога;
- Carreta empty successful result: `5-10m`;
- fallback stale usage: только если явно принято решение, максимум `24h`;
- auth/rate/server errors: не кэшировать.

### Cache value

Хранить:
- normalized request;
- normalized catalog items;
- normalized supplier quotes;
- `cachedAt`;
- `expiresAt`;
- возможно `source = UMAPI`.
  - для Carreta: `source = CARRETA`.

Не хранить:
- API key;
- Carreta position signature в публичном cache value, если cache доступен не только backend service;
- raw headers;
- stack traces;
- ненужный raw response.

---

## Retry/fallback policy

### Retry

Retry allowed:
- connect timeout;
- read timeout;
- connection reset;
- `429`;
- `502`;
- `503`;
- `504`;
- other `5xx`, если нет признаков permanent error.

Retry denied:
- blank/invalid article;
- `400`;
- `401`;
- `402`;
- `403`;
- contract mapping errors;
- JSON parse error после успешного `200`, если это означает несовместимый contract.

### Fallback

Fallback allowed:
- UMAPI временно недоступен;
- есть cache для такого ключа;
- cache не протух или stale fallback явно разрешен.

Fallback denied:
- auth failure;
- invalid request;
- contract mismatch;
- cache отсутствует.

---

## Security и secrets

Что обязательно:
- API keys только через env/config.
- Не коммитить реальные credentials.
- Не отдавать ключ в error response.
- Не логировать headers целиком.
- Не давать frontend напрямую ходить в UMAPI.
- Не давать frontend напрямую ходить в Carreta.
- Для UMAPI использовать header `X-App-Key`.
- Для Carreta `api_key` идет query parameter, поэтому:
  - запретить логирование full URI;
  - сделать redaction `api_key=***`;
  - не включать query string в exception messages;
  - не хранить `api_key` в actuator/config dump;
  - включить IP allowlist в кабинете Carreta.
- Carreta `positionSignature` (`_`) использовать как чувствительный технический token:
  - не показывать клиентскому приложению;
  - не логировать;
  - хранить только если нужно создать заказ;
  - считать протухшим после истечения TTL quote.
- Автоматическое создание заказа у Carreta разрешать только manager/admin role.
- В dev/test использовать `test=on`, production order только после явного подтверждения.

Что можно добавить позже:
- per-user/audit log поиска запчастей;
- role-based access после интеграции Core с AuthService;
- rate limiting собственного endpoint, чтобы не сжечь лимиты UMAPI/Carreta.

---

## Миграции БД

В базовом варианте UMAPI-only День 10 мог бы пройти без новых миграций.

После добавления Carreta и procurement-flow миграция становится желательной, если мы хотим сохранять заявки/предложения/закупки, а не только показывать ephemeral quotes из Redis.

Миграция нужна только если принимается одно из решений:
- хранить `external_source`/`external_id` в `part`;
- хранить историю внешних поисков;
- хранить manufacturer/supplier metadata;
- добавлять procurement/order purchase flow.

Рекомендуемый MVP:
- не добавлять таблицы под UMAPI search cache, потому что Redis достаточно;
- не менять `OrderPartItem`;
- не менять financial tables.
- добавить procurement tables только если делаем manager review и приемку на склад в рамках Day 10.

Если после разбора API решено хранить source в `Part`, добавить отдельный changelog:

```text
db/changelog/db.changelog-1.5-umapi-integration.sql
```

Возможные поля:
- `external_source varchar(30)`;
- `external_id varchar(100)`;
- unique index on `(external_source, external_id)` where both not null.

Но это только после явного решения, что импорт внешних каталожных позиций должен сохранять provenance.

Если реализуем procurement MVP, добавить отдельный changelog:

```text
db/changelog/db.changelog-1.6-procurement-carreta.sql
```

Минимальные таблицы:

```text
purchase_request
- id
- order_id
- requested_by_employee_id
- umapi_article_id
- article_number
- brand
- oem_code
- quantity
- status
- created_at
- updated_at
```

```text
supplier_quote
- id
- purchase_request_id
- provider
- provider_source_code
- position_signature
- requested_code
- article_number
- brand
- name
- description
- is_cross
- purchase_price
- currency
- qty_raw
- available_quantity
- min_order_quantity
- delivery_days_min
- delivery_days_max
- supply_probability_percent
- recommended_sale_price
- margin_amount
- fetched_at
- expires_at
```

```text
purchase_order
- id
- purchase_request_id
- supplier_quote_id
- manager_id
- external_provider
- external_order_id
- external_order_number
- external_status
- external_status_display
- quantity
- purchase_unit_price
- sale_unit_price
- purchase_total
- sale_total
- status
- ordered_at
- received_at
- created_at
- updated_at
```

Индексы:
- `purchase_request(order_id)`;
- `purchase_request(status)`;
- `supplier_quote(purchase_request_id)`;
- `supplier_quote(provider, requested_code)`;
- `supplier_quote(expires_at)`;
- `purchase_order(purchase_request_id)`;
- `purchase_order(external_provider, external_order_id)`;
- `purchase_order(status)`.

Security note:
- `supplier_quote.position_signature` чувствительное поле;
- не возвращать его в публичных DTO;
- при возможности шифровать на уровне приложения или хотя бы не выводить в logs.

---

## Риски и как их закрыть

### Риск 1. UMAPI contract окажется сложнее ожидаемого

Как закрыть:
- сначала сделать thin client и mapper;
- не менять доменную модель под каждый внешний нюанс;
- internal DTO держать минимальным.

### Риск 2. Перепутать catalog data с ценами и остатками

Как закрыть:
- не считать внешний catalog result внутренним stock;
- не считать UMAPI `Suppliers` продавцами/складами;
- не заполнять `Part.cost` из UMAPI без отдельного price provider;
- TTL сделать настраиваемым;
- перед импортом/добавлением в заказ при необходимости делать refresh каталожной позиции.

### Риск 3. Rate limits

Как закрыть:
- Redis cache;
- normalizer;
- short negative cache для пустых результатов;
- retry с backoff;
- позже собственный rate limit.
- отдельно для Carreta короткий TTL `15-30m`, потому что цена/наличие меняются чаще каталога.

### Риск 4. Сломается существующий Parts/Order flow

Как закрыть:
- не менять `OrderPartItem` в День 10;
- external search держать отдельным endpoint;
- добавить regression tests на reservation и financial recalculation.

### Риск 5. Внешний API недоступен во время демо

Как закрыть:
- fallback to cache;
- mock/fake profile для локального smoke-run;
- понятная ошибка без stacktrace.

### Риск 6. Секреты попадут в репозиторий

Как закрыть:
- только env variables;
- пустой default;
- documentation placeholder;
- no real keys in markdown/code.
- redaction для query parameter `api_key`;
- не логировать Carreta full URL;
- не логировать Carreta position signature `_`;
- включить IP allowlist в кабинете Carreta.

### Риск 7. Менеджер случайно оформит реальный заказ во время теста

Как закрыть:
- по умолчанию `app.carreta.test-orders-enabled=true`;
- production mode включается только явным env;
- UI/action требует подтверждения;
- в backend запретить real order без manager/admin role;
- для smoke-run использовать только `test=on`.

### Риск 8. Закупочная цена станет клиентской без наценки

Как закрыть:
- хранить `purchasePrice` и `salePrice` отдельно;
- `OrderPartItem.unitPrice` получает только `salePrice`;
- добавить `MarkupPricingService`;
- запретить `salePrice < purchasePrice`, кроме явного admin override.

---

## Definition of Done Дня 10

День можно считать закрытым, если выполнено все:

- `GET /api/parts/external/search` работает через backend.
- Запрос валидируется и нормализуется.
- UMAPI вызывается только из integration layer.
- Redis cache реально используется.
- Повторный одинаковый запрос не делает внешний HTTP-вызов.
- Retry срабатывает только на transient failures.
- При недоступности UMAPI и наличии cache возвращается fallback.
- При недоступности UMAPI без cache возвращается понятная ошибка.
- Внутренний склад не смешан с внешним catalog data.
- Существующие `Part`, `OrderPartItem`, `OrderFinancialsService`, `LoyaltyService` сценарии не сломаны.
- `GET /api/procurement/supplier-quotes/search` или эквивалентный service-method получает Carreta quotes.
- Carreta вызывается только из integration layer.
- Carreta `api_key` читается только из env/secret config.
- Carreta full URL с `api_key` не попадает в logs/errors.
- Carreta quote fields `price`, `qty`, `period_min/max`, `min_qty`, `stat`, `is_cross` маппятся в internal DTO.
- Закупочная цена Carreta отделена от клиентской цены AutoShop.
- Есть manager-only flow для создания `PurchaseRequest/PurchaseOrder`, хотя бы на уровне service/controller contract.
- Если реализован внешний order create, он работает в `test=on` режиме для dev smoke-run.
- Приемка на склад остается отдельным действием и только она увеличивает `Part.stockQuantity`.
- Есть тесты на cache/retry/fallback.
- Все конфиги вынесены в `application.properties`/env.
- Реальные UMAPI/Carreta credentials не попали в git.

---

## Минимальный порядок реализации

Если день начнет сжиматься, идти в таком порядке:

1. Реализовать UMAPI catalog search: brand refinement/analogs/article details/OE_CODES.
2. Добавить UMAPI properties и client skeleton.
3. Сделать UMAPI external search без cache.
4. Добавить UMAPI mapper и stable internal DTO.
5. Добавить Redis cache для UMAPI.
6. Реализовать Carreta properties и client skeleton.
7. Сделать Carreta quote search без order creation.
8. Добавить Carreta mapper, quantity parser и secret redaction.
9. Добавить procurement DTO/service: purchase request + supplier quote.
10. Добавить markup pricing: purchasePrice -> recommendedSalePrice.
11. Добавить retry/fallback для обоих providers.
12. Добавить controller tests/service tests.
13. Только после этого делать optional import endpoint и optional Carreta order create.

Главное:
лучше иметь надежный UMAPI catalog search + Carreta quote search, чем недоделанный auto-order + поломанный склад.

---

## Ручной чек-лист перед завершением

- [ ] UMAPI base URL и auth не захардкожены.
- [ ] Carreta base URL и `api_key` не захардкожены.
- [ ] `articleNumber` нормализуется одинаково в search и cache key.
- [ ] Cache key не содержит секреты.
- [ ] TTL читается из config.
- [ ] Повторный search возвращается из Redis.
- [ ] `401/403` не ретраится.
- [ ] `5xx/timeout` ретраится.
- [ ] Fallback не срабатывает на auth/config errors.
- [ ] Пустой successful response обрабатывается как `200` с пустым списком.
- [ ] Ошибки идут через общий `GlobalExceptionHandler`.
- [ ] Carreta quote search возвращает price/qty/delivery fields.
- [ ] Carreta `api_key` маскируется в logs.
- [ ] Carreta position signature `_` не отдается наружу без необходимости.
- [ ] `purchasePrice` и `salePrice` не смешаны.
- [ ] Carreta real order disabled by default; test mode включен для smoke-run.
- [ ] Приемка на склад не происходит автоматически по внешнему статусу.
- [ ] Существующие тесты `parts/order/loyalty` проходят.
- [ ] Smoke-run описан в заметках дня.
