# AutoShop Backend UI Context

> Контекст для разработки `autoshop-web-spec` под реальный backend-контур AutoShop.
> Цель: проектировать UI сразу под production-like API, а локально тестировать через `autoshop-infrastructure`.

## 1. Общая схема backend

Сервисы:
- `autoshop-auth` — логин, refresh/logout, текущий пользователь, создание staff-пользователей админом
- `autoshop-core` — основной business API для работников: клиенты, машины, заказы, loyalty, склад, закупки, поиск запчастей
- `autoshop-files` — upload/list/download/delete файлов
- `autoshop-notification` — фоновые уведомления; для UI отдельного публичного worker API сейчас не видно
- `autoshop-infrastructure` — reverse proxy, docker compose, env, окружения

Локальная точка входа для UI:
- Base URL: `http://localhost:8088`

Прямые локальные порты:
- `auth`: `http://localhost:8082`
- `core`: `http://localhost:8080`
- `files`: `http://localhost:8084`
- `notification`: `http://localhost:8083`

Для UI рекомендуется ходить через `nginx` gateway на `8088`.

## 2. Локальная авторизация для UI

Текущая локальная bootstrap-учётка:
- email: `admin@autoshop.local`
- password: `Admin123!`
- role: `ADMIN`

Логин:
- `POST /api/auth/login`

Пример запроса:
```json
{
  "email": "admin@autoshop.local",
  "password": "Admin123!"
}
```

Пример ответа:
```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "tokenType": "Bearer",
  "accessExpiresIn": 900,
  "refreshExpiresIn": 604800,
  "userId": 1,
  "email": "admin@autoshop.local",
  "roles": ["ADMIN"]
}
```

Все защищённые запросы UI должны слать:
```http
Authorization: Bearer <accessToken>
```

## 3. Роли и UI-матрица

Роли из backend:
- `ADMIN`
- `MANAGER`
- `MECHANIC`
- `RECEPTIONIST`
- `CLIENT`

Для worker UI ключевые роли:
- `ADMIN`
- `MANAGER`
- `MECHANIC`
- `RECEPTIONIST`

Базовая логика интерфейса:
- `ADMIN` — видит всё
- `MANAGER` — заказы, назначение сотрудников, оценки, склад/закупки, клиенты, автомобили, loyalty
- `RECEPTIONIST` — приёмка клиента, машины, создание заказов, изменение статуса, loyalty read/write в части списания
- `MECHANIC` — работа по заказу, статусы, смета, запчасти по заказу, чтение заказов

## 4. Auth API

### Public auth
- `POST /api/auth/register` — публичная регистрация клиента
- `POST /api/auth/login` — логин
- `POST /api/auth/refresh` — обновление access token

### Authenticated auth
- `POST /api/auth/logout`
- `POST /api/auth/validate`
- `POST /api/auth/verify-token`
- `GET /api/auth/me`

### Admin-only
- `POST /api/admin/users`

Payload для staff-user creation:
```json
{
  "email": "manager@autoshop.local",
  "password": "Manager123!",
  "firstName": "Ivan",
  "lastName": "Manager",
  "roles": ["MANAGER"]
}
```

Важно:
- `CLIENT` нельзя создавать через `/api/admin/users`
- Для staff UI логично иметь экран “Пользователи/Сотрудники” только для `ADMIN`

## 5. Core API: главный UI-контур работников

## 5.1 Customers
Base path: `/api/customers`

Endpoints:
- `POST /api/customers`
- `GET /api/customers/{id}`
- `PUT /api/customers/{id}`
- `DELETE /api/customers/{id}`
- `GET /api/customers/search`

Поля создания клиента:
```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79991234567",
  "email": "ivan@example.com"
}
```

UI use cases:
- клиентский справочник
- поиск клиента по имени/телефону/email
- создание клиента на стойке приёмки
- редактирование карточки клиента

## 5.2 Vehicles
Base path: `/api/vehicles`

Endpoints:
- `POST /api/vehicles`
- `GET /api/vehicles/{id}`
- `GET /api/vehicles/vin/{vin}`
- `GET /api/vehicles/customer/{customerId}`
- `PUT /api/vehicles/{id}`
- `PUT /api/vehicles/{id}/catalog-link`
- `DELETE /api/vehicles/{id}/catalog-link`
- `DELETE /api/vehicles/{id}`

Поля создания автомобиля:
```json
{
  "customerId": 1,
  "brand": "Toyota",
  "model": "Camry",
  "vin": "JTNB11HK1J3000001",
  "licensePlate": "A123BC77"
}
```

