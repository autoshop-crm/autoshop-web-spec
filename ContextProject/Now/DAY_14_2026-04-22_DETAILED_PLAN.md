# Подробный план на День 14: 22 апреля 2026

Тема дня: **Kafka events из Core: `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_COMPLETED` + получение в NotificationService**.

План учитывает:
- календарный roadmap: `22.04 | 8 | Kafka events из Core (order created/status changed/completed) + получение в Notification`;
- День 11: NotificationService уже должен быть отдельным микросервисом с Kafka consumer, email templates, retry, DLT и idempotency;
- День 13: Core уже интегрирован с AuthService через token validation и RBAC;
- текущие проекты:
  - `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core`;
  - `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth`;
  - `/Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-notification`.

---

## 1. Главная цель дня

К концу Дня 14 система должна пройти реальный локальный сценарий:

```text
Auth login -> Core protected order API -> Core commits order change
  -> Core publishes Kafka event
  -> NotificationService consumes event
  -> NotificationService renders email
  -> SMTP/Mailhog accepts email
  -> notification/inbox/attempt rows are saved
```

Минимальный end-to-end должен покрыть:
- создание заказа -> `ORDER_CREATED`;
- смену статуса `NEW -> IN_PROGRESS` -> `ORDER_STATUS_CHANGED`;
- смену статуса `IN_PROGRESS -> COMPLETED` -> `ORDER_STATUS_CHANGED` и `ORDER_COMPLETED`, либо только `ORDER_COMPLETED` как финальное бизнес-уведомление, если решено не дублировать письмо клиенту;
- отсутствие дублей писем при повторной доставке Kafka record с тем же `eventId`;
- Core не вызывает NotificationService по REST и не ждет результат email delivery.

---

## 2. Текущее состояние по фактам из кода

### 2.1. Core

Факты:
- Core уже имеет зависимость `org.springframework.kafka:spring-kafka` и `spring-kafka-test` в `build.gradle`.
  - Файл: `build.gradle`, строки 27-45.
- Kafka bootstrap уже задан в `application.properties`.
  - Файл: `src/main/resources/application.properties`, строка 12.
- Core уже интегрирован с AuthService:
  - `app.auth.base-url` по умолчанию смотрит на `http://localhost:8082`;
  - Файл: `src/main/resources/application.properties`, строки 23-27.
- Order flow находится в `OrderServiceImpl`.
  - Создание заказа: `create(...)`, строки 47-70.
  - Смена статуса: `updateStatus(...)`, строки 116-144.
- В заказе уже есть все финансовые поля для completed payload:
  - `finalAmount`, `completedAt`, `loyaltyPointsSpent`, totals;
  - Файл: `Order.java`, строки 48-97.
- Customer содержит email и ФИО.
  - Файл: `Customer.java`, строки 26-35.
- Vehicle содержит brand/model/licensePlate.
  - Файл: `Vehicle.java`, строки 29-39.

Вывод:
Core уже готов быть producer-ом без новых зависимостей, но пока не имеет application-level publisher и доменных событий заказов.

### 2.2. NotificationService

Факты:
- Сервис уже слушает `${app.kafka.order-events-topic}` через `@KafkaListener`.
  - Файл: `NotificationEventConsumer.java`, строки 29-34.
- Consumer читает JSON string в `NotificationEventEnvelope`.
  - Файл: `NotificationEventConsumer.java`, строки 37-42.
- Processing service валидирует envelope, версию `1`, `eventId`, `eventType`, `source`, `payload`.
  - Файл: `NotificationProcessingService.java`, строки 187-205.
- Idempotency уже реализована через inbox и проверку sent notification:
  - inbox skip для `PROCESSED`;
  - sent notification skip;
  - Файл: `NotificationProcessingService.java`, строки 61-82.
- Email retry и delivery attempts уже реализованы.
  - Файл: `NotificationProcessingService.java`, строки 132-160.
- Kafka DLT/retry уже настроены.
  - Файл: `KafkaConsumerConfig.java`, строки 22-70.
- Поддерживаются event types:
  - `ORDER_CREATED`;
  - `ORDER_STATUS_CHANGED`;
  - `ORDER_COMPLETED`;
  - Файл: `NotificationTemplateService.java`, строки 70-76.
- Payload validation для письма требует минимум `orderNumber`, `customerEmail`, а для status changed еще `newStatus`.
  - Файл: `NotificationTemplateService.java`, строки 79-126.
- README уже описывает topic, DLT, supported events и envelope.
  - Файл: `README.md`, строки 51-93.

