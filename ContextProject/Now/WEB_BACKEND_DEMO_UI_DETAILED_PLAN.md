# Подробный план разработки простого Web UI для демонстрации текущего backend

Дата: 2026-04-23  
Назначение: локальный демонстрационный интерфейс, который показывает, "за что дергать" в backend, и позволяет руками пройти основные рабочие сценарии без Postman.

---

## 1. Главная цель

Сделать максимально простой web-интерфейс поверх текущих backend-сервисов AutoShop:

- показать все основные доступные endpoint-ы;
- дать формы для ключевых запросов;
- показывать HTTP method, URL, request body, статус ответа и JSON ответа;
- показать систему с трех рабочих сторон:
  - менеджер;
  - механик;
  - клиент;
- провести один понятный end-to-end сценарий:
  - login;
  - создать клиента;
  - создать автомобиль;
  - связать автомобиль с UMAPI-каталогом;
  - создать заказ;
  - подобрать/создать деталь;
  - добавить деталь в заказ;
  - обновить смету;
  - применить/снять loyalty points;
  - сменить статус заказа;
  - увидеть, что backend отправил событие для NotificationService;
  - загрузить/посмотреть файл, если Day 15 file facade уже реализован.

Это не полноценный клиентский кабинет и не production web app. Это "панель управления backend-MVP", где видно, какие ручки уже живые и что они возвращают.

---

## 2. На чем основан план

Факты по текущему состоянию:

- `autoshop-core` уже содержит REST API для клиентов: `CustomerController` на `/api/customers` с create/get/update/delete/search. См. `src/main/java/com/vladko/autoshopcore/client/controller/CustomerController.java:16`.
- `autoshop-core` уже содержит REST API для автомобилей и catalog-link: `VehicleController` на `/api/vehicles`. См. `src/main/java/com/vladko/autoshopcore/vehicle/controller/VehicleController.java:17`.
- `autoshop-core` уже содержит REST API заказов: `OrderController` на `/api/orders`, включая assign, estimate, status, выборки по customer/vehicle/status. См. `src/main/java/com/vladko/autoshopcore/order/controller/OrderController.java:20`.
- `autoshop-core` уже содержит склад/детали: `PartController` на `/api/parts` и `OrderPartItemController` на `/api/orders/{orderId}/parts`. См. `src/main/java/com/vladko/autoshopcore/parts/controller/PartController.java:25` и `src/main/java/com/vladko/autoshopcore/parts/controller/OrderPartItemController.java:23`.
- `autoshop-core` уже содержит UMAPI catalog flow: `/api/parts/catalog/...` и order-friendly `/api/orders/{orderId}/parts/catalog/...`. См. `src/main/java/com/vladko/autoshopcore/parts/controller/CatalogPartSearchController.java:20` и `src/main/java/com/vladko/autoshopcore/parts/controller/OrderCatalogPartSearchController.java:23`.
- `autoshop-core` уже содержит procurement flow через Carreta: supplier quotes, purchase orders, stock receipts. См. `src/main/java/com/vladko/autoshopcore/procurement/controller/SupplierQuoteController.java:13`, `PurchaseOrderController.java:16`, `StockReceiptController.java:15`.
- `autoshop-core` уже содержит loyalty API: account, transactions, tiers, spend/remove points. См. `src/main/java/com/vladko/autoshopcore/loyalty/controller/LoyaltyController.java:17` и `OrderLoyaltyController.java:18`.
- `autoshop-auth` уже содержит login/register/refresh/logout/validate/verify-token/me. См. `../autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/controller/AuthController.java:25`.
- `autoshop-files` уже содержит file API `/api/files`: upload, metadata, list, download, presigned URL, delete. См. `../autoshop-files/src/main/java/com/vladko/autoshopfilestorage/file/FileController.java:35`.
- `autoshop-notification` по планам Day 11/14 работает через Kafka и технические health/dev endpoint-ы, а не как основной REST-бизнес API.
- В `autoshop-core` security сейчас закрывает все неразрешенные маршруты: `.requestMatchers("/api/**").denyAll()` и `.anyRequest().denyAll()`. См. `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:97`.
- Значит web UI нельзя просто положить в `static` и ожидать, что он откроется: маршруты `/demo/**` нужно явно разрешить в security, лучше только для local/demo режима.

---

## 3. Выбранный подход

### Вариант MVP

Сделать demo UI прямо внутри `autoshop-core`:

```text
http://localhost:8080/demo/
```

Технически:

- plain HTML + CSS + JavaScript;
- без React/Vite/Node/npm;
- файлы в `src/main/resources/static/demo/`;
- API-вызовы к Core идут same-origin на `http://localhost:8080/api/...`;
- token хранится в `localStorage`;
- каждый запрос показывает:
  - название действия;
  - method;
  - URL;
  - query/body/form-data;
  - headers, кроме чувствительных значений;
  - HTTP status;
  - prettified JSON response;
  - curl-команду для повторения.

Почему именно так:

- не появляется отдельный frontend-проект;
- нет CORS для Core API, потому что UI отдается тем же origin;
- сборка не усложняется;
- можно быстро открыть браузер и показать backend на защите/демо;
- интерфейс не претендует на production UX, но честно показывает работу backend.

### Минимальный proxy для AuthService

AuthService живет на отдельном порту `8082`. Если страница с `localhost:8080` будет напрямую делать `fetch('http://localhost:8082/api/auth/login')`, браузер может упереться в CORS.

