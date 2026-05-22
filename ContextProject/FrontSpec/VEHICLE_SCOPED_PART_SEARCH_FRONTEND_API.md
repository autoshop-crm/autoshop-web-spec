# Vehicle-Scoped Part Search Frontend API

Дата: 2026-05-12
Проект: `autoshop-core`
Статус: backend реализован

---

# 1. Что это за новый API

Этот API решает задачу удобного поиска деталей для механика, когда:

- механик не знает точный артикул;
- механик знает человеческое название детали, например:
  - `Oil Filter`
  - `Air Filter`
  - `Brake Pads`
  - `Масляный фильтр`
- поиск должен идти **не по всему миру деталей**, а **в контексте конкретной машины заказа**.

Главная идея:
- сначала машина должна быть привязана к конкретной `UMAPI modification`;
- затем поиск по названию работает внутри каталога именно этой модификации;
- backend находит подходящие catalog groups и catalog articles;
- backend сразу обогащает результат локальным складом;
- фронт получает уже удобный unified result для UI.

Это и есть рекомендованный **Вариант C**.

---

# 2. Зачем нужен этот flow

UMAPI не поддерживает глобальный text search аналогов по строке вроде `Oil Filter`.

Поэтому вместо этого мы строим свой backend flow:

1. у заказа есть машина;
2. у машины есть привязка к `UMAPI catalog modification`;
3. frontend отправляет строку поиска `query`;
4. backend ищет релевантные product groups в каталоге машины;
5. backend получает articles для найденных групп;
6. backend проверяет локальный склад;
7. backend возвращает список деталей, уже готовых для действий механика.

Итог:
- механик ищет “по-человечески”;
- backend всё равно остаётся корректным относительно UMAPI.

---

# 3. Когда этот API можно использовать

API работает, если:

- существует `Order`;
- у `Order` есть `Vehicle`;
- `Vehicle` уже привязан к UMAPI catalog modification.

Если машина не привязана к каталогу, этот endpoint работать не будет.

То есть frontend должен учитывать два состояния:

## 3.1 Машина привязана к каталогу
Тогда поиск по названию доступен.

## 3.2 Машина не привязана к каталогу
Тогда frontend должен:
- скрыть поиск по названию;
- или показать CTA вида:
  - `Сначала выберите точную модификацию автомобиля`
  - `Привяжите машину к каталогу`

---

# 4. Endpoint

## 4.1 Поиск детали по названию в контексте заказа

`GET /api/orders/{orderId}/parts/search-by-name`

### Query params

- `query` — обязательный поисковый текст
- `availableOnly` — необязательный `boolean`
- `limit` — необязательный `integer`
- `offset` — необязательный `integer`

### Пример

```http
GET /api/orders/3/parts/search-by-name?query=Oil%20Filter
```

Пример с дополнительными параметрами:

```http
GET /api/orders/3/parts/search-by-name?query=Oil%20Filter&availableOnly=false&limit=20&offset=0
```

---

# 5. Роли доступа

Endpoint должен быть доступен тем же ролям, которые работают с деталями заказа.

Рекомендуемое frontend-использование:

- `MECHANIC` — основной пользователь этого поиска
- `MANAGER` — может использовать тоже
- `RECEPTIONIST` — зависит от UX, но обычно не основной сценарий
- `ADMIN` — доступен

Если в конкретной сборке security ещё не обновлён, frontend должен быть готов к `403` и показать понятную ошибку доступа.

---

# 6. Что делает backend внутри

Backend выполняет такую цепочку:

1. Находит заказ по `orderId`
2. Получает связанную машину
3. Проверяет, что у машины есть:
   - `umapiType`
   - `umapiModificationId`
4. Запускает catalog search product groups по `query`
5. Берёт найденные группы
6. Запрашивает catalog articles по найденным group ids
7. Сопоставляет catalog articles с локальными `Part` по `articleNumber`
8. Возвращает frontend-ready response

То есть frontend не должен сам:
- отдельно искать product groups;
- отдельно искать articles;
- отдельно склеивать их со складом.

Всё это делает backend.

---

# 7. Request contract

## 7.1 Обязательный параметр

### `query`
Строка поиска, например:
- `Oil Filter`
- `Air Filter`
- `Brake Pads`
- `масляный фильтр`