Вывод:
NotificationService почти готов к Day 14. Основные изменения здесь должны быть не в бизнес-логике, а в совместимости запуска, тестовом покрытии всех трех событий и документации реального Core producer-а.

### 2.3. AuthService

Факты:
- AuthService по умолчанию запускается на `8082`.
  - Файл: `application.yml`, строки 1-2.
- Core по умолчанию ходит в AuthService на `http://localhost:8082`.
  - Core `application.properties`, строка 23.
- Auth имеет endpoint `POST /api/auth/validate`.
  - Файл: `AuthController.java`, строки 55-60.
- Token validation response содержит `userId`, `email`, `roles`, `tokenType`, `jti`, `expiresAt`.
  - Файл: `TokenValidationResponse.java`, строки 6-14.
- Роли Auth: `ADMIN`, `MANAGER`, `MECHANIC`, `RECEPTIONIST`, `CLIENT`.
  - Файл: `RoleName.java`, строки 3-8.
- JWT access token содержит `email`, `roles`, `type=access`.
  - Файл: `JwtService.java`, строки 32-46.
- Для dev/test есть пользователи всех ролей.
  - Файл: `DevUsersInitializer.java`, строки 28-35.

Вывод:
AuthService не должен участвовать в Kafka events напрямую. Его роль в День 14: обеспечить токены для защищенных Core API, не конфликтовать портом с NotificationService и быть частью integrated smoke.

---

## 3. Архитектурное решение Дня 14

### 3.1. Выбранный подход

Для Дня 14 используем MVP-паттерн:

```text
OrderService publishes Spring application event inside transaction
  -> @TransactionalEventListener(phase = AFTER_COMMIT)
  -> KafkaOrderNotificationEventPublisher sends JSON string to Kafka
```

Почему:
- событие публикуется только после успешного commit бизнес-операции;
- Core не ждет email delivery;
- не нужен полноценный outbox в 8-часовом Day 14;
- позже можно заменить handler на transactional outbox без изменения внешнего Kafka contract.

### 3.2. Что сознательно не делаем в День 14

- Не добавляем прямой REST `Core -> NotificationService`.
- Не добавляем зависимость Core от классов NotificationService.
- Не добавляем Kafka в AuthService.
- Не делаем service-to-service auth для NotificationService, потому что NotificationService не вызывает Core.
- Не добавляем `CLIENT` scoped access к заказам; это было отложено после Day 13.
- Не делаем transactional outbox table, если не останется времени.
- Не меняем event contract на lowercase names.
- Не отправляем событие до commit.

### 3.3. Важное ограничение MVP

`@TransactionalEventListener(AFTER_COMMIT)` защищает от события о rollback-нутой операции, но не гарантирует доставку, если Core упал после commit и до Kafka send.

Для защиты MVP это приемлемо. Для production-уровня нужно добавить outbox:

```text
order_event_outbox(id UUID, aggregate_id, event_type, payload_json, status, attempts, created_at, published_at)
```

Это зафиксировать как follow-up, не смешивать с Day 14.

---

## 4. Единый Kafka contract

### 4.1. Topic

```text
autoshop.order-events
```

DLT:

```text
autoshop.order-events.dlt
```

Kafka message key:

```text
eventId.toString()
```

### 4.2. Envelope

Core публикует JSON string:

```json
{
  "eventId": "UUID",
  "eventType": "ORDER_CREATED | ORDER_STATUS_CHANGED | ORDER_COMPLETED",
  "occurredAt": "ISO-8601 instant",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-created",
  "payload": {}
}
```

Правила:
- `eventId` создается один раз на логическое событие;
- `eventType` только uppercase;
- `source = autoshop-core`;
- `version = 1`;
- `correlationId` человекочитаемый и стабильный для логов;
- payload содержит все данные для письма;
- NotificationService не догружает данные из Core.

### 4.3. Payload `ORDER_CREATED`

```json
{
  "orderId": 42,
  "orderNumber": "AS-2026-00042",
  "customerId": 7,
  "customerFirstName": "Ivan",
  "customerLastName": "Petrov",
  "customerEmail": "ivan@example.com",
  "vehicleId": 12,
  "vehicleBrand": "Toyota",
  "vehicleModel": "Camry",
  "vehiclePlateNumber": "A123BC77",
  "createdAt": "2026-04-22T10:15:30Z"
}
```

