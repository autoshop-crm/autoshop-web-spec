# NotificationService: архитектура, реализация и интеграция с Core

Дата фиксации: 2026-04-22.

Документ описывает текущее устройство микросервиса `autoshop-notification-service`, принятые архитектурные решения и контракт, который должен использовать `Core` для дальнейшей интеграции через Kafka.

Главная цель документа: дать рабочую инструкцию для подключения `Core` к `NotificationService` без догадок, расхождений в event contract и случайных дублей писем.

---

## 1. Назначение микросервиса

`NotificationService` - отдельный Spring Boot микросервис для обработки уведомлений AutoShop.

Он отвечает за:

- получение доменных событий из Kafka;
- валидацию общего event envelope;
- защиту от повторной обработки через inbox/idempotency;
- выбор email-шаблона по `eventType`;
- рендер HTML-письма через Thymeleaf;
- отправку письма через выбранного provider-а;
- retry временных ошибок отправки email;
- retry/DLQ обработки Kafka record;
- сохранение истории уведомлений и попыток отправки в PostgreSQL.

Он не отвечает за:

- синхронную отправку писем по REST из `Core`;
- бизнес-решения заказов;
- подтягивание недостающих данных из `Core`;
- UI для управления шаблонами;
- SMS/push/marketing campaigns;
- подтверждение домена Mailjet;
- финальную delivery-аналитику Mailjet webhooks.

Ключевая граница ответственности: `Core` публикует событие с полным payload, `NotificationService` принимает событие и сам доводит email delivery pipeline до результата.

---

## 2. Текущий технологический стек

Проект:

- Java 17;
- Spring Boot 3.5.x;
- Gradle;
- Spring Kafka;
- Spring Data JPA;
- PostgreSQL;
- Liquibase;
- Spring Mail;
- Thymeleaf;
- Actuator;
- Spring Validation;
- Testcontainers dependencies;
- H2 для части тестов;
- Embedded Kafka в текущем Kafka integration test.

Основной package:

```text
com.vladko.autoshopnotification
```

Основные пакеты:

```text
config
event
event.dto
template
template.service
template.entity
template.repository
notification
notification.service
notification.entity
notification.repository
email
retry
```

---

## 3. Архитектурные решения

### 3.1. NotificationService является отдельным микросервисом

Решение: сервис живет отдельным приложением, а не пакетом внутри `Core`.

Причина:

- email delivery не должен блокировать бизнес-операции заказов;
- retry уведомлений должен быть независим от транзакций `Core`;
- можно менять provider-а отправки email без изменения бизнес-логики `Core`;
- Kafka дает естественную асинхронную границу.

Последствие для `Core`:

- `Core` не вызывает NotificationService по REST;
- `Core` публикует Kafka events;
- `Core` не ждет результата отправки письма.

### 3.2. Kafka - единственный вход для бизнес-уведомлений

Решение: все order notification events приходят через один topic:

```text
autoshop.order-events
```

DLT:

```text
autoshop.order-events.dlt
```

Consumer group:

```text
notification-service
```

Причина:

- один topic проще для MVP;
- проще настроить producer в `Core`;
- проще сопровождать DLQ;
- idempotency реализуется на уровне события, а не topic-а.

### 3.3. Event envelope обязателен

Решение: любое событие от `Core` должно иметь общий envelope:

```json
{
  "eventId": "8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33",
  "eventType": "ORDER_CREATED",
  "occurredAt": "2026-04-19T10:15:30Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-created",
  "payload": {}
}
```

Обязательные поля:

- `eventId`;
- `eventType`;
- `source`;
- `version`;
- `payload`.

Текущая поддерживаемая версия:

```text
version = 1
```

`occurredAt` и `correlationId` важны для трассировки, но текущая жесткая валидация сервиса проверяет прежде всего `eventId`, `eventType`, `source`, `version`, `payload`.

### 3.4. `eventId` - ключ идемпотентности

Решение: `eventId` генерирует producer в `Core` один раз на бизнес-событие.

`NotificationService` использует `eventId`:

- как primary key в `notification_event_inbox`;
- как часть unique constraint `(event_id, channel)` в `notification`;
- как `CustomID` при отправке через Mailjet.

Последствие для `Core`:

- при retry публикации одного и того же бизнес-события нельзя генерировать новый `eventId`;
- если `Core` случайно отправит то же событие с новым `eventId`, NotificationService будет считать его новым уведомлением.

### 3.5. Все данные для письма должны быть в payload

Решение: NotificationService не ходит в `Core` за недостающими полями.

Причина:

- обработка события должна быть автономной;
- retry не должен зависеть от доступности `Core`;
- письмо должно отражать состояние на момент события;
- исчезает риск несогласованности, когда заказ уже изменился, а письмо строится по новым данным.

Последствие для `Core`:

- payload должен содержать customer email, order number, status/date/amount и другие поля, нужные шаблону;
- нельзя отправлять только `orderId` и ожидать, что NotificationService сам загрузит заказ.

### 3.6. Email provider переключается конфигурацией

Решение: отправка инкапсулирована в интерфейсе:

```text
EmailSender
```

