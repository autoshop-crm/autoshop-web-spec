# Подробный план на День 11: 19 апреля 2026

Основа плана:
- `ContextProject/Now/FULL_PLAN_TO_2026-05-01.md`
- `ContextProject/Now/DAY_1_2026-04-09_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_9_2026-04-17_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_10_2026-04-18_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_10_ADDON_UMAPI_CATALOG_SEARCH_PLAN.md`
- `ContextProject/Now/CORE_API_DESCRIPTION.md`
- `ContextProject/Now/DEVELOPMENT_ROADMAP.md`
- текущее состояние `Core` после реализации `Client`, `Vehicle`, `Order`, `Parts`, `Loyalty`, `UMAPI`, `Carreta`

Главная цель дня:
Создать отдельный микросервис `NotificationService`, который умеет принимать доменные события из Kafka, выбирать email-шаблон, рендерить письмо, отправлять его через SMTP/Mailhog, сохранять историю уведомлений и устойчиво переживать временные ошибки через retry и DLQ.

Важно:
`NotificationService` создается как новый проект, а не как пакет внутри `autoshop-core`.

Рекомендуемое имя нового проекта:

```text
autoshop-notification-service
```

Рекомендуемый package:

```text
com.vladko.autoshopnotification
```

---

## Что должно быть готово к концу 19 апреля 2026

- Создан отдельный Spring Boot проект `NotificationService`:
  - Java 17;
  - Spring Boot 3.x;
  - Gradle;
  - PostgreSQL;
  - Liquibase;
  - Spring Kafka;
  - Spring Mail;
  - Thymeleaf;
  - Validation;
  - Actuator;
  - Testcontainers.
- Есть отдельная база `notifications_db` или отдельная schema для notifications, если локальный compose пока использует один PostgreSQL instance.
- Есть нормальная package-структура:
  - `config`
  - `event`
  - `template`
  - `notification`
  - `email`
  - `retry`
  - `common`
- Есть Kafka consumer для MVP-событий:
  - `order.created`;
  - `order.status-changed`;
  - `order.completed`;
  - технически допустим `loyalty.points-earned`, но в День 11 его можно оставить как plan-ready handler без обязательного producer-а.
- Есть стабильный внутренний event contract, который позже сможет использовать `Core` в День 14 / 22.04.
- Есть idempotency:
  - повтор одного и того же `eventId` не должен отправлять письмо повторно;
  - повтор доставки Kafka после падения consumer-а должен быть безопасным.
- Есть email templates:
  - заказ создан;
  - статус заказа изменен;
  - заказ завершен;
  - fallback template для неизвестного или временно не настроенного шаблона не нужен, лучше явно падать в DLQ.
- Есть retry:
  - retry обработки Kafka record;
  - retry отправки email при временных SMTP ошибках;
  - DLQ для записей, которые не удалось обработать после retry.
- Есть persistence:
  - уведомление;
  - попытки отправки;
  - шаблоны или seed templates;
  - event inbox/idempotency.
- Есть ручной smoke-сценарий:
  - поднять Kafka + PostgreSQL + Mailhog;
  - отправить тестовое событие в topic;
  - увидеть письмо в Mailhog;
  - увидеть запись в БД;
  - повторить тот же `eventId` и убедиться, что дубль письма не ушел.
- Есть тесты:
  - unit для template rendering;
  - unit для выбора template по event type;
  - service test для idempotency;
  - integration test с Kafka Testcontainers;
  - email test через mock mail sender или GreenMail/Wiser.

---

## Главный результат дня

После Дня 11 `NotificationService` должен стать отдельным рабочим микросервисом, который уже можно подключать к будущим событиям из `Core`.

Ключевая мысль:
в День 11 мы делаем consumer и email delivery pipeline полностью рабочими, но не обязаны еще менять `Core`, чтобы он публиковал реальные события. По календарю это отдельный день:

```text
22.04 | Kafka events из Core + получение в Notification
```

Поэтому в День 11 допустимы:
- ручной test producer;
- integration test producer;
- временный internal endpoint только для локального smoke, если он закрыт profile `local` и не является частью публичного API.

Недопустимо:
- реализовать NotificationService внутри `autoshop-core`;
- завязать NotificationService на прямые REST-вызовы в `Core` для отправки письма;
- требовать от Core синхронного ожидания результата email-отправки;
- отправлять email до фиксации idempotency/event state.

---

## MVP-граница Дня 11