Замечание по `orderNumber`:
- в текущем `Order` нет отдельного поля `orderNumber`;
- для Day 14 не добавлять миграцию, если нет требования к отдельному номеру;
- использовать вычисляемый номер `AS-{year}-{id padded to 5}` в event mapper;
- пример: `AS-2026-00042`;
- год брать из `order.createdAt`, fallback на `Instant.now()`.

### 4.4. Payload `ORDER_STATUS_CHANGED`

```json
{
  "orderId": 42,
  "orderNumber": "AS-2026-00042",
  "customerId": 7,
  "customerFirstName": "Ivan",
  "customerLastName": "Petrov",
  "customerEmail": "ivan@example.com",
  "previousStatus": "NEW",
  "newStatus": "IN_PROGRESS",
  "changedAt": "2026-04-22T12:00:00Z",
  "managerComment": ""
}
```

Правила:
- не публиковать, если статус не изменился;
- `previousStatus` и `newStatus` брать из enum `OrderStatus`;
- `managerComment` на Day 14 оставить пустой строкой, потому что `OrderStatusUpdateDTO` сейчас содержит только status;
- если позже нужен комментарий менеджера, расширить `OrderStatusUpdateDTO` отдельной задачей.

### 4.5. Payload `ORDER_COMPLETED`

```json
{
  "orderId": 42,
  "orderNumber": "AS-2026-00042",
  "customerId": 7,
  "customerFirstName": "Ivan",
  "customerLastName": "Petrov",
  "customerEmail": "ivan@example.com",
  "completedAt": "2026-04-22T17:45:00Z",
  "finalAmount": 12500.00,
  "currency": "RUB",
  "loyaltyPointsEarned": 125
}
```

Правила:
- `completedAt` брать из `order.completedAt`;
- `finalAmount` брать из `order.finalAmount`;
- `currency = RUB`;
- `loyaltyPointsEarned` вычислять по текущему правилу loyalty `floor(finalAmount * 0.05)`, либо вернуть из `LoyaltyService.processOrderCompleted`.

Важный технический выбор:
- сейчас `LoyaltyService.processOrderCompleted(order)` возвращает `void`;
- для корректного payload лучше изменить контракт на `Integer processOrderCompleted(Order order)`;
- если операция уже была обработана раньше, вернуть `0` или найденное значение из transaction;
- Day 14 MVP может вычислить points в event mapper по `finalAmount`, но лучше не дублировать бизнес-логику в publisher-е.

---

## 5. План изменений в Core

### Блок C1. Добавить properties для order events

Файлы:
- `src/main/resources/application.properties`;
- `src/main/resources/application-local.properties.example`;
- `src/main/resources/application-prod.properties`.

Добавить:

```properties
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer

app.kafka.order-events-topic=${APP_KAFKA_ORDER_EVENTS_TOPIC:autoshop.order-events}
app.events.source=${APP_EVENTS_SOURCE:autoshop-core}
app.events.version=${APP_EVENTS_VERSION:1}
app.events.order-notifications-enabled=${APP_EVENTS_ORDER_NOTIFICATIONS_ENABLED:true}
```

Acceptance:
- Core стартует без дополнительных env vars;
- topic можно переопределить через env;
- в тестах можно выключить publisher через property или заменить bean mock-ом.

### Блок C2. Создать Core-side event contract package

Новый пакет:

```text
src/main/java/com/vladko/autoshopcore/event/notification/
```

Классы/records:

```text
NotificationEventEnvelope.java
OrderCreatedNotificationPayload.java
OrderStatusChangedNotificationPayload.java
OrderCompletedNotificationPayload.java
OrderNotificationEventType.java
OrderNotificationEventProperties.java
```

Решения:
- не импортировать DTO из `autoshop-notification`;
- payload id использовать `Long`, чтобы совпасть с NotificationService DTO;
- Core `Integer id` конвертировать через `Long.valueOf(id)`;
- event type enum должен сериализоваться как строка uppercase или в envelope передавать `.name()`.

Acceptance:
- DTO serializes в JSON, совместимый с NotificationService;
- `eventType` ровно `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_COMPLETED`;
- `version` ровно `1`.

### Блок C3. Создать mapper/factory для payload

Новые классы:

```text
OrderNotificationPayloadFactory.java
OrderNumberFormatter.java
```

Ответственность:
- построить `orderNumber`;
- извлечь customer fields;
- извлечь vehicle fields;
- извлечь financial/completion fields;
- проверить обязательные поля до Kafka send.