UI use cases:
- список машин клиента
- поиск по VIN
- привязка машины к каталогам UMAPI
- управление карточкой автомобиля

## 5.3 Orders
Base path: `/api/orders`

Endpoints:
- `POST /api/orders`
- `GET /api/orders/{id}`
- `PUT /api/orders/{id}`
- `PUT /api/orders/{id}/assign`
- `PUT /api/orders/{id}/estimate`
- `PUT /api/orders/{id}/status`
- `GET /api/orders/customer/{customerId}`
- `GET /api/orders/vehicle/{vehicleId}`
- `GET /api/orders/status/{status}`

Создание заказа:
```json
{
  "customerId": 1,
  "vehicleId": 10,
  "employeeId": 3,
  "problem": "Шум в подвеске, требуется диагностика"
}
```

Назначение сотрудника:
```json
{
  "employeeId": 5
}
```

Смена статуса:
```json
{
  "status": "IN_PROGRESS"
}
```

Что важно для UI:
- экран очереди заказов по статусам
- фильтры по клиенту/машине/статусу
- карточка заказа
- edit problem
- назначение механика/менеджера
- update estimate
- timeline статусов

## 5.4 Order Parts
Base path: `/api/orders/{orderId}/parts`

Endpoints:
- `POST /api/orders/{orderId}/parts`
- `GET /api/orders/{orderId}/parts`
- `PUT /api/orders/{orderId}/parts/{itemId}`
- `DELETE /api/orders/{orderId}/parts/{itemId}`

Связанный каталог для заказа:
- `GET /api/orders/{orderId}/parts/catalog/product-groups/search`
- `GET /api/orders/{orderId}/parts/catalog/articles`

UI use cases:
- список деталей по заказу
- добавление/изменение/удаление позиции
- подбор деталей по уже привязанной машине заказа
- сценарий для механика и менеджера

## 5.5 Parts / Warehouse
Base path: `/api/parts`

Endpoints:
- `POST /api/parts`
- `GET /api/parts/{id}`
- `PUT /api/parts/{id}`
- `PUT /api/parts/{id}/stock`
- `DELETE /api/parts/{id}`
- `GET /api/parts`

Дополнительный поиск:
- `GET /api/parts/external/search`
- `GET /api/parts/catalog/manufacturers`
- `GET /api/parts/catalog/model-series`
- `GET /api/parts/catalog/modifications`
- `GET /api/parts/catalog/product-groups/search`
- `GET /api/parts/catalog/articles`

UI use cases:
- складской каталог
- поиск по артикулу/бренду/названию
- наличие на складе
- внешние предложения поставщиков
- подбор деталей по каталогу автомобиля

## 5.6 Procurement
Base path: `/api/procurement`

Endpoints:
- `POST /api/procurement/purchase-orders`
- `POST /api/procurement/stock-receipts`
- `GET /api/procurement/supplier-quotes/search?query=...`

UI use cases:
- поиск предложений поставщика
- создание закупки
- приёмка деталей на склад

Это больше manager/admin UI, а не mechanic UI.

## 5.7 Loyalty
Endpoints:
- `GET /api/loyalty/accounts/customer/{customerId}`
- `GET /api/loyalty/accounts/{accountId}/transactions`
- `GET /api/loyalty/tiers`
- `PUT /api/orders/{orderId}/loyalty/spend`
- `DELETE /api/orders/{orderId}/loyalty/spend`

UI use cases:
- баланс бонусов клиента
- история бонусных транзакций
- списание бонусов в заказе
- удаление списания

## 6. Files API
Base path: `/api/files`

Endpoints:
- `POST /api/files` — multipart upload
- `GET /api/files/{fileId}` — metadata
- `GET /api/files` — list by owner
- `GET /api/files/{fileId}/download`
- `POST /api/files/{fileId}/presigned-download-url`
- `DELETE /api/files/{fileId}`

Upload query/form params:
- `category`
- `ownerType`
- `ownerId`
- `uploadedBy` (optional)
- `file`

UI use cases:
- вложения заказа
- вложения диагностики / осмотра
- загрузка фото машины / документов / смет
- предпросмотр и скачивание

Важно для UI-модели:
- файл должен быть привязан к owner-сущности (`order`, `customer`, и т.п. — точные enum значения лучше читать из backend DTO/enum при интеграции)

## 7. Ролевой доступ в core

