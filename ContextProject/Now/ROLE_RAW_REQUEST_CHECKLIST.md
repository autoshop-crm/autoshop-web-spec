# Raw Request Checklist By Role

Дата: 2026-04-24  
Назначение: список ручных запросов для проверки через твой экран `Raw Request`.

Этот файл собран по фактически доступным endpoint-ам и текущим role rules в backend.

Важно:

- для `Auth` используй `demo-api` routes:
  - `/demo-api/auth/login`
  - `/demo-api/auth/register`
  - `/demo-api/auth/refresh`
  - `/demo-api/auth/validate`
  - `/demo-api/auth/me`
- для `Core` используй реальные routes:
  - `/api/...`
- в `Raw Request` после логина Bearer token должен подставляться автоматически из UI state;
- если token не подставился, запросы к `/api/**` будут давать `401`.

---

## 1. Тестовые пользователи

### Manager

```text
email: manager@autoshop.local
password: Manager123!
```

### Mechanic

```text
email: mechanic@autoshop.local
password: Mechanic123!
```

### Client

```text
email: client@autoshop.local
password: Client123!
```

Дополнительно:

```text
admin@autoshop.local / Admin123!
reception@autoshop.local / Reception123!
```

---

## 2. Общие auth-запросы

Эти запросы можно выполнять для любой роли.

### 2.1. Login

Method:

```text
POST
```

URL:

```text
/demo-api/auth/login
```

Body example for manager:

```json
{
  "email": "manager@autoshop.local",
  "password": "Manager123!"
}
```

Body example for mechanic:

```json
{
  "email": "mechanic@autoshop.local",
  "password": "Mechanic123!"
}
```

Body example for client:

```json
{
  "email": "client@autoshop.local",
  "password": "Client123!"
}
```

Ожидаемо:

- `200` и JSON с `accessToken`, `refreshToken`, `roles`
- если пароль неверный -> `401`

### 2.2. Validate token

Method:

```text
POST
```

URL:

```text
/demo-api/auth/validate
```

Body:

```json
{}
```

Ожидаемо:

- `200`, если token есть и валиден
- `401`, если token отсутствует

### 2.3. Current user

Method:

```text
GET
```

URL:

```text
/demo-api/auth/me
```

Body:

```json
{}
```

Ожидаемо:

- `200` с текущим пользователем
- `401` без token

### 2.4. Refresh

Method:

```text
POST
```

URL:

```text
/demo-api/auth/refresh
```

Body:

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Ожидаемо:

- `200` с новыми токенами
- `400`, если `refreshToken` пустой

### 2.5. Register

Method:

```text
POST
```

URL:

```text
/demo-api/auth/register
```

Body:

```json
{
  "email": "demo.client.{{timestamp}}@example.com",
  "password": "ChangeMe123!",
  "firstName": "Demo",
  "lastName": "Client"
}
```

Ожидаемо:

- `201`, если email новый
- `409`, если email уже существует

---

## 3. Client circle

Главная правда текущего состояния:

- роль `CLIENT` в Auth уже есть;
- client-scoped Core API еще не реализован;
- значит у клиента сейчас реально доступны только auth-запросы;
- запросы к staff Core API должны давать `403`.

Это и нужно руками проверить.

### 3.1. Что реально доступно клиенту сейчас

1. Login
2. Validate
3. Me
4. Refresh

То есть используй блок `Общие auth-запросы`.

### 3.2. Негативные проверки клиента

После login как `client@autoshop.local` проверь, что staff API закрыт.

#### Client -> orders should be forbidden

Method:

```text
GET
```

URL:

```text
/api/orders/1
```

Body:

```json
{}
```

Ожидаемо:

- `403`

#### Client -> customers should be forbidden

Method:

```text
GET
```

URL:

```text
/api/customers/1
```

Body:

```json
{}
```

Ожидаемо:

- `403`

#### Client -> vehicles should be forbidden

Method:

```text
GET
```

URL:

```text
/api/vehicles/1
```

Body:

```json
{}
```

Ожидаемо:

- `403`

#### Client -> loyalty should be forbidden

Method:

```text
GET
```

URL:

```text
/api/loyalty/tiers
```

Body:

```json
{}
```

Ожидаемо:

- `403`

### 3.3. Что planned для клиента, но пока не должно работать

Эти URL пока не реализованы. Если дернуть их сейчас, ожидай `404` или иной not found path result.