Текущие реализации:

- `SmtpEmailSender`;
- `MailjetEmailSender`.

Переключатель:

```properties
app.mail.provider=smtp
app.mail.provider=mailjet
```

По умолчанию используется SMTP.

### 3.7. `NotificationStatus.SENT` означает "принято provider-ом"

Решение: текущий статус `SENT` означает, что письмо успешно передано SMTP/Mailjet API.

Это не означает:

- что письмо гарантированно доставлено в inbox клиента;
- что клиент открыл письмо;
- что Mailjet не вернет bounce позже.

Для будущего delivery lifecycle через Mailjet Event API нужен отдельный слой событий, например `mailjet_event` или `notification_delivery_event`. Текущая реализация только готовит базу через `provider_message_id`, `provider_message_uuid`, `provider_message_href`.

### 3.8. Неизвестный eventType - non-retryable ошибка

Решение: если `eventType` не поддерживается, сервис не пытается подобрать fallback-шаблон.

Причина:

- fallback может отправить клиенту неверное письмо;
- контракт должен ломаться явно;
- некорректные события должны попадать в DLQ.

Текущие поддерживаемые event types:

```text
ORDER_CREATED
ORDER_STATUS_CHANGED
ORDER_COMPLETED
```

Важно: текущий код использует uppercase names. Если `Core` сейчас использует формат `order.created`, нужно либо адаптировать producer к uppercase, либо расширить resolver в NotificationService. Для интеграции сейчас рекомендуется использовать uppercase event types.

---

## 4. Реализация по слоям

### 4.1. Config layer

Основные классы:

```text
src/main/java/com/vladko/autoshopnotification/config/AppKafkaProperties.java
src/main/java/com/vladko/autoshopnotification/config/AppMailProperties.java
src/main/java/com/vladko/autoshopnotification/config/AppMailjetProperties.java
src/main/java/com/vladko/autoshopnotification/config/AppRetryProperties.java
src/main/java/com/vladko/autoshopnotification/config/KafkaConsumerConfig.java
```

Что делает слой:

- бин Kafka listener container factory;
- создание Kafka topics;
- настройка Kafka retry и DLT;
- настройка mail provider-а;
- настройка retry email/Kafka;
- настройка Mailjet REST API.

Ключевые application properties:

```properties
spring.application.name=autoshop-notification-service
server.port=${SERVER_PORT:8082}

spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5433/notifications_db}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:autoshop-admin}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:pass}
spring.jpa.hibernate.ddl-auto=validate
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml

spring.kafka.bootstrap-servers=${SPRING_KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.consumer.group-id=${APP_KAFKA_CONSUMER_GROUP:notification-service}
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.consumer.enable-auto-commit=false
spring.kafka.listener.ack-mode=record

app.kafka.order-events-topic=${APP_KAFKA_ORDER_EVENTS_TOPIC:autoshop.order-events}
app.kafka.order-events-dlt-topic=${APP_KAFKA_ORDER_EVENTS_DLT_TOPIC:autoshop.order-events.dlt}
app.kafka.topic-partitions=${APP_KAFKA_TOPIC_PARTITIONS:1}
app.kafka.topic-replicas=${APP_KAFKA_TOPIC_REPLICAS:1}

app.mail.provider=${APP_MAIL_PROVIDER:smtp}
app.mail.from=${APP_MAIL_FROM:noreply@autoshop.local}
app.mail.from-name=${APP_MAIL_FROM_NAME:AutoShop}

app.retry.email.max-attempts=${APP_RETRY_EMAIL_MAX_ATTEMPTS:3}
app.retry.email.backoff=${APP_RETRY_EMAIL_BACKOFF:500ms}
app.retry.kafka.max-attempts=${APP_RETRY_KAFKA_MAX_ATTEMPTS:3}
app.retry.kafka.backoff=${APP_RETRY_KAFKA_BACKOFF:1s}
```

### 4.2. Kafka consumer layer

Основной класс:

```text
src/main/java/com/vladko/autoshopnotification/event/NotificationEventConsumer.java
```

Что происходит:

1. Listener читает record из `${app.kafka.order-events-topic}`.
2. Raw string парсится в `NotificationEventEnvelope`.
3. При невалидном JSON выбрасывается `NonRetryableNotificationException`.
4. Consumer передает envelope в `NotificationProcessingService`.
5. В service передается metadata Kafka record:
   - topic;
   - partition;
   - offset.

Kafka ack mode:

```text
record
```

Consumer manual ack в коде не используется. Ack controlled by container after successful listener execution.

### 4.3. Kafka retry и DLT

Основной класс:

```text
src/main/java/com/vladko/autoshopnotification/config/KafkaConsumerConfig.java
```

Текущий механизм:

- `DefaultErrorHandler`;
- `FixedBackOff`;
- `DeadLetterPublishingRecoverer`;
- DLT topic: `${app.kafka.order-events-dlt-topic}`;
- partition DLT соответствует partition исходного record-а.

Non-retryable exception:

```text
NonRetryableNotificationException
```

Такие ошибки не гоняются по retry и отправляются в DLT быстрее.