Обязательный scope на 8 часов:
- создать проект и базовую конфигурацию;
- подключить PostgreSQL, Liquibase, Kafka, Mailhog/SMTP;
- сделать 3 email templates;
- сделать Kafka consumer;
- сделать idempotent processing;
- сделать retry + DLQ;
- сделать базовые тесты и smoke.

Необязательный scope, если останется время:
- CRUD API для шаблонов;
- админский preview template;
- HTML + plain text multipart emails;
- rate limiting отправки;
- metrics по template key/status;
- SMS/push заготовки.

Следующий scope после Дня 11:
- Day 14 / 22.04: добавить Kafka producer в `Core`;
- Day 21 / 29.04: E2E прогон полного сценария;
- позже: production SMTP provider, Mailjet/SendGrid, unsubscribe/preferences, мультиязычность.

---

## Что не делаем в День 11

- Не делаем SMS.
- Не делаем push notifications.
- Не делаем marketing campaigns.
- Не делаем сложный template editor.
- Не делаем UI.
- Не делаем авторизацию админских endpoint-ов, если сами endpoint-ы не входят в MVP дня.
- Не отправляем реальные письма через внешний SMTP provider.
- Не храним SMTP password в репозитории.
- Не делаем синхронный REST endpoint `Core -> NotificationService -> sendEmail`.
- Не блокируем бизнес-операции `Core`, если письмо не отправилось.
- Не используем Kafka как task queue без idempotency.

---

## Ключевой контекст проекта на старт Дня 11

Перед реализацией важно держать фактическую картину:

- Локальная инфраструктура уже спланирована:
  - PostgreSQL;
  - Redis;
  - Kafka;
  - MinIO;
  - Mailhog.
- В текущем `docker-compose.yml` Kafka находится под profile `messaging`.
- Mailhog уже доступен локально:
  - SMTP: `localhost:1025`;
  - UI: `localhost:8025`.
- В `Core` уже есть домены, которые позже будут источниками событий:
  - `Customer`;
  - `Vehicle`;
  - `Order`;
  - `Parts`;
  - `Loyalty`;
  - `Procurement/Carreta` как развивающийся слой закупок.
- В `Core` пока нет финального event producer-а для заказов.
- По полному плану `Core` начнет публиковать Kafka events отдельно 22.04.
- День 11 должен подготовить приемную сторону так, чтобы 22.04 осталось только подключить producer и согласовать payload.

---

## Архитектурные решения, которые надо зафиксировать утром

Перед кодингом нужно принять 14 решений и дальше не менять их посреди дня:

1. `NotificationService` - отдельный Spring Boot application, не модуль внутри `Core`.
2. Kafka - основной вход для бизнес-уведомлений.
3. SMTP/Mailhog - единственный delivery channel в MVP.
4. PostgreSQL - источник правды по notification state и попыткам отправки.
5. `eventId` обязателен во всех событиях.
6. Idempotency строится по `eventId`, а не по `orderId + status`.
7. Consumer commit/ack выполняется только после успешной обработки или после отправки записи в DLQ.
8. Retry Kafka record и retry SMTP отправки не должны бесконечно умножать друг друга.
9. Template выбирается по `eventType` и `channel`.
10. HTML-шаблоны хранятся как ресурс приложения в MVP, а таблица `notification_template` может использоваться для seed/метаданных или следующего CRUD-этапа.
11. Если email получателя отсутствует или невалиден, это non-retryable ошибка, запись идет в `FAILED` и/или DLQ без повторов.
12. Если SMTP временно недоступен, это retryable ошибка.
13. Если payload не соответствует контракту, это non-retryable ошибка и DLQ.
14. NotificationService не запрашивает у Core недостающие поля в момент обработки события. Все данные для письма должны быть в event payload.

Если эти решения не принять сразу, сервис быстро расползется:
- часть данных начнет подтягиваться REST-вызовами в Core;
- письма начнут отправляться повторно при rebalance Kafka;
- retry будет бесконечным;
- template contract станет неявным;
- 22.04 будет сложно подключить producer из Core.

---

## Event contract для MVP

### Общая envelope-структура

Все события лучше держать в едином формате:

```json
{
  "eventId": "8f2cb0f6-41f0-4b79-a4d8-73d0d862fa33",
  "eventType": "ORDER_STATUS_CHANGED",
  "occurredAt": "2026-04-19T10:15:30Z",
  "source": "autoshop-core",
  "version": 1,
  "correlationId": "order-42-status-change",
  "payload": {}
}
```

Правила:
- `eventId` генерируется producer-ом один раз;
- `eventType` используется для routing внутри NotificationService;
- `version` нужен, чтобы позже менять contract без аварий;
- `correlationId` нужен для логов и трассировки;
- `payload` должен содержать все поля, нужные для письма.