Валидации:
- `order.id != null`;
- `order.customer != null`;
- `order.customer.email` не blank;
- `order.vehicle != null` для `ORDER_CREATED`;
- `previousStatus != newStatus` для status changed;
- `completedAt != null` для completed, fallback допустим только если documented.

Acceptance:
- unit tests на formatter:
  - id `42`, instant `2026-04-22` -> `AS-2026-00042`;
  - id `100001` -> `AS-2026-100001`;
- unit tests на payload factory для всех трех событий.

### Блок C4. Создать publisher interface и Kafka implementation

Новые классы:

```text
OrderNotificationEventPublisher.java
KafkaOrderNotificationEventPublisher.java
OrderNotificationPublishException.java
NoopOrderNotificationEventPublisher.java
```

Interface:

```java
void publishOrderCreated(Order order);
void publishOrderStatusChanged(Order order, OrderStatus previousStatus, OrderStatus newStatus, String managerComment);
void publishOrderCompleted(Order order, Integer loyaltyPointsEarned);
```

Kafka implementation:
- inject `KafkaTemplate<String, String>`;
- inject `ObjectMapper`;
- inject properties;
- создать `UUID eventId`;
- создать `Instant occurredAt`;
- создать envelope;
- `objectMapper.writeValueAsString(envelope)`;
- `kafkaTemplate.send(topic, eventId.toString(), json)`;
- логировать `eventId`, `eventType`, `orderId`, topic, но не email и не token.

Обработка ошибок:
- serialization error -> `OrderNotificationPublishException`;
- Kafka send async failure:
  - минимум добавить callback/logging;
  - для MVP не откатывать уже committed order transaction;
  - для тестов можно использовать `KafkaTemplate` mock.

Feature flag:
- если `app.events.order-notifications-enabled=false`, использовать noop publisher или handler skip.

Acceptance:
- unit test проверяет topic, key = eventId, value содержит envelope;
- producer не логирует персональные данные;
- выключение flag не ломает order flow.

### Блок C5. Добавить domain events и AFTER_COMMIT handler

Новый пакет:

```text
src/main/java/com/vladko/autoshopcore/order/event/
```

Records:

```text
OrderCreatedDomainEvent(Order order)
OrderStatusChangedDomainEvent(Order order, OrderStatus previousStatus, OrderStatus newStatus, String managerComment)
OrderCompletedDomainEvent(Order order, Integer loyaltyPointsEarned)
```

Handler:

```text
OrderNotificationDomainEventHandler.java
```

Handler methods:
- `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` for each event;
- call publisher methods;
- catch/log publish exceptions only if we decide business operation must stay committed;
- do not throw back into web request after commit unless intentionally chosen.

Decision:
- Для Day 14 не откатывать заказ из-за Kafka publish failure. Ошибка доставки события фиксируется в logs. Outbox остается future work.

Acceptance:
- publisher вызывается только после successful transaction commit;
- rollback test доказывает, что Kafka publisher не вызван при exception внутри transaction.

### Блок C6. Встроить events в `OrderServiceImpl`

Файл:

```text
src/main/java/com/vladko/autoshopcore/order/service/OrderServiceImpl.java
```

Изменения:
- inject `ApplicationEventPublisher`;
- в `create(...)`:
  - сохранить order;
  - publish `OrderCreatedDomainEvent(savedOrder)`;
  - вернуть response.
- в `updateStatus(...)`:
  - сохранить `previousStatus` до изменения;
  - если target equals current, вернуть без события;
  - после всех guard/business side effects выставить новый status;
  - сохранить order;
  - publish `OrderStatusChangedDomainEvent(savedOrder, previousStatus, targetStatus, "")`;
  - если targetStatus `COMPLETED`, publish `OrderCompletedDomainEvent(savedOrder, loyaltyPointsEarned)`.

Важный порядок для completed:
1. validate transition;
2. finalize reservations;
3. process loyalty completed and get earned points;
4. set status/completedAt;
5. save order;
6. publish Spring events;
7. AFTER_COMMIT sends Kafka.

Potential issue:
- Сейчас `loyaltyService.processOrderCompleted(order)` вызывается до `order.setStatus(COMPLETED)` и до `completedAt`.
- Для event payload это нормально, если completedAt выставить до save и event будет содержать saved entity.
- Но если loyalty recalculates finalAmount, event должен строиться после loyalty side effects.

Acceptance:
- `create` публикует ровно один domain event;
- `NEW -> IN_PROGRESS` публикует status changed;
- repeated status update to same status не публикует event;
- `IN_PROGRESS -> COMPLETED` публикует completed event и, если принято, status changed event;
- invalid transition не публикует event.

