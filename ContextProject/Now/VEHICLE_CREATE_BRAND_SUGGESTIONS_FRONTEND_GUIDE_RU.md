# Vehicle Create + Brand Suggestions Frontend Guide

Дата: 2026-05-15
Статус: подробный технический разбор текущей реализации frontend-потока создания автомобиля с подсказками марки, подсказками модели и опциональной привязкой к UMAPI-каталогу.

---

## 1. Цель документа

Этот документ объясняет, как в текущем frontend-проекте устроен экран создания автомобиля:

- как работает форма создания автомобиля;
- как реализованы подсказки по маркам;
- как реализованы подсказки по моделям;
- как подгружается каталог производителей / серий / модификаций;
- как формируется payload на backend;
- как эту же логику можно встроить в отдельный web-client.

Документ основан на фактическом коде текущего проекта.

---

## 2. Executive summary

Текущая реализация создания автомобиля состоит из **двух слоёв**:

### Layer A — локальный UX-слой для быстрого ввода марки и модели

Он работает без тяжёлой серверной логики и даёт:

- список популярных брендов;
- логотипы брендов;
- подсказки моделей для выбранной марки;
- возможность вручную ввести свои значения.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:287`
- `src/utils/vehicleCatalog.ts:1`

### Layer B — серверный каталог UMAPI для точной модификации

Он работает через backend API и даёт:

- catalog manufacturers;
- model series;
- exact modification;
- возможность после создания машины привязать её к каталогу.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:101`
- `src/api/partsApi.ts:32`
- `src/api/vehiclesApi.ts:47`

### Главная идея

Машину можно создать **всегда**, даже если каталог не выбран.

Но если выбрана точная модификация, frontend после `POST /api/vehicles` делает второй вызов:

- `PUT /api/vehicles/{id}/catalog-link`

Это делает карточку автомобиля богаче и открывает downstream-сценарии поиска деталей по каталогу.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:234`
- `src/pages/vehicles/VehicleCreatePage.tsx:241`

---

## 3. Primary Locations

### Основной экран
- `src/pages/vehicles/VehicleCreatePage.tsx:60`

### Локальный бренд-справочник
- `src/utils/vehicleCatalog.ts:1`

### API автомобилей
- `src/api/vehiclesApi.ts:4`

### API каталогов / UMAPI-подсказок
- `src/api/partsApi.ts:32`

### Типы каталога
- `src/types/models.ts:89`
- `src/types/models.ts:94`
- `src/types/models.ts:102`
- `src/types/models.ts:111`

### Поиск клиента для привязки автомобиля
- `src/components/CustomerLookupField.tsx:1`
- `src/pages/vehicles/VehicleCreatePage.tsx:276`

---

## 4. Какие задачи решает экран создания автомобиля

Экран решает сразу несколько задач:

1. выбрать клиента;
2. ввести обязательные данные автомобиля;
3. ускорить ввод марки и модели через подсказки;
4. при желании привязать авто к каталогу точной модификации;
5. сохранить авто в backend;
6. опционально дозаписать catalog-link отдельным вызовом.

То есть это не просто форма `brand/model/vin/licensePlate`, а мини-wizard из двух логических частей:

- базовое создание машины;
- точная каталогизация машины.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:264`
- `src/pages/vehicles/VehicleCreatePage.tsx:333`

---

## 5. Архитектура формы

## 5.1. Form stack

Форма построена на:

- `react-hook-form`
- `zod`
- `MUI`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:6`
- `src/pages/vehicles/VehicleCreatePage.tsx:22`
- `src/pages/vehicles/VehicleCreatePage.tsx:32`

### Zod schema

Форма валидирует:

- `customerId` — обязателен;
- `brand` — обязательна;
- `model` — обязательна;
- `vin` — ровно 17 символов, VIN charset;
- `licensePlate` — строка 4–12 символов по regexp.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:32`

### Почему это важно

Это означает, что экран можно переносить в другой клиент без привязки к текущему layout, если сохранить:

- shape полей;
- валидационные правила;
- двухфазный submit.

---

## 5.2. Hidden fields pattern

В форме есть скрытые поля:

- `customerId`
- `brand`
- `model`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:272`
- `src/pages/vehicles/VehicleCreatePage.tsx:273`
- `src/pages/vehicles/VehicleCreatePage.tsx:274`

### Почему так сделано

Потому что реальные UI-контролы — это не обычные `TextField`, а управляемые lookup/autocomplete-компоненты.

То есть:

- пользователь работает с `Autocomplete`;
- итоговые значения синхронизируются в `react-hook-form` через `setValue(...)`.

Это важный паттерн для встраивания в другой web client.

---

## 6. Как работает выбор клиента

Перед созданием машины пользователь должен выбрать клиента.

Для этого используется `CustomerLookupField`:

- `value={selectedCustomer}`
- `onChange={onSelectCustomer}`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:276`