### Topic naming

Рекомендуемый MVP:

```text
autoshop.order-events
autoshop.order-events.dlt
```

Альтернатива, если хочется topic per event:

```text
autoshop.order.created
autoshop.order.status-changed
autoshop.order.completed
```

Для Дня 11 лучше выбрать один topic `autoshop.order-events`, потому что:
- проще consumer configuration;
- проще Testcontainers smoke;
- проще добавить producer в `Core` 22.04;
- `eventType` уже решает внутреннюю маршрутизацию.

### Consumer group

```text
notification-service
```

Почему:
- имя отражает микросервис;
- если будет несколько replicas, Kafka будет распределять partitions внутри одной группы;
- повторные consumer instances не должны дублировать отправку писем.

---

## MVP события

### 1. ORDER_CREATED

Topic:

```text
autoshop.order-events
```

Payload:

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
  "createdAt": "2026-04-19T10:15:30Z"
}
```

Шаблон:

```text
ORDER_CREATED_EMAIL
```

Subject:

```text
AutoShop: заказ AS-2026-00042 создан
```

Основная задача письма:
- подтвердить создание заказа;
- показать машину;
- показать номер заказа;
- не обещать срок и стоимость, если они еще не рассчитаны.

### 2. ORDER_STATUS_CHANGED

Payload:

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
  "changedAt": "2026-04-19T12:00:00Z",
  "managerComment": "Диагностика завершена, мастер приступил к работам"
}
```

Шаблон:

```text
ORDER_STATUS_CHANGED_EMAIL
```

Subject:

```text
AutoShop: статус заказа AS-2026-00042 изменен
```

Правила:
- если `managerComment` пустой, блок комментария не рендерить;
- статусы показывать человекочитаемо через mapper внутри NotificationService;
- не отправлять письмо, если `previousStatus == newStatus`.

### 3. ORDER_COMPLETED

Payload:

```json
{
  "orderId": 42,
  "orderNumber": "AS-2026-00042",
  "customerId": 7,
  "customerFirstName": "Ivan",
  "customerLastName": "Petrov",
  "customerEmail": "ivan@example.com",
  "completedAt": "2026-04-19T18:30:00Z",
  "finalAmount": 24500.00,
  "currency": "RUB",
  "loyaltyPointsEarned": 245
}
```

Шаблон:

```text
ORDER_COMPLETED_EMAIL
```

Subject:

```text
AutoShop: заказ AS-2026-00042 завершен
```

Правила:
- `loyaltyPointsEarned` показывать только если поле больше 0;
- `finalAmount` показывать только если поле есть;
- валюта MVP: `RUB`.

---

## Структура нового проекта

Рекомендуемая структура:

```text
autoshop-notification-service/
  build.gradle
  settings.gradle
  src/main/java/com/vladko/autoshopnotification/
    NotificationServiceApplication.java
    common/
      exception/
      time/
    config/
      KafkaConsumerConfig.java
      MailConfig.java
      NotificationProperties.java
      RetryProperties.java
    event/
      dto/
      handler/
      mapper/
      NotificationEventConsumer.java
      NotificationEventDispatcher.java
    notification/
      entity/
      repository/
      service/
      dto/
    template/
      TemplateKey.java
      NotificationTemplateService.java
      ThymeleafTemplateRenderer.java
    email/
      EmailMessage.java
      EmailSender.java
      SmtpEmailSender.java
    retry/
      RetryClassifier.java
      NotificationProcessingException.java
      RetryableNotificationException.java
      NonRetryableNotificationException.java
  src/main/resources/
    application.properties
    application-local.properties
    application-local.properties.example
    db/changelog/
      db.changelog-master.yaml
      db.changelog-1.0-notifications.sql
    templates/email/
      order-created.html
      order-status-changed.html
      order-completed.html
  src/test/java/com/vladko/autoshopnotification/
```

---

## Gradle dependencies

Минимальный набор:

```gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
implementation 'org.springframework.boot:spring-boot-starter-mail'
implementation 'org.springframework.boot:spring-boot-starter-thymeleaf'
implementation 'org.springframework.boot:spring-boot-starter-validation'
implementation 'org.springframework.kafka:spring-kafka'
implementation 'org.liquibase:liquibase-core'
compileOnly 'org.projectlombok:lombok'
runtimeOnly 'org.postgresql:postgresql'
annotationProcessor 'org.projectlombok:lombok'

testImplementation 'org.springframework.boot:spring-boot-starter-test'
testImplementation 'org.springframework.boot:spring-boot-testcontainers'
testImplementation 'org.springframework.kafka:spring-kafka-test'
testImplementation 'org.testcontainers:junit-jupiter'
testImplementation 'org.testcontainers:kafka'
testImplementation 'org.testcontainers:postgresql'
testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
```