Retryable ошибки:

- временная недоступность SMTP/Mailjet;
- неожиданная runtime ошибка;
- временные инфраструктурные сбои.

### 4.4. Processing layer

Основной класс:

```text
src/main/java/com/vladko/autoshopnotification/notification/service/NotificationProcessingService.java
```

Основной pipeline:

1. Validate envelope.
2. Найти или создать inbox row по `eventId`.
3. Если inbox уже `PROCESSED`, ничего не отправлять.
4. Пометить inbox как `PROCESSING`.
5. Найти существующий notification по `eventId + EMAIL`.
6. Если notification уже `SENT`, пометить inbox как `PROCESSED` и выйти.
7. Отрендерить шаблон.
8. Создать notification, если его еще нет.
9. Пометить notification как `SENDING`.
10. Отправить email с retry.
11. Сохранить provider metadata.
12. Пометить notification как `SENT`.
13. Пометить inbox как `PROCESSED`.

Envelope validation:

- `envelope != null`;
- `eventId != null`;
- `eventType` не blank;
- `source` не blank;
- `version == 1`;
- `payload != null`.

### 4.5. Template layer

Основные классы:

```text
src/main/java/com/vladko/autoshopnotification/template/service/TemplateKeyResolver.java
src/main/java/com/vladko/autoshopnotification/template/service/NotificationTemplateService.java
src/main/java/com/vladko/autoshopnotification/template/service/StatusLabelMapper.java
```

Шаблоны:

```text
src/main/resources/templates/email/order-created.html
src/main/resources/templates/email/order-status-changed.html
src/main/resources/templates/email/order-completed.html
```

Seed metadata:

```text
notification_template
```

Mapping:

```text
ORDER_CREATED -> ORDER_CREATED_EMAIL
ORDER_STATUS_CHANGED -> ORDER_STATUS_CHANGED_EMAIL
ORDER_COMPLETED -> ORDER_COMPLETED_EMAIL
```

Тема письма берется из `notification_template.subject_template`, тело - из Thymeleaf resource.

Дата форматируется в зоне:

```text
Europe/Moscow
```

Locale:

```text
ru-RU
```

Email validation:

```text
^[^@\s]+@[^@\s]+\.[^@\s]+$
```

Если email невалидный, письмо не отправляется, событие считается non-retryable.

### 4.6. Email layer

Основные классы:

```text
src/main/java/com/vladko/autoshopnotification/email/EmailSender.java
src/main/java/com/vladko/autoshopnotification/email/SmtpEmailSender.java
src/main/java/com/vladko/autoshopnotification/email/MailjetEmailSender.java
src/main/java/com/vladko/autoshopnotification/email/EmailMessage.java
src/main/java/com/vladko/autoshopnotification/email/EmailSendResult.java
```

`EmailSender` contract:

```java
EmailSendResult send(EmailMessage message);
String providerName();
```

`EmailMessage` содержит:

- recipient;
- subject;
- htmlBody;
- templateKey;
- customId;
- eventPayload.

Для Mailjet:

- `customId = eventId`;
- `eventPayload = eventType=...;template=...`.

### 4.7. SMTP provider

Класс:

```text
SmtpEmailSender
```

Активен при:

```properties
app.mail.provider=smtp
```

Или если `app.mail.provider` не задан.

Использует:

- `JavaMailSender`;
- `app.mail.from`;
- `app.mail.from-name`;
- HTML body.

Local default:

```properties
spring.mail.host=localhost
spring.mail.port=1025
```

Это ожидает Mailhog.

### 4.8. Mailjet provider

Класс:

```text
MailjetEmailSender
```

Активен при:

```properties
app.mail.provider=mailjet
```

Mailjet endpoint:

```text
POST https://api.mailjet.com/v3.1/send
```

Auth:

```text
HTTP Basic Auth
username = MAILJET_API_KEY
password = MAILJET_API_SECRET
```

Payload:

```json
{
  "SandboxMode": true,
  "Messages": [
    {
      "From": {
        "Email": "verified-sender@example.com",
        "Name": "AutoShop"
      },
      "To": [
        {
          "Email": "ivan@example.com"
        }
      ],
      "Subject": "AutoShop: заказ AS-2026-00042 создан",
      "HTMLPart": "<html>...</html>",
      "CustomID": "8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33",
      "EventPayload": "eventType=ORDER_CREATED;template=ORDER_CREATED_EMAIL"
    }
  ]
}
```

Response parsing:

- ожидается `Messages[0].Status == "success"`;
- сохраняется `MessageID`;
- сохраняется `MessageUUID`;
- сохраняется `MessageHref`.

Retry classification для Mailjet:

- retryable:
  - HTTP 408;
  - HTTP 429;
  - HTTP 5xx;
  - network/resource access errors;
- non-retryable:
  - missing credentials;
  - invalid sender;
  - HTTP 400;
  - HTTP 401/403;
  - per-message API rejection.

По умолчанию:

```properties
app.mailjet.sandbox-mode=true
```

Это важно: sandbox валидирует request, но не отправляет реальное письмо.

### 4.9. Persistence layer