```text
/api/client/me
/api/client/vehicles
/api/client/orders
/api/client/orders/{orderId}
/api/client/loyalty/account
/api/client/loyalty/transactions
```

---

## 4. Manager circle

Это основной полный ручной сценарий.

Рекомендуемый порядок:

1. login manager
2. создать клиента
3. создать машину
4. создать заказ
5. посмотреть loyalty
6. создать локальную деталь
7. обновить остаток
8. добавить деталь в заказ
9. обновить смету
10. изменить статус
11. поиск по UMAPI
12. quotes / purchase / stock receipt

---

## 5. Manager requests

### 5.1. Create customer

Method:

```text
POST
```

URL:

```text
/api/customers
```

Body:

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79991234567",
  "email": "ivan.petrov.{{timestamp}}@example.com"
}
```

Ожидаемо:

- `201`
- сохранить `id` как `{{customerId}}`

### 5.2. Get customer

Method:

```text
GET
```

URL:

```text
/api/customers/{{customerId}}
```

### 5.3. Search customer

Method:

```text
GET
```

URL:

```text
/api/customers/search?firstName=Ivan
```

### 5.4. Update customer

Method:

```text
PUT
```

URL:

```text
/api/customers/{{customerId}}
```

Body:

```json
{
  "firstName": "Ivan Updated"
}
```

### 5.5. Create vehicle

Method:

```text
POST
```

URL:

```text
/api/vehicles
```

Body:

```json
{
  "customerId": {{customerId}},
  "brand": "Toyota",
  "model": "Corolla",
  "vin": "JTDBR32E720123456",
  "licensePlate": "A123BC77"
}
```

Ожидаемо:

- `201`
- сохранить `id` как `{{vehicleId}}`

### 5.6. Get vehicle

Method:

```text
GET
```

URL:

```text
/api/vehicles/{{vehicleId}}
```

### 5.7. Vehicles by customer

Method:

```text
GET
```

URL:

```text
/api/vehicles/customer/{{customerId}}
```

### 5.8. Link vehicle to UMAPI catalog

Method:

```text
PUT
```

URL:

```text
/api/vehicles/{{vehicleId}}/catalog-link
```

Body:

```json
{
  "type": "PC",
  "manufacturerId": 130,
  "manufacturerName": "TOYOTA",
  "modelSeriesId": 100273,
  "modelSeriesName": "COROLLA",
  "modificationId": 123456,
  "modificationName": "COROLLA 1.6",
  "engineDescription": "1.6 бензин"
}
```

Важно:

- это пройдет только если значения реально валидны для твоей UMAPI-логики;
- если пока нет реальных валидных ID, можешь этот шаг пропустить или использовать свои найденные значения после catalog lookup.

### 5.9. Create order

Method:

```text
POST
```

URL:

```text
/api/orders
```

Body:

```json
{
  "customerId": {{customerId}},
  "vehicleId": {{vehicleId}},
  "employeeId": 1,
  "problem": "Oil leak diagnostics"
}
```

Ожидаемо:

- `201`
- сохранить `id` как `{{orderId}}`

### 5.10. Get order

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}
```

### 5.11. Orders by customer

Method:

```text
GET
```

URL:

```text
/api/orders/customer/{{customerId}}
```

### 5.12. Orders by vehicle

Method:

```text
GET
```

URL:

```text
/api/orders/vehicle/{{vehicleId}}
```

### 5.13. Update order problem

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}
```

Body:

```json
{
  "problem": "Oil leak diagnostics and filter replacement"
}
```

### 5.14. Assign mechanic

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/assign
```

Body:

```json
{
  "employeeId": 1
}
```

### 5.15. Update estimate

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/estimate
```

Body:

```json
{
  "laborTotal": 3000.00,
  "discountAmount": 0.00
}
```

### 5.16. Update status

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/status
```

Body:

```json
{
  "status": "IN_PROGRESS"
}
```

Повторно потом:

```json
{
  "status": "COMPLETED"
}
```

### 5.17. Loyalty account by customer

Method:

```text
GET
```

URL:

```text
/api/loyalty/accounts/customer/{{customerId}}
```

Ожидаемо:

- `200`
- сохранить `id` как `{{loyaltyAccountId}}`

### 5.18. Loyalty transactions

Method:

```text
GET
```

URL:

```text
/api/loyalty/accounts/{{loyaltyAccountId}}/transactions
```

### 5.19. Loyalty tiers

Method:

```text
GET
```

URL:

```text
/api/loyalty/tiers
```

### 5.20. Spend loyalty points

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/loyalty/spend
```

Body:

```json
{
  "points": 100
}
```

### 5.21. Remove loyalty spend

Method:

```text
DELETE
```

URL:

```text
/api/orders/{{orderId}}/loyalty/spend
```

Body:

```json
{}
```

### 5.22. Create local part

Method:

```text
POST
```

URL:

```text
/api/parts
```

Body:

```json
{
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00
}
```

Ожидаемо:

- `201`
- сохранить `id` как `{{partId}}`

### 5.23. Get part

Method:

```text
GET
```

URL:

```text
/api/parts/{{partId}}
```

### 5.24. Search parts

Method:

```text
GET
```

URL:

```text
/api/parts?articleNumber=90915YZZE1
```

### 5.25. Update stock

Method:

```text
PUT
```

URL:

```text
/api/parts/{{partId}}/stock
```

Body:

```json
{
  "stockQuantity": 10
}
```

### 5.26. Add part to order

Method:

```text
POST
```

URL:

```text
/api/orders/{{orderId}}/parts
```

Body:

```json
{
  "partId": {{partId}},
  "quantity": 2
}
```

### 5.27. List order parts

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts
```

### 5.28. Update order part quantity

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/parts/{{itemId}}
```

Body:

```json
{
  "quantity": 3
}
```

### 5.29. External article search

Method:

```text
GET
```

URL:

```text
/api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10
```

### 5.30. Manufacturers

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/manufacturers?type=PC&popular=true
```

### 5.31. Model series

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/model-series?type=PC&manufacturerId=130
```

### 5.32. Modifications

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/modifications?type=PC&modelSeriesId=100273
```

### 5.33. Product groups by modification

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/product-groups/search?type=PC&modificationId=123456&query=масляный%20фильтр
```

### 5.34. Articles by product group

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/articles?type=PC&modificationId=123456&productGroupIds=7&limit=10
```

### 5.35. Order-scoped product groups

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts/catalog/product-groups/search?query=масляный%20фильтр
```

### 5.36. Order-scoped articles

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts/catalog/articles?productGroupIds=7&limit=10
```

### 5.37. Supplier quotes

Method:

```text
GET
```

URL:

```text
/api/procurement/supplier-quotes/search?query=90915YZZE1
```

### 5.38. Purchase order

Method:

```text
POST
```

URL:

```text
/api/procurement/purchase-orders
```

Body:

```json
{
  "quote": {
    "positionSignature": "manual-signature-from-provider",
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
  "clientComment": "order-{{orderId}}",
  "createExternalOrder": false
}
```

Совет:

- сначала тестируй с `createExternalOrder=false`
- так проще проверить бизнес-валидацию без реального внешнего заказа

### 5.39. Stock receipt

Method:

```text
POST
```

URL:

```text
/api/procurement/stock-receipts
```

Body:

```json
{
  "targetPartId": {{partId}},
  "receivedQuantity": 5,
  "salePrice": 1500.00
}
```

---

## 6. Mechanic circle

Механик может читать заказы, машины и детали, работать с частями заказа, каталогом, estimate и status.

Механик не должен иметь доступ к:

- customers create/update/delete
- orders create
- procurement
- local part create/update/delete/stock receipt
- loyalty spend/remove

Это тоже нужно руками проверить.

---

## 7. Mechanic requests

Сначала login как mechanic.

### 7.1. Get order

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}
```

### 7.2. Orders by status

Method:

```text
GET
```

URL:

```text
/api/orders/status/IN_PROGRESS
```

### 7.3. Get vehicle

Method:

```text
GET
```

URL:

```text
/api/vehicles/{{vehicleId}}
```

### 7.4. Parts search

Method:

```text
GET
```

URL:

```text
/api/parts?articleNumber=90915YZZE1&availableOnly=true
```

### 7.5. List order parts

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts
```

### 7.6. Add part to order

Method:

```text
POST
```

URL:

```text
/api/orders/{{orderId}}/parts
```

Body:

```json
{
  "partId": {{partId}},
  "quantity": 1
}
```

