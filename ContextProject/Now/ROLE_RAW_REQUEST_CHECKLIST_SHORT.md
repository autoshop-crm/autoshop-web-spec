# Role Raw Request Checklist Short

Короткая версия для ручной проверки в `Raw Request`.

Как пользоваться:

- сначала выполни login для нужной роли;
- Bearer token UI должен подставить сам;
- JSON ниже можно вставлять как есть;
- числа `1` в `customerId`, `vehicleId`, `orderId`, `partId`, `itemId`, `loyaltyAccountId` это пример:
  если у тебя в ответе получился другой `id`, просто замени `1` на свой.

Твой текущий рабочий login для `CLIENT` уже подтвержден.

---

## Client

### Auth

`POST` `/demo-api/auth/login` -> `200`  
Что делает: логинит клиента и сохраняет token в UI.

```json
{
  "email": "client@autoshop.local",
  "password": "Client123!"
}
```

`POST` `/demo-api/auth/validate` -> `200`  
Что делает: проверяет текущий token и роли.

```json
{}
```

`GET` `/demo-api/auth/me` -> `200`  
Что делает: возвращает текущего пользователя.

```json
{}
```

`POST` `/demo-api/auth/refresh` -> `200`  
Что делает: обновляет access token по refresh token.

```json
{
  "refreshToken": "e5787cbc-fd48-4f7c-abc3-85436fffe5af"
}
```

### Forbidden checks

`GET` `/api/orders/1` -> `403`  
Что делает: проверяет, что клиент не может читать staff orders API.

```json
{}
```

`GET` `/api/customers/1` -> `403`  
Что делает: проверяет, что клиент не может читать staff customers API.

```json
{}
```

`GET` `/api/vehicles/1` -> `403`  
Что делает: проверяет, что клиент не может читать staff vehicles API.

```json
{}
```

`GET` `/api/loyalty/tiers` -> `403`  
Что делает: проверяет, что клиент не может ходить в staff loyalty API.

```json
{}
```

### Planned, not implemented yet

`GET` `/api/client/me` -> `404`  
Что делает: будущий endpoint клиентского кабинета, пока не реализован.

```json
{}
```

`GET` `/api/client/orders` -> `404`  
Что делает: будущий список заказов клиента, пока не реализован.

```json
{}
```

`GET` `/api/client/vehicles` -> `404`  
Что делает: будущий список машин клиента, пока не реализован.

```json
{}
```

---

## Manager

### Auth

`POST` `/demo-api/auth/login` -> `200`  
Что делает: логинит менеджера.

```json
{
  "email": "manager@autoshop.local",
  "password": "Manager123!"
}
```

`POST` `/demo-api/auth/validate` -> `200`  
Что делает: подтверждает, что в token роль `MANAGER`.

```json
{}
```

### Customer

`POST` `/api/customers` -> `201`  
Что делает: создает клиента.

```json
{
  "firstName": "Ivan",
  "lastName": "Petrov",
  "phoneNumber": "+79991234567",
  "email": "ivan.petrov.demo.1@example.com"
}
```

`GET` `/api/customers/1` -> `200`  
Что делает: читает клиента по id.

```json
{}
```

`GET` `/api/customers/search?firstName=Ivan` -> `200`  
Что делает: ищет клиента по имени.

```json
{}
```

`PUT` `/api/customers/1` -> `200`  
Что делает: обновляет клиента.

```json
{
  "firstName": "Ivan Updated"
}
```

### Vehicle

`POST` `/api/vehicles` -> `201`  
Что делает: создает машину клиента.

```json
{
  "customerId": 1,
  "brand": "Toyota",
  "model": "Corolla",
  "vin": "JTDBR32E720123456",
  "licensePlate": "A123BC77"
}
```

`GET` `/api/vehicles/1` -> `200`  
Что делает: читает машину по id.

```json
{}
```

`GET` `/api/vehicles/customer/1` -> `200`  
Что делает: получает все машины клиента.

```json
{}
```

`PUT` `/api/vehicles/1/catalog-link` -> `200` or `4xx`  
Что делает: привязывает машину к UMAPI-модификации.

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

### Order

`POST` `/api/orders` -> `201`  
Что делает: создает заказ на клиента и машину.

```json
{
  "customerId": 1,
  "vehicleId": 1,
  "employeeId": 1,
  "problem": "Oil leak diagnostics"
}
```

`GET` `/api/orders/1` -> `200`  
Что делает: читает заказ по id.