### Что делает `onSelectCustomer`

При выборе клиента фронт:

- сохраняет объект клиента в локальный state;
- пишет `customerId` в форму через `setValue(...)`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:153`

### Дополнительное поведение

Если страница открыта с query-параметром `customerId`, клиент подгружается автоматически:

- читается `searchParams.get('customerId')`
- потом вызывается `customersApi.getById(...)`
- форма сразу получает этот `customerId`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:62`
- `src/pages/vehicles/VehicleCreatePage.tsx:125`

### Что это даёт

Экран можно открывать из клиентской карточки или из нового web-клиента в deep-linked режиме:

- `/vehicles/new?customerId=123`

Это уже встроенный integration pattern.

---

## 7. Как работают подсказки брендов

## 7.1. Источник данных по брендам

Подсказки брендов **не тянутся с backend**.

Они берутся из локального frontend-справочника:

- `vehicleBrandCatalog`

Источник:
- `src/utils/vehicleCatalog.ts:5`

### Структура элемента бренда

Каждый элемент содержит:

- `brand`
- `logoUrl`
- `models`

Источник:
- `src/utils/vehicleCatalog.ts:1`

### Что это означает

Подсказки брендов:

- быстрые;
- оффлайн относительно каталога;
- детерминированные;
- удобны для UX even if UMAPI catalog временно недоступен.

---

## 7.2. Компонент выбора бренда

Для марки используется:

- `Autocomplete<VehicleBrandCatalogItem, false, false, false>`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:287`

### Поведение

- `options={vehicleBrandCatalog}`
- `inputValue={brandValue}`
- `onChange={handleBrandChange}`
- `onInputChange={... setValue('brand', nextValue) ...}`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:288`
- `src/pages/vehicles/VehicleCreatePage.tsx:291`
- `src/pages/vehicles/VehicleCreatePage.tsx:292`

### Важный UX-эффект

Пользователь может:

- выбрать бренд из списка;
- просто печатать вручную;
- очистить поле.

То есть это не жёсткий select, а **assisted input**.

---

## 7.3. Логотипы брендов

Для каждого бренда может показываться логотип через `BrandLogo`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:45`

### Как это работает

- если `logoUrl` валиден — рендерится картинка;
- если логотип не загрузился — показывается `Avatar` с инициалами.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:49`
- `src/pages/vehicles/VehicleCreatePage.tsx:53`

### Почему это хорошо

Это делает UX устойчивым:

- бренды выглядят визуально богаче;
- отсутствие изображения не ломает интерфейс.

---

## 7.4. Что происходит при выборе бренда

При выборе марки вызывается `handleBrandChange(...)`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:205`

### Функция делает сразу несколько вещей

1. записывает `brand` в форму;
2. очищает `model`;
3. сбрасывает выбранного catalog manufacturer;
4. сбрасывает model series;
5. сбрасывает modification;
6. сбрасывает флаг `catalogTouched`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:207`
- `src/pages/vehicles/VehicleCreatePage.tsx:208`
- `src/pages/vehicles/VehicleCreatePage.tsx:209`
- `src/pages/vehicles/VehicleCreatePage.tsx:210`

### Product rationale

Смена бренда делает предыдущие выборы серии/модификации невалидными, поэтому весь downstream-catalog выбор очищается.

Это правильная зависимая модель.

---

## 8. Как работают подсказки моделей

## 8.1. Источник данных моделей

Подсказки моделей для поля `model` берутся из локального brand catalog:

- `selectedBrand?.models ?? []`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:158`
- `src/pages/vehicles/VehicleCreatePage.tsx:159`

### Это значит

Модельные подсказки не грузятся с backend напрямую.

Они зависят от выбранного локального бренда.

---

## 8.2. Компонент выбора модели

Для модели используется:

- `Autocomplete<string, false, false, true>`
- с `freeSolo`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:318`

### Поведение