### Блок C7. Обновить LoyaltyService для earned points

Файлы:

```text
src/main/java/com/vladko/autoshopcore/loyalty/service/LoyaltyService.java
src/main/java/com/vladko/autoshopcore/loyalty/service/LoyaltyServiceImpl.java
src/test/java/com/vladko/autoshopcore/loyalty/service/LoyaltyIntegrationTest.java
src/test/java/com/vladko/autoshopcore/order/service/OrderServiceTest.java
```

Изменение:
- `processOrderCompleted(Order order)` -> `Integer processOrderCompleted(Order order)`;
- вернуть `earnedPoints`;
- если начисление уже существовало:
  - вариант A: вернуть `0`, чтобы не обещать новое начисление;
  - вариант B: найти существующую transaction и вернуть amount.

Рекомендация:
- Для Day 14 вернуть фактически начисленные в этой операции points.
- Если duplicate processing внутри Core невозможен из-за terminal status, `0` для already processed acceptable.

Acceptance:
- существующие loyalty tests обновлены и проходят;
- completed event получает корректные points.

### Блок C8. Core tests

Добавить/обновить:

```text
src/test/java/com/vladko/autoshopcore/event/notification/OrderNumberFormatterTest.java
src/test/java/com/vladko/autoshopcore/event/notification/OrderNotificationPayloadFactoryTest.java
src/test/java/com/vladko/autoshopcore/event/notification/KafkaOrderNotificationEventPublisherTest.java
src/test/java/com/vladko/autoshopcore/order/service/OrderServiceTest.java
```

Проверки:
- payload fields для created/status/completed;
- `orderNumber` формат;
- Kafka key = `eventId`;
- JSON содержит `source=autoshop-core`, `version=1`;
- `OrderServiceImpl.create` emits domain event;
- `OrderServiceImpl.updateStatus` emits event only on real status change;
- invalid transition/guards do not publish;
- same-status update does not publish.

Integration test, если хватает времени:

```text
src/test/java/com/vladko/autoshopcore/event/notification/OrderNotificationKafkaIntegrationTest.java
```

Сценарий:
- `@SpringBootTest`;
- Kafka Testcontainers из текущего `TestcontainersConfiguration`;
- создать minimal customer/vehicle/order;
- выполнить create/status;
- прочитать Kafka record из `autoshop.order-events`;
- assert eventType/payload.

Если Testcontainers долго:
- оставить unit-level publisher tests + ручной smoke.

---

## 6. План изменений в NotificationService

### Блок N1. Развести порт с AuthService

Проблема:
- AuthService default port: `8082`;
- NotificationService default port: `8082`;
- Core default Auth base URL: `http://localhost:8082`.

Решение:
- Auth оставить на `8082`;
- NotificationService перевести на `8083` по умолчанию или явно запускать с `SERVER_PORT=8083`;
- обновить README и architecture quick reference.

Файлы:

```text
src/main/resources/application.properties
README.md
```

Изменение:

```properties
server.port=${SERVER_PORT:8083}
```

Acceptance:
- Auth и Notification можно запустить одновременно;
- README показывает Notification `http://localhost:8083`;
- Core продолжает ходить в Auth на `8082`.

### Блок N2. Contract tests для всех трех event types

Сейчас integration test покрывает только `ORDER_CREATED`.

Добавить в:

```text
src/test/java/com/vladko/autoshopnotification/notification/NotificationKafkaConsumerIntegrationTest.java
src/test/java/com/vladko/autoshopnotification/template/NotificationTemplateServiceTest.java
```

Проверки:
- Kafka consumes `ORDER_STATUS_CHANGED` and sends email;
- Kafka consumes `ORDER_COMPLETED` and sends email;
- invalid version -> DLT or processing failure path;
- unsupported event type -> non-retryable;
- same `eventId` duplicate does not send second email.

Acceptance:
- Notification tests доказывают готовность принимать реальные Core events;
- supported event set зафиксирован тестами.

### Блок N3. Проверить status labels

Файл:

```text
src/main/java/com/vladko/autoshopnotification/template/service/StatusLabelMapper.java
```

Проверить, что есть labels для:
- `NEW`;
- `IN_PROGRESS`;
- `COMPLETED`;
- `CANCELLED`.

Acceptance:
- status changed email не показывает raw enum, если mapper должен показывать русский label;
- неизвестный статус имеет controlled fallback или non-retryable error, согласно текущему design.