Если `query` пустой, backend вернёт ошибку.

## 7.2 `availableOnly`
Если `true`, backend возвращает только позиции, которые уже есть локально на складе.

Если `false` или не передан:
- backend возвращает и локально доступные позиции,
- и позиции, которых локально нет.

### Примеры

Только доступные локально:

```http
GET /api/orders/3/parts/search-by-name?query=Oil%20Filter&availableOnly=true
```

Все найденные:

```http
GET /api/orders/3/parts/search-by-name?query=Oil%20Filter&availableOnly=false
```

## 7.3 `limit`
Количество записей articles, которое backend попросит у catalog search.

По умолчанию:
- `20`

Ограничения:
- минимум `1`
- максимум `100`

## 7.4 `offset`
Смещение для пагинации.

По умолчанию:
- `0`

Ограничения:
- не может быть отрицательным

---

# 8. Response contract

## 8.1 Общая структура ответа

```json
{
  "orderId": 3,
  "vehicleId": 10,
  "vehicleBrand": "BMW",
  "vehicleModel": "X5",
  "modificationId": 333,
  "modificationName": "X5 3.0D",
  "query": "Oil Filter",
  "catalogLinked": true,
  "productGroupsCached": false,
  "productGroupsFallback": false,
  "articlesCached": false,
  "articlesFallback": false,
  "matchedProductGroups": [
    {
      "productGroupId": 7,
      "name": "Oil Filter",
      "normalizedName": "oil filter",
      "score": 1.00
    }
  ],
  "items": [
    {
      "productGroupId": 7,
      "productGroupName": "Oil Filter",
      "umapiArticleId": 55,
      "articleNumber": "OC90",
      "brand": "MAHLE",
      "name": "Oil Filter",
      "shortDescription": "Oil Filter",
      "source": "CATALOG",
      "mediaFile": null,
      "supplierQuoteSearchUrl": "/api/procurement/supplier-quotes/search?query=OC90",
      "matchedLocalPart": {
        "id": 44,
        "brand": "MAHLE",
        "name": "Oil Filter",
        "articleNumber": "OC90",
        "cost": 650.00,
        "stockQuantity": 5,
        "reservedQuantity": 2,
        "availableQuantity": 3,
        "createdAt": "2026-05-10T10:00:00Z",
        "updatedAt": "2026-05-10T10:00:00Z"
      },
      "exactLocalMatch": true,
      "availableLocally": true,
      "canAddAsLocal": true,
      "canAddAsRequested": false
    },
    {
      "productGroupId": 7,
      "productGroupName": "Oil Filter",
      "umapiArticleId": 56,
      "articleNumber": "WL7123",
      "brand": "WIX",
      "name": "Oil Filter",
      "shortDescription": "Oil Filter",
      "source": "CATALOG",
      "mediaFile": null,
      "supplierQuoteSearchUrl": "/api/procurement/supplier-quotes/search?query=WL7123",
      "matchedLocalPart": null,
      "exactLocalMatch": false,
      "availableLocally": false,
      "canAddAsLocal": false,
      "canAddAsRequested": true
    }
  ]
}
```

---

# 9. Поля ответа верхнего уровня

## `orderId`
ID заказа, в контексте которого выполнялся поиск.

## `vehicleId`
ID машины заказа.

## `vehicleBrand`
Бренд машины.

## `vehicleModel`
Модель машины.

## `modificationId`
UMAPI modification id, к которой привязана машина.

## `modificationName`
Человекочитаемое название модификации.

## `query`
Поисковая строка, которую отправил frontend.

## `catalogLinked`
Флаг, что машина корректно привязана к UMAPI catalog modification.

Ожидаемое значение в успешном сценарии:
- `true`

## `productGroupsCached`
Признак, что результат поиска product groups пришёл из cache.

## `productGroupsFallback`
Признак, что UMAPI был недоступен и backend вернул fallback из cache.

## `articlesCached`
Признак, что список articles был взят из cache.

## `articlesFallback`
Признак fallback для article search.

## `matchedProductGroups`
Список найденных product groups, которые backend посчитал релевантными для `query`.

Это полезно для UI, если хочешь показывать:
- почему backend нашёл именно эти results;
- к каким категориям относятся найденные детали.

## `items`
Основной список candidate parts для показа механику.

---

# 10. Поля `matchedProductGroups[]`

