# Подробный план на День 13: 21 апреля 2026

Тема дня: `Интеграция Core <-> Auth: JWT проверка, роли в Core`  
Плановая нагрузка: `10 часов`  
Затрагиваемые проекты:
- `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core`
- `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth`

## Основа плана

- `ContextProject/Now/FULL_PLAN_TO_2026-05-01.md`
- `ContextProject/Now/DEVELOPMENT_ROADMAP.md`
- `ContextProject/Now/DAY_2_2026-04-10_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_3_2026-04-11_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_10_2026-04-18_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_11_2026-04-19_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_12_2026-04-20_DETAILED_PLAN.md`
- `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/ContextProject/Now/DAY_2_2026-04-10_IMPLEMENTATION_RESULT.md`
- фактический код `Core` и `AuthService` на момент подготовки плана.

## Почему этот день важен

По полному календарю проекта `AuthService` должен уметь выдавать JWT, роли и проверять токены, а `Core` должен перестать быть открытым API. В `FULL_PLAN_TO_2026-05-01.md` цель к 1 мая включает `AuthService` с `JWT access/refresh`, ролями и проверкой токенов, а день `21.04` прямо выделен под интеграцию `Core <-> Auth`.

До этого момента `Core` сознательно развивался как бизнес-ядро без полноценной security-интеграции. Это было правильно для быстрых доменных вертикалей, но теперь наружные клиенты должны ходить в `Core` только с `Authorization: Bearer <accessToken>`, а `Core` должен понимать:
- кто пользователь;
- какие у него роли;
- можно ли ему выполнять конкретную операцию;
- что делать с истекшим, отозванным или невалидным токеном.

## Главная цель дня

Сделать рабочую интеграцию `Core` с отдельным микросервисом `AuthService`, при которой:
- `AuthService` остается владельцем пользователей, паролей, refresh token, blacklist и auth-решений;
- `Core` не хранит пользователей Auth в своей БД и не читает `auth_db` напрямую;
- `Core` принимает `Bearer access token`, проверяет его через `AuthService`, создает локальный `Authentication` в Spring Security и применяет role-based access control;
- все существующие бизнес-модули `Core` продолжают работать, но уже под ролями.

## Главный результат дня

К концу дня должен быть готов не "набор security-классов", а проверяемый поток:

```text
User/Web/Android
  -> POST /api/auth/login
  -> получает accessToken + roles
  -> вызывает Core API с Authorization: Bearer <accessToken>
  -> Core вызывает AuthService /api/auth/validate
  -> Core получает userId/email/roles/jti/expiresAt
  -> Core применяет RBAC
  -> Core возвращает 200/201 либо 401/403
```

После `logout` в `AuthService` тот же access token больше не должен проходить в `Core`, потому что `AuthService` проверяет blacklist.

## Что не делаем в День 13

- Не строим OAuth2 Authorization Server.
- Не внедряем Keycloak.
- Не делаем OpenID Connect discovery/JWKS.
- Не делаем сложный ABAC или permission table на каждое действие.
- Не делаем UI управления пользователями и ролями.
- Не переносим пользователей Auth в БД Core.
- Не добавляем foreign key из `core_db` в `auth_db`.
- Не делаем customer-user binding для клиентского личного кабинета. Это отдельный шаг для Web/Android MVP.
- Не закрываем интеграцию `Core <-> FileStorage`. Она по календарю идет 23.04.
- Не публикуем Kafka events. Это отдельный день 22.04.

## Фактическое состояние перед стартом

### Core