Сводно по security:
- Заказы:
  - create: `ADMIN`, `MANAGER`, `RECEPTIONIST`
  - read: `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`
  - assign: `ADMIN`, `MANAGER`
  - estimate: `ADMIN`, `MANAGER`, `MECHANIC`
  - status: `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`
- Клиенты/машины:
  - в основном `ADMIN`, `MANAGER`, `RECEPTIONIST`
- Запчасти по заказу:
  - read: `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`
  - write: `ADMIN`, `MANAGER`, `MECHANIC`
- Закупки/приёмка:
  - `ADMIN`, `MANAGER`
- Loyalty:
  - read/write в worker-контуре в основном `ADMIN`, `MANAGER`, `RECEPTIONIST`

Для UI это значит:
- проще всего делать route guards и скрывать действия по `roles` из токена/login response
- при этом backend всё равно остаётся источником истины

## 8. Как правильно строить WEB UI под prod

Рекомендуемый frontend base URL:
- production/staging-like: один gateway URL
- локально: `http://localhost:8088`

Не рекомендуется для UI:
- ходить напрямую на `8080/8082/8083/8084`
- использовать произвольный префикс вроде `/demo-api/...`, если он не реализован в `nginx`

Правильные локальные маршруты:
- auth: `/api/auth/...`
- core worker API: `/api/...`
- files: `/api/files/...`

## 9. Production-minded UI архитектура

Для `autoshop-web-spec` имеет смысл заложить такие модули:
- `Auth`
  - login
  - refresh session
  - current user
  - role guards
- `Reception`
  - create/search customer
  - create/update vehicle
  - create order
  - change order status
  - loyalty spend
- `Manager`
  - order board
  - assign mechanics
  - estimate editing
  - procurement
  - supplier quote search
  - parts stock management
- `Mechanic`
  - assigned order list
  - order detail
  - update estimate
  - update status
  - manage order parts
  - upload photos/files
- `Admin`
  - create workers
  - view all worker features

## 10. Что UI лучше предусмотреть заранее

- централизованный API client с Bearer token
- refresh token flow
- role-based navigation
- optimistic UI только там, где нет риска для финансов/склада
- error rendering из backend 401/403/409/422/500
- file upload abstraction отдельно от JSON API
- enums/statuses не хардкодить “красиво” без словаря на фронте

## 11. Что ещё важно проверить перед полной интеграцией

Для точного UI-контракта потом стоит дополнительно снять:
- реальные response payload примеры для `OrderResponseDTO`, `CustomerResponseDTO`, `VehicleResponseDTO`
- enum-значения `OrderStatus`, `FileCategory`, `OwnerType`
- pagination/shape ответа files list
- точные поля order part DTO и procurement DTO

Но уже сейчас этого документа достаточно, чтобы:
- строить auth flow
- проектировать кабинеты `ADMIN` / `MANAGER` / `MECHANIC` / `RECEPTIONIST`
- подключать рабочие CRUD-экраны к реальному backend

## 12. Короткий старт для UI

1. Логиниться на `POST http://localhost:8088/api/auth/login`
2. Сохранять `accessToken` и `refreshToken`
3. Для worker API использовать `Authorization: Bearer <token>`
4. Основные первые экраны:
   - login
   - current user / role bootstrap
   - customers search/create
   - vehicles by customer
   - orders by status
   - order details
   - order parts
   - file attachments

## 13. Source references

Основные файлы, по которым собран контекст:
- `../autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/controller/AuthController.java`
- `../autoshop-auth/src/main/java/com/vladko/autoshopauth/user/controller/AdminUserController.java`
- `../autoshop-auth/src/main/java/com/vladko/autoshopauth/security/SecurityConfig.java`
- `../autoshop-auth/src/main/java/com/vladko/autoshopauth/role/entity/RoleName.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/client/controller/CustomerController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/vehicle/controller/VehicleController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/order/controller/OrderController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/OrderPartItemController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/OrderCatalogPartSearchController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/PartController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/CatalogPartSearchController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/ExternalPartSearchController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/procurement/controller/PurchaseOrderController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/procurement/controller/StockReceiptController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/procurement/controller/SupplierQuoteController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/loyalty/controller/LoyaltyController.java`
- `../autoshop-core/src/main/java/com/vladko/autoshopcore/loyalty/controller/OrderLoyaltyController.java`
- `../autoshop-files/src/main/java/com/vladko/autoshopfilestorage/file/FileController.java`
- `compose/compose.local.yml`
- `nginx/local/autoshop.conf`