Каждый элемент содержит:

- `productGroupId` — ID product group в каталоге
- `name` — оригинальное название группы
- `normalizedName` — нормализованное имя
- `score` — релевантность матчинга к введённому `query`

### Как использовать на frontend

Можно:
- не показывать вообще, если UX должен быть простым;
- показывать как подсказку:
  - `Найдено в категории: Oil Filter`
- показывать debug-информацию для internal staff UI.

---

# 11. Поля `items[]`

Каждая строка результата — это candidate part, релевантный именно этой машине.

## `productGroupId`
ID product group, к которой backend отнёс строку.

## `productGroupName`
Название product group.

## `umapiArticleId`
UMAPI article id.

## `articleNumber`
Артикул детали.

Это один из важнейших полей для дальнейшего flow.

## `brand`
Бренд детали.

## `name`
Название детали.

## `shortDescription`
Краткое описание.

## `source`
Источник результата.

Текущее ожидаемое значение:
- `CATALOG`

## `mediaFile`
Ссылка/идентификатор медиа, если есть в каталоге.

## `supplierQuoteSearchUrl`
Подсказка для дальнейшего procurement/search flow.

Сейчас это полезное backend field, но фронт может его не использовать напрямую.

## `matchedLocalPart`
Если backend нашёл точную локальную `Part` по артикулу, здесь будет объект локальной детали.

Если локального совпадения нет:
- `matchedLocalPart = null`

## `exactLocalMatch`
`true`, если есть точное локальное совпадение по артикулу.

## `availableLocally`
`true`, если у matched local part есть доступный остаток.

Считается по формуле:
- `availableQuantity > 0`

## `canAddAsLocal`
Подсказка для фронта:
- если `true`, можно показать кнопку `Добавить со склада`

## `canAddAsRequested`
Подсказка для фронта:
- если `true`, можно показать кнопку `Добавить под заказ`

---

# 12. Поля `matchedLocalPart`

Это уже существующий локальный складской объект.

В нём frontend получает:

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

### Как использовать

Если `matchedLocalPart != null` и `availableLocally = true`:
- строку можно добавить в заказ как обычную локальную деталь

Если `matchedLocalPart = null` или `availableLocally = false`:
- строку можно добавить как `requested part`

---

# 13. Рекомендуемый frontend flow

## 13.1 При добавлении автомобиля

Frontend должен дать возможность не просто создать машину, но и выбрать её точную catalog modification.

То есть UX должен включать:
- бренд / производитель
- model series
- modification

Потом эта информация должна быть сохранена как привязка машины к каталогу.

Без этого новый search-by-name flow работать корректно не будет.

## 13.2 В карточке заказа

Когда механик открывает заказ:

1. фронт знает `orderId`
2. механик открывает поиск деталей
3. вводит `query`
4. frontend вызывает:
   - `GET /api/orders/{orderId}/parts/search-by-name?query=...`
5. backend возвращает results
6. frontend показывает список
7. механик выбирает строку
8. дальше:
   - если `canAddAsLocal = true` → старый flow добавления локальной детали
   - если `canAddAsRequested = true` → новый flow `requested part`

---

# 14. Рекомендуемый UI

## 14.1 Компонент поиска

Рекомендуемые элементы:
- input поиска
- debounce `300-500ms`
- кнопка `Найти`
- индикатор загрузки
- empty state
- error state

## 14.2 Таблица результатов

Рекомендуемые колонки:
- `Категория`
- `Артикул`
- `Бренд`
- `Название`
- `Локальный остаток`
- `Цена`
- `Действие`

### Пример отображения действий

Если `canAddAsLocal = true`:
- кнопка `Добавить со склада`

Если `canAddAsRequested = true`:
- кнопка `Добавить под заказ`

Если одновременно есть локальная запись, но она недоступна:
- можно показывать статус:
  - `Есть в базе, но не в наличии`

---

# 15. Recommended UX states

## 15.1 Loading
Показывать skeleton или spinner.

## 15.2 Empty
Если `items = []`, показать:
- `По вашему запросу ничего не найдено для этой модификации автомобиля`

## 15.3 Vehicle not linked
Если backend вернул ошибку про отсутствие catalog linkage, показать:
- `Для этой машины не выбрана точная модификация каталога`
- `Сначала привяжите автомобиль к каталогу`