- В `Core` уже подключен `spring-boot-starter-security` в `build.gradle`, значит фундаментальная зависимость есть и ее не нужно добавлять заново.
- Текущий `SecurityConfiguration` отключает CSRF/basic/form login, делает stateless-сессию, но разрешает все запросы через `authorize.anyRequest().permitAll()`. Это главный файл, который нужно заменить на реальную security-политику: [SecurityConfiguration.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:13).
- В `application.properties` пока есть настройки БД, Redis, Kafka, MinIO, UMAPI и Carreta, но нет настроек `AuthService`: [application.properties](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/resources/application.properties:1).
- `Core` уже имеет публичные контроллеры для клиентов, автомобилей, заказов, запчастей, закупок и лояльности. Например, `CustomerController` открыт на `/api/customers`: [CustomerController.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/java/com/vladko/autoshopcore/client/controller/CustomerController.java:15), `OrderController` открыт на `/api/orders`: [OrderController.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/java/com/vladko/autoshopcore/order/controller/OrderController.java:19), `PartController` открыт на `/api/parts`: [PartController.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/java/com/vladko/autoshopcore/parts/controller/PartController.java:24).
- В `GlobalExceptionHandler` уже унифицированы бизнес-ошибки, но security-ошибки `401/403` должны обрабатываться не как обычные доменные исключения, а через `AuthenticationEntryPoint` и `AccessDeniedHandler`: [GlobalExceptionHandler.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/main/java/com/vladko/autoshopcore/shared/exception/GlobalExceptionHandler.java:36).
- В `docker-compose.yml` в Core есть инфраструктура Postgres/Redis/Kafka/MinIO/Mailhog, но самого `AuthService` там нет: [docker-compose.yml](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/docker-compose.yml:1).
- Множество controller-тестов сейчас используют `@AutoConfigureMockMvc(addFilters = false)`, например `OrderControllerTest`: [OrderControllerTest.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core/src/test/java/com/vladko/autoshopcore/order/controller/OrderControllerTest.java:36). Их не надо ломать ради security; лучше добавить отдельные security-тесты.

### AuthService

- `AuthService` уже работает как отдельный Spring Boot проект на порту `8082`: [application.yml](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/resources/application.yml:1).
- В Auth уже есть публичные endpoint-ы `register`, `login`, `refresh` и защищенные `logout`, `validate`: [AuthController.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/controller/AuthController.java:22).
- `login` и `refresh` возвращают `accessToken`, `refreshToken`, `tokenType`, TTL, `userId`, `email`, `roles`: [AuthResponse.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/dto/AuthResponse.java:5).
- Access JWT содержит `jti`, `sub=userId`, `email`, `roles`, `type=access`, `iat`, `exp`: [JwtService.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/security/JwtService.java:32).
- `JwtAuthenticationFilter` AuthService проверяет подпись, blacklist, существование и активность пользователя, затем создает principal с ролями: [JwtAuthenticationFilter.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/security/JwtAuthenticationFilter.java:53).
- `/api/auth/validate` возвращает `TokenValidationResponse` с `valid`, `userId`, `email`, `roles`, `tokenType`, `jti`, `expiresAt`, `message`: [TokenValidationResponse.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/dto/TokenValidationResponse.java:6).
- При невалидном токене именно для `/api/auth/validate` AuthService возвращает `401` и тело `TokenValidationResponse.invalid(...)`: [RestAuthenticationEntryPoint.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/security/RestAuthenticationEntryPoint.java:35).
- Роли уже зафиксированы как `ADMIN`, `MANAGER`, `MECHANIC`, `RECEPTIONIST`, `CLIENT`: [RoleName.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/role/entity/RoleName.java:3), seed ролей есть в Liquibase: [002-seed-roles.yaml](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/resources/db/changelog/changes/002-seed-roles.yaml:1).
- В Auth уже есть интеграционные тесты на login, refresh, validate, logout, inactive user: [AuthControllerIntegrationTest.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/test/java/com/vladko/autoshopauth/auth/AuthControllerIntegrationTest.java:51).
- Есть dev/test bootstrap одного пользователя с настраиваемой ролью, но нет удобного seed-набора пользователей для всех ролей: [BootstrapUserInitializer.java](/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth/src/main/java/com/vladko/autoshopauth/config/BootstrapUserInitializer.java:18).

## Архитектурное решение дня

### Выбранный подход

Для MVP День 13 выбираем удаленную проверку access token через `AuthService`:

```text
Core receives Authorization: Bearer xxx
Core -> AuthService POST /api/auth/validate with the same Authorization header
AuthService validates signature + exp + token type + blacklist + active user
Core trusts only successful AuthService response
```

### Почему не локальная JWT-проверка в Core

Локальная проверка JWT в Core быстрее, но в текущем проекте она хуже закрывает MVP-требования:
- Core пришлось бы знать `JWT_SECRET`, что размазывает auth-секрет по сервисам.
- Core не увидел бы logout blacklist без отдельного Redis-контракта.
- Core не увидел бы деактивацию пользователя до истечения access token.
- При изменении claims пришлось бы синхронно менять два сервиса.

### Почему не гибрид в День 13

Гибрид `локальная проверка подписи + периодическая проверка AuthService` можно сделать позже. В День 13 важнее получить корректность, предсказуемые `401/403` и интеграционный smoke. Перформанс-оптимизация через cache допустима позже, когда появятся реальные нагрузки.