Основные таблицы:

```text
notification
notification_delivery_attempt
notification_event_inbox
notification_template
```

Миграции:

```text
src/main/resources/db/changelog/db.changelog-1.0-notifications.sql
src/main/resources/db/changelog/db.changelog-1.1-mailjet.sql
```

`notification`:

- хранит результат обработки уведомления;
- имеет unique constraint `(event_id, channel)`;
- хранит recipient, subject, template key, status;
- после Mailjet интеграции хранит provider metadata.

`notification_delivery_attempt`:

- хранит каждую попытку отправки;
- хранит attempt number;
- хранит provider;
- хранит status;
- хранит error message.

`notification_event_inbox`:

- primary key `event_id`;
- хранит Kafka topic/partition/offset;
- хранит processing status;
- является первым уровнем idempotency.

`notification_template`:

- хранит template key;
- channel;
- subject template;
- path к body template;
- active flag.

---

## 5. Контракт для Core

### 5.1. Kafka topic

Core должен публиковать order notification events в:

```text
autoshop.order-events
```

Message key:

```text
eventId
```

Значение:

```text
JSON string NotificationEventEnvelope
```

Рекомендуется использовать key = `eventId.toString()`, потому что:

- проще трассировать;
- стабильнее retry;
- события с одинаковым `eventId` попадут в одну partition;
- consumer logs проще читать.

### 5.2. Общий envelope

Java record на стороне NotificationService:

```java
public record NotificationEventEnvelope(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        Integer version,
        String correlationId,
        JsonNode payload
) {
}
```

JSON contract:

```json
{
  "eventId": "UUID",
  "eventType": "ORDER_CREATED | ORDER_STATUS_CHANGED | ORDER_COMPLETED",
  "occurredAt": "ISO-8601 instant",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "string",
  "payload": {}
}
```

Требования:

- `eventId` обязателен;
- `eventId` должен быть глобально уникальным для конкретного бизнес-события;
- `eventType` обязателен;
- `source` обязателен, рекомендуемое значение `autoshop-core`;
- `version` обязателен и сейчас должен быть `1`;
- `payload` обязателен;
- payload должен содержать все данные для письма.

### 5.3. Naming event types

Текущая реализация ожидает:

```text
ORDER_CREATED
ORDER_STATUS_CHANGED
ORDER_COMPLETED
```

Не использовать без доработки NotificationService:

```text
order.created
order.status-changed
order.completed
```

Если в `Core` уже заведены lowercase domain event names, есть два варианта:

1. На Kafka boundary маппить их в uppercase names для NotificationService.
2. Расширить `TemplateKeyResolver` и payload routing в NotificationService.

Для ближайшей интеграции рекомендуется вариант 1, потому что он не требует менять NotificationService.

### 5.4. Когда Core должен публиковать события

Core должен публиковать событие только после успешной фиксации бизнес-изменения.

Рекомендуемый production-паттерн:

```text
Transactional Outbox
```

MVP-вариант:

```text
publish after successful DB transaction commit
```

Почему нельзя публиковать до commit:

- письмо может уйти о заказе, который потом откатился;
- NotificationService не спрашивает Core повторно;
- событие считается источником правды для уведомления.

### 5.5. Что Core не должен делать

Core не должен:

- вызывать NotificationService синхронно по REST;
- ждать результат отправки email;
- генерировать новый `eventId` при retry того же события;
- отправлять payload только с `orderId`;
- скрывать email клиента, если письмо должно быть отправлено;
- публиковать событие до commit;
- публиковать событие на каждое техническое сохранение заказа, если бизнес-события не было;
- отправлять `ORDER_STATUS_CHANGED`, если `previousStatus == newStatus`.

---

## 6. Payload contracts

### 6.1. ORDER_CREATED

Java record:

```java
public record OrderCreatedPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        Long vehicleId,
        String vehicleBrand,
        String vehicleModel,
        String vehiclePlateNumber,
        Instant createdAt
) {
}
```

Required for current template:

- `orderNumber`;
- `customerEmail`.

Recommended full payload:

```json
{
  "eventId": "8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33",
  "eventType": "ORDER_CREATED",
  "occurredAt": "2026-04-19T10:15:30Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-created",
  "payload": {
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
    "createdAt": "2026-04-19T10:15:30Z"
  }
}
```

Template variables used:

- `customerFirstName`;
- `customerEmail`;
- `orderNumber`;
- `vehicleBrand`;
- `vehicleModel`;
- `vehiclePlateNumber`;
- `createdAt`.

Fallback behavior in template service:

- blank `customerFirstName` -> `"клиент"`;
- blank vehicle fields -> empty string;
- null `createdAt` -> empty string.

### 6.2. ORDER_STATUS_CHANGED

Java record:

```java
public record OrderStatusChangedPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        String previousStatus,
        String newStatus,
        Instant changedAt,
        String managerComment
) {
}
```

Required:

- `orderNumber`;
- `customerEmail`;
- `newStatus`.

Business validation:

- if `previousStatus != null && previousStatus.equals(newStatus)`, event is rejected as non-retryable.

Recommended payload:

```json
{
  "eventId": "d4905b25-3bc0-46ce-a3af-f7f6800c32c7",
  "eventType": "ORDER_STATUS_CHANGED",
  "occurredAt": "2026-04-22T12:30:00Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-status-IN_PROGRESS",
  "payload": {
    "orderId": 42,
    "orderNumber": "AS-2026-00042",
    "customerId": 7,
    "customerFirstName": "Ivan",
    "customerLastName": "Petrov",
    "customerEmail": "ivan@example.com",
    "previousStatus": "NEW",
    "newStatus": "IN_PROGRESS",
    "changedAt": "2026-04-22T12:30:00Z",
    "managerComment": "Мастер начал диагностику"
  }
}
```

Template variables used:

- `customerFirstName`;
- `customerEmail`;
- `orderNumber`;
- `previousStatusLabel`;
- `newStatusLabel`;
- `changedAt`;
- `managerComment`.

Status labels are produced by `StatusLabelMapper`. Core may send internal enum names; NotificationService maps them to readable Russian labels.

### 6.3. ORDER_COMPLETED

Java record:

```java
public record OrderCompletedPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        Instant completedAt,
        BigDecimal finalAmount,
        String currency,
        Integer loyaltyPointsEarned
) {
}
```

Required:

- `orderNumber`;
- `customerEmail`.

Recommended payload:

```json
{
  "eventId": "898fbb0e-3454-4d5e-8ad6-9d071a831c49",
  "eventType": "ORDER_COMPLETED",
  "occurredAt": "2026-04-22T17:45:00Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-completed",
  "payload": {
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
}
```

Template variables used:

- `customerFirstName`;
- `customerEmail`;
- `orderNumber`;
- `completedAt`;
- `finalAmount`;
- `hasFinalAmount`;
- `currency`;
- `loyaltyPointsEarned`;
- `hasLoyaltyPoints`.

Fallback behavior:

- null `finalAmount` hides amount block;
- blank `currency` -> `RUB`;
- null `loyaltyPointsEarned` -> `0`.

---

## 7. Core integration design

### 7.1. Recommended producer API inside Core

Core should hide Kafka details behind an application service, for example:

```java
public interface OrderNotificationEventPublisher {

    void publishOrderCreated(Order order);

    void publishOrderStatusChanged(Order order, OrderStatus previousStatus, OrderStatus newStatus, String managerComment);

    void publishOrderCompleted(Order order, Integer loyaltyPointsEarned);
}
```

Implementation should:

1. Build payload DTO.
2. Build envelope.
3. Serialize envelope to JSON.
4. Send to `autoshop.order-events`.
5. Use `eventId` as Kafka key.

### 7.2. Recommended Core properties

In `Core`:

```properties
spring.kafka.bootstrap-servers=${SPRING_KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.apache.kafka.common.serialization.StringSerializer

app.kafka.order-events-topic=${APP_KAFKA_ORDER_EVENTS_TOPIC:autoshop.order-events}
app.events.source=autoshop-core
app.events.version=1
```

If Core already uses JSON serializer, it can publish objects directly, but the simplest shared contract for now is JSON string.

### 7.3. Minimal producer DTOs for Core

Core can duplicate minimal DTOs in its own package. Do not import classes from NotificationService as a runtime dependency unless a separate shared contract module is deliberately created.

Recommended Core-side envelope:

```java
public record NotificationEventEnvelope(
        UUID eventId,
        String eventType,
        Instant occurredAt,
        String source,
        Integer version,
        String correlationId,
        Object payload
) {
}
```

Recommended payloads:

```java
public record OrderCreatedNotificationPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        Long vehicleId,
        String vehicleBrand,
        String vehicleModel,
        String vehiclePlateNumber,
        Instant createdAt
) {
}
```

```java
public record OrderStatusChangedNotificationPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        String previousStatus,
        String newStatus,
        Instant changedAt,
        String managerComment
) {
}
```

```java
public record OrderCompletedNotificationPayload(
        Long orderId,
        String orderNumber,
        Long customerId,
        String customerFirstName,
        String customerLastName,
        String customerEmail,
        Instant completedAt,
        BigDecimal finalAmount,
        String currency,
        Integer loyaltyPointsEarned
) {
}
```

### 7.4. Minimal Core publisher example

Example shape:

```java
@Service
public class KafkaOrderNotificationEventPublisher implements OrderNotificationEventPublisher {

    private static final int EVENT_VERSION = 1;
    private static final String SOURCE = "autoshop-core";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;

    public KafkaOrderNotificationEventPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${app.kafka.order-events-topic:autoshop.order-events}") String topic
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
    }

    @Override
    public void publishOrderCreated(Order order) {
        UUID eventId = UUID.randomUUID();
        Instant occurredAt = Instant.now();

        var payload = new OrderCreatedNotificationPayload(
                order.getId(),
                order.getOrderNumber(),
                order.getCustomer().getId(),
                order.getCustomer().getFirstName(),
                order.getCustomer().getLastName(),
                order.getCustomer().getEmail(),
                order.getVehicle().getId(),
                order.getVehicle().getBrand(),
                order.getVehicle().getModel(),
                order.getVehicle().getPlateNumber(),
                order.getCreatedAt()
        );

        publish(eventId, "ORDER_CREATED", occurredAt, "order-" + order.getId() + "-created", payload);
    }

    private void publish(UUID eventId,
                         String eventType,
                         Instant occurredAt,
                         String correlationId,
                         Object payload) {
        var envelope = new NotificationEventEnvelope(
                eventId,
                eventType,
                occurredAt,
                SOURCE,
                EVENT_VERSION,
                correlationId,
                payload
        );
        try {
            kafkaTemplate.send(topic, eventId.toString(), objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Failed to serialize notification event " + eventId, exception);
        }
    }
}
```