- если бренд выбран — доступны локальные suggestions;
- если пользователь хочет, он может ввести модель руками;
- если поле очистить — сбрасывается выбранная catalog series и modification.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:321`
- `src/pages/vehicles/VehicleCreatePage.tsx:324`
- `src/pages/vehicles/VehicleCreatePage.tsx:326`

### Почему это хорошо

Это очень полезный гибрид:

- common models выбираются быстро;
- редкие модели не блокируются;
- backend-ограничения не мешают сохранить авто.

---

## 8.3. Что происходит при выборе модели

При выборе модели вызывается `handleModelChange(...)`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:214`

### Функция делает

1. пишет модель в форму;
2. сбрасывает выбранную model series;
3. сбрасывает modification;
4. сбрасывает `catalogTouched`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:215`
- `src/pages/vehicles/VehicleCreatePage.tsx:216`
- `src/pages/vehicles/VehicleCreatePage.tsx:217`

### Логика

Даже если имя модели совпадает, пользователь мог выбрать другую сущность каталога, поэтому downstream-путь к точной модификации надо пересобрать заново.

---

## 9. Автопривязка brand/model к серверному каталогу

В текущей реализации есть очень важный механизм: если пользователь вручную ввёл brand/model, frontend пытается **автоматически найти exact match** в уже подгруженном серверном каталоге.

---

## 9.1. Автосопоставление марки

Есть `useEffect`, который:

- ждёт `brandValue`;
- ждёт список `manufacturers`;
- если `selectedManufacturer` ещё не выбран;
- ищет exact match по `manufacturer.name` case-insensitive;
- если нашёл — вызывает `handleManufacturerSelect(exact, false)`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:135`
- `src/pages/vehicles/VehicleCreatePage.tsx:138`
- `src/pages/vehicles/VehicleCreatePage.tsx:140`

### Что это даёт

Если пользователь выбрал, например, `Toyota` из локального бренд-списка, а в серверном каталоге есть `TOYOTA`, связка на следующий шаг может произойти автоматически.

---

## 9.2. Автосопоставление модели

Аналогично работает эффект для `modelValue`:

- ждёт список `modelSeriesOptions`;
- если `selectedModelSeries` ещё не выбран;
- ищет exact match по `series.name` case-insensitive;
- при совпадении вызывает `handleModelSeriesSelect(exact, false)`.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:144`
- `src/pages/vehicles/VehicleCreatePage.tsx:147`
- `src/pages/vehicles/VehicleCreatePage.tsx:149`

### Смысл

Это создаёт ощущение «умной формы»:

- пользователь вводит бренд и модель почти как обычный form input;
- форма сама начинает поднимать каталогический контекст, если может.

---

## 10. Как подгружается UMAPI-каталог

## 10.1. Шаг 1 — manufacturers

При открытии страницы frontend загружает список производителей каталога.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:101`

### Алгоритм

1. сначала запросить popular manufacturers:
   - `partsApi.getManufacturers({ type: 'PC', popular: true })`
2. если popular вернул данные — использовать их;
3. если popular пустой — запросить полный список:
   - `partsApi.getManufacturers({ type: 'PC' })`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:106`
- `src/pages/vehicles/VehicleCreatePage.tsx:112`

### API endpoint

- `GET /api/parts/catalog/manufacturers?type=PC&popular=true`
- fallback: `GET /api/parts/catalog/manufacturers?type=PC`

Источник:
- `src/api/partsApi.ts:32`

### Почему это хорошая стратегия

- быстрый first render;
- если backend умеет отдавать popular — пользователь быстрее получает релевантный short list;
- если popular logic недоступна или пуста — UX не ломается.

---

## 10.2. Шаг 2 — model series

Когда выбран manufacturer, frontend подгружает series/models каталога.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:173`

### Алгоритм

- сохранить `selectedManufacturer`;
- сбросить series + modification;
- при наличии производителя вызвать:
  - `partsApi.getModelSeries({ type: 'PC', manufacturerId })`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:174`
- `src/pages/vehicles/VehicleCreatePage.tsx:175`
- `src/pages/vehicles/VehicleCreatePage.tsx:181`

### API endpoint

- `GET /api/parts/catalog/model-series?type=PC&manufacturerId=...`

Источник:
- `src/api/partsApi.ts:36`

---

## 10.3. Шаг 3 — modifications

Когда выбрана series/model, frontend загружает точные модификации.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:190`

### Алгоритм

- сохранить `selectedModelSeries`;
- сбросить modification;
- при наличии series вызвать:
  - `partsApi.getModifications({ type: 'PC', modelSeriesId })`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:191`
- `src/pages/vehicles/VehicleCreatePage.tsx:192`
- `src/pages/vehicles/VehicleCreatePage.tsx:198`

### API endpoint

- `GET /api/parts/catalog/modifications?type=PC&modelSeriesId=...`

Источник:
- `src/api/partsApi.ts:40`

---

## 10.4. Шаг 4 — final selection

После выбора `selectedModification` frontend не делает немедленного вызова на backend.

Он просто сохраняет выбранную модификацию в state:

- `setSelectedModification(nextValue)`
- `setCatalogTouched(true)`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:399`