### Блок N4. Уточнить docs по producer contract

Файлы:

```text
README.md
docs/
```

Добавить:
- Core producer должен отправлять JSON string;
- key = `eventId`;
- event types uppercase;
- `source=autoshop-core`;
- version `1`;
- Notification port `8083`;
- локальный запуск вместе с Auth/Core.

Acceptance:
- новый разработчик может поднять три сервиса без догадок по портам и topic.

---

## 7. План изменений в AuthService

### Блок A1. Не добавлять Kafka в Auth

Решение:
- AuthService не producer и не consumer для order notification events;
- Auth остается владельцем identity/JWT/roles;
- Core получает роли через `POST /api/auth/validate`;
- NotificationService не требует user token для Kafka consumption.

Acceptance:
- в Auth не появляется `spring-kafka`;
- не появляется coupling Auth -> Notification.

### Блок A2. Зафиксировать порт и local run для интеграционного smoke

Файлы:

```text
src/main/resources/application.yml
README.md или новый docs/local-run.md
```

Проверить/добавить:
- Auth port остается `8082`;
- local profile/dev profile использует shared Redis на `6379`;
- local DB URL можно быстро направить на общий Postgres из Core compose:

```bash
DB_URL=jdbc:postgresql://localhost:5433/auth_db
DB_USERNAME=autoshop-admin
DB_PASSWORD=pass
SPRING_PROFILES_ACTIVE=dev
```

Acceptance:
- Auth стартует рядом с Core и Notification;
- Core `APP_AUTH_BASE_URL=http://localhost:8082` остается корректным.

### Блок A3. Проверить dev users для smoke

Нужно иметь минимум:
- `manager@autoshop.local` / `Manager123!`;
- `mechanic@autoshop.local` / `Mechanic123!`;
- `reception@autoshop.local` / `Reception123!`;
- `admin@autoshop.local` / `Admin123!`.

Проверить, что `DevUsersInitializer` активируется профилем `dev`.

Acceptance:
- можно получить manager token;
- manager/receptionist может создать customer/vehicle/order;
- mechanic или manager может перевести заказ в нужные статусы по Core RBAC.

### Блок A4. Auth tests/smoke после Day 13 изменений

Команды:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
./gradlew test
```

Smoke:

```bash
curl -X POST http://localhost:8082/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@autoshop.local","password":"Manager123!"}'
```

Acceptance:
- login возвращает access token;
- `/api/auth/validate` возвращает `valid=true`, roles include `MANAGER`;
- logout не ломает Core behavior после Day 13.

---

## 8. Local infrastructure plan

### 8.1. Shared compose из Core

Запуск:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
docker compose --profile messaging up -d postgres redis kafka mailhog
```

Нужно создать базы:

```sql
CREATE DATABASE auth_db;
CREATE DATABASE notifications_db;
```

Core может использовать default database `postgres` или отдельную `core_db`, если уже принято так в локальном окружении.

### 8.2. Ports

```text
Core:                8080 or current project default
AuthService:         8082
NotificationService: 8083
PostgreSQL:          5433 -> container 5432
Redis:               6379
Kafka:               9092
Mailhog SMTP:        1025
Mailhog UI:          8025
```

### 8.3. Run order

1. Shared infra.
2. AuthService with `dev` profile.
3. NotificationService with local profile / `SERVER_PORT=8083`.
4. Core with local profile and `APP_AUTH_BASE_URL=http://localhost:8082`.

---

## 9. Detailed 8-hour execution schedule

### 0:00-0:30. Preparation

- Проверить `git status` в Core/Auth/Notification.
- Подтвердить, что Day 13 changes не сломаны.
- Запустить быстрые тесты Auth/Core/Notification, если время позволяет.
- Проверить, что локальные secrets не попадают в commit.

Deliverable:
- clear starting point;
- список уже грязных файлов зафиксирован мысленно, чужие изменения не трогать.

### 0:30-1:20. Core event contract

- Добавить properties.
- Добавить envelope/payload records.
- Добавить `OrderNotificationEventType`.
- Добавить `OrderNumberFormatter`.
- Написать tests на formatter и DTO serialization.

Deliverable:
- Core умеет строить совместимый JSON contract без Kafka.

### 1:20-2:20. Core payload factory + publisher

- Добавить `OrderNotificationPayloadFactory`.
- Добавить interface `OrderNotificationEventPublisher`.
- Добавить Kafka implementation.
- Добавить feature flag/noop или conditional publishing.
- Написать unit tests на payload factory и Kafka publisher.