## 15.4 Partial catalog relevance
Если `matchedProductGroups` есть, но `items` пустой:
- можно показать:
  - `Категории найдены, но конкретные детали не вернулись`

---

# 16. Ошибки, которые должен учитывать frontend

## 16.1 `404 Not Found`
Причины:
- заказ не найден

## 16.2 `400 Bad Request`
Причины:
- пустой `query`
- `limit < 1`
- `limit > 100`
- `offset < 0`

## 16.3 `409 Conflict`
Причины:
- у заказа нет машины
- машина не привязана к UMAPI catalog modification

Это важный сценарий для UI.

## 16.4 `403 Forbidden`
Причины:
- у пользователя нет прав на использование endpoint

---

# 17. Как комбинировать с уже существующими API

Новый endpoint не заменяет старые flows, а дополняет их.

## 17.1 Старый flow: поиск по артикулу
Если механик знает точный артикул:
- лучше использовать existing article-based search

## 17.2 Новый flow: поиск по названию
Если механик не знает артикул:
- использовать `search-by-name`

## 17.3 После выбора строки
Если деталь локально доступна:
- использовать старый endpoint добавления локальной детали в заказ

Если детали локально нет:
- использовать `POST /api/orders/{orderId}/requested-parts`

То есть новый endpoint — это **поисковый слой**, а не endpoint изменения заказа.

---

# 18. Suggested frontend decision tree

## Для каждой строки результата

### Сценарий A: деталь есть локально
Условия:
- `matchedLocalPart != null`
- `availableLocally = true`
- `canAddAsLocal = true`

Действие:
- показать CTA `Добавить со склада`

### Сценарий B: детали локально нет
Условия:
- `matchedLocalPart = null`
- или `availableLocally = false`
- `canAddAsRequested = true`

Действие:
- показать CTA `Добавить под заказ`

---

# 19. Пример интеграции на фронте

## Шаг 1
Механик открыл заказ `#3`

## Шаг 2
В поиске ввёл:
- `Oil Filter`

## Шаг 3
Frontend отправил:

```http
GET /api/orders/3/parts/search-by-name?query=Oil%20Filter&availableOnly=false&limit=20&offset=0
```

## Шаг 4
Получил `items[]`

## Шаг 5
Показал список:
- `OC90 / MAHLE / Oil Filter / На складе / Добавить со склада`
- `WL7123 / WIX / Oil Filter / Нет на складе / Добавить под заказ`

## Шаг 6
После выбора строки:
- или добавил локальную деталь
- или создал requested part

---

# 20. Ограничения текущей версии

## 20.1 Это не global text search
Поиск работает только в контексте конкретной машины.

## 20.2 Качество результата зависит от catalog linkage
Если машина привязана неправильно, поиск тоже будет плохим.

## 20.3 Это не analog search endpoint
Этот endpoint не возвращает “все аналоги по миру”.
Он возвращает **релевантные catalog articles для конкретной машины**, уже enriched локальным складом.

## 20.4 Quote и procurement здесь не запускаются
Этот endpoint не создаёт закупку.
Он только помогает механику выбрать нужную деталь.

---

# 21. Backend reference

Основные backend-файлы:

- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderVehicleScopedPartSearchController.java:14`
- `src/main/java/com/vladko/autoshopcore/parts/service/vehicle/VehicleScopedPartSearchService.java:5`
- `src/main/java/com/vladko/autoshopcore/parts/service/vehicle/VehicleScopedPartSearchServiceImpl.java:32`
- `src/main/java/com/vladko/autoshopcore/parts/dto/vehicle/VehicleScopedPartSearchResponseDTO.java:16`
- `src/main/java/com/vladko/autoshopcore/parts/dto/vehicle/VehicleScopedPartSearchItemDTO.java:13`
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderCatalogPartSearchController.java:21`
- `src/main/java/com/vladko/autoshopcore/parts/controller/OrderRequestedPartController.java:15`

---

# 22. Короткая рекомендация для frontend

Если нужен лучший UX для механика, используй этот flow как основной:

1. При создании авто обязательно привязывай точную modification
2. На заказе давай поиск по названию детали
3. По результатам показывай:
   - локально доступные детали
   - детали под заказ
4. После выбора строки направляй пользователя либо в local add flow, либо в requested part flow