### Почему это правильно

Потому что catalog-link — это часть финального submit flow, а не отдельная операция посередине формы.

---

## 11. Как выглядит итоговый submit flow

Submit состоит из **двух последовательных операций**.

## 11.1. Шаг 1 — create vehicle

Сначала frontend делает:

- `POST /api/vehicles`

с payload:

- `customerId`
- `brand`
- `model`
- `vin`
- `licensePlate`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:234`
- `src/api/vehiclesApi.ts:39`

### Payload type

`VehicleCreatePayload`:

- `customerId: number`
- `brand: string`
- `model: string`
- `vin: string`
- `licensePlate: string`

Источник:
- `src/api/vehiclesApi.ts:4`

---

## 11.2. Шаг 2 — optional catalog link

После успешного создания frontend строит catalog payload:

- `buildCatalogPayload()`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:220`

### Когда payload строится

Только если выбраны все три сущности:

- manufacturer
- modelSeries
- modification

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:221`

### Что входит в payload

- `type`
- `manufacturerId`
- `manufacturerName`
- `modelSeriesId`
- `modelSeriesName`
- `modificationId`
- `modificationName`
- `engineDescription`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:223`

### Дальше frontend делает

- `PUT /api/vehicles/{id}/catalog-link`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:241`
- `src/api/vehiclesApi.ts:47`

---

## 11.3. Шаг 3 — navigation

После этого фронт уходит на карточку автомобиля:

- `navigate(/vehicles/{id})`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:245`

---

## 12. Что видит пользователь в UI

## 12.1. Основная часть формы

Пользователь видит:

- выбор клиента;
- марка;
- модель;
- VIN;
- госномер.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:285`

## 12.2. Каталожная часть

Пользователь видит отдельный блок:

- `Каталог UMAPI`
- `Производитель`
- `Серия / модель`
- `Точная модификация`

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:333`
- `src/pages/vehicles/VehicleCreatePage.tsx:348`
- `src/pages/vehicles/VehicleCreatePage.tsx:370`
- `src/pages/vehicles/VehicleCreatePage.tsx:398`

### UX-смысл

Это прямо показывает пользователю, что:

- базовую машину можно сохранить быстро;
- точная каталожная привязка — дополнительное улучшение качества данных.

---

## 12.3. Success summary

Если manufacturer + series + modification выбраны полностью, показывается success-alert с summary:

- производитель;
- серия;
- модификация;
- двигатель / fuel / capacity при наличии.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:428`

### Почему это полезно

Пользователь получает confirm, что выбрана именно та машина, а не просто близкая серия.

---

## 12.4. Warning summary

Если пользователь начал работать с каталогом, но не довёл выбор до точной модификации, показывается warning:

- авто можно сохранить;
- но поиск деталей по названию потом будет недоступен.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:442`

### Это очень важный продуктовый текст

Он объясняет value catalog-link не в технических терминах, а через downstream-пользу.

---

## 13. Usage patterns

## Pattern 1 — assisted manual entry

Марка и модель не жёстко ограничены каталогом.

Пользователь может ввести значения вручную, но форма помогает ему через suggestions.

Это лучший компромисс между:

- usability;
- data quality;
- устойчивостью к редким моделям.

---

## Pattern 2 — progressive enhancement

Сначала создаётся обычный `Vehicle`, затем при возможности добавляется `catalog-link`.

Это означает:

- форма не блокируется, если каталог недоступен;
- бизнес-данные об автомобиле не теряются;
- каталогизация — enhancement, а не prerequisite.

---

## Pattern 3 — cascading selection

Каталогическая часть устроена как cascade:

1. manufacturer
2. modelSeries
3. modification

И каждый upstream reset очищает downstream selections.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:161`
- `src/pages/vehicles/VehicleCreatePage.tsx:168`

---

## Pattern 4 — optimistic intelligence without over-automation

Фронт пытается автоматически сопоставить brand/model к серверному каталогу, но не делает рискованных fuzzy-assumptions.

Он ищет **exact match** по имени, а не приблизительное совпадение.

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:138`
- `src/pages/vehicles/VehicleCreatePage.tsx:147`

---