This example is intentionally minimal. For production reliability, use outbox.

### 7.5. Transaction boundary in Core

Preferred options, from strongest to weakest:

1. Transactional outbox table in Core plus background publisher.
2. `@TransactionalEventListener(phase = AFTER_COMMIT)` that publishes Kafka event after commit.
3. Direct publish after service method transaction returns successfully.

Do not publish inside a transaction before commit.

Recommended MVP shape:

```java
@Component
public class OrderDomainEventHandler {

    private final OrderNotificationEventPublisher publisher;

    public OrderDomainEventHandler(OrderNotificationEventPublisher publisher) {
        this.publisher = publisher;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(OrderCreatedDomainEvent event) {
        publisher.publishOrderCreated(event.order());
    }
}
```

If Core does not yet have domain events, the application service can publish after successful transaction completion, but this is weaker than outbox.

### 7.6. Event id strategy

For now:

```java
UUID eventId = UUID.randomUUID();
```

But ensure it is generated once per domain event.

If using outbox:

- outbox row id may be UUID;
- same UUID should be sent as `eventId`;
- publisher retries must reuse the stored UUID.

If using direct publish:

- do not regenerate `eventId` on producer retry;
- if the producer cannot guarantee this, prefer outbox.

### 7.7. Core status mapping

NotificationService accepts status values as strings.

Recommended status values from Core:

```text
NEW
IN_PROGRESS
COMPLETED
CANCELLED
```

The current `StatusLabelMapper` should be checked before adding new Core order statuses. If Core has more statuses, either:

- add labels to NotificationService; or
- send statuses already compatible with existing mapper.

### 7.8. Core validation before publish

Before publishing event, Core should validate:

- order has stable id;
- order has order number;
- customer exists;
- customer email exists if notification should be sent;
- customer email is syntactically valid enough;
- event type matches actual business transition;
- status changed event has different previous and new statuses.

Still, NotificationService keeps its own validation and can reject bad events.

---

## 8. Runtime behavior and failure scenarios

### 8.1. Happy path

1. Core commits order change.
2. Core publishes Kafka event to `autoshop.order-events`.
3. NotificationService consumer reads record.
4. Envelope is parsed.
5. Inbox row is created.
6. Template is selected.
7. Email is rendered.
8. Notification row is created.
9. Delivery attempt row is created.
10. Email provider accepts message.
11. Attempt is marked `SUCCESS`.
12. Notification is marked `SENT`.
13. Inbox is marked `PROCESSED`.
14. Kafka record is acknowledged.

### 8.2. Duplicate Kafka delivery

If Kafka delivers the same record again:

- same `eventId` is found in inbox;
- if status is `PROCESSED`, service skips processing;
- if notification already `SENT`, service marks inbox processed and skips sending.

Result:

```text
No duplicate email after successful send.
```

### 8.3. Invalid JSON

Example:

```text
record value is not valid JSON
```

Behavior:

- consumer throws `NonRetryableNotificationException`;
- Kafka error handler treats it as non-retryable;
- record goes to DLT.

### 8.4. Unsupported version

Example:

```json
"version": 2
```

Behavior:

- processing throws `NonRetryableNotificationException`;
- inbox may be failed if envelope was parsed and had valid event id;
- record goes to DLT.

Current supported version:

```text
1
```

### 8.5. Missing or invalid customerEmail

Behavior:

- template service throws `NonRetryableNotificationException`;
- email is not sent;
- notification may not be created if validation fails before create;
- inbox is marked `FAILED`;
- record goes to DLT.

### 8.6. Temporary email provider failure

Examples:

- SMTP temporary failure;
- Mailjet 429;
- Mailjet 5xx;
- network timeout.

Behavior:

- delivery attempt is marked retryable failed;
- service retries email according to `app.retry.email`;
- if all email attempts fail, processing throws retryable exception;
- Kafka handler retries record according to `app.retry.kafka`;
- after Kafka retries are exhausted, record goes to DLT.

Important: there are two retry layers:

- email retry inside one record processing;
- Kafka retry for the whole record.

Keep attempt counts conservative to avoid multiplying retries too much.

### 8.7. Mailjet sandbox

If:

```properties
app.mail.provider=mailjet
app.mailjet.sandbox-mode=true
```

Then:

- request is sent to Mailjet;
- payload/auth can be validated;
- real email is not delivered;
- webhooks for real delivery are not expected.

### 8.8. Mailjet production