```json
{}
```

`GET` `/api/orders/customer/1` -> `200`  
Что делает: получает заказы клиента.

```json
{}
```

`GET` `/api/orders/vehicle/1` -> `200`  
Что делает: получает заказы по машине.

```json
{}
```

`PUT` `/api/orders/1` -> `200`  
Что делает: меняет описание проблемы в заказе.

```json
{
  "problem": "Oil leak diagnostics and filter replacement"
}
```

`PUT` `/api/orders/1/assign` -> `200`  
Что делает: назначает сотрудника на заказ.

```json
{
  "employeeId": 1
}
```

`PUT` `/api/orders/1/estimate` -> `200`  
Что делает: обновляет смету по работам и скидке.

```json
{
  "laborTotal": 3000.00,
  "discountAmount": 0.00
}
```

`PUT` `/api/orders/1/status` -> `200`  
Что делает: переводит заказ в работу.

```json
{
  "status": "IN_PROGRESS"
}
```

`PUT` `/api/orders/1/status` -> `200`  
Что делает: завершает заказ.

```json
{
  "status": "COMPLETED"
}
```

### Loyalty

`GET` `/api/loyalty/accounts/customer/1` -> `200`  
Что делает: читает loyalty account клиента.

```json
{}
```

`GET` `/api/loyalty/accounts/1/transactions` -> `200`  
Что делает: читает историю баллов.

```json
{}
```

`GET` `/api/loyalty/tiers` -> `200`  
Что делает: читает список уровней лояльности.

```json
{}
```

`PUT` `/api/orders/1/loyalty/spend` -> `200` or `4xx`  
Что делает: пытается списать баллы на заказ.

```json
{
  "points": 100
}
```

`DELETE` `/api/orders/1/loyalty/spend` -> `200`  
Что делает: снимает ранее примененные баллы.

```json
{}
```

### Parts

`POST` `/api/parts` -> `201`  
Что делает: создает локальную деталь в справочнике.

```json
{
  "brand": "TOYOTA",
  "name": "Oil filter",
  "articleNumber": "90915YZZE1",
  "cost": 1500.00
}
```

`GET` `/api/parts/1` -> `200`  
Что делает: читает деталь по id.

```json
{}
```

`GET` `/api/parts?articleNumber=90915YZZE1` -> `200`  
Что делает: ищет локальную деталь.

```json
{}
```

`PUT` `/api/parts/1/stock` -> `200`  
Что делает: обновляет складской остаток детали.

```json
{
  "stockQuantity": 10
}
```

`POST` `/api/orders/1/parts` -> `201`  
Что делает: добавляет деталь в заказ.

```json
{
  "partId": 1,
  "quantity": 2
}
```

`GET` `/api/orders/1/parts` -> `200`  
Что делает: читает состав деталей в заказе.

```json
{}
```

`PUT` `/api/orders/1/parts/1` -> `200`  
Что делает: меняет количество детали в заказе.

```json
{
  "quantity": 3
}
```

### Catalog

`GET` `/api/parts/external/search?articleNumber=90915YZZE1&brand=TOYOTA&limit=10` -> `200` or `4xx/5xx`  
Что делает: ищет артикул во внешнем каталоге.

```json
{}
```

`GET` `/api/parts/catalog/manufacturers?type=PC&popular=true` -> `200` or `4xx/5xx`  
Что делает: получает марки машин из каталога.

```json
{}
```

`GET` `/api/parts/catalog/model-series?type=PC&manufacturerId=130` -> `200` or `4xx/5xx`  
Что делает: получает серии модели для производителя.

```json
{}
```

`GET` `/api/parts/catalog/modifications?type=PC&modelSeriesId=100273` -> `200` or `4xx/5xx`  
Что делает: получает модификации модели.

```json
{}
```

`GET` `/api/parts/catalog/product-groups/search?type=PC&modificationId=123456&query=масляный%20фильтр` -> `200` or `4xx/5xx`  
Что делает: ищет группу деталей по названию.

```json
{}
```

`GET` `/api/parts/catalog/articles?type=PC&modificationId=123456&productGroupIds=7&limit=10` -> `200` or `4xx/5xx`  
Что делает: получает конкретные артикулы по группе.

```json
{}
```

`GET` `/api/orders/1/parts/catalog/product-groups/search?query=масляный%20фильтр` -> `200` or `409`  
Что делает: ищет группы деталей уже в контексте машины заказа.

```json
{}
```