Deliverable:
- Core может отправить event в topic через KafkaTemplate.

### 2:20-3:20. Transaction boundary

- Добавить domain event records.
- Добавить `OrderNotificationDomainEventHandler` с `@TransactionalEventListener(AFTER_COMMIT)`.
- Добавить tests, что handler вызывает publisher.
- Добавить rollback behavior test, если быстро получается.

Deliverable:
- Kafka send отложен до commit.

### 3:20-4:30. Встроить в OrderService

- Inject `ApplicationEventPublisher`.
- В `create` отправить `OrderCreatedDomainEvent`.
- В `updateStatus` сохранить `previousStatus`.
- На реальном status change отправить `OrderStatusChangedDomainEvent`.
- На completed отправить `OrderCompletedDomainEvent`.
- Обновить `OrderServiceTest`.

Deliverable:
- order create/status/completed генерируют domain events.

### 4:30-5:10. Loyalty points для completed payload

- Изменить `LoyaltyService.processOrderCompleted` на возврат `Integer`.
- Обновить implementation.
- Обновить tests.
- Убедиться, что existing loyalty behavior не изменился.

Deliverable:
- completed payload содержит реальные earned points.

### 5:10-5:50. Notification compatibility updates

- Развести порт Notification на `8083`.
- Добавить/расширить Kafka integration tests для status changed/completed.
- Проверить `StatusLabelMapper`.
- Обновить README.

Deliverable:
- Notification принимает все три события и не конфликтует с Auth.

### 5:50-6:20. Auth local smoke readiness

- Проверить Auth profile/dev users.
- При необходимости добавить docs local run.
- Не добавлять Kafka.
- Запустить Auth tests или targeted tests.

Deliverable:
- Auth готов выдавать токены для Core smoke.

### 6:20-7:20. Integrated local smoke

Запустить:

```bash
docker compose --profile messaging up -d postgres redis kafka mailhog
```

Auth:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
DB_URL=jdbc:postgresql://localhost:5433/auth_db \
DB_USERNAME=autoshop-admin \
DB_PASSWORD=pass \
SPRING_PROFILES_ACTIVE=dev \
./gradlew bootRun
```

Notification:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-notification
SERVER_PORT=8083 \
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/notifications_db \
SPRING_DATASOURCE_USERNAME=autoshop-admin \
SPRING_DATASOURCE_PASSWORD=pass \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

Core:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
APP_AUTH_BASE_URL=http://localhost:8082 \
SPRING_PROFILES_ACTIVE=local \
./gradlew bootRun
```

Smoke steps:
1. Login manager in Auth.
2. Create customer in Core.
3. Create vehicle in Core.
4. Create order in Core.
5. Verify Mailhog has created email.
6. Assign mechanic if needed.
7. Update estimate if needed.
8. Move status to `IN_PROGRESS`.
9. Verify Mailhog has status changed email.
10. Move status to `COMPLETED`.
11. Verify completed email.
12. Check Notification DB:
    - `notification_event_inbox`;
    - `notification`;
    - `notification_delivery_attempt`.

Deliverable:
- real Core -> Kafka -> Notification -> Mailhog path works.

### 7:20-8:00. Final verification and docs

- Run tests:
  - Core targeted tests or full `./gradlew test`;
  - Notification `./gradlew test`;
  - Auth `./gradlew test` if changed.
- Update docs with final commands and any known limitation.
- Record follow-ups:
  - transactional outbox;
  - service compose for all apps;
  - client-scoped order endpoints;
  - status manager comment.

Deliverable:
- Day 14 is complete and reproducible.

---

## 10. Acceptance criteria by service

### Core

- Has Core-side event DTOs compatible with NotificationService.
- Publishes JSON string to `autoshop.order-events`.
- Kafka key equals `eventId`.
- Event types are uppercase.
- `source=autoshop-core`.
- `version=1`.
- Publish happens only after successful DB commit.
- `ORDER_CREATED` emitted after order create.
- `ORDER_STATUS_CHANGED` emitted only on real status transition.
- `ORDER_COMPLETED` emitted on transition to completed.
- Invalid transition does not emit event.
- Same status update does not emit event.
- Core does not call NotificationService by REST.
- Core does not depend on NotificationService classes.
- Existing Core security via Auth still works.

### NotificationService