### Правило отказа

Если `AuthService` недоступен, `Core` не должен пропускать запрос как anonymous. Для защищенных endpoint-ов это должно быть:
- `503 Service Unavailable`, если Auth недоступен или вернул 5xx;
- `401 Unauthorized`, если token отсутствует, истек, отозван или невалиден;
- `403 Forbidden`, если token валиден, но роли недостаточно.

## Целевой контракт Core -> Auth

### Request

```http
POST /api/auth/validate HTTP/1.1
Host: localhost:8082
Authorization: Bearer <access-token>
```

Тело запроса не нужно. Токен передается только через `Authorization` header.

### Success response

```json
{
  "valid": true,
  "userId": 1,
  "email": "manager@autoshop.local",
  "roles": ["MANAGER"],
  "tokenType": "access",
  "jti": "9d6f2b5a-...",
  "expiresAt": "2026-04-21T09:15:00Z",
  "message": null
}
```

### Invalid response

AuthService сейчас возвращает `401` и тело:

```json
{
  "valid": false,
  "userId": null,
  "email": null,
  "roles": null,
  "tokenType": null,
  "jti": null,
  "expiresAt": null,
  "message": "Access token is invalid"
}
```

Core должен корректно обработать оба варианта:
- `200 + valid=true` -> создать authenticated principal;
- `401 + valid=false` -> вернуть клиенту `401`;
- `401` с обычным `ErrorResponse` -> вернуть клиенту `401`;
- `503/5xx/timeout` -> вернуть клиенту `503`.

### Principal внутри Core

В Core нужен локальный principal, не JPA entity:

```java
public record AuthenticatedUser(
    Long userId,
    String email,
    Set<String> roles,
    String jti,
    Instant expiresAt
) {}
```

Authorities в Spring Security:

```text
ROLE_ADMIN
ROLE_MANAGER
ROLE_MECHANIC
ROLE_RECEPTIONIST
ROLE_CLIENT
```

## RBAC-матрица для Core

### Базовые правила

- `ADMIN` может все внутри Core.
- `MANAGER` может управлять клиентами, авто, заказами, сметами, складом, закупками и лояльностью.
- `RECEPTIONIST` может создавать и обновлять клиентов/авто/заказы, смотреть каталог и списки, но не должен создавать реальные заказы поставщику и управлять складовыми остатками.
- `MECHANIC` может смотреть назначенные/рабочие данные, обновлять статус работ, работать с деталями заказа и каталогом, но не должен удалять клиентов, менять складовые остатки напрямую или создавать закупочные заказы.
- `CLIENT` пока не получает доступ к текущим Core endpoint-ам, потому что в Core еще нет связки `auth.userId -> customerId`. Клиентский "мой гараж" нужно добавить отдельно для Android/Web MVP.

### Endpoint matrix MVP