`GET` `/api/orders/1/parts/catalog/articles?productGroupIds=7&limit=10` -> `200` or `409`  
Что делает: получает артикулы в контексте заказа.

```json
{}
```

### Procurement

`GET` `/api/procurement/supplier-quotes/search?query=90915YZZE1` -> `200` or `4xx/5xx`  
Что делает: ищет предложения поставщика.

```json
{}
```

`POST` `/api/procurement/purchase-orders` -> `201` or `4xx`  
Что делает: проверяет или создает закупку у поставщика.

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
  "clientComment": "order-1",
  "createExternalOrder": false
}
```

`POST` `/api/procurement/stock-receipts` -> `200`  
Что делает: увеличивает складской остаток детали после приемки.

```json
{
  "targetPartId": 1,
  "receivedQuantity": 5,
  "salePrice": 1500.00
}
```

---

## Mechanic

### Auth

`POST` `/demo-api/auth/login` -> `200`  
Что делает: логинит механика.

```json
{
  "email": "mechanic@autoshop.local",
  "password": "Mechanic123!"
}
```

`POST` `/demo-api/auth/validate` -> `200`  
Что делает: подтверждает, что в token роль `MECHANIC`.

```json
{}
```

### Allowed

`GET` `/api/orders/1` -> `200`  
Что делает: читает заказ.

```json
{}
```

`GET` `/api/orders/status/IN_PROGRESS` -> `200`  
Что делает: читает список заказов в работе.

```json
{}
```

`GET` `/api/vehicles/1` -> `200`  
Что делает: читает машину заказа.

```json
{}
```

`GET` `/api/parts?articleNumber=90915YZZE1&availableOnly=true` -> `200`  
Что делает: проверяет локальный склад.

```json
{}
```

`GET` `/api/orders/1/parts` -> `200`  
Что делает: смотрит детали заказа.

```json
{}
```

`POST` `/api/orders/1/parts` -> `201`  
Что делает: добавляет уже существующую деталь в заказ.

```json
{
  "partId": 1,
  "quantity": 1
}
```

`PUT` `/api/orders/1/parts/1` -> `200`  
Что делает: меняет количество детали в заказе.

```json
{
  "quantity": 2
}
```

`DELETE` `/api/orders/1/parts/1` -> `204`  
Что делает: удаляет деталь из заказа.

```json
{}
```

`GET` `/api/parts/catalog/manufacturers?type=PC&popular=true` -> `200` or `4xx/5xx`  
Что делает: стартует подбор детали через каталог.

```json
{}
```

`GET` `/api/orders/1/parts/catalog/product-groups/search?query=масляный%20фильтр` -> `200` or `409`  
Что делает: ищет группу детали для машины заказа.

```json
{}
```

`GET` `/api/orders/1/parts/catalog/articles?productGroupIds=7&limit=10` -> `200` or `409`  
Что делает: получает артикулы для выбранной группы.

```json
{}
```

`PUT` `/api/orders/1/estimate` -> `200`  
Что делает: обновляет смету по работам.

```json
{
  "laborTotal": 2500.00,
  "discountAmount": 0.00
}
```

`PUT` `/api/orders/1/status` -> `200`  
Что делает: меняет статус заказа.

```json
{
  "status": "IN_PROGRESS"
}
```

### Forbidden

`POST` `/api/customers` -> `403`  
Что делает: проверяет, что механик не может создавать клиентов.

```json
{
  "firstName": "Blocked",
  "lastName": "Mechanic",
  "phoneNumber": "+79990000000",
  "email": "blocked.mechanic@example.com"
}
```

`POST` `/api/orders` -> `403`  
Что делает: проверяет, что механик не может создавать заказ.

```json
{
  "customerId": 1,
  "vehicleId": 1,
  "employeeId": 1,
  "problem": "Should be forbidden"
}
```

`GET` `/api/procurement/supplier-quotes/search?query=90915YZZE1` -> `403`  
Что делает: проверяет, что механик не может идти в procurement.

```json
{}
```

`POST` `/api/parts` -> `403`  
Что делает: проверяет, что механик не может создавать локальную деталь.

```json
{
  "brand": "TEST",
  "name": "Blocked part",
  "articleNumber": "BLOCKED-1",
  "cost": 100.00
}
```

`PUT` `/api/orders/1/loyalty/spend` -> `403`  
Что делает: проверяет, что механик не может списывать баллы.

```json
{
  "points": 100
}
```