- Consumes events from `autoshop.order-events`.
- Supports `ORDER_CREATED`, `ORDER_STATUS_CHANGED`, `ORDER_COMPLETED`.
- Rejects invalid envelope/version/payload as non-retryable.
- Stores inbox row with topic/partition/offset.
- Sends email via configured provider.
- Stores notification and delivery attempts.
- Duplicate `eventId` does not send duplicate email after success.
- DLT config remains active.
- Runs on a port that does not conflict with Auth.

### AuthService

- Runs on `8082`.
- Provides login and token validation for Core.
- Has dev users for manager/mechanic/reception/admin.
- No Kafka dependency added.
- No Auth -> Notification coupling added.
- Integrated smoke can authenticate a Core request.

---

## 11. Risks and mitigations

### Risk 1. Событие уйдет до commit

Impact:
- клиент получит письмо по заказу, который не сохранился.

Mitigation:
- only `@TransactionalEventListener(AFTER_COMMIT)`;
- tests на rollback.

### Risk 2. Core упадет после commit, но до Kafka send

Impact:
- заказ сохранен, письмо не отправлено.

Mitigation:
- принять как MVP limitation;
- зафиксировать outbox follow-up.

### Risk 3. Duplicate emails

Impact:
- клиент получает одно письмо несколько раз.

Mitigation:
- Kafka key = eventId;
- Notification inbox idempotency уже есть;
- tests на duplicate eventId.

### Risk 4. Contract drift

Impact:
- Notification кладет event в DLT.

Mitigation:
- Core-side serialization tests;
- Notification contract tests for all event types;
- event type uppercase only.

### Risk 5. Port conflict Auth/Notification

Impact:
- один из сервисов не стартует локально.

Mitigation:
- Auth stays 8082;
- Notification moves to 8083 or run with `SERVER_PORT=8083`;
- docs updated.

### Risk 6. Lazy loading after commit

Impact:
- AFTER_COMMIT handler may access lazy fields after transaction and fail.

Mitigation:
- either publish event with snapshot payload instead of entity;
- or ensure required associations are initialized before publishing;
- recommended safer MVP: domain event carries already built payload snapshot, not raw `Order`.

Important refinement:
- Although examples show `OrderCreatedDomainEvent(Order order)`, implementation should prefer immutable snapshot DTO created inside transaction:

```text
OrderCreatedDomainEvent(OrderCreatedNotificationPayload payload)
```

This avoids lazy loading problems after commit.

### Risk 7. Completed event loyalty points mismatch

Impact:
- email shows wrong earned points.

Mitigation:
- return points from `LoyaltyService.processOrderCompleted`;
- do not duplicate earn-rate formula in publisher unless absolutely necessary.

---

## 12. Recommended implementation refinement

Use snapshot domain events, not entity domain events.

Preferred shape:

```java
public record OrderCreatedDomainEvent(OrderCreatedNotificationPayload payload) {}
public record OrderStatusChangedDomainEvent(OrderStatusChangedNotificationPayload payload) {}
public record OrderCompletedDomainEvent(OrderCompletedNotificationPayload payload) {}
```

Then:
- `OrderServiceImpl` builds payload inside transaction while entity graph is available;
- AFTER_COMMIT handler wraps payload into envelope and sends Kafka;
- Kafka publisher does not touch JPA entities.

This is the best Day 14 compromise:
- no outbox yet;
- no lazy loading trap;
- strong event contract;
- easy unit tests.

---

## 13. Final Definition of Done

Day 14 is done when:

- AuthService starts and issues manager token.
- Core starts and validates token through Auth.
- NotificationService starts on non-conflicting port.
- Kafka topic `autoshop.order-events` is used by both Core and Notification.
- Creating an order through Core produces `ORDER_CREATED` email in Mailhog.
- Updating order status produces status email or intentionally documented skip.
- Completing order produces completed email in Mailhog.
- Notification DB contains inbox, notification and delivery attempt rows.
- Duplicate Kafka delivery with same `eventId` does not duplicate email.
- Core tests for producer/payload/order events pass.
- Notification tests for all supported events pass.
- Auth tests or smoke validation pass.
- Docs mention ports, topic, env vars, and limitations.

---

## 14. Follow-ups after Day 14

- Add transactional outbox in Core.
- Add all-services Docker Compose or compose override for Core/Auth/Notification.
- Add service health dashboard.
- Add manager comment to status update DTO and email.
- Add client-scoped endpoints using Auth `userId -> customerId`.
- Add monitoring metrics:
  - Core event publish success/failure;
  - Notification consumed/sent/failed by event type;
  - DLT count.
- Add replay/admin tool for failed notification events.