| Зона Core | Endpoint-ы | Роли |
|---|---|---|
| Health | `GET /actuator/health` | public |
| Customers read/search | `GET /api/customers/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Customers create/update | `POST/PUT /api/customers/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Customers delete | `DELETE /api/customers/**` | `ADMIN`, `MANAGER` |
| Vehicles read/search | `GET /api/vehicles/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Vehicles create/update/catalog-link | `POST/PUT/DELETE /api/vehicles/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Orders read | `GET /api/orders/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Orders create/update | `POST /api/orders`, `PUT /api/orders/{id}` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Orders assign | `PUT /api/orders/{id}/assign` | `ADMIN`, `MANAGER` |
| Orders estimate | `PUT /api/orders/{id}/estimate` | `ADMIN`, `MANAGER`, `MECHANIC` |
| Orders status | `PUT /api/orders/{id}/status` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Order parts read | `GET /api/orders/{orderId}/parts` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Order parts mutate | `POST/PUT/DELETE /api/orders/{orderId}/parts/**` | `ADMIN`, `MANAGER`, `MECHANIC` |
| Local parts read/search | `GET /api/parts`, `GET /api/parts/{id}` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Local parts mutate | `POST/PUT/DELETE /api/parts/**` | `ADMIN`, `MANAGER` |
| External parts/catalog search | `GET /api/parts/external/**`, `GET /api/parts/catalog/**`, `GET /api/orders/{orderId}/parts/catalog/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC` |
| Supplier quotes search | `GET /api/procurement/supplier-quotes/search` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Purchase orders | `POST /api/procurement/purchase-orders` | `ADMIN`, `MANAGER` |
| Stock receipts | `POST /api/procurement/stock-receipts` | `ADMIN`, `MANAGER` |
| Loyalty read | `GET /api/loyalty/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |
| Loyalty spend/cancel on order | `PUT/DELETE /api/orders/{orderId}/loyalty/**` | `ADMIN`, `MANAGER`, `RECEPTIONIST` |

Если правило трудно выразить только через path + method, допустимо поставить coarse-grained правило в `SecurityConfiguration`, а точечное ограничение вынести в `@PreAuthorize` на метод контроллера.

## План изменений в AuthService

### Блок A1. Утренний аудит Auth-контракта

Время: `30-45 минут`

Что проверить:
- `./gradlew test` в `autoshop-auth`.
- `POST /api/auth/login` возвращает roles и access token.
- `POST /api/auth/validate` работает с `Authorization: Bearer`.
- `POST /api/auth/logout` заносит `jti` в blacklist.
- После logout `/api/auth/validate` возвращает `401` и `valid=false`.
- Неактивный пользователь не проходит validate.

Что должно получиться:
- Есть уверенность, что Core можно интегрировать не с моковым Auth, а с реальным контрактом.

### Блок A2. Зафиксировать и немного усилить публичный auth-контракт

Время: `1-1.5 часа`

Изменения:
- Оставить `POST /api/auth/validate` как основной service-to-service endpoint.
- Добавить совместимый alias `POST /api/auth/verify-token`, потому что roadmap ранее упоминал `verify-token`. Alias должен использовать ту же логику, что `/validate`, без дублирования бизнес-кода.
- Добавить `GET /api/auth/me` для будущих Web/Android MVP. Endpoint возвращает текущего пользователя по access token:
  - `userId`
  - `email`
  - `roles`
  - `expiresAt`
- Не менять формат `AuthResponse`, чтобы не ломать уже покрытые login/refresh тесты.
- Не переименовывать `roles` и не добавлять префикс `ROLE_` в JWT. JWT хранит бизнес-роли (`MANAGER`), а `ROLE_` добавляется только внутри Spring Security.

Файлы:
- `autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/controller/AuthController.java`
- `autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/service/AuthService.java`
- новый DTO при необходимости: `auth/dto/CurrentUserResponse.java`
- `autoshop-auth/src/test/java/com/vladko/autoshopauth/auth/AuthControllerIntegrationTest.java`

Acceptance:
- `/api/auth/validate` продолжает проходить существующие тесты.
- `/api/auth/verify-token` возвращает тот же успешный payload.
- `/api/auth/me` возвращает данные authenticated principal.
- Без токена `/api/auth/me` возвращает `401`.

### Блок A3. Подготовить dev-пользователей для всех ролей

Время: `1 час`

Проблема:
- Сейчас регистрация создает только `CLIENT`.
- Для ручного smoke Core нужны токены `MANAGER`, `MECHANIC`, `RECEPTIONIST`, желательно `ADMIN`.
- Текущий `BootstrapUserInitializer` умеет создать одного пользователя с одной ролью.

MVP-решение:
- Не делать admin API управления ролями.
- Добавить dev/test bootstrap seed для нескольких пользователей, включаемый только в `dev`/`test` профиле.
- Минимальный набор:
  - `admin@autoshop.local` / `Admin123!` / `ADMIN`
  - `manager@autoshop.local` / `Manager123!` / `MANAGER`
  - `reception@autoshop.local` / `Reception123!` / `RECEPTIONIST`
  - `mechanic@autoshop.local` / `Mechanic123!` / `MECHANIC`
  - `client@autoshop.local` / `Client123!` / `CLIENT`

Варианты реализации:
- Консервативно: расширить `AppBootstrapProperties` списком users.
- Быстро для MVP: оставить существующий single bootstrap и добавить отдельный `DevUsersInitializer` под профилем `dev/test`.

Предпочтительно:
- `DevUsersInitializer` или расширенный bootstrap с явным `enabled`.
- Пароли только для local/dev, не для prod.

Acceptance:
- В `test` профиле можно получить токен для каждой роли.
- В `prod` профиле dev-users не создаются.
- Тест фиксирует, что минимум manager/mechanic/receptionist доступны в dev/test bootstrap.

### Блок A4. Обновить документацию AuthService

Время: `30 минут`

Что зафиксировать:
- порт `8082`;
- base URL для Core: `http://localhost:8082`;
- endpoint проверки: `POST /api/auth/validate`;
- alias: `POST /api/auth/verify-token`;
- token claims;
- роли;
- dev-users;
- ручной smoke login/validate/logout.

Где:
- если в Auth есть README - обновить README;
- если README нет, добавить краткий `ContextProject/Now/AUTH_CORE_INTEGRATION_CONTRACT.md` или секцию в существующий context-файл.

## План изменений в Core

### Блок C1. Добавить конфигурацию интеграции с AuthService

Время: `45-60 минут`

Добавить свойства:

```properties
app.auth.base-url=${APP_AUTH_BASE_URL:http://localhost:8082}
app.auth.validate-path=${APP_AUTH_VALIDATE_PATH:/api/auth/validate}
app.auth.connect-timeout=${APP_AUTH_CONNECT_TIMEOUT:1s}
app.auth.read-timeout=${APP_AUTH_READ_TIMEOUT:2s}
app.auth.enabled=${APP_AUTH_ENABLED:true}
```

Файлы:
- `src/main/resources/application.properties`
- `src/main/resources/application-local.properties.example`
- `src/main/resources/application-prod.properties`
- новый класс `AuthServiceProperties`.

Package:

```text
src/main/java/com/vladko/autoshopcore/security/
  AuthServiceProperties.java
```

Acceptance:
- Core стартует с дефолтным `APP_AUTH_BASE_URL`.
- Значения можно переопределить через env.
- В тестах можно заменить клиент AuthService mock-реализацией.

### Блок C2. Реализовать Core client для AuthService

Время: `1.5-2 часа`

Добавить:

```text
src/main/java/com/vladko/autoshopcore/security/
  AuthServiceClient.java
  RestClientAuthServiceClient.java
  AuthTokenValidationResponse.java
  AuthenticatedUser.java
  AuthServiceUnavailableException.java
  InvalidAccessTokenException.java
```

Поведение `AuthServiceClient`:
- принимает raw access token без префикса `Bearer`;
- вызывает `POST {baseUrl}{validatePath}`;
- добавляет `Authorization: Bearer <token>`;
- не передает тело;
- на `200 valid=true` возвращает `AuthenticatedUser`;
- на `200 valid=false` или `401` бросает `InvalidAccessTokenException`;
- на `403` тоже трактует как invalid/auth failure;
- на timeout, connection refused, `5xx` бросает `AuthServiceUnavailableException`;
- не логирует raw token;
- не кладет token в exception message.

Таймауты:
- connect: `1s`;
- read: `2s`;
- для локального MVP этого достаточно, чтобы зависший Auth не подвешивал Core надолго.

Acceptance:
- Unit test с mock HTTP server проверяет happy path.
- Unit test проверяет invalid token.
- Unit test проверяет unavailable/timeout.
- В логах не появляется raw JWT.

### Блок C3. Реализовать Bearer token filter в Core

Время: `1.5 часа`

Добавить:

```text
src/main/java/com/vladko/autoshopcore/security/
  BearerTokenAuthenticationFilter.java
  CoreAuthenticationEntryPoint.java
  CoreAccessDeniedHandler.java
```

Поведение filter:
- если endpoint public, filter не обязан дергать AuthService;
- если нет `Authorization`, оставить context пустым и дать Spring Security вернуть `401`;
- если header не начинается с `Bearer `, вернуть `401`;
- если `Bearer` пустой, вернуть `401`;
- если токен есть, вызвать `AuthServiceClient`;
- при успехе создать `UsernamePasswordAuthenticationToken`:
  - principal = `AuthenticatedUser`;
  - credentials = `null`;
  - authorities = `ROLE_` + role;
- положить authentication в `SecurityContextHolder`;
- при invalid token очистить context и вернуть `401`;
- при unavailable вернуть `503`;
- не продолжать filter chain после auth failure.

Формат ошибок Core:

```json
{
  "timestamp": "...",
  "status": 401,
  "error": "Unauthorized",
  "message": "Access token is invalid",
  "path": "/api/orders"
}
```

Для `403`:

```json
{
  "timestamp": "...",
  "status": 403,
  "error": "Forbidden",
  "message": "Access denied",
  "path": "/api/procurement/purchase-orders"
}
```

Для `503`:

```json
{
  "timestamp": "...",
  "status": 503,
  "error": "Service Unavailable",
  "message": "Authentication service is unavailable",
  "path": "/api/orders"
}
```

Acceptance:
- No token на protected endpoint -> `401`.
- Invalid token -> `401`.
- AuthService down -> `503`.
- Valid token создает principal с ролями.

### Блок C4. Заменить permitAll на реальный SecurityFilterChain

Время: `1-1.5 часа`

Изменить `SecurityConfiguration`:
- оставить `csrf.disable`;
- оставить stateless;
- оставить `httpBasic` и `formLogin` выключенными;
- подключить `CoreAuthenticationEntryPoint`;
- подключить `CoreAccessDeniedHandler`;
- добавить `BearerTokenAuthenticationFilter` до `UsernamePasswordAuthenticationFilter`;
- разрешить public endpoint-ы:
  - `GET /actuator/health`;
  - возможно `/error`, чтобы Spring корректно формировал ошибки;
- применить RBAC matrix.

Пример направления:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
    .requestMatchers(HttpMethod.POST, "/api/procurement/purchase-orders").hasAnyRole("ADMIN", "MANAGER")
    .requestMatchers("/api/**").authenticated()
    .anyRequest().denyAll()
)
```

Важно:
- Path rules должны быть достаточно явными, чтобы опасные операции не попали под общий `authenticated`.
- Финальный fallback лучше `denyAll`, а не `permitAll`.
- Для сложных случаев использовать `@EnableMethodSecurity` и `@PreAuthorize`.

Acceptance:
- `SecurityConfiguration` больше не содержит `anyRequest().permitAll()`.
- Public health доступен без токена.
- Любой `/api/**` требует валидный access token.
- Недостаточная роль получает `403`.

### Блок C5. Разложить роли по контроллерам и методам

Время: `1.5-2 часа`

Минимальный путь:
- Основную RBAC matrix реализовать в `SecurityConfiguration` через `requestMatchers`.
- Для точечных операций, которые трудно выразить path-ом, добавить `@PreAuthorize`.

Контроллеры для проверки:
- `CustomerController`
- `VehicleController`
- `OrderController`
- `PartController`
- `OrderPartItemController`
- `CatalogPartSearchController`
- `ExternalPartSearchController`
- `OrderCatalogPartSearchController`
- `SupplierQuoteController`
- `PurchaseOrderController`
- `StockReceiptController`
- `LoyaltyController`
- `OrderLoyaltyController`

Особенно важно закрыть:
- `POST /api/procurement/purchase-orders` только `ADMIN/MANAGER`, потому что Day 10 уже фиксировал, что реальный заказ поставщику должен быть доступен только manager/admin.
- `PUT /api/parts/{id}/stock` только `ADMIN/MANAGER`.
- `DELETE /api/customers/**`, `DELETE /api/vehicles/**`, `DELETE /api/parts/**` только `ADMIN/MANAGER`.
- `PUT /api/orders/{id}/assign` только `ADMIN/MANAGER`.

Acceptance:
- Каждая зона Core из RBAC matrix покрыта правилом.
- Нет случайно открытого `/api/**`.
- `CLIENT` не проходит в текущие staff endpoint-ы.

### Блок C6. Обновить тесты Core под security

Время: `2 часа`

Не нужно переписывать все старые controller-тесты. Они проверяют DTO/валидацию/business mapping и могут оставаться с `addFilters=false`.

Добавить отдельные security-тесты:

```text
src/test/java/com/vladko/autoshopcore/security/
  AuthServiceClientTest.java
  CoreSecurityIntegrationTest.java
```

Что покрыть:
- `GET /actuator/health` без токена -> `200` или корректный health status.
- `GET /api/customers/search` без токена -> `401`.
- `GET /api/customers/search` с invalid token -> `401`.
- `GET /api/customers/search` с `MANAGER` -> не `401/403`.
- `POST /api/customers` с `CLIENT` -> `403`.
- `PUT /api/orders/10/status` с `MECHANIC` -> проходит security.
- `POST /api/procurement/purchase-orders` с `MECHANIC` -> `403`.
- `POST /api/procurement/purchase-orders` с `MANAGER` -> проходит security и доходит до controller/service mock.
- AuthService unavailable на protected endpoint -> `503`.
- После logout smoke: тот же token через Core -> `401` (это можно оставить для ручного/e2e smoke, если сложно автоматизировать между двумя приложениями в один день).

Технический подход:
- Для `AuthServiceClientTest` использовать mock HTTP server или mock `RestClient` infrastructure.
- Для `CoreSecurityIntegrationTest` поднять Spring context с mocked `AuthServiceClient`.
- Не использовать реальные JWT внутри Core tests, потому что Core не должен парсить JWT.
- Mock должен возвращать `AuthenticatedUser` с разными ролями.

Acceptance:
- `./gradlew test` в Core проходит.
- Старые controller/service/repository tests не сломаны.
- Новые security-тесты доказывают `401/403/503`.

### Блок C7. Обновить конфиги запуска и локальный smoke

Время: `45-60 минут`

Core:
- добавить `APP_AUTH_BASE_URL` в local example;
- при необходимости добавить note в README/context;
- если используется общий docker-compose, записать, что Auth пока стартует как отдельный Gradle app на `8082`, а Core ходит в него по `http://localhost:8082`.

Auth:
- убедиться, что `AuthService` local profile/dev profile использует правильную БД и Redis;
- проверить, что Redis общий или доступный AuthService для blacklist.

Smoke commands:

```bash
# Terminal 1: infrastructure from autoshop-core
docker compose up -d postgres redis

# Terminal 2: Auth
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
./gradlew bootRun --args='--spring.profiles.active=dev'

# Terminal 3: Core
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
./gradlew bootRun --args='--spring.profiles.active=local'
```

Login:

```bash
curl -s -X POST http://localhost:8082/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"manager@autoshop.local","password":"Manager123!"}'
```

Core without token:

```bash
curl -i http://localhost:8080/api/customers/search
```

Expected:

```text
HTTP/1.1 401
```

Core with manager token:

```bash
curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected:

```text
HTTP/1.1 200
```

Core forbidden check with client token:

```bash
curl -i -X POST http://localhost:8080/api/procurement/purchase-orders \
  -H "Authorization: Bearer $CLIENT_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{...}'
```

Expected:

```text
HTTP/1.1 403
```

Logout invalidation:

```bash
curl -i -X POST http://localhost:8082/api/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"'"$REFRESH_TOKEN"'"}'

curl -i http://localhost:8080/api/customers/search \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected:

```text
HTTP/1.1 401
```

## Детальный порядок работы на 10 часов

### 0. Подготовка

Время: `15 минут`

- Проверить `git status` в обоих проектах.
- Запустить быстрый тест Auth, если время позволяет.
- Запустить быстрый тест Core, если время позволяет.
- Не начинать с рефакторинга пакетов.

### 1. Auth contract hardening

Время: `2 часа`

- Добавить `/api/auth/verify-token` alias.
- Добавить `/api/auth/me`.
- Добавить dev/test users для ролей или зафиксировать другой быстрый способ получать role tokens.
- Дотестировать Auth.

### 2. Core Auth client

Время: `2 часа`

- Добавить properties.
- Добавить DTO/principal.
- Добавить RestClient-based Auth client.
- Добавить unit tests на response/status mapping.

### 3. Core filter + error handlers

Время: `1.5 часа`

- Добавить Bearer filter.
- Добавить `AuthenticationEntryPoint`.
- Добавить `AccessDeniedHandler`.
- Проверить, что ошибки выглядят как остальные JSON-ошибки Core.

### 4. Core RBAC

Время: `1.5 часа`

- Заменить `permitAll`.
- Реализовать RBAC matrix.
- Проверить самые опасные endpoint-ы:
  - purchase order;
  - stock update;
  - deletes;
  - order assign;
  - loyalty spend.

### 5. Core security tests

Время: `1.5 часа`

- Добавить dedicated security integration tests.
- Не переписывать старые controller tests без необходимости.
- Добиться прохождения `./gradlew test`.

### 6. Integrated smoke

Время: `1 час`

- Поднять Redis/Postgres.
- Поднять Auth.
- Поднять Core.
- Проверить login -> Core request -> forbidden -> logout -> Core invalid.

### 7. Документация и фиксация результата

Время: `30 минут`

- Обновить context/README с:
  - auth base url;
  - validate endpoint;
  - роли;
  - RBAC matrix;
  - smoke commands;
  - known limitations.
- Зафиксировать, что `CLIENT` пока не имеет customer-scoped доступа в Core.

## Definition of Done на День 13

День считается завершенным, если выполнено все:

- AuthService тесты проходят.
- Core тесты проходят.
- Core больше не содержит `anyRequest().permitAll()` для `/api/**`.
- `GET /actuator/health` доступен без токена.
- Любой бизнес endpoint `/api/**` без токена возвращает `401`.
- Невалидный/отозванный access token возвращает `401`.
- Валидный access token от AuthService создает authenticated principal в Core.
- Роли из AuthService превращаются в Spring authorities в Core.
- Недостаточная роль возвращает `403`.
- Недоступный AuthService не открывает доступ, а возвращает `503`.
- `MANAGER` может выполнить рабочий Core сценарий: найти/создать клиента, авто, заказ.
- `MECHANIC` не может создать purchase order.
- `CLIENT` не может пользоваться staff endpoint-ами Core.
- После logout в AuthService старый access token не проходит в Core.
- В конфиге Core есть `APP_AUTH_BASE_URL`.
- В документации есть контракт `Core -> Auth`.

## Acceptance criteria по проектам

### AuthService

- `POST /api/auth/login` возвращает token pair и roles.
- `POST /api/auth/validate` валидирует access token.
- `POST /api/auth/verify-token` работает как alias validate.
- `GET /api/auth/me` возвращает текущего пользователя.
- `POST /api/auth/logout` инвалидирует refresh token и access token через blacklist.
- Тесты покрывают validate/verify-token/me/logout.
- Dev/test окружение позволяет получить токены минимум для `MANAGER`, `MECHANIC`, `CLIENT`.

### Core

- Core умеет вызывать AuthService.
- Core не знает JWT secret.
- Core не парсит JWT claims самостоятельно.
- Core не подключается к `auth_db`.
- Core security filter создает `AuthenticatedUser`.
- Core RBAC matrix применена.
- Core возвращает `401/403/503` предсказуемо.
- Core tests покрывают главные роли и ошибки.

## Риски и меры

### Риск 1. AuthService становится single point of failure

Симптом:
- Auth упал, весь Core возвращает `503`.

Почему это приемлемо в День 13:
- Без Auth нельзя безопасно решать, кто пользователь.
- Пропускать запросы при падении Auth нельзя.

Мера:
- короткие timeout;
- понятный `503`;
- позже можно добавить bounded cache или локальную JWT-проверку с blacklist sync.

### Риск 2. Слишком широкие роли в Core

Симптом:
- `MECHANIC` или `CLIENT` случайно может создать закупочный заказ или удалить клиента.

Мера:
- RBAC matrix до кодинга;
- security tests на forbidden operations;
- fallback `denyAll`.

### Риск 3. Сломаются существующие controller tests

Симптом:
- все WebMvc tests получают `401`.

Мера:
- оставить business controller tests с `addFilters=false`;
- добавить отдельные security tests с filters enabled;
- не смешивать тесты бизнес-валидации и security policy.

### Риск 4. Drift ролей между Auth и Core

Симптом:
- Auth выдает `RECEPTIONIST`, Core не знает роль или наоборот.

Мера:
- в Core не заводить отдельный enum как источник истины, если он не нужен;
- использовать строковые constants в одном месте;
- tests на все роли Auth.

### Риск 5. Logout не инвалидирует Core-доступ

Симптом:
- после logout старый access token продолжает работать в Core.

Причина:
- Core валидирует токен локально или кеширует validate слишком долго.

Мера:
- в День 13 Core всегда дергает AuthService validate;
- не добавлять cache в MVP;
- smoke-test logout -> Core request.

### Риск 6. Токены попадут в логи

Симптом:
- raw JWT в exception/logs.

Мера:
- не логировать Authorization header;
- exception message без token value;
- в debug логах писать только `jti` или `userId`, если реально нужно.

## Что оставить на будущие дни

- Customer-user binding: связать `Auth userId` с `Customer` для `CLIENT`.
- Client-scoped endpoints:
  - `GET /api/me/vehicles`
  - `GET /api/me/orders`
  - `GET /api/me/loyalty`
- Role management API для администратора.
- Audit fields в Core:
  - `createdByUserId`
  - `updatedByUserId`
  - `statusChangedByUserId`
- Service-to-service auth для будущих `NotificationService` и `FileStorageService`.
- Cache/introspection optimization для Core Auth client.
- CORS policy для Web MVP.
- Docker Compose, который поднимает Core + Auth + shared infra одной командой.

## Итоговая формула дня

День 13 должен перевести систему из состояния:

```text
Core has business API, Auth has tokens, but they live separately
```

в состояние:

```text
Auth owns identity and token validity
Core owns business data and role-based business access
Clients can safely call Core only through Bearer JWT
```

Это обязательный мост перед Web MVP, Android MVP, Kafka events и FileStorage-интеграцией.