Поэтому для demo лучше добавить в Core local-only proxy:

```http
POST /demo-api/auth/login
POST /demo-api/auth/register
POST /demo-api/auth/refresh
POST /demo-api/auth/validate
GET  /demo-api/auth/me
```

Proxy только пересылает запросы в `APP_AUTH_BASE_URL`, не хранит пароли и не меняет auth-логику.

### FileStorage

Для файлов есть два режима:

1. Если Day 15 Core file facade уже реализован:
   - UI дергает доменные Core endpoint-ы `/api/orders/{orderId}/files` и `/api/vehicles/{vehicleId}/files`.
2. Если Day 15 еще не реализован:
   - вкладка "Файлы" показывает статус "backend facade not ready";
   - можно оставить read-only справку по прямому FileStorage API `/api/files`;
   - прямой browser call к `autoshop-files` не делать в MVP, чтобы не ловить CORS и не обходить Core.

---

## 4. Что не делаем

- Не делаем полноценный Web MVP для пользователей.
- Не делаем дизайн-систему, роутинг, авторизацию на frontend-уровне, сложный state manager.
- Не ходим из браузера напрямую в UMAPI, Carreta или MinIO.
- Не показываем секреты `APP_UMAPI_API_KEY`, `APP_CARRETA_API_KEY`, MinIO credentials.
- Не добавляем бизнес-логику в demo UI.
- Не делаем отдельную БД/таблицы для demo.
- Не пытаемся исправить backend-зазоры внутри UI. Например, если Carreta purchase order требует `positionSignature`, а supplier quote response его не отдает наружу, UI должен честно показать ограничение и дать поле ручного ввода.

---

## 5. Структура интерфейса

### Верхняя панель

Показывает:

- Core health: `GET /actuator/health`;
- Auth health, если доступен health endpoint;
- Files health, если сервис поднят;
- Notification health, если сервис поднят;
- текущий access token: present/missing;
- текущий пользователь: email, roles, expiresAt после validate/me;
- сохраненные ID текущего сценария:
  - `customerId`;
  - `vehicleId`;
  - `orderId`;
  - `partId`;
  - `orderPartItemId`;
  - `loyaltyAccountId`;
  - `fileId`.

### Левая навигация

Разделы:

1. `Auth`
2. `Demo Flow`
3. `Customers`
4. `Vehicles`
5. `Orders`
6. `Parts`
7. `Catalog / UMAPI`
8. `Procurement / Carreta`
9. `Loyalty`
10. `Files`
11. `Events / Notification`
12. `Raw Request`

### Правая рабочая область

Каждый раздел содержит:

- компактную форму;
- кнопку выполнения;
- блок "Request";
- блок "Response";
- кнопку "Save IDs from response";
- кнопку "Copy curl".

Важно: все формы должны быть предзаполнены валидными демо-значениями, чтобы можно было нажимать кнопки сверху вниз без долгой подготовки.

### Ролевой переключатель

В верхней части UI нужен явный переключатель режима:

```text
Manager | Mechanic | Client
```

Он не меняет backend-роль сам по себе, а:

- переключает preset экрана;
- показывает релевантные разделы;
- подставляет соответствующий demo flow;
- визуально помечает:
  - что доступно текущей роли уже сейчас;
  - что доступно только staff;
  - что пока является follow-up и еще не реализовано в Core.

Правило:

- `Manager` и `Mechanic` должны работать на реальных текущих endpoint-ах;
- `Client` должен иметь честный режим:
  - где уже есть реальный backend-контур - используем его;
  - где его еще нет - показываем planned API и ограничения, а не делаем фальшивую имитацию.

---

## 6. Данные состояния demo UI

Хранить в `localStorage` под ключом `autoshop.demo.state`:

```json
{
  "coreBaseUrl": "",
  "accessToken": "",
  "refreshToken": "",
  "currentUser": null,
  "activeRoleView": "MANAGER",
  "customerId": null,
  "vehicleId": null,
  "orderId": null,
  "partId": null,
  "orderPartItemId": null,
  "loyaltyAccountId": null,
  "fileId": null,
  "lastArticleNumber": "90915YZZE1",
  "lastBrand": "TOYOTA",
  "lastProductGroupIds": []
}
```

Если `coreBaseUrl` пустой, JS использует `window.location.origin`.

---

## 7. Ролевые контуры и ограничения текущего backend

### 7.1. Manager

Это основной и уже наиболее полный контур текущего backend.

Менеджер в demo UI должен видеть и реально использовать:

- login/validate/me;
- создание и поиск клиента;
- создание и редактирование автомобиля;
- создание заказа;
- назначение механика;
- обновление сметы;
- просмотр и смену статуса заказа;
- просмотр loyalty счета и применение/снятие баллов;
- поиск запчастей в локальном справочнике;
- поиск по UMAPI;
- получение supplier quotes через Carreta;
- создание purchase order;
- приемку на склад;
- работу с файлами через Core file facade, если Day 15 готов.

Что важно показать именно с точки зрения менеджера:

- менеджер открывает карточку клиента и оформляет весь жизненный цикл обращения;
- менеджер отвечает за финансовую сторону заказа:
  - labor estimate;
  - manual discount;
  - итоговую сумму;
  - loyalty spend;
  - закупку недостающих деталей;
- "выставление счета" в текущем MVP отражается через:
  - `PUT /api/orders/{id}/estimate`;
  - итоговые финансовые поля заказа `costsTotal`, `discountAmount`, `finalAmount`;
  - при наличии file facade - загрузку/отдачу `ORDER_ESTIMATE` как файла.