## 14. Что нужно для встраивания этой логики в web client

Ниже — минимальный набор технологий и шагов, если переносить это в отдельный клиент.

## 14.1. Обязательные API

### Для базового сценария
- `POST /api/vehicles`
- `GET /api/customers/{id}` или customer search

### Для умных подсказок / каталога
- `GET /api/parts/catalog/manufacturers?type=PC&popular=true`
- `GET /api/parts/catalog/manufacturers?type=PC`
- `GET /api/parts/catalog/model-series?type=PC&manufacturerId=...`
- `GET /api/parts/catalog/modifications?type=PC&modelSeriesId=...`
- `PUT /api/vehicles/{id}/catalog-link`

Источник:
- `src/api/partsApi.ts:32`
- `src/api/vehiclesApi.ts:47`

---

## 14.2. Обязательные frontend states

Нужно держать отдельно:

- `brandValue`
- `modelValue`
- `selectedCustomer`
- `manufacturers`
- `selectedManufacturer`
- `modelSeriesOptions`
- `selectedModelSeries`
- `modificationOptions`
- `selectedModification`
- `catalogTouched`
- `catalogError`
- loading states для каждого шага каталога

Источник:
- `src/pages/vehicles/VehicleCreatePage.tsx:64`
- `src/pages/vehicles/VehicleCreatePage.tsx:76`

---

## 14.3. Обязательные UX-правила

1. Марка и модель должны допускать ручной ввод.
2. Подсказки не должны блокировать submit.
3. Очистка бренда должна сбрасывать модель и каталог.
4. Очистка модели должна сбрасывать series/modification.
5. Каталогическая часть должна быть опциональной, но явно полезной.
6. После create желательно делать optional second call на `catalog-link`.

---

## 15. Рекомендуемый псевдо-flow для другого клиента

```text
open form
  -> preload manufacturers (popular, fallback all)
  -> user selects customer
  -> user types brand
      -> local brand suggestions shown
      -> if exact catalog manufacturer exists, preload model series
  -> user types/selects model
      -> local model suggestions shown
      -> if exact catalog series exists, preload modifications
  -> user optionally selects exact modification
  -> submit
      -> POST /api/vehicles
      -> if exact modification selected: PUT /api/vehicles/{id}/catalog-link
      -> navigate to vehicle details
```

---

## 16. Key insights

### Insight 1

Текущая реализация не зависит только от backend-каталога и поэтому остаётся usable даже при его проблемах.

### Insight 2

Подсказки брендов и моделей — это локальный UX accelerator, а не source-of-truth.

### Insight 3

Source-of-truth для точной технической идентификации автомобиля — это серверный UMAPI catalog chain.

### Insight 4

Двухшаговый submit (`create` -> `linkCatalog`) — очень удачное решение для интеграции в web-client, потому что оно снижает хрупкость формы.

### Insight 5

Экран уже фактически реализует pattern `soft wizard without explicit steps`: визуально это одна форма, но логически это последовательность зависимых действий.

---

## 17. Точки расширения

Если развивать этот flow дальше, разумные улучшения такие:

1. добавить поиск производителя по строке, если manufacturers слишком много;
2. кешировать `modelSeries` и `modifications` по id;
3. добавлять auto-select, если по series/modification найден ровно один вариант;
4. показывать year-range (`productionFrom/productionTo`) в списке model series;
5. показывать richer label для modification сразу в dropdown;
6. ввести отдельный client-safe hook вроде `useVehicleCatalogWizard()` для переиспользования в нескольких приложениях.

---

## 18. Практический итог

Текущий frontend реализует создание автомобиля как комбинацию:

- простой валидируемой формы базовых полей;
- локальных умных подсказок для марки/модели;
- каскадной серверной каталогизации через UMAPI;
- неблокирующей optional привязки к каталогу после создания записи.

Это хорошая технология для переноса в web client, потому что она:

- понятна пользователю;
- не слишком хрупкая;
- улучшает качество данных;
- не ломается, если часть подсказок недоступна;
- уже согласована с текущей backend-моделью.

---

## 19. Источники анализа

- экран создания автомобиля: `src/pages/vehicles/VehicleCreatePage.tsx:60`
- локальный бренд-справочник: `src/utils/vehicleCatalog.ts:1`
- catalog manufacturers / series / modifications API: `src/api/partsApi.ts:32`
- create + catalog-link API: `src/api/vehiclesApi.ts:39`
- catalog entity types: `src/types/models.ts:89`
- customer lookup integration: `src/components/CustomerLookupField.tsx:1`