Опционально для email integration test:

```gradle
testImplementation 'org.subethamail:subethasmtp:3.1.7'
```

или другой легкий test SMTP server.

Spring Retry можно не добавлять, если retry Kafka делается через `DefaultErrorHandler`, а retry SMTP - через маленький собственный executor с ограниченным backoff. Если хочется единообразия с `Core`, можно использовать:

```gradle
implementation 'org.springframework.retry:spring-retry'
implementation 'org.springframework:spring-aspects'
```

Для MVP предпочтительнее:
- Kafka retry: Spring Kafka `DefaultErrorHandler`;
- email retry внутри processing: максимум 2-3 попытки с backoff;
- финальный провал: DLT.

---

## Конфигурация приложения

`application.properties`:

```properties
spring.application.name=autoshop-notification-service

server.port=${SERVER_PORT:8082}

spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5433/notifications_db}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:autoshop-admin}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:pass}
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml

spring.kafka.bootstrap-servers=${SPRING_KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
spring.kafka.consumer.group-id=${APP_KAFKA_CONSUMER_GROUP:notification-service}
spring.kafka.consumer.auto-offset-reset=earliest
spring.kafka.consumer.enable-auto-commit=false

spring.mail.host=${SPRING_MAIL_HOST:localhost}
spring.mail.port=${SPRING_MAIL_PORT:1025}
spring.mail.username=${SPRING_MAIL_USERNAME:}
spring.mail.password=${SPRING_MAIL_PASSWORD:}
spring.mail.properties.mail.smtp.auth=${SPRING_MAIL_SMTP_AUTH:false}
spring.mail.properties.mail.smtp.starttls.enable=${SPRING_MAIL_STARTTLS:false}

app.kafka.order-events-topic=${APP_KAFKA_ORDER_EVENTS_TOPIC:autoshop.order-events}
app.kafka.order-events-dlt-topic=${APP_KAFKA_ORDER_EVENTS_DLT_TOPIC:autoshop.order-events.dlt}

app.mail.from=${APP_MAIL_FROM:noreply@autoshop.local}
app.mail.from-name=${APP_MAIL_FROM_NAME:AutoShop}

app.retry.email.max-attempts=${APP_RETRY_EMAIL_MAX_ATTEMPTS:3}
app.retry.email.backoff=${APP_RETRY_EMAIL_BACKOFF:500ms}
app.retry.kafka.max-attempts=${APP_RETRY_KAFKA_MAX_ATTEMPTS:3}
app.retry.kafka.backoff=${APP_RETRY_KAFKA_BACKOFF:1s}
```

`application-local.properties.example` должен содержать те же ключи без секретов.

---

## База данных

### Таблица `notification`

Назначение:
хранит итоговое состояние уведомления по конкретному событию и каналу.

```sql
CREATE TABLE notification (
    id BIGSERIAL PRIMARY KEY,
    event_id UUID NOT NULL,
    event_type VARCHAR(80) NOT NULL,
    source VARCHAR(80) NOT NULL,
    channel VARCHAR(30) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_key VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    CONSTRAINT uk_notification_event_channel UNIQUE (event_id, channel)
);
```

Статусы:

```text
PENDING
SENDING
SENT
FAILED
SKIPPED_DUPLICATE
```

Для MVP `SKIPPED_DUPLICATE` можно не хранить отдельной строкой, достаточно не создавать дубль и логировать skip.

### Таблица `notification_delivery_attempt`

Назначение:
история попыток отправки email.

```sql
CREATE TABLE notification_delivery_attempt (
    id BIGSERIAL PRIMARY KEY,
    notification_id BIGINT NOT NULL REFERENCES notification(id),
    attempt_number INTEGER NOT NULL,
    status VARCHAR(40) NOT NULL,
    provider VARCHAR(60) NOT NULL,
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP
);
```

Статусы attempt:

```text
STARTED
SUCCESS
FAILED_RETRYABLE
FAILED_NON_RETRYABLE
```

### Таблица `notification_event_inbox`

Назначение:
отдельный idempotency/inbox слой для Kafka events.

```sql
CREATE TABLE notification_event_inbox (
    event_id UUID PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    source VARCHAR(80) NOT NULL,
    topic VARCHAR(120) NOT NULL,
    partition_number INTEGER,
    offset_number BIGINT,
    status VARCHAR(40) NOT NULL,
    received_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    error_message TEXT
);
```