Честное ограничение:

- отдельного invoice/billing endpoint-а в текущем Core нет;
- поэтому в плане UI надо использовать формулировку:
  - `estimate / final amount / printable estimate file`,
  а не обещать готовый бухгалтерский модуль.

### 7.2. Mechanic

Механик уже поддерживается ролями и частью endpoint-ов, но его контур уже, чем у менеджера.

По текущей security-конфигурации механик реально может:

- читать заказы;
- читать автомобили;
- читать локальные детали и остатки;
- искать каталожные группы/артикулы через `/api/parts/catalog/**`;
- добавлять детали в заказ;
- менять количество деталей в заказе;
- удалять детали из заказа;
- обновлять estimate;
- менять статус заказа.

См. действующие role rules:

- `GET /api/orders/**` доступен `MECHANIC`;
- `GET /api/vehicles/**` доступен `MECHANIC`;
- `GET /api/parts/**` доступен `MECHANIC`;
- `POST/PUT/DELETE /api/orders/*/parts/**` доступны `MECHANIC`;
- `PUT /api/orders/*/estimate` доступен `MECHANIC`;
- `PUT /api/orders/*/status` доступен `MECHANIC`.

См. `src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:67`.

Механик не должен в demo UI видеть как "обычную свою" операцию:

- создание клиента;
- создание автомобиля;
- создание заказа;
- создание/редактирование локальной детали в справочнике;
- приемку на склад;
- создание purchase order;
- supplier quotes search через Carreta, потому что сейчас `GET /api/procurement/supplier-quotes/search` не открыт для `MECHANIC`.

Поэтому UI механика должен быть построен как контур:

```text
Получил заказ -> открыл машину -> посмотрел проблему ->
проверил локальный склад -> если детали есть, добавил в заказ ->
если деталей нет, нашел каталожные варианты ->
подготовил артикул/позицию для менеджера ->
обновил estimate/status -> приложил фото/комментарий, если file facade готов
```

Главная мысль:

- механик в этом demo не занимается закупкой сам;
- он доводит техническую часть заказа до состояния, когда менеджер может быстро оформить закупку и финальную стоимость.

### 7.3. Client

Роль `CLIENT` уже существует в AuthService. См. `../autoshop-auth/src/main/java/com/vladko/autoshopauth/role/entity/RoleName.java:3`.

Но в текущем Core клиентский read-only/self-service контур еще не доведен до готового API:

- в Day 14 это прямо было отложено;
- follow-up уже зафиксирован как `client-scoped order endpoints`;
- также отдельно зафиксировано: `Add client-scoped endpoints using Auth userId -> customerId`.

См.:

- `ContextProject/Now/DAY_14_2026-04-22_DETAILED_PLAN.md:141`
- `ContextProject/Now/DAY_14_2026-04-22_DETAILED_PLAN.md:1113`

Из этого следует важное правило для demo UI:

- `Client` режим нужно включить в план уже сейчас;
- но он должен быть обозначен как следующий backend-срез, а не как "уже полностью работает".

Что клиенту логично показывать в целевой версии:

- свой профиль;
- свои автомобили;
- свои заказы;
- статус каждого заказа;
- итоговую сумму и примененные скидки/баллы;
- loyalty account и историю начислений/списаний;
- смету/документы/фото, если file facade готов;
- уведомления по статусам и завершению заказа.

Что можно показать уже сейчас в demo UI без обмана:

- login под пользователем с ролью `CLIENT`;
- `validate/me` через AuthService;
- отдельную клиентскую вкладку с planned API contract;
- карту будущего сценария клиента на основе уже существующих customer/order/vehicle/loyalty сущностей;
- read-only explanation, что staff endpoints сейчас не должны напрямую открываться клиенту.

Что нужно добавить в backend следующим шагом, чтобы клиентский режим стал реальным:

```http
GET /api/client/me
GET /api/client/vehicles
GET /api/client/orders
GET /api/client/orders/{orderId}
GET /api/client/loyalty/account
GET /api/client/loyalty/transactions
GET /api/client/orders/{orderId}/files
GET /api/client/orders/{orderId}/files/{fileId}
```

Источник данных для этих endpoint-ов:

- `userId` из Auth principal;
- mapping `userId -> customerId`;
- дальше уже выборка по существующим доменным таблицам `customer`, `vehicle`, `order`, `loyalty`.

### 7.4. Что это меняет в UI-архитектуре

Demo UI должен иметь не только общую навигацию по сущностям, но и отдельные role presets:

1. `Manager workspace`
2. `Mechanic workspace`
3. `Client workspace`

Каждый preset открывает свою стартовую панель:

- `Manager workspace`:
  - Customer card
  - Vehicle card
  - Order financials
  - Procurement
  - Loyalty
  - Files
- `Mechanic workspace`:
  - Assigned/selected order
  - Vehicle linked to order
  - Local stock check
  - Catalog search
  - Order parts
  - Estimate and status
- `Client workspace`:
  - My profile
  - My vehicles
  - My orders
  - Loyalty
  - Documents
  - Notifications

Для `Client workspace` в первой версии UI часть блоков может быть:

- `Planned`
- `Backend follow-up required`
- `Read-only contract preview`

Это лучше, чем смешивать клиентский контур со staff-инструментами.

---

## 8. Endpoint matrix для UI

### Auth

