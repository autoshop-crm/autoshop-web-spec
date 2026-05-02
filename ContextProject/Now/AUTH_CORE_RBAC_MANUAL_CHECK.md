# Ручная проверка AuthService <-> Core RBAC

Цель документа: наглядно проверить, что `AuthService` и `Core` реально работают вместе, а все типы пользователей получают правильный доступ.

Проверяемая связка:

```text
AuthService login/register
  -> accessToken
  -> Core API with Authorization: Bearer <accessToken>
  -> Core calls AuthService /api/auth/validate
  -> Core applies role-based access
  -> 200/201, 401, 403
```

## 1. Что должно быть запущено

### Инфраструктура

Из проекта `autoshop-core`:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
docker compose up -d postgres redis
```

Если БД `auth_db` еще не создана:

```bash
docker exec autoshop-postgres psql -U autoshop-admin -d postgres -c "CREATE DATABASE auth_db;"
```

Если команда вернула ошибку, что база уже существует, это нормально.

### AuthService

В отдельном терминале:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth

DB_URL=jdbc:postgresql://localhost:5433/auth_db \
DB_USERNAME=autoshop-admin \
DB_PASSWORD=pass \
./gradlew bootRun --args='--spring.profiles.active=dev'
```

AuthService должен подняться на:

```text
http://localhost:8082
```

### Core

В отдельном терминале:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
./gradlew bootRun --args='--spring.profiles.active=local'
```

Core должен подняться на:

```text
http://localhost:8080
```

## 2. Dev-пользователи

В `dev/test` профиле AuthService автоматически создает пользователей:

| Роль | Email | Password |
|---|---|---|
| `ADMIN` | `admin@autoshop.local` | `Admin123!` |
| `MANAGER` | `manager@autoshop.local` | `Manager123!` |
| `RECEPTIONIST` | `reception@autoshop.local` | `Reception123!` |
| `MECHANIC` | `mechanic@autoshop.local` | `Mechanic123!` |
| `CLIENT` | `client@autoshop.local` | `Client123!` |

Отдельно можно зарегистрировать нового пользователя через `/api/auth/register`, но он получит роль `CLIENT`.

## 3. Быстрая проверка, что сервисы живы

Core health без токена:

```bash
curl -i http://localhost:8080/actuator/health
```

Ожидаемо:

```text
HTTP/1.1 200
```

Core business endpoint без токена:

```bash
curl -i http://localhost:8080/api/customers/search
```

Ожидаемо:

```text
HTTP/1.1 401
```

Это значит, что Core больше не открыт публично.

## 4. Как получить access token

Шаблон login:

```bash
curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@autoshop.local","password":"Manager123!"}'
```

Удобно сохранить токены в shell-переменные.

### MANAGER token

```bash
MANAGER_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@autoshop.local","password":"Manager123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

### ADMIN token

```bash
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@autoshop.local","password":"Admin123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

### RECEPTIONIST token

```bash
RECEPTIONIST_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"reception@autoshop.local","password":"Reception123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

### MECHANIC token

```bash
MECHANIC_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mechanic@autoshop.local","password":"Mechanic123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

### CLIENT token

```bash
CLIENT_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"client@autoshop.local","password":"Client123!"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

Проверить, что токен получен:

```bash
echo "$MANAGER_TOKEN"
```

Если пусто, значит login не прошел. Нужно смотреть лог AuthService и правильность БД/профиля.

## 5. Проверка AuthService validate/me

Проверить, что AuthService сам валидирует токен:

```bash
curl -i -X POST http://localhost:8082/api/auth/validate \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 200
```

В body должно быть:

```json
{
  "valid": true,
  "email": "manager@autoshop.local",
  "roles": ["MANAGER"]
}
```

Проверить `/me`:

```bash
curl -i http://localhost:8082/api/auth/me \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 200
```

## 6. Главная матрица проверки ролей

| Проверка | ADMIN | MANAGER | RECEPTIONIST | MECHANIC | CLIENT |
|---|---:|---:|---:|---:|---:|
| `GET /api/customers/search` | `200` | `200` | `200` | `403` | `403` |
| `POST /api/customers` | `201` | `201` | `201` | `403` | `403` |
| `GET /api/vehicles/customer/1` | `200/404` | `200/404` | `200/404` | `200/404` | `403` |
| `POST /api/vehicles` | `201` | `201` | `201` | `403` | `403` |
| `GET /api/parts` | `200` | `200` | `200` | `200` | `403` |
| `POST /api/parts` | `201` | `201` | `403` | `403` | `403` |
| `PUT /api/orders/1/status` | `200/404` | `200/404` | `200/404` | `200/404` | `403` |
| `PUT /api/orders/1/assign` | `200/404` | `200/404` | `403` | `403` | `403` |
| `POST /api/procurement/purchase-orders` | `201/502` | `201/502` | `403` | `403` | `403` |
| `POST /api/procurement/stock-receipts` | `200` | `200` | `403` | `403` | `403` |