Статусы inbox:

```text
RECEIVED
PROCESSING
PROCESSED
FAILED
DLQ
```

Почему нужен отдельный inbox:
- проще отличить "event уже видели" от "notification уже отправили";
- можно безопасно повторять обработку;
- легче отлаживать Kafka offset и DLQ.

### Таблица `notification_template`

Для MVP можно засидить metadata, даже если HTML лежит в resources:

```sql
CREATE TABLE notification_template (
    id BIGSERIAL PRIMARY KEY,
    template_key VARCHAR(120) NOT NULL UNIQUE,
    channel VARCHAR(30) NOT NULL,
    subject_template VARCHAR(255) NOT NULL,
    body_template_path VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
```

Seed:

```sql
INSERT INTO notification_template (template_key, channel, subject_template, body_template_path, active, created_at, updated_at)
VALUES
('ORDER_CREATED_EMAIL', 'EMAIL', 'AutoShop: заказ {{orderNumber}} создан', 'email/order-created', TRUE, NOW(), NOW()),
('ORDER_STATUS_CHANGED_EMAIL', 'EMAIL', 'AutoShop: статус заказа {{orderNumber}} изменен', 'email/order-status-changed', TRUE, NOW(), NOW()),
('ORDER_COMPLETED_EMAIL', 'EMAIL', 'AutoShop: заказ {{orderNumber}} завершен', 'email/order-completed', TRUE, NOW(), NOW());
```

Важно:
если используется Thymeleaf, subject можно рендерить отдельным helper-ом или на MVP собирать в Java по `TemplateKey`.

---

## Email templates

### Общий стиль писем

Письма должны быть простыми:
- без тяжелых картинок;
- без внешних CSS;
- с inline-safe HTML;
- с понятным заголовком;
- с номером заказа;
- с подписью AutoShop.

### `order-created.html`

Переменные:

```text
customerFirstName
orderNumber
vehicleBrand
vehicleModel
vehiclePlateNumber
createdAt
```

Основной текст:
- заказ создан;
- команда сервиса скоро начнет обработку;
- номер заказа сохранить для обращения.

### `order-status-changed.html`

Переменные:

```text
customerFirstName
orderNumber
previousStatusLabel
newStatusLabel
changedAt
managerComment
```

Правила:
- комментарий показывать только если он не blank;
- статусы показывать на русском:
  - `NEW` -> `Новый`;
  - `IN_PROGRESS` -> `В работе`;
  - `COMPLETED` -> `Завершен`;
  - `CANCELLED` -> `Отменен`.

### `order-completed.html`

Переменные:

```text
customerFirstName
orderNumber
completedAt
finalAmount
currency
loyaltyPointsEarned
```

Правила:
- блок с баллами показывать только если `loyaltyPointsEarned > 0`;
- сумму форматировать как money;
- не обещать оплату онлайн, если такой функции еще нет.

---

## Processing flow

Целевой flow:

```text
Kafka record
  -> deserialize envelope
  -> validate envelope
  -> check inbox by eventId
  -> if duplicate processed: ack and stop
  -> save inbox RECEIVED/PROCESSING
  -> dispatch by eventType
  -> validate payload
  -> select template
  -> render subject/body
  -> create notification PENDING
  -> send email with bounded retry
  -> save attempts
  -> mark notification SENT
  -> mark inbox PROCESSED
  -> ack Kafka record
```

Failure flow:

```text
Validation error / unknown eventType / invalid email
  -> mark inbox FAILED
  -> mark notification FAILED if created
  -> send record to DLT or let DefaultErrorHandler publish to DLT
  -> ack original after DLT publish
```

Retryable failure:

```text
SMTP temporary failure / connection timeout
  -> retry email send
  -> if still failing, throw RetryableNotificationException
  -> Kafka DefaultErrorHandler retries record
  -> after max attempts, publish to DLT
```

Критичное правило:
если письмо уже отправлено, повторная обработка того же `eventId` не должна отправлять его еще раз.

---

## Kafka error handling и DLQ

Рекомендуемая конфигурация:

- `ConcurrentKafkaListenerContainerFactory`;
- manual ack или record ack после успешной обработки;
- `DefaultErrorHandler`;
- `DeadLetterPublishingRecoverer`;
- fixed backoff из properties;
- DLT topic: `autoshop.order-events.dlt`.

Классификация ошибок:

Retryable:
- SMTP connection timeout;
- SMTP server temporary unavailable;
- Kafka transient infrastructure error;
- database transient connection issue.

Non-retryable:
- JSON parse error;
- unknown `eventType`;
- unsupported `version`;
- missing `eventId`;
- missing or invalid `customerEmail`;
- missing template;
- invalid payload contract.

Правило:
non-retryable ошибки не гонять 3 раза. Они сразу должны уходить в DLT или фиксироваться как failed.

---

## Idempotency

Idempotency обязателен, потому что Kafka дает at-least-once delivery.

Решение MVP:

- `notification_event_inbox.event_id` - primary key;
- `notification.event_id + channel` - unique constraint;
- при входе события сначала пытаемся создать inbox row;
- если insert конфликтует:
  - если status `PROCESSED`, ack и stop;
  - если status `PROCESSING` старый, можно повторить осторожно;
  - если status `FAILED/DLQ`, решение зависит от ручного replay, в MVP лучше не переотправлять автоматически.

Практичный MVP-алгоритм:

```text
1. find inbox by eventId.
2. if PROCESSED -> return duplicate skipped.
3. if not exists -> insert RECEIVED.
4. process in transaction until notification PENDING is created.
5. email sending can happen outside long DB transaction.
6. after send -> mark SENT and PROCESSED.
```

Важно:
не держать транзакцию открытой во время SMTP-вызова дольше необходимого, но и не терять состояние. Для MVP допустима простая реализация с короткими save-переходами статуса:

```text
RECEIVED -> PROCESSING -> PROCESSED
PENDING -> SENDING -> SENT
```

---

## API микросервиса

MVP NotificationService может вообще не иметь публичных бизнес-endpoint-ов, кроме health.

Обязательные технические endpoint-ы:

```http
GET /actuator/health
GET /actuator/info
```

Опционально для локального smoke profile `local`:

```http
POST /api/dev/events/order-created
POST /api/dev/events/order-status-changed
POST /api/dev/events/order-completed
```

Но предпочтительнее smoke через Kafka test producer, чтобы не создавать ложный production API.

Если делается debug endpoint, правила:
- только `@Profile("local")`;
- не документировать как публичный API;
- не использовать его в `Core`.

---

## Docker Compose изменения

Так как план применяется к новому проекту, изменения могут быть в отдельном compose нового сервиса или в общем root compose монорепозитория.

Минимально нужно:

- убедиться, что PostgreSQL создает `notifications_db`;
- включать Kafka profile при запуске;
- Mailhog уже есть;
- добавить service `notification-service` позже, когда Dockerfile будет готов.

Вариант локального запуска без контейнеризации приложения:

```bash
docker compose --profile messaging up -d postgres kafka mailhog
```

Для БД есть два пути:

1. Создать отдельную DB вручную/скриптом:

```sql
CREATE DATABASE notifications_db;
```

2. На MVP использовать тот же database `postgres`, но schema `notifications`.

Рекомендуется отдельная DB `notifications_db`, потому что это отдельный микросервис.

Если текущий compose не создает несколько DB автоматически, добавить init script позже:

```text
docker/postgres/init/01-create-databases.sql
```

Содержимое:

```sql
CREATE DATABASE notifications_db;
```

Важно:
не ломать текущий `Core`, который уже ожидает свою БД/настройки.

---

## Логирование и observability

Логировать:
- `eventId`;
- `eventType`;
- `correlationId`;
- Kafka topic/partition/offset;
- notification id;
- template key;
- retry attempt;
- итоговый status.

Не логировать:
- полный email body;
- SMTP password;
- персональные данные сверх необходимого;
- stack trace на ожидаемые validation errors как error-level шум.

Actuator:

```properties
management.endpoints.web.exposure.include=health,info,metrics
management.endpoint.health.show-details=when_authorized
```

Метрики MVP:
- количество обработанных событий;
- количество отправленных писем;
- количество failed notifications;
- количество DLQ records.

Если Micrometer wiring не успевает в День 11, зафиксировать это как отдельную задачу после MVP, но health обязателен.

---

## Тестовый план

### Unit tests

1. `TemplateKeyResolverTest`
   - `ORDER_CREATED` -> `ORDER_CREATED_EMAIL`;
   - `ORDER_STATUS_CHANGED` -> `ORDER_STATUS_CHANGED_EMAIL`;
   - `ORDER_COMPLETED` -> `ORDER_COMPLETED_EMAIL`;
   - unknown event -> exception.

2. `StatusLabelMapperTest`
   - `NEW` -> `Новый`;
   - `IN_PROGRESS` -> `В работе`;
   - `COMPLETED` -> `Завершен`;
   - unknown -> raw value or controlled exception.