### 7.7. Update order part quantity

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/parts/{{itemId}}
```

Body:

```json
{
  "quantity": 2
}
```

### 7.8. Remove order part

Method:

```text
DELETE
```

URL:

```text
/api/orders/{{orderId}}/parts/{{itemId}}
```

Body:

```json
{}
```

### 7.9. Catalog manufacturers

Method:

```text
GET
```

URL:

```text
/api/parts/catalog/manufacturers?type=PC&popular=true
```

### 7.10. Order-scoped product groups

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts/catalog/product-groups/search?query=масляный%20фильтр
```

### 7.11. Order-scoped articles

Method:

```text
GET
```

URL:

```text
/api/orders/{{orderId}}/parts/catalog/articles?productGroupIds=7&limit=10
```

### 7.12. Update estimate

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/estimate
```

Body:

```json
{
  "laborTotal": 2500.00,
  "discountAmount": 0.00
}
```

### 7.13. Update status

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/status
```

Body:

```json
{
  "status": "IN_PROGRESS"
}
```

потом:

```json
{
  "status": "COMPLETED"
}
```

---

## 8. Negative checks for mechanic

### Mechanic -> create customer should be forbidden

Method:

```text
POST
```

URL:

```text
/api/customers
```

Body:

```json
{
  "firstName": "Blocked",
  "lastName": "Mechanic",
  "phoneNumber": "+79990000000",
  "email": "blocked.mechanic@example.com"
}
```

Ожидаемо:

- `403`

### Mechanic -> create order should be forbidden

Method:

```text
POST
```

URL:

```text
/api/orders
```

Body:

```json
{
  "customerId": 1,
  "vehicleId": 1,
  "employeeId": 1,
  "problem": "Should be forbidden"
}
```

Ожидаемо:

- `403`

### Mechanic -> procurement quotes should be forbidden

Method:

```text
GET
```

URL:

```text
/api/procurement/supplier-quotes/search?query=90915YZZE1
```

Ожидаемо:

- `403`

### Mechanic -> create local part should be forbidden

Method:

```text
POST
```

URL:

```text
/api/parts
```

Body:

```json
{
  "brand": "TEST",
  "name": "Blocked part",
  "articleNumber": "BLOCKED-1",
  "cost": 100.00
}
```

Ожидаемо:

- `403`

### Mechanic -> loyalty spend should be forbidden

Method:

```text
PUT
```

URL:

```text
/api/orders/{{orderId}}/loyalty/spend
```

Body:

```json
{
  "points": 100
}
```

Ожидаемо:

- `403`

---

## 9. Quick smoke sequence

Если хочешь быстро руками проверить весь контур без лишнего блуждания:

### Manager smoke

1. `/demo-api/auth/login`
2. `POST /api/customers`
3. `POST /api/vehicles`
4. `POST /api/orders`
5. `GET /api/loyalty/accounts/customer/{{customerId}}`
6. `POST /api/parts`
7. `PUT /api/parts/{{partId}}/stock`
8. `POST /api/orders/{{orderId}}/parts`
9. `PUT /api/orders/{{orderId}}/estimate`
10. `PUT /api/orders/{{orderId}}/status`

### Mechanic smoke

1. `/demo-api/auth/login`
2. `GET /api/orders/{{orderId}}`
3. `GET /api/parts?availableOnly=true`
4. `GET /api/orders/{{orderId}}/parts`
5. `PUT /api/orders/{{orderId}}/estimate`
6. `PUT /api/orders/{{orderId}}/status`
7. `GET /api/procurement/supplier-quotes/search?query=90915YZZE1` -> должен быть `403`

### Client smoke

1. `/demo-api/auth/login`
2. `/demo-api/auth/validate`
3. `/demo-api/auth/me`
4. `GET /api/orders/1` -> должен быть `403`
5. `GET /api/client/orders` -> должен быть `404` пока endpoint не реализован

---

## 10. Что сейчас не включено

Пока не включал в checklist:

- Core file facade `/api/orders/{id}/files`, `/api/vehicles/{id}/files`
  - потому что в текущем `autoshop-core` эти controllers еще не подтверждены как готовые
- client-scoped Core API `/api/client/**`
  - потому что это следующий backend этап, а не текущая реализованная поверхность

Если хочешь, следующим сообщением я могу сделать вторую версию этого файла уже в формате:

```text
Role -> Method -> URL -> Expected status -> Copy-paste JSON
```

совсем как тестовый чеклист без лишних пояснений.