Важно:
- `200/404` означает, что security пропустила запрос, а дальше уже доменная логика могла не найти entity.
- `201/502` для purchase order означает, что security пропустила запрос, но дальше может сработать внешняя Carreta-интеграция или ее config.
- Для проверки RBAC главное отличие: `403` = роль не имеет доступа, `401` = токен отсутствует/невалиден.

## 7. Готовые curl-проверки

### 7.1. Customer search

MANAGER должен пройти:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $MANAGER_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 200
```

MECHANIC не должен пройти:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $MECHANIC_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 403
```

CLIENT не должен пройти:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 403
```

### 7.2. Create customer

RECEPTIONIST должен пройти:

```bash
curl -i -X POST http://localhost:8080/api/customers \
  -H "Authorization: Bearer $RECEPTIONIST_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Test",
    "lastName": "Customer",
    "phoneNumber": "+79990000001",
    "email": "test-customer-1@example.com"
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

CLIENT не должен пройти:

```bash
curl -i -X POST http://localhost:8080/api/customers \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "firstName": "Client",
    "lastName": "Blocked",
    "phoneNumber": "+79990000002",
    "email": "client-blocked@example.com"
  }'
```

Ожидаемо:

```text
HTTP/1.1 403
```

### 7.3. Parts access

MECHANIC может читать parts:

```bash
curl -i http://localhost:8080/api/parts \
  -H "Authorization: Bearer $MECHANIC_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 200
```

MECHANIC не может создавать parts:

```bash
curl -i -X POST http://localhost:8080/api/parts \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "brand": "Bosch",
    "name": "Oil filter",
    "articleNumber": "OF-RBAC-1",
    "cost": 15.50
  }'
```

Ожидаемо:

```text
HTTP/1.1 403
```

MANAGER может создавать parts:

```bash
curl -i -X POST http://localhost:8080/api/parts \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "brand": "Bosch",
    "name": "Oil filter RBAC",
    "articleNumber": "OF-RBAC-2",
    "cost": 15.50
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

### 7.4. Order status

MECHANIC имеет право менять статус заказа:

```bash
curl -i -X PUT http://localhost:8080/api/orders/1/status \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"IN_PROGRESS"}'
```

Ожидаемо:

```text
HTTP/1.1 200
```

или:

```text
HTTP/1.1 404
```

`404` здесь означает, что security пропустила MECHANIC, но заказа `1` нет.

CLIENT не имеет права:

```bash
curl -i -X PUT http://localhost:8080/api/orders/1/status \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"status":"IN_PROGRESS"}'
```

Ожидаемо:

```text
HTTP/1.1 403
```

### 7.5. Purchase order

MECHANIC не может создать закупочный заказ:

```bash
curl -i -X POST http://localhost:8080/api/procurement/purchase-orders \
  -H "Authorization: Bearer $MECHANIC_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "quote": {
      "positionSignature": "manual-check",
      "articleNumber": "OF-RBAC-PO",
      "brand": "Bosch",
      "name": "Oil filter",
      "purchasePrice": 10.00,
      "deliveryDaysMin": 1,
      "deliveryDaysMax": 2,
      "minOrderQuantity": 1,
      "quantityRaw": "10"
    },
    "quantity": 1,
    "salePrice": 15.00,
    "createExternalOrder": false
  }'
```

Ожидаемо:

```text
HTTP/1.1 403
```

MANAGER проходит security:

```bash
curl -i -X POST http://localhost:8080/api/procurement/purchase-orders \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "quote": {
      "positionSignature": "manual-check",
      "articleNumber": "OF-RBAC-PO",
      "brand": "Bosch",
      "name": "Oil filter",
      "purchasePrice": 10.00,
      "deliveryDaysMin": 1,
      "deliveryDaysMax": 2,
      "minOrderQuantity": 1,
      "quantityRaw": "10"
    },
    "quantity": 1,
    "salePrice": 15.00,
    "createExternalOrder": false
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

Если вернулся `502` или `503`, это уже не RBAC, а проблема внешней procurement/Carreta/config части.

## 8. Самостоятельная регистрация пользователя

Можно зарегистрировать нового пользователя:

```bash
curl -i -X POST http://localhost:8082/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "client-demo@example.com",
    "password": "StrongPass123",
    "firstName": "Demo",
    "lastName": "Client"
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

Затем login:

```bash
DEMO_CLIENT_TOKEN=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"client-demo@example.com","password":"StrongPass123"}' \
  | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
```

Проверить роль:

```bash
curl -i http://localhost:8082/api/auth/me \
  -H "Authorization: Bearer $DEMO_CLIENT_TOKEN"
```

Ожидаемо:

```json
"roles":["CLIENT"]
```

Проверить Core:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $DEMO_CLIENT_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 403
```

Это правильно: зарегистрированный пользователь пока является клиентом, а клиентские customer-scoped endpoint-ы еще не реализованы.

## 9. Создание сотрудников через ADMIN

Публичный endpoint `/api/auth/register` всегда создает только `CLIENT`.

Сотрудников нужно создавать через защищенный admin endpoint:

```http
POST /api/admin/users
Authorization: Bearer <ADMIN_TOKEN>
```

Создать механика:

```bash
curl -i -X POST http://localhost:8082/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "mechanic-new@autoshop.local",
    "password": "MechanicPass123!",
    "firstName": "New",
    "lastName": "Mechanic",
    "roles": ["MECHANIC"]
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

Создать менеджера:

```bash
curl -i -X POST http://localhost:8082/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "manager-new@autoshop.local",
    "password": "ManagerPass123!",
    "firstName": "New",
    "lastName": "Manager",
    "roles": ["MANAGER"]
  }'
```

Ожидаемо:

```text
HTTP/1.1 201
```

Проверить, что созданный сотрудник может залогиниться:

```bash
curl -i -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"mechanic-new@autoshop.local","password":"MechanicPass123!"}'
```

Ожидаемо:

```text
HTTP/1.1 200
```

В ответе должны быть:

```json
"roles":["MECHANIC"]
```

MANAGER не может создавать сотрудников:

```bash
curl -i -X POST http://localhost:8082/api/admin/users \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "blocked-mechanic@autoshop.local",
    "password": "MechanicPass123!",
    "roles": ["MECHANIC"]
  }'
```

Ожидаемо:

```text
HTTP/1.1 403
```

Через admin endpoint нельзя создавать `CLIENT`:

```bash
curl -i -X POST http://localhost:8082/api/admin/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "client-from-admin@autoshop.local",
    "password": "ClientPass123!",
    "roles": ["CLIENT"]
  }'
```

Ожидаемо:

```text
HTTP/1.1 400
```

Это сделано специально:

```text
CLIENT -> только публичная регистрация
MANAGER/MECHANIC/RECEPTIONIST/ADMIN -> только ADMIN endpoint
```

## 10. Проверка logout -> Core token invalid

Для logout нужен `refreshToken`, поэтому получим полную пару:

```bash
MANAGER_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@autoshop.local","password":"Manager123!"}')

MANAGER_ACCESS_TOKEN=$(echo "$MANAGER_LOGIN_RESPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
MANAGER_REFRESH_TOKEN=$(echo "$MANAGER_LOGIN_RESPONSE" | sed -n 's/.*"refreshToken":"\([^"]*\)".*/\1/p')
```

До logout Core должен пропустить:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $MANAGER_ACCESS_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 200
```

Logout:

```bash
curl -i -X POST http://localhost:8082/api/auth/logout \
  -H "Authorization: Bearer $MANAGER_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"'"$MANAGER_REFRESH_TOKEN"'"}'
```

Ожидаемо:

```text
HTTP/1.1 200
```

После logout тот же access token в Core:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $MANAGER_ACCESS_TOKEN"
```

Ожидаемо:

```text
HTTP/1.1 401
```

Это самая важная проверка, что Core не валидирует JWT сам, а спрашивает AuthService и видит blacklist.

## 11. Как читать результаты

| HTTP status | Значение |
|---:|---|
| `200` | Запрос разрешен, endpoint отработал |
| `201` | Создание разрешено и прошло |
| `400` | Security пропустила, но request body невалиден |
| `401` | Нет токена, токен невалиден, истек или отозван |
| `403` | Токен валиден, но роль не имеет доступа |
| `404` | Security пропустила, но сущность не найдена |
| `409` | Security пропустила, но бизнес-конфликт |
| `502/503` | Security могла пропустить, но дальше проблема внешнего сервиса/config; либо AuthService недоступен |

Главные признаки, что интеграция работает:

```text
без токена -> 401
CLIENT -> 403 на staff endpoint
MECHANIC -> 200/404 на order status, но 403 на purchase order
RECEPTIONIST -> 200 на customers, но 403 на purchase order
MANAGER -> 200/201 на staff operations
logout -> старый token дает 401 в Core
```