3. `ThymeleafTemplateRendererTest`
   - renders order number;
   - hides empty manager comment;
   - hides zero loyalty points.

4. `EmailValidationTest`
   - blank email -> non-retryable;
   - invalid email -> non-retryable;
   - normal email -> ok.

### Service tests

1. `NotificationProcessingServiceTest`
   - creates notification for valid event;
   - skips duplicate processed `eventId`;
   - marks failed for invalid payload;
   - records delivery attempts.

2. `EmailSenderRetryTest`
   - temporary SMTP failure retries;
   - success after second attempt marks SENT;
   - permanent invalid recipient does not retry.

### Integration tests

1. PostgreSQL Testcontainers:
   - Liquibase миграции применяются;
   - unique constraint по `event_id/channel` работает.

2. Kafka Testcontainers:
   - producer отправляет `ORDER_CREATED`;
   - consumer обрабатывает;
   - запись появляется в `notification`;
   - повтор того же event не создает второе письмо.

3. DLQ test:
   - отправить record без `eventId`;
   - убедиться, что он попал в `autoshop.order-events.dlt` или помечен failed согласно выбранной реализации.

### Manual smoke

1. Поднять инфраструктуру:

```bash
docker compose --profile messaging up -d postgres kafka mailhog
```

2. Запустить NotificationService локально:

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

3. Отправить тестовое событие в Kafka.

Варианты:
- через маленький test producer в integration test;
- через `kafka-console-producer`;
- через временный local-only endpoint.

4. Проверить Mailhog:

```text
http://localhost:8025
```

5. Проверить БД:

```sql
SELECT event_id, event_type, channel, recipient, status, sent_at
FROM notification
ORDER BY id DESC;
```

6. Повторить то же событие с тем же `eventId`.

Ожидание:
- второго письма нет;
- второй `notification` row не создан;
- в логах видно duplicate skip.

---

## Порядок работ на 8 часов

### 0:00-0:30 - Зафиксировать skeleton проекта

- Создать `autoshop-notification-service`.
- Настроить `settings.gradle`, `build.gradle`.
- Создать main application class.
- Поднять пустой context test.

Проверка:

```bash
./gradlew test
```

### 0:30-1:20 - Конфиг и инфраструктура

- Добавить `application.properties`.
- Добавить local/example properties.
- Настроить datasource.
- Настроить Kafka properties.
- Настроить mail properties.
- Добавить Actuator health.

Проверка:

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

### 1:20-2:20 - Liquibase и entities

- Создать changelog:
  - `notification`;
  - `notification_delivery_attempt`;
  - `notification_event_inbox`;
  - `notification_template`.
- Создать entities/repositories.
- Проверить миграции на чистой БД.

Проверка:

```bash
./gradlew test
```

### 2:20-3:20 - Event DTO и dispatcher

- Создать `NotificationEventEnvelope`.
- Создать payload DTO:
  - `OrderCreatedPayload`;
  - `OrderStatusChangedPayload`;
  - `OrderCompletedPayload`.
- Реализовать validation.
- Реализовать dispatcher по `eventType`.
- Реализовать template key resolver.

Проверка:
- unit tests на mapping и validation.

### 3:20-4:30 - Templates и rendering

- Подключить Thymeleaf.
- Создать 3 HTML templates.
- Создать renderer.
- Создать subject builder.
- Создать status label mapper.

Проверка:
- unit tests, которые рендерят HTML и проверяют ключевые поля.

### 4:30-5:40 - Email sender + retry

- Реализовать `EmailSender`.
- Реализовать `SmtpEmailSender`.
- Реализовать bounded retry для SMTP.
- Сохранять delivery attempts.
- Классифицировать retryable/non-retryable ошибки.

Проверка:
- unit tests с mock `JavaMailSender`.

### 5:40-6:50 - Kafka consumer + DLQ

- Настроить `KafkaConsumerConfig`.
- Реализовать `NotificationEventConsumer`.
- Подключить `DefaultErrorHandler`.
- Подключить `DeadLetterPublishingRecoverer`.
- Сделать DLT topic config.
- Проверить ack semantics.

Проверка:
- Kafka integration test или ручной producer.

### 6:50-7:30 - Idempotency hardening

- Довести inbox flow.
- Добавить unique constraints.
- Проверить duplicate event.
- Убедиться, что повтор не отправляет письмо.

Проверка:
- service/integration test на duplicate `eventId`.

### 7:30-8:00 - Smoke, документация, фиксация хвостов