Before disabling sandbox:

```properties
app.mailjet.sandbox-mode=false
```

Required:

- verified sender address or domain in Mailjet;
- SPF/DKIM configured for real domain;
- secrets passed through env vars, not committed;
- a real recipient for smoke test;
- logs checked for no leaked secrets.

---

## 9. Local run and smoke test

### 9.1. Start infrastructure

From shared AutoShop compose:

```bash
docker compose --profile messaging up -d postgres kafka mailhog
```

Create database if needed:

```sql
CREATE DATABASE notifications_db;
```

### 9.2. Start NotificationService

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

Default local endpoints:

```text
NotificationService: http://localhost:8082
Actuator health: http://localhost:8082/actuator/health
Mailhog UI: http://localhost:8025
Kafka: localhost:9092
Postgres notifications DB: localhost:5433/notifications_db
```

### 9.3. Publish test event manually

If using Kafka CLI:

```bash
kafka-console-producer --bootstrap-server localhost:9092 --topic autoshop.order-events --property parse.key=true --property key.separator=:
```

Then send one line:

```text
8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33:{"eventId":"8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33","eventType":"ORDER_CREATED","occurredAt":"2026-04-19T10:15:30Z","source":"autoshop-core","version":1,"correlationId":"order-42-created","payload":{"orderId":42,"orderNumber":"AS-2026-00042","customerId":7,"customerFirstName":"Ivan","customerLastName":"Petrov","customerEmail":"ivan@example.com","vehicleId":12,"vehicleBrand":"Toyota","vehicleModel":"Camry","vehiclePlateNumber":"A123BC77","createdAt":"2026-04-19T10:15:30Z"}}
```

### 9.4. Verify result

Check:

- Mailhog UI contains email;
- `notification` table has row with `status = SENT`;
- `notification_delivery_attempt` has one successful attempt;
- `notification_event_inbox` has row with `status = PROCESSED`;
- sending the same event again does not create a second email.

Useful SQL:

```sql
SELECT id, event_id, event_type, recipient, template_key, status, provider, provider_message_id, created_at, sent_at
FROM notification
ORDER BY id DESC;
```

```sql
SELECT id, notification_id, attempt_number, status, provider, error_message, started_at, finished_at
FROM notification_delivery_attempt
ORDER BY id DESC;
```

```sql
SELECT event_id, event_type, topic, partition_number, offset_number, status, received_at, processed_at, error_message
FROM notification_event_inbox
ORDER BY received_at DESC;
```

### 9.5. Verify DLT

Publish invalid event, for example unsupported event type:

```json
{
  "eventId": "9aa2d2aa-7ebd-41b9-a77f-86c4a9734451",
  "eventType": "UNKNOWN_EVENT",
  "occurredAt": "2026-04-22T10:00:00Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "unknown-test",
  "payload": {
    "customerEmail": "ivan@example.com"
  }
}
```

Expected:

- processing fails as non-retryable;
- record is published to `autoshop.order-events.dlt`;
- inbox status may be `FAILED` if envelope passed initial validation.

---

## 10. Tests in NotificationService

Current test coverage includes:

- template key resolver tests;
- status label mapper tests;
- template rendering tests;
- processing service tests:
  - send success;
  - duplicate event idempotency;
  - temporary email retry;
  - invalid recipient rejection;
  - provider metadata persistence;
- Kafka consumer integration test with `@EmbeddedKafka`;
- Mailjet sender tests:
  - request payload;
  - Basic Auth;
  - response metadata parsing;
  - retryable/non-retryable classification.

Run:

```bash
./gradlew test
```

Current known note:

- project has Testcontainers dependencies;
- current Kafka integration test uses `EmbeddedKafka`, not Testcontainers Kafka.

---

## 11. Observability and operations

Actuator:

```text
GET /actuator/health
GET /actuator/info
GET /actuator/metrics
```

Logs to watch:

- event received;
- duplicate skipped;
- notification sent;
- processing failed without retry;
- processing failed and will be retried.

Database is currently the main operational audit source:

- `notification` - final notification state;
- `notification_delivery_attempt` - provider attempt history;
- `notification_event_inbox` - event processing state;
- DLT topic - records that could not be processed.

Recommended future metrics:

- count by `eventType`;
- count by `templateKey`;
- count by notification status;
- count by provider;
- email send latency;
- DLT count;
- retry count.

---

## 12. Security and secrets

Do not commit:

- SMTP password;
- Mailjet API key;
- Mailjet API secret;
- production sender credentials.

Use env vars:

```text
MAILJET_API_KEY
MAILJET_API_SECRET
APP_MAIL_FROM
APP_MAIL_FROM_NAME
SPRING_MAIL_USERNAME
SPRING_MAIL_PASSWORD
```

Do not log:

- full Mailjet basic auth header;
- raw email HTML body in production;
- Mailjet private API secret;
- full customer PII unless needed for debugging.

Email address is persisted as recipient. This is expected for audit, but should be considered PII.

---

## 13. Mailjet-specific status

Implemented:

- Send API v3.1;
- Basic Auth;
- sandbox mode;
- `CustomID = eventId`;
- `EventPayload = eventType/template`;
- response parsing for `MessageID`, `MessageUUID`, `MessageHref`;
- provider metadata persistence;
- retry classification.

Not implemented yet:

- Mailjet Event API webhook endpoint;
- webhook callback registration;
- open/click/bounce/spam/unsub persistence;
- unsubscribe/preferences flow;
- confirmed production domain setup.

Reason:

- current priority is Core integration via Kafka;
- webhooks require public HTTPS URL;
- real delivery requires verified sender/domain.

Future webhook endpoint can use:

```text
POST /api/mailjet/events
```

But this endpoint does not exist yet.

---

## 14. Compatibility checklist for Core integration

Before connecting Core, verify:

- Core and NotificationService use same Kafka bootstrap servers.
- Topic name is `autoshop.order-events`.
- DLT topic exists or auto-create is enabled.
- Core publishes JSON string.
- Kafka message key is `eventId`.
- `eventType` is uppercase and one of:
  - `ORDER_CREATED`;
  - `ORDER_STATUS_CHANGED`;
  - `ORDER_COMPLETED`.
- `version` is `1`.
- `source` is `autoshop-core`.
- payload contains `customerEmail`.
- payload contains `orderNumber`.
- status changed events contain `newStatus`.
- status changed events do not have equal previous and new status.
- completed events include amount/loyalty data if the email should show it.
- Core publishes only after DB commit.
- Core retry does not generate a new `eventId` for the same logical event.
- NotificationService is running with access to PostgreSQL and Kafka.
- Mailhog or real provider is configured.

---

## 15. Minimal integration sequence with Core

Recommended order:

1. Add Core Kafka producer dependencies/config if missing.
2. Add Core-side notification event DTOs.
3. Add `OrderNotificationEventPublisher`.
4. Publish `ORDER_CREATED` after order creation commit.
5. Start local Kafka/PostgreSQL/Mailhog.
6. Start NotificationService.
7. Start Core.
8. Create order through Core API.
9. Verify email appears in Mailhog.
10. Verify rows in NotificationService database.
11. Add `ORDER_STATUS_CHANGED`.
12. Add `ORDER_COMPLETED`.
13. Add regression tests around Core producer payloads.
14. Later replace direct post-commit publish with outbox if reliability is required.

---

## 16. Common integration mistakes

### Mistake: Core sends lowercase event type

Example:

```json
"eventType": "order.created"
```

Current result:

```text
Unsupported event type -> non-retryable failure -> DLT
```

Fix:

```json
"eventType": "ORDER_CREATED"
```

### Mistake: Core sends only orderId

Example:

```json
"payload": { "orderId": 42 }
```

Current result:

```text
Missing orderNumber/customerEmail -> non-retryable failure -> DLT
```

Fix: include full notification payload.

### Mistake: Core generates new eventId on retry

Result:

```text
NotificationService sees each retry as a new event and may send duplicate emails.
```

Fix: persist event id in outbox or keep stable id for producer retry.

### Mistake: Core publishes before transaction commit

Result:

```text
Email may be sent for rolled back order.
```

Fix: publish after commit or use outbox.

### Mistake: Core waits for email result

Result:

```text
Business operation becomes coupled to email provider availability.
```

Fix: treat Kafka publish as integration boundary. Email result belongs to NotificationService.

---

## 17. Current readiness summary

Ready:

- NotificationService app;
- Kafka consumer;
- Kafka retry + DLT;
- envelope validation;
- idempotent processing;
- notification persistence;
- delivery attempt persistence;
- seed templates;
- Thymeleaf rendering;
- SMTP/Mailhog delivery;
- Mailjet Send API provider;
- tests for critical notification path.

Ready for Core integration:

- `ORDER_CREATED`;
- `ORDER_STATUS_CHANGED`;
- `ORDER_COMPLETED`;
- topic contract;
- JSON envelope contract;
- payload contract;
- idempotency contract.

Needs attention during Core integration:

- event type naming must match uppercase names;
- Core should publish after commit;
- Core should reuse event id on retry;
- local smoke should verify real Kafka -> NotificationService -> Mailhog path;
- status labels should be checked if Core has statuses beyond current mapper.

Not in current scope:

- direct REST API from Core to NotificationService;
- template CRUD;
- admin preview endpoint;
- Web UI;
- SMS/push;
- Mailjet webhooks;
- delivery/open/click analytics.

---

## 18. Quick reference

NotificationService local port:

```text
8082
```

Kafka topic:

```text
autoshop.order-events
```

Kafka DLT:

```text
autoshop.order-events.dlt
```

Consumer group:

```text
notification-service
```

Supported events:

```text
ORDER_CREATED
ORDER_STATUS_CHANGED
ORDER_COMPLETED
```

Envelope version:

```text
1
```

Default email provider:

```text
smtp
```

Local SMTP:

```text
localhost:1025
```

Mailhog UI:

```text
http://localhost:8025
```

Mailjet provider:

```properties
app.mail.provider=mailjet
app.mailjet.sandbox-mode=true
```

Test command:

```bash
./gradlew test
```