| UI action | Endpoint | Комментарий |
|---|---|---|
| Register | `POST /demo-api/auth/register` | proxy to AuthService |
| Login | `POST /demo-api/auth/login` | сохранить `accessToken` и `refreshToken` |
| Refresh | `POST /demo-api/auth/refresh` | обновить token |
| Validate | `POST /demo-api/auth/validate` | показать roles/expiresAt |
| Me | `GET /demo-api/auth/me` | показать current user |

### Customers

| UI action | Endpoint |
|---|---|
| Create customer | `POST /api/customers` |
| Get customer | `GET /api/customers/{id}` |
| Search customer | `GET /api/customers/search?email=&phoneNumber=&firstName=&lastName=` |
| Update customer | `PUT /api/customers/{id}` |
| Delete customer | `DELETE /api/customers/{id}` |

Минимальная форма create:

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79991234567",
  "email": "ivan.petrov.demo@example.com"
}
```

### Vehicles

| UI action | Endpoint |
|---|---|
| Create vehicle | `POST /api/vehicles` |
| Get vehicle | `GET /api/vehicles/{id}` |
| Get by VIN | `GET /api/vehicles/vin/{vin}` |
| List by customer | `GET /api/vehicles/customer/{customerId}` |
| Update vehicle | `PUT /api/vehicles/{id}` |
| Link UMAPI catalog modification | `PUT /api/vehicles/{id}/catalog-link` |
| Unlink catalog | `DELETE /api/vehicles/{id}/catalog-link` |
| Delete vehicle | `DELETE /api/vehicles/{id}` |

Минимальная форма create:

```json
{
  "customerId": 1,
  "brand": "Toyota",
  "model": "Corolla",
  "vin": "JTDBR32E720123456",
  "licensePlate": "A123BC77"
}
```

### Orders

| UI action | Endpoint |
|---|---|
| Create order | `POST /api/orders` |
| Get order | `GET /api/orders/{id}` |
| Update problem | `PUT /api/orders/{id}` |
| Assign employee | `PUT /api/orders/{id}/assign` |
| Update estimate | `PUT /api/orders/{id}/estimate` |
| Change status | `PUT /api/orders/{id}/status` |
| List by customer | `GET /api/orders/customer/{customerId}` |
| List by vehicle | `GET /api/orders/vehicle/{vehicleId}` |
| List by status | `GET /api/orders/status/{status}` |

Минимальная форма create:

```json
{
  "customerId": 1,
  "vehicleId": 1,
  "employeeId": 1,
  "problem": "Oil leak diagnostics"
}
```

Статусы для selector брать из backend enum, на UI можно зафиксировать MVP-набор:

```text
NEW
IN_PROGRESS
COMPLETED
CANCELLED
```

Если фактический enum отличается, UI должен показывать ошибку backend без скрытия деталей.

### Parts and order parts

| UI action | Endpoint |
|---|---|
| Create local part | `POST /api/parts` |
| Search local parts | `GET /api/parts?articleNumber=&brand=&name=&availableOnly=` |
| Get local part | `GET /api/parts/{id}` |
| Update local part | `PUT /api/parts/{id}` |
| Update stock | `PUT /api/parts/{id}/stock` |
| Delete part | `DELETE /api/parts/{id}` |
| Add part to order | `POST /api/orders/{orderId}/parts` |
| List order parts | `GET /api/orders/{orderId}/parts` |
| Update order part quantity | `PUT /api/orders/{orderId}/parts/{itemId}` |
| Remove order part | `DELETE /api/orders/{orderId}/parts/{itemId}` |

Минимальная форма part:

```json
{
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00
}
```

### Catalog / UMAPI

| UI action | Endpoint |
|---|---|
| External article search | `GET /api/parts/external/search?articleNumber=&brand=&limit=&offset=` |
| Manufacturers | `GET /api/parts/catalog/manufacturers?type=PC&popular=true` |
| Model series | `GET /api/parts/catalog/model-series?type=PC&manufacturerId=` |
| Modifications | `GET /api/parts/catalog/modifications?type=PC&modelSeriesId=` |
| Product groups by modification | `GET /api/parts/catalog/product-groups/search?type=PC&modificationId=&query=` |
| Articles by product group | `GET /api/parts/catalog/articles?type=PC&modificationId=&productGroupIds=&supplierId=&limit=&offset=` |
| Product groups by order vehicle | `GET /api/orders/{orderId}/parts/catalog/product-groups/search?query=` |
| Articles by order vehicle | `GET /api/orders/{orderId}/parts/catalog/articles?productGroupIds=&supplierId=&limit=&offset=` |

UI-правило:

- рядом с ответом показывать badges `cached` и `fallback`;
- если нет UMAPI key или внешний API недоступен, не прятать ошибку, а показать ее как часть демонстрации текущей интеграции.

### Procurement / Carreta

| UI action | Endpoint |
|---|---|
| Search supplier quotes | `GET /api/procurement/supplier-quotes/search?query=` |
| Create/check purchase order | `POST /api/procurement/purchase-orders` |
| Receive stock | `POST /api/procurement/stock-receipts` |

UI-правило для purchase order:

- если supplier quote response не содержит `positionSignature`, кнопка "Create external order" должна быть disabled;
- оставить режим "manual quote JSON" для проверки backend endpoint-а вручную;
- явно показать примечание: backend-зазор описан в `CORE_API_DESCRIPTION.md`, потому что Carreta требует position signature.

### Loyalty

| UI action | Endpoint |
|---|---|
| Get/create account | `GET /api/loyalty/accounts/customer/{customerId}` |
| Get transactions | `GET /api/loyalty/accounts/{accountId}/transactions` |
| Get tiers | `GET /api/loyalty/tiers` |
| Spend points on order | `PUT /api/orders/{orderId}/loyalty/spend` |
| Remove spent points | `DELETE /api/orders/{orderId}/loyalty/spend` |

UI-правило:

- показывать balance, tier, totalSpent, totalEarnedPoints;
- после `COMPLETED` заказа повторно обновлять account/transactions.

### Files

Если Day 15 Core facade реализован:

| UI action | Endpoint |
|---|---|
| Upload order file | `POST /api/orders/{orderId}/files?category=ORDER_DOCUMENT` |
| List order files | `GET /api/orders/{orderId}/files` |
| Get order file metadata | `GET /api/orders/{orderId}/files/{fileId}` |
| Download order file | `GET /api/orders/{orderId}/files/{fileId}/download` |
| Presigned order URL | `POST /api/orders/{orderId}/files/{fileId}/presigned-download-url` |
| Delete order file | `DELETE /api/orders/{orderId}/files/{fileId}` |
| Upload vehicle file | `POST /api/vehicles/{vehicleId}/files?category=VEHICLE_PHOTO` |
| List vehicle files | `GET /api/vehicles/{vehicleId}/files` |

Если facade еще не реализован:

- показывать "Files facade is planned in Day 15";
- показывать прямой FileStorage contract read-only:
  - `POST /api/files?category=&ownerType=&ownerId=&uploadedBy=`;
  - `GET /api/files?ownerType=&ownerId=&category=&includeDeleted=&page=&size=`;
  - `GET /api/files/{fileId}`;
  - `GET /api/files/{fileId}/download`;
  - `POST /api/files/{fileId}/presigned-download-url`;
  - `DELETE /api/files/{fileId}`.

### Events / Notification

NotificationService не должен становиться REST-зависимостью Core. UI показывает:

- включен ли Core producer: `app.events.order-notifications-enabled`;
- topic: `autoshop.order-events`;
- кнопки сценария, которые должны породить event:
  - create order -> `ORDER_CREATED`;
  - update order status -> `ORDER_STATUS_CHANGED`;
  - complete order -> `ORDER_COMPLETED`;
- ссылку/подсказку на Mailhog UI, если он поднят;
- health NotificationService;
- текстовый чеклист: "после COMPLETED проверь email/log/inbox".

Если есть local-only dev endpoints NotificationService из Day 11:

```http
POST /api/dev/events/order-created
POST /api/dev/events/order-status-changed
POST /api/dev/events/order-completed
```

их можно добавить в раздел "dev only", но не смешивать с реальным Core flow.

---

## 8. Детальный demo flow

### 8.0. Ролевые сценарии поверх общего demo flow

Общий flow выше остается базовым, но demo UI должен уметь запускать его из трех рабочих точек зрения.

### 8.0.1. Manager flow

Это главный end-to-end сценарий.

```text
Login manager ->
create/search customer ->
create/search vehicle ->
link vehicle to catalog ->
create order ->
assign mechanic ->
set estimate ->
check loyalty ->
if needed start procurement ->
receive stock / add part ->
finalize order ->
complete order ->
show notification outcome ->
show estimate/documents/files
```

Manager flow должен особенно хорошо показывать:

- оформление клиента;
- оформление автомобиля;
- открытие заказа;
- финансовую часть;
- закупку недостающих деталей;
- итог заказа и артефакты для клиента.

### 8.0.2. Mechanic flow

Это технический рабочий сценарий внутри уже созданного заказа.

```text
Login mechanic ->
open assigned/existing order ->
inspect vehicle and problem ->
check local stock ->
if stock exists add part to order ->
if stock missing search by catalog/article ->
prepare missing part data for manager ->
update estimate/labor ->
change status NEW -> IN_PROGRESS -> COMPLETED
```

Mechanic flow должен особенно хорошо показывать:

- чтение заказа и машины;
- проверку наличия на складе;
- добавление уже существующих деталей в заказ;
- поиск каталожного артикула без прямой закупки;
- изменение статуса и сметы.

UI-подсказка для механика:

- если локальной детали нет и нужна закупка, показать action card:
  - `handoff to manager`;
  - передать article number / brand / desired quantity;
  - открыть ссылку на Manager Procurement panel с уже подставленным query.

### 8.0.3. Client flow

Это либо будущий self-service контур, либо ограниченный preview до появления client-scoped endpoint-ов.

Целевой flow:

```text
Login client ->
see my profile ->
see my vehicles ->
see my active and completed orders ->
open order details ->
see status, estimate, final amount, spent/earned loyalty ->
download estimate/documents ->
receive notifications on status changes
```

Текущий честный MVP flow:

```text
Login client ->
validate/me ->
see planned self-service dashboard ->
see which backend endpoints are required next ->
see how existing manager-side entities will be projected into client view
```

То есть клиентский режим нужен уже в плане и UI, но пока как:

- контракт будущего кабинета;
- карта данных;
- готовая точка для следующего backend этапа.

### Step 0. Проверка окружения

UI делает:

```http
GET /actuator/health
```

Показывает:

- Core UP/DOWN;
- Auth reachable/unreachable;
- Files reachable/unreachable;
- Notification reachable/unreachable;
- предупреждение, если token отсутствует.

### Step 1. Login

Пользователь вводит email/password manager/admin user.

UI вызывает:

```http
POST /demo-api/auth/login
```

После успеха:

- сохраняет `accessToken`;
- сохраняет `refreshToken`;
- вызывает validate/me;
- показывает roles.

### Step 2. Create customer

UI вызывает:

```http
POST /api/customers
```

После успеха:

- сохраняет `customerId`;
- отображает карточку клиента;
- предлагает сразу открыть поиск.

### Step 3. Create vehicle

UI подставляет `customerId` и вызывает:

```http
POST /api/vehicles
```

После успеха:

- сохраняет `vehicleId`;
- показывает VIN/licensePlate;
- предлагает UMAPI catalog-link.

### Step 4. Catalog lookup and vehicle link

Быстрый путь:

- пользователь вводит готовые `manufacturerId`, `modelSeriesId`, `modificationId`;
- UI вызывает `PUT /api/vehicles/{id}/catalog-link`.

Наглядный путь:

1. `GET /api/parts/catalog/manufacturers?type=PC&popular=true`
2. `GET /api/parts/catalog/model-series?type=PC&manufacturerId=...`
3. `GET /api/parts/catalog/modifications?type=PC&modelSeriesId=...`
4. `PUT /api/vehicles/{id}/catalog-link`

После успеха:

- карточка автомобиля показывает `umapiModificationId`;
- становятся доступны order-friendly catalog endpoints.

### Step 5. Create order

UI вызывает:

```http
POST /api/orders
```

После успеха:

- сохраняет `orderId`;
- показывает status, totals, discounts;
- раскрывает блоки parts, loyalty, status, files.

### Step 6. Find or create part

Вариант A: артикульный внешний поиск:

```http
GET /api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10
```

Вариант B: поиск по названию в рамках автомобиля заказа:

```http
GET /api/orders/{orderId}/parts/catalog/product-groups/search?query=масляный фильтр
GET /api/orders/{orderId}/parts/catalog/articles?productGroupIds=...
```

После выбора артикула UI создает локальную деталь:

```http
POST /api/parts
PUT /api/parts/{id}/stock
```

### Step 7. Add part to order

UI вызывает:

```http
POST /api/orders/{orderId}/parts
```

После успеха:

- сохраняет `orderPartItemId`;
- обновляет заказ;
- показывает `partsTotal`, `finalAmount`.

### Step 8. Update estimate

UI вызывает:

```http
PUT /api/orders/{orderId}/estimate
```

Body:

```json
{
  "laborTotal": 3000.00,
  "discountAmount": 0.00
}
```

После успеха:

- показывает laborTotal, partsTotal, finalAmount.

### Step 9. Loyalty

UI вызывает:

```http
GET /api/loyalty/accounts/customer/{customerId}
GET /api/loyalty/tiers
```

Если balance > 0:

```http
PUT /api/orders/{orderId}/loyalty/spend
```

Если balance = 0:

- UI показывает, что списание сейчас не пройдет;
- основной сценарий продолжает статус заказа до completed, чтобы увидеть начисление.

### Step 10. Complete order and observe events

UI вызывает:

```http
PUT /api/orders/{orderId}/status
```

Body:

```json
{
  "status": "COMPLETED"
}
```

После успеха:

- обновляет order;
- обновляет loyalty account;
- обновляет transactions;
- показывает чеклист NotificationService:
  - Core event publisher должен отправить `ORDER_COMPLETED`;
  - NotificationService должен получить Kafka message;
  - письмо/лог можно проверить через Mailhog/logs.

### Step 11. Files

Если Core file facade есть:

- upload PDF/image;
- list files;
- metadata;
- presigned URL;
- download;
- delete.

Если facade нет:

- раздел остается информационным и показывает, что это следующий backend шаг.

---

## 9. Файлы, которые нужно создать/изменить

### Core static UI

Создать:

```text
src/main/resources/static/demo/index.html
src/main/resources/static/demo/styles.css
src/main/resources/static/demo/js/state.js
src/main/resources/static/demo/js/api.js
src/main/resources/static/demo/js/render.js
src/main/resources/static/demo/js/forms.js
src/main/resources/static/demo/js/app.js
```

Назначение:

- `index.html` - layout, nav, root containers;
- `styles.css` - простой readable UI;
- `state.js` - localStorage state;
- `api.js` - fetch wrapper, bearer token, curl generation;
- `render.js` - JSON viewer, response cards, status badges;
- `forms.js` - schemas/default values для форм;
- `app.js` - wiring всех разделов.

### Core demo proxy

Создать:

```text
src/main/java/com/vladko/autoshopcore/demo/DemoUiProperties.java
src/main/java/com/vladko/autoshopcore/demo/DemoAuthProxyController.java
src/main/java/com/vladko/autoshopcore/demo/DemoHealthController.java
```

Правила:

- включать только при `app.demo.enabled=true`;
- в `application-local.properties.example` добавить:

```properties
app.demo.enabled=true
app.demo.auth-base-url=http://localhost:8082
app.demo.files-base-url=http://localhost:8084
app.demo.notification-base-url=http://localhost:8083
```

В production default должен быть:

```properties
app.demo.enabled=false
```

### Security

Изменить:

```text
src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java
```

Добавить разрешения:

```text
GET  /demo
GET  /demo/**
POST /demo-api/auth/login
POST /demo-api/auth/register
POST /demo-api/auth/refresh
GET  /demo-api/health/**
POST /demo-api/auth/validate
GET  /demo-api/auth/me
```

Важно:

- `/demo-api/auth/validate` и `/demo-api/auth/me` должны требовать или принимать token и передавать его в AuthService;
- если `app.demo.enabled=false`, demo controllers не должны регистрироваться;
- нельзя случайно открыть `/api/**` шире текущих role rules.

---

## 10. Приоритеты реализации

### P0. Страница открывается

Сделать:

- разрешить `/demo/**` в local/demo режиме;
- создать `index.html`, `styles.css`, базовый JS;
- вывести Core health;
- вывести пустой token state.

Acceptance:

- `http://localhost:8080/demo/` открывается;
- без token все Core API формы показывают подсказку "login first";
- `/api/**` без token по-прежнему закрыты по текущим правилам.

### P1. Auth и request viewer

Сделать:

- `DemoAuthProxyController`;
- login form;
- token storage;
- validate/me;
- универсальный response viewer;
- copy curl.

Acceptance:

- login работает из браузера;
- access token автоматически подставляется в Core API requests;
- ошибки `401/403/400/409/500` показываются полностью и читаемо.

### P2. Вертикальный сценарий Customer -> Vehicle -> Order

Сделать:

- create/search/get customer;
- create/get/list vehicle;
- create/get/update/status order;
- сохранение ID между шагами.
- собрать это как `Manager workspace`.

Acceptance:

- можно создать клиента, авто и заказ без Postman;
- ID автоматически подставляются в следующие формы;
- JSON ответа виден после каждого шага.

### P2.5. Role presets

Сделать:

- переключатель `Manager | Mechanic | Client`;
- отдельные стартовые панели для трех ролей;
- фильтрацию доступных UI actions по роли;
- явные badges:
  - `Available now`
  - `Manager only`
  - `Mechanic only`
  - `Planned for client scope`

Acceptance:

- пользователь может открыть demo UI и сразу понять, какой рабочий контур он сейчас смотрит;
- механик не видит закупку как "свою" операцию;
- клиентский режим явно отделен от staff-инструментов;
- planned client features не маскируются под уже реализованные.

### P3. Parts, estimate, loyalty

Сделать:

- local parts CRUD minimum;
- stock update;
- add/list/update/remove order part;
- update estimate;
- loyalty account/tiers/transactions;
- spend/remove points.
- разделить presentation для manager и mechanic.

Acceptance:

- можно увидеть изменение totals после добавления детали и сметы;
- можно увидеть loyalty account и transactions;
- completed order обновляет loyalty flow, если backend это делает.
- механик видит только свой рабочий поднабор действий.

### P4. Catalog and procurement

Сделать:

- external article search;
- catalog manufacturers/model-series/modifications/product-groups/articles;
- vehicle catalog-link;
- order-friendly product group/articles search;
- supplier quotes;
- stock receipt;
- purchase order manual JSON panel.

Acceptance:

- UI показывает cached/fallback для UMAPI/Carreta ответов;
- отсутствие ключей или внешняя ошибка отображается как диагностическая информация;
- purchase order не притворяется рабочим, если нет `positionSignature`.

### P5. Files and Notification visibility

Сделать:

- если Day 15 facade готов: forms для order/vehicle files;
- если facade не готов: read-only информационный блок;
- Notification block: что должно произойти после order events, где смотреть Mailhog/logs.

Acceptance:

- files section не ломает общий demo, даже если file facade еще отсутствует;
- Notification section ясно объясняет, какие backend actions генерируют события.

---

## 11. Оценка времени

Минимальная версия на 1 рабочий день:

| Блок | Время | Результат |
|---|---:|---|
| P0 static shell + security | 1.0 ч | `/demo/` открывается |
| P1 auth proxy + request viewer | 1.5 ч | можно login и смотреть request/response |
| P2 customer/vehicle/order flow | 2.0 ч | основной вертикальный сценарий |
| P3 parts/estimate/loyalty | 1.5 ч | видны деньги, склад, loyalty |
| P4 catalog/procurement | 1.5 ч | видны UMAPI/Carreta интеграции |
| P5 files/notification/docs | 0.8 ч | видны сервисные интеграции |
| Smoke + fixes | 0.7 ч | демо проходит целиком |

Итого: примерно 9 часов на аккуратный однодневный демонстратор.

Если времени меньше, резать в таком порядке:

1. оставить Auth + Demo Flow + JSON viewer;
2. оставить Customer/Vehicle/Order/Parts;
3. Catalog/Procurement сделать read-only с 2-3 ручками;
4. Files/Notification оставить как диагностические блоки.

---

## 12. Тестирование

### Unit/controller tests

Минимум:

- `DemoAuthProxyControllerTest`:
  - login proxy returns AuthService response;
  - AuthService unavailable -> stable `503`;
  - token header is forwarded for validate/me.
- `SecurityConfigurationTest`:
  - `GET /demo/` доступен в demo/local режиме;
  - `GET /api/customers/search` без token не открыт случайно;
  - role rules для `/api/**` не расширены.

### Manual smoke

Команды запуска:

```bash
docker compose up -d postgres redis kafka minio mailhog
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
./gradlew bootRun --args='--spring.profiles.active=local'
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-notification
./gradlew bootRun --args='--spring.profiles.active=local'
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-files
./gradlew bootRun --args='--spring.profiles.active=local'
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
./gradlew bootRun --args='--spring.profiles.active=local'
```

Проверка в браузере:

```text
http://localhost:8080/demo/
```

Smoke-сценарий:

1. Login as manager/admin.
2. Validate token.
3. Create customer.
4. Create vehicle.
5. Create order.
6. Create part.
7. Update stock.
8. Add part to order.
9. Update estimate.
10. Get loyalty account.
11. Complete order.
12. Refresh loyalty transactions.
13. Check Notification/Mailhog/logs.
14. Upload/list/download file, если file facade готов.

### Browser acceptance

- UI не перезагружает страницу после каждого запроса.
- Все responses видны как JSON.
- Last request можно повторить через curl.
- После refresh страницы token и ID сценария остаются.
- Кнопка "Reset demo state" чистит localStorage.

---

## 13. Acceptance criteria

Считаем задачу готовой, если:

- `GET http://localhost:8080/demo/` открывает demo UI.
- Из UI можно залогиниться через AuthService и сохранить token.
- Все Core API calls идут с `Authorization: Bearer ...`.
- В UI есть три явных режима:
  - manager;
  - mechanic;
  - client.
- Без Postman можно пройти минимум:
  - customer create;
  - vehicle create;
  - order create;
  - part create;
  - stock update;
  - add part to order;
  - estimate update;
  - status update;
  - loyalty account/transactions read.
- Без Postman можно пройти отдельный mechanic flow:
  - открыть существующий заказ;
  - проверить локальный склад;
  - добавить существующую деталь в заказ;
  - воспользоваться catalog search;
  - передать procurement handoff менеджеру;
  - обновить estimate/status.
- В client mode UI честно показывает:
  - что уже есть в Auth;
  - какие client-scoped endpoint-ы еще нужно добавить в Core;
  - какие данные будут доступны клиенту после этого.
- UI показывает raw request/response для каждого действия.
- UI показывает cached/fallback на UMAPI/Carreta ответах.
- UI не раскрывает внешние API keys и MinIO credentials.
- `/api/**` security rules не ослаблены.
- Demo proxy не включается в production по умолчанию.
- Есть короткая инструкция запуска в README или отдельном markdown.

---

## 14. Основные риски и закрытие

### Риск 1. CORS между Core UI и AuthService

Закрытие:

- не дергать AuthService напрямую из браузера;
- сделать Core local-only proxy `/demo-api/auth/**`.

### Риск 2. Случайно открыть production API

Закрытие:

- `app.demo.enabled=false` по умолчанию;
- demo controllers через `@ConditionalOnProperty`;
- security tests на то, что `/api/**` не стал публичным.

### Риск 3. External API keys отсутствуют

Закрытие:

- UI показывает ошибку backend как диагностический результат;
- не блокировать весь сценарий на UMAPI/Carreta;
- local part flow должен работать без внешних ключей.

### Риск 4. Purchase order не может быть создан из найденного quote

Причина:

- текущий supplier quote response не отдает наружу `positionSignature`, а Carreta order требует его.

Закрытие:

- кнопку create external order делать disabled, пока quote не содержит нужный token/signature;
- оставить manual JSON mode;
- отдельно запланировать backend доработку: `quoteToken` или сохранение quote в Redis/DB.

### Риск 5. File facade Day 15 еще не готов

Закрытие:

- Files вкладка должна быть optional;
- если endpoint-ы `/api/orders/{id}/files` отсутствуют, UI показывает плановый контракт и не валит demo flow.

### Риск 6. NotificationService не имеет удобного REST read API

Закрытие:

- не пытаться читать notification DB из UI;
- показывать event-producing actions и места проверки: logs/Mailhog/Kafka topic;
- dev endpoints держать отдельно от real flow.

---

## 15. Следующие backend follow-ups после demo UI

Эти задачи не входят в сам demo UI, но станут очевидны при использовании:

1. Добавить в supplier quote response безопасный `quoteToken` или `positionSignature`, чтобы UI мог создать purchase order без ручного JSON.
2. Добавить маленький read-only diagnostics endpoint в Core:

```http
GET /api/demo/system-status
```

только для local/demo режима, чтобы показывать:

- auth base URL;
- file base URL;
- notification enabled;
- order events topic;
- UMAPI configured true/false;
- Carreta configured true/false.

3. Добавить NotificationService read-only debug endpoint только для local:

```http
GET /api/dev/notifications/recent
```

чтобы на демо видеть, что Kafka event был обработан.

4. После Day 15 завершить files вкладку через Core file facade.
5. Добавить client-scoped Core API:

```http
GET /api/client/me
GET /api/client/vehicles
GET /api/client/orders
GET /api/client/orders/{orderId}
GET /api/client/loyalty/account
GET /api/client/loyalty/transactions
GET /api/client/orders/{orderId}/files
```

6. Добавить mapping `Auth userId -> customerId`, чтобы роль `CLIENT` получала доступ только к своим машинам, заказам, баллам и документам.
7. Рассмотреть read-only доступ механика к supplier quotes, если бизнес-процессу удобно, чтобы мастер видел ориентир по срокам и наличию до передачи менеджеру.

---

## 16. Итоговое решение

Делать не "настоящий frontend", а локальный backend demo console внутри `autoshop-core`:

```text
/demo/              static HTML/CSS/JS
/demo-api/auth/**   local-only proxy to AuthService
/api/**             реальные Core endpoints
```

Первый экран должен сразу показывать живость сервисов, token state и кнопку начала сценария. Главная ценность интерфейса - не красота, а прозрачность: каждый backend вызов виден, повторяем и понятен.