- Прогнать ручной smoke через Mailhog.
- Обновить README нового сервиса:
  - запуск;
  - env vars;
  - topics;
  - пример события;
  - Mailhog URL.
- Зафиксировать задачу на 22.04:
  - producer в `Core`;
  - real event publishing from order lifecycle;
  - E2E scenario.

---

## Минимальный README нового сервиса

README должен содержать:

```text
# AutoShop NotificationService

## Run locally
docker compose --profile messaging up -d postgres kafka mailhog
./gradlew bootRun --args='--spring.profiles.active=local'

## Mailhog
SMTP: localhost:1025
UI: http://localhost:8025

## Kafka
Topic: autoshop.order-events
DLT: autoshop.order-events.dlt
Consumer group: notification-service

## Supported events
- ORDER_CREATED
- ORDER_STATUS_CHANGED
- ORDER_COMPLETED

## Idempotency
eventId is required and must be globally unique.
```

---

## Контракт с будущим Core producer

На 22.04 при подключении `Core` нужно будет сделать:

- добавить outbox/event publisher в `Core`;
- генерировать `eventId`;
- публиковать `ORDER_CREATED` после создания заказа;
- публиковать `ORDER_STATUS_CHANGED` после реальной смены статуса;
- публиковать `ORDER_COMPLETED` при завершении заказа и после расчета loyalty points;
- не публиковать событие, если транзакция изменения заказа откатилась;
- добавить correlation id в logs;
- согласовать topic и payload version.

Важно для Дня 11:
не ждать этого producer-а, но сделать contract таким, чтобы его можно было подключить без переделки NotificationService.

---

## Риски дня и как их закрыть

### Риск 1. Kafka consumer работает, но письма дублируются

Причина:
нет idempotency по `eventId`.

Защита:
- unique constraints;
- inbox table;
- duplicate test.

### Риск 2. Retry отправляет одно письмо несколько раз

Причина:
непонятно, успел SMTP принять письмо или нет.

Защита MVP:
- после успешного `JavaMailSender.send()` сразу mark SENT;
- повтор того же event не отправлять;
- attempts хранить отдельно;
- понимать, что exactly-once email delivery невозможен, но duplicates минимизируются.

### Риск 3. NotificationService начинает ходить в Core за данными

Причина:
payload слишком бедный.

Защита:
- все данные для письма включить в event payload;
- если поля нет, письмо не отправлять или рендерить без блока, но не делать REST call.

### Риск 4. DLQ превращается в мусорную корзину без диагностики

Причина:
нет error metadata.

Защита:
- логировать eventId/type/correlationId;
- сохранять error_message в inbox/notification;
- в DLT headers оставить exception class/message.

### Риск 5. Сервис невозможно запустить отдельно

Причина:
зависимость от текущего `Core` repository/config.

Защита:
- отдельные `application-local.properties`;
- отдельная DB;
- только Kafka как вход;
- README с запуском.

---

## Definition of Done Дня 11

День считается закрытым, если выполнено:

- `NotificationService` находится в отдельном проекте.
- Приложение стартует локально без `Core`.
- Liquibase создает таблицы notification-сервиса.
- Kafka consumer слушает `autoshop.order-events`.
- Валидное `ORDER_CREATED` приводит к email в Mailhog.
- Валидное `ORDER_STATUS_CHANGED` приводит к email в Mailhog.
- Валидное `ORDER_COMPLETED` приводит к email в Mailhog.
- Повтор события с тем же `eventId` не отправляет дубль.
- Невалидное событие не ломает consumer loop.
- После исчерпания retry событие попадает в DLT или фиксируется как failed согласно выбранной реализации.
- В БД видны notification status и delivery attempts.
- Есть unit/integration tests критичного пути.
- README объясняет запуск, topics и пример события.

---

## Короткий чек-лист перед завершением дня

- [ ] Новый проект создан отдельно от `autoshop-core`.
- [ ] `./gradlew test` проходит.
- [ ] `./gradlew bootRun --args='--spring.profiles.active=local'` стартует.
- [ ] Kafka topic выбран и зафиксирован.
- [ ] DLT topic выбран и зафиксирован.
- [ ] Email templates лежат в resources.
- [ ] SMTP идет в Mailhog.
- [ ] `eventId` обязателен.
- [ ] Duplicate event не отправляет второе письмо.
- [ ] Retry не бесконечный.
- [ ] Non-retryable ошибки не гоняются по кругу.
- [ ] README нового сервиса обновлен.
- [ ] Задача на 22.04 записана: добавить producer events в `Core`.
