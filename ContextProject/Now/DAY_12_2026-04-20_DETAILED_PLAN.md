# Подробный план на День 12: 20 апреля 2026

Основа плана:
- `ContextProject/Now/FULL_PLAN_TO_2026-05-01.md`
- `ContextProject/Now/DEVELOPMENT_ROADMAP.md`
- `ContextProject/Now/DAY_1_2026-04-09_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_10_2026-04-18_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_11_2026-04-19_DETAILED_PLAN.md`
- `ContextProject/Now/NOTIFICATION_SERVICE_ARCHITECTURE_AND_CORE_INTEGRATION.md`
- текущее состояние `Core` после реализации `Client`, `Vehicle`, `Order`, `Parts`, `Loyalty`, `UMAPI`, `Carreta`
- локальная инфраструктура `docker-compose.yml`: PostgreSQL, Redis, Kafka, MinIO, Mailhog

Главная цель дня:
Создать отдельный микросервис `FileStorageService`, который умеет работать с MinIO как S3-compatible object storage: инициализировать buckets, принимать upload, отдавать download, выдавать presigned URL, хранить metadata файлов в PostgreSQL и давать стабильный REST-контракт для будущей интеграции `Core <-> FileStorage` 23.04.

Важно:
`FileStorageService` создается как новый проект, а не как пакет внутри `autoshop-core`.

Рекомендуемое имя нового проекта:

```text
autoshop-file-storage-service
```

Рекомендуемый package:

```text
com.vladko.autoshopfilestorage
```

---

## Что должно быть готово к концу 20 апреля 2026

- Создан отдельный Spring Boot проект `FileStorageService`:
  - Java 17;
  - Spring Boot 3.x;
  - Gradle;
  - PostgreSQL;
  - Liquibase;
  - MinIO Java SDK;
  - Validation;
  - Actuator;
  - Testcontainers.
- Есть отдельная база `files_db` или отдельная schema `files`, если локальный compose пока использует один PostgreSQL instance.
- Есть нормальная package-структура:
  - `config`
  - `storage`
  - `file`
  - `bucket`
  - `metadata`
  - `presign`
  - `validation`
  - `common`
- Есть MinIO integration layer:
  - configuration properties;
  - `MinioClient` bean;
  - bucket initializer;
  - upload object;
  - download object;
  - remove object for rollback/soft-delete cleanup;
  - presigned GET URL;
  - optional presigned PUT URL как plan-ready extension, но не как обязательный MVP.
- Есть buckets:
  - `car-inspections`;
  - `documents`;
  - `avatars`;
  - `estimates`.
- Есть metadata persistence:
  - file id;
  - bucket;
  - object key;
  - original filename;
  - content type;
  - size;
  - checksum;
  - category;
  - owner reference;
  - uploader reference;
  - status;
  - audit timestamps.
- Есть REST API:
  - upload multipart;
  - download через service;
  - получить metadata;
  - список файлов по owner;
  - выдать presigned download URL;
  - soft delete metadata + object delete или delayed cleanup.
- Есть validation:
  - допустимые категории;
  - допустимые content types;
  - ограничения размера;
  - filename sanitization;
  - запрет path traversal;
  - запрет user-supplied object key.
- Есть error handling:
  - нормальный JSON error response;
  - различение validation/not found/storage unavailable/conflict;
  - MinIO credentials/connection errors не протекают наружу сырыми stack traces.
- Есть ручной smoke-сценарий:
  - поднять PostgreSQL + MinIO;
  - запустить FileStorageService;
  - проверить создание buckets;
  - загрузить файл;
  - увидеть metadata в БД;
  - скачать файл через service endpoint;
  - получить presigned URL;
  - скачать файл по presigned URL;
  - удалить файл и убедиться, что повторный download возвращает корректную ошибку.
- Есть тесты:
  - unit для bucket/category resolver;
  - unit для object key factory;
  - unit для file validation;
  - service test для metadata lifecycle;
  - controller test для HTTP-контракта;
  - integration test с MinIO-compatible container, если хватает времени.

---

## Главный результат дня

После Дня 12 `FileStorageService` должен быть самостоятельным рабочим микросервисом, который уже можно подключать к `Core` 23.04 без перепроектирования.

Ключевая мысль:
`FileStorageService` отвечает за бинарные файлы и metadata, но не должен становиться частью доменной модели заказов, автомобилей или клиентов.

Правильная граница ответственности:
- `Core` знает, что у заказа/авто/клиента есть файлы, и хранит только file references или вызывает FileStorage API;
- `FileStorageService` знает `ownerType` и `ownerId` как внешнюю ссылку, но не делает FK в таблицы `Core`;
- MinIO хранит bytes;
- PostgreSQL FileStorageService хранит metadata и lifecycle;
- AuthService позже даст user identity/roles, но День 12 не должен блокироваться на полной security-интеграции.

По календарю:

```text
20.04 | FileStorageService: MinIO buckets, upload/download, presigned URL, metadata
21.04 | Интеграция Core <-> Auth
23.04 | Интеграция Core <-> FileStorage
```

Поэтому День 12 делает service contract и локальный smoke полностью рабочими, но не обязан менять `Core`.

---

## MVP-граница Дня 12

Обязательный scope на 10 часов:
- создать новый Spring Boot проект;
- подключить PostgreSQL, Liquibase, MinIO SDK;
- описать `FileMetadata` и миграции;
- настроить MinIO client и startup bucket initialization;
- реализовать upload/download;
- реализовать presigned download URL;
- реализовать metadata API;
- реализовать validation типов/размеров;
- покрыть критичный путь тестами;
- описать smoke в README.

Необязательный scope, если останется время:
- presigned PUT upload flow;
- thumbnails для изображений;
- image compression;
- scheduled cleanup orphan objects;
- virus scan placeholder state;
- object versioning;
- Kafka event `FILE_UPLOADED`;
- отдельная admin endpoint для bucket health.

Следующий scope после Дня 12:
- 23.04: интегрировать `Core` с FileStorage для документов и фото к заказам/авто;
- позже: роли и access policy через AuthService;
- позже: thumbnails/compression для Web/Android;
- позже: production S3 provider вместо MinIO без смены бизнес-контракта.

---

## Что не делаем в День 12

- Не реализуем FileStorageService внутри `autoshop-core`.
- Не добавляем прямые foreign key из `files_db` в таблицы `Core`.
- Не меняем домены `Order` и `Vehicle` в этот день, кроме документации будущего контракта.
- Не делаем полноценную авторизацию и role-based file access, потому что интеграция Core/Auth идет отдельными днями.
- Не храним MinIO secret key в репозитории.
- Не даем клиенту выбирать bucket или object key напрямую.
- Не делаем публичные buckets.
- Не возвращаем постоянные MinIO object URLs вместо presigned URL.
- Не грузим файлы напрямую в MinIO из `Core`, обходя FileStorageService.
- Не храним bytes в PostgreSQL.
- Не делаем image processing обязательным для MVP дня.
- Не делаем сложную дедупликацию по checksum как обязательное поведение.
- Не делаем permanent hard delete без metadata audit trail.
- Не используем Kafka для file upload lifecycle в MVP.

---

## Ключевой контекст проекта на старт Дня 12

Перед реализацией нужно держать фактическую картину:

- `Core` уже имеет рабочие вертикальные модули:
  - `client`;
  - `vehicle`;
  - `order`;
  - `parts`;
  - `loyalty`;
  - `procurement`;
  - external integrations `UMAPI`/`Carreta`.
- `NotificationService` спланирован как отдельный микросервис и задает правильный стиль:
  - отдельный проект;
  - собственная БД;
  - собственная зона ответственности;
  - без синхронной доменной зависимости от `Core`.
- Локальный `docker-compose.yml` уже содержит:
  - PostgreSQL на `localhost:5433`;
  - MinIO API на `localhost:9000`;
  - MinIO Console на `localhost:9001`;
  - root credentials через env:
    - `MINIO_ROOT_USER`;
    - `MINIO_ROOT_PASSWORD`.
- В `Core` уже есть свойства:
  - `app.minio.url`;
  - `app.minio.access-key`;
  - `app.minio.secret-key`;
  но это не означает, что Core должен владеть MinIO. В День 12 эти свойства нужно рассматривать как историческую инфраструктурную заготовку, а не как архитектурное решение для прямого доступа Core -> MinIO.
- Roadmap FileStorageService уже зафиксировал bucket names:
  - `car-inspections`;
  - `documents`;
  - `avatars`;
  - `estimates`.
- День 23 будет подключать документы и фото к заказам/авто. Поэтому API Дня 12 должен заранее поддержать owner reference:
  - `ownerType`;
  - `ownerId`;
  - `category`.

---

## Архитектурные решения, которые надо зафиксировать утром

Перед кодингом нужно принять 18 решений и дальше не менять их посреди дня:

1. `FileStorageService` - отдельный Spring Boot application, не модуль внутри `Core`.
2. PostgreSQL FileStorageService - источник правды по metadata и lifecycle.
3. MinIO - источник правды по bytes.
4. Metadata создается в одной transaction с бизнес-решением upload lifecycle, но MinIO операция сама по себе не участвует в DB transaction. Нужен rollback/compensation.
5. File id - `UUID`, потому что это внешний identifier между микросервисами и клиентами.
6. Object key генерируется сервисом, а не приходит от клиента.
7. Bucket выбирается только через `FileCategory`.
8. `ownerType` и `ownerId` - внешняя ссылка без FK.
9. `ownerType` в MVP должен быть enum/string с whitelist, а не произвольная строка.
10. Upload MVP идет через multipart endpoint FileStorageService.
11. Presigned URL в MVP обязателен для download.
12. Presigned PUT upload проектируется как extension, но не обязан входить в 10-часовой scope.
13. Download через service endpoint остается нужен даже при presigned URL, потому что Web/Android и Core могут использовать разные режимы.
14. Soft delete по умолчанию: metadata переводится в `DELETED`, object удаляется из MinIO или ставится cleanup marker. В MVP можно удалять object сразу, но metadata оставить.
15. Content type нельзя слепо доверять только request header. В MVP достаточно whitelist по declared content type + extension sanity check, но в плане оставить место для Apache Tika.
16. Максимальные размеры задаются через properties по категориям.
17. Buckets создаются на startup, если отсутствуют; это допустимо для local/dev. В production может быть выключаемое поведение.
18. FileStorageService не дергает `Core`, чтобы проверить существование order/vehicle в День 12. Проверка принадлежит будущей интеграции 23.04.

Если эти решения не принять сразу, сервис быстро расползется:
- Core начнет напрямую работать с MinIO;
- в metadata появятся неявные связи с таблицами другого сервиса;
- клиент сможет подсовывать object key;
- presigned URL станет permanent URL;
- удаление файлов станет необратимым и плохо аудируемым.

---

## Технологический стек нового сервиса

Рекомендуемые dependencies:

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.5.9'
    id 'io.spring.dependency-management' version '1.1.7'
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.liquibase:liquibase-core'
    implementation 'io.minio:minio:8.5.17'

    compileOnly 'org.projectlombok:lombok'
    runtimeOnly 'org.postgresql:postgresql'
    annotationProcessor 'org.projectlombok:lombok'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.boot:spring-boot-testcontainers'
    testImplementation 'org.testcontainers:junit-jupiter'
    testImplementation 'org.testcontainers:postgresql'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```

Примечание:
- если MinIO Testcontainers делается через generic container, отдельная dependency `org.testcontainers:minio` может быть недоступна или не нужна;
- для image processing `Thumbnailator` не подключать в обязательный MVP, чтобы не раздувать День 12.

---

## Рекомендуемая структура проекта

```text
autoshop-file-storage-service/
├── build.gradle
├── settings.gradle
├── README.md
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com/vladko/autoshopfilestorage
│   │   │       ├── FileStorageServiceApplication.java
│   │   │       ├── bucket
│   │   │       │   ├── BucketInitializer.java
│   │   │       │   ├── BucketNameResolver.java
│   │   │       │   └── StorageBucket.java
│   │   │       ├── common
│   │   │       │   ├── BaseEntity.java
│   │   │       │   ├── ErrorResponse.java
│   │   │       │   └── GlobalExceptionHandler.java
│   │   │       ├── config
│   │   │       │   ├── MinioConfiguration.java
│   │   │       │   ├── StorageProperties.java
│   │   │       │   └── WebConfiguration.java
│   │   │       ├── file
│   │   │       │   ├── controller
│   │   │       │   │   └── FileController.java
│   │   │       │   ├── dto
│   │   │       │   │   ├── FileMetadataResponseDTO.java
│   │   │       │   │   ├── FileUploadRequestDTO.java
│   │   │       │   │   ├── FileUploadResponseDTO.java
│   │   │       │   │   ├── OwnerFilesResponseDTO.java
│   │   │       │   │   └── PresignedUrlResponseDTO.java
│   │   │       │   ├── entity
│   │   │       │   │   ├── FileCategory.java
│   │   │       │   │   ├── FileMetadata.java
│   │   │       │   │   ├── FileOwnerType.java
│   │   │       │   │   └── FileStatus.java
│   │   │       │   ├── exception
│   │   │       │   │   ├── FileNotFoundException.java
│   │   │       │   │   ├── FileValidationException.java
│   │   │       │   │   └── StorageOperationException.java
│   │   │       │   ├── mapper
│   │   │       │   │   └── FileMetadataMapper.java
│   │   │       │   ├── repository
│   │   │       │   │   └── FileMetadataRepository.java
│   │   │       │   └── service
│   │   │           ├── FileMetadataService.java
│   │   │           ├── FileStorageFacade.java
│   │   │           └── FileStorageServiceImpl.java
│   │   │       ├── presign
│   │   │       │   ├── PresignedUrlService.java
│   │   │       │   └── PresignedUrlServiceImpl.java
│   │   │       ├── storage
│   │   │       │   ├── MinioObjectStorageClient.java
│   │   │       │   ├── ObjectStorageClient.java
│   │   │       │   ├── StoredObject.java
│   │   │       │   └── StorageObjectKeyFactory.java
│   │   │       └── validation
│   │   │           ├── ContentTypePolicy.java
│   │   │           ├── FileUploadValidator.java
│   │   │           └── FilenameSanitizer.java
│   │   └── resources
│   │       ├── application.properties
│   │       ├── application-local.properties.example
│   │       └── db/changelog
│   │           ├── db.changelog-master.yaml
│   │           └── db.changelog-1.0-file-metadata.sql
│   └── test
│       └── java/com/vladko/autoshopfilestorage
│           ├── file
│           ├── storage
│           └── validation
```

Важно:
`ObjectStorageClient` нужен как boundary над MinIO SDK. Остальной код сервиса не должен знать детали `PutObjectArgs`, `GetObjectArgs`, `GetPresignedObjectUrlArgs`.

---

## Конфигурация приложения

`application.properties`:

```properties
spring.application.name=autoshop-file-storage-service
server.port=${SERVER_PORT:8083}

spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:${POSTGRES_PORT:5433}/${POSTGRES_DB:postgres}}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:${POSTGRES_USER:autoshop-admin}}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:${POSTGRES_PASSWORD:pass}}
spring.datasource.driver-class-name=org.postgresql.Driver

spring.jpa.hibernate.ddl-auto=validate
spring.jpa.open-in-view=false
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml

management.endpoints.web.exposure.include=health,info
management.endpoint.health.probes.enabled=true

app.storage.minio.endpoint=${APP_STORAGE_MINIO_ENDPOINT:http://localhost:${MINIO_API_PORT:9000}}
app.storage.minio.access-key=${APP_STORAGE_MINIO_ACCESS_KEY:${MINIO_ROOT_USER:minioadmin}}
app.storage.minio.secret-key=${APP_STORAGE_MINIO_SECRET_KEY:${MINIO_ROOT_PASSWORD:minioadmin}}
app.storage.minio.create-buckets-on-startup=${APP_STORAGE_CREATE_BUCKETS_ON_STARTUP:true}

app.storage.buckets.car-inspections=${APP_STORAGE_BUCKET_CAR_INSPECTIONS:car-inspections}
app.storage.buckets.documents=${APP_STORAGE_BUCKET_DOCUMENTS:documents}
app.storage.buckets.avatars=${APP_STORAGE_BUCKET_AVATARS:avatars}
app.storage.buckets.estimates=${APP_STORAGE_BUCKET_ESTIMATES:estimates}

app.storage.presigned.download-ttl=${APP_STORAGE_PRESIGNED_DOWNLOAD_TTL:15m}

app.storage.limits.default-max-size=${APP_STORAGE_DEFAULT_MAX_SIZE:10485760}
app.storage.limits.avatar-max-size=${APP_STORAGE_AVATAR_MAX_SIZE:5242880}
app.storage.limits.photo-max-size=${APP_STORAGE_PHOTO_MAX_SIZE:15728640}
app.storage.limits.document-max-size=${APP_STORAGE_DOCUMENT_MAX_SIZE:20971520}
```

Local profile:

```properties
spring.config.activate.on-profile=local

server.port=8083

spring.datasource.url=jdbc:postgresql://localhost:5433/postgres
spring.datasource.username=autoshop-admin
spring.datasource.password=pass

app.storage.minio.endpoint=http://localhost:9000
app.storage.minio.access-key=minioadmin
app.storage.minio.secret-key=minioadmin
app.storage.minio.create-buckets-on-startup=true
```

Важно:
- реальные MinIO credentials не коммитить;
- `application-local.properties` можно держать в `.gitignore`, а `application-local.properties.example` оставить в репозитории;
- порт `8083` выбран после `Core` и `NotificationService` (`8082`).

---

## Bucket strategy

### Buckets MVP

| Bucket | Назначение | Категории |
|---|---|---|
| `car-inspections` | фото осмотров авто и заказов | `VEHICLE_PHOTO`, `ORDER_INSPECTION_PHOTO` |
| `documents` | договоры, акты, generic documents | `ORDER_DOCUMENT`, `CUSTOMER_DOCUMENT`, `VEHICLE_DOCUMENT` |
| `avatars` | аватары клиентов/сотрудников | `CUSTOMER_AVATAR`, `EMPLOYEE_AVATAR` |
| `estimates` | сметы, счета, PDF результатов | `ORDER_ESTIMATE`, `INVOICE`, `REPORT` |

Правила:
- bucket name берется из properties;
- category -> bucket mapping централизован в `BucketNameResolver`;
- endpoint upload не принимает bucket напрямую;
- новые bucket names добавляются через enum + properties + tests.

### Object key strategy

Object key должен быть предсказуем для обслуживания, но не раскрывать личные данные и не зависеть от original filename.

Рекомендуемый формат:

```text
{category-lower}/{yyyy}/{MM}/{dd}/{fileId}/{safeBaseName}-{shortChecksum}.{extension}
```

Пример:

```text
order-document/2026/04/20/5d58e7f4-9b62-4c46-8ed6-14b6c1f4d064/act-3fa9b2c1.pdf
```

Правила:
- `fileId` генерируется до upload;
- filename sanitization убирает path separators и control characters;
- extension берется из sanitized original filename, но сверяется с content type policy;
- если extension неизвестен, использовать `.bin` только для разрешенных binary categories;
- object key никогда не строится из `ownerId` напрямую, чтобы не облегчать перебор.

---

## Metadata model

### Entity `FileMetadata`

Рекомендуемая модель:

```java
@Entity
@Table(name = "file_metadata")
public class FileMetadata {
    @Id
    private UUID id;

    @Enumerated(EnumType.STRING)
    private FileCategory category;

    @Enumerated(EnumType.STRING)
    private FileOwnerType ownerType;

    private String ownerId;
    private String uploadedBy;

    private String bucketName;
    private String objectKey;
    private String originalFilename;
    private String contentType;
    private Long sizeBytes;
    private String checksumSha256;
    private String etag;

    @Enumerated(EnumType.STRING)
    private FileStatus status;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
}
```

### `FileCategory`

```text
ORDER_DOCUMENT
ORDER_ESTIMATE
ORDER_INSPECTION_PHOTO
VEHICLE_PHOTO
VEHICLE_DOCUMENT
CUSTOMER_DOCUMENT
CUSTOMER_AVATAR
EMPLOYEE_AVATAR
INVOICE
REPORT
```

### `FileOwnerType`

```text
ORDER
VEHICLE
CUSTOMER
EMPLOYEE
PART
PURCHASE_ORDER
SYSTEM
```

Важно:
- `ownerId` строковый, потому что разные сервисы могут иметь разные id strategy;
- в День 23 `Core` скорее всего будет передавать Long id как строку;
- позже AuthService может передавать `uploadedBy` как user id / subject.

### `FileStatus`

```text
PENDING
AVAILABLE
UPLOAD_FAILED
DELETED
```

Lifecycle:

```text
validate request
  -> create metadata PENDING
  -> upload object to MinIO
  -> update metadata AVAILABLE with size/checksum/etag/objectKey
  -> return response
```

Failure path:

```text
validate request
  -> create metadata PENDING
  -> MinIO upload fails
  -> update metadata UPLOAD_FAILED
  -> try to delete partial object if objectKey exists
  -> return 503 or 500 depending on failure type
```

---

## Liquibase schema

MVP SQL:

```sql
CREATE TABLE file_metadata (
    id UUID PRIMARY KEY,
    category VARCHAR(64) NOT NULL,
    owner_type VARCHAR(64) NOT NULL,
    owner_id VARCHAR(128) NOT NULL,
    uploaded_by VARCHAR(128),
    bucket_name VARCHAR(128) NOT NULL,
    object_key VARCHAR(1024) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64),
    etag VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX ux_file_metadata_bucket_object_key
    ON file_metadata(bucket_name, object_key);

CREATE INDEX ix_file_metadata_owner
    ON file_metadata(owner_type, owner_id, status, created_at DESC);

CREATE INDEX ix_file_metadata_status_created_at
    ON file_metadata(status, created_at);

CREATE INDEX ix_file_metadata_checksum
    ON file_metadata(checksum_sha256);
```

Если используется отдельная schema:

```sql
CREATE SCHEMA IF NOT EXISTS files;
CREATE TABLE files.file_metadata (...);
```

Решение для MVP:
- если новый проект запускается на общем local Postgres database `postgres`, использовать schema `files`;
- если удобно создать отдельную database `files_db`, использовать default schema `public`;
- в плане и README явно написать выбранный вариант, чтобы 23.04 не искать metadata.

---

## REST API MVP

Base path:

```text
/api/files
```

### 1. Upload file

```http
POST /api/files
Content-Type: multipart/form-data
```

Parts:

```text
file: MultipartFile
category: ORDER_DOCUMENT
ownerType: ORDER
ownerId: 42
uploadedBy: 7
```

Response `201 Created`:

```json
{
  "id": "5d58e7f4-9b62-4c46-8ed6-14b6c1f4d064",
  "category": "ORDER_DOCUMENT",
  "ownerType": "ORDER",
  "ownerId": "42",
  "originalFilename": "act.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 184522,
  "checksumSha256": "3fa9b2c1...",
  "status": "AVAILABLE",
  "createdAt": "2026-04-20T10:15:30Z"
}
```

Правила:
- `file` обязателен;
- пустой файл запрещен;
- `category`, `ownerType`, `ownerId` обязательны;
- `uploadedBy` optional до полной Auth-интеграции;
- `bucketName` и `objectKey` не отдавать в обычном публичном response, если нет admin необходимости.

### 2. Get metadata

```http
GET /api/files/{fileId}
```

Response `200 OK`:

```json
{
  "id": "5d58e7f4-9b62-4c46-8ed6-14b6c1f4d064",
  "category": "ORDER_DOCUMENT",
  "ownerType": "ORDER",
  "ownerId": "42",
  "originalFilename": "act.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 184522,
  "checksumSha256": "3fa9b2c1...",
  "status": "AVAILABLE",
  "createdAt": "2026-04-20T10:15:30Z",
  "deletedAt": null
}
```

### 3. List files by owner

```http
GET /api/files?ownerType=ORDER&ownerId=42
```

Optional filters:

```text
category=ORDER_DOCUMENT
includeDeleted=false
page=0
size=20
```

Response:

```json
{
  "items": [
    {
      "id": "5d58e7f4-9b62-4c46-8ed6-14b6c1f4d064",
      "category": "ORDER_DOCUMENT",
      "ownerType": "ORDER",
      "ownerId": "42",
      "originalFilename": "act.pdf",
      "contentType": "application/pdf",
      "sizeBytes": 184522,
      "status": "AVAILABLE",
      "createdAt": "2026-04-20T10:15:30Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

### 4. Download through service

```http
GET /api/files/{fileId}/download
```

Response:
- `200 OK`;
- `Content-Type` из metadata;
- `Content-Disposition: attachment; filename="..."`;
- stream body.

Правила:
- `DELETED` и `UPLOAD_FAILED` не скачиваются;
- если metadata есть, но object исчез из MinIO, вернуть storage error и залогировать inconsistency.

### 5. Presigned download URL

```http
POST /api/files/{fileId}/presigned-download-url
```

Optional request:

```json
{
  "ttlSeconds": 900
}
```

Response:

```json
{
  "fileId": "5d58e7f4-9b62-4c46-8ed6-14b6c1f4d064",
  "url": "http://localhost:9000/documents/...",
  "expiresAt": "2026-04-20T10:30:30Z"
}
```

Rules:
- max TTL ограничить properties, например 1 час;
- default TTL 15 минут;
- URL не сохранять в БД;
- URL не логировать полностью, чтобы не утекали query signature parameters.

### 6. Delete file

```http
DELETE /api/files/{fileId}
```

Response:

```http
204 No Content
```

MVP behavior:
- metadata переводится в `DELETED`;
- `deletedAt` заполняется;
- object удаляется из MinIO;
- повторный delete idempotent: `204`, если файл уже `DELETED`.

Альтернатива:
- object не удалять сразу, а очищать scheduled job. Это безопаснее для восстановления, но требует отдельного cleanup flow. Для Дня 12 можно выбрать прямое удаление object + сохранение metadata audit.

---

## Presigned URL policy

Presigned URL нужен для Web/Android, чтобы не прокачивать большие файлы через backend, когда это не требуется.

MVP:
- `GET` presigned URL для скачивания;
- только для `AVAILABLE` файлов;
- TTL 15 минут;
- max TTL 60 минут;
- URL выдается после проверки metadata.

Не MVP:
- presigned `PUT` upload;
- multipart upload напрямую в MinIO;
- client-side resumable upload.

Plan-ready design для presigned PUT:

```text
POST /api/files/presigned-upload-url
  -> создать metadata PENDING
  -> вернуть PUT URL + required headers
  -> клиент загружает в MinIO
POST /api/files/{fileId}/complete-upload
  -> проверить object exists/stat
  -> заполнить metadata
  -> AVAILABLE
```

Почему не делать это обязательным в День 12:
- появляется двухфазный lifecycle;
- нужны orphan PENDING cleanup;
- сложнее validation content type/size/checksum;
- для MVP достаточно multipart upload через service.

---

## Validation policy

### Size limits

| Category group | Max size MVP |
|---|---:|
| avatars | 5 MB |
| photos/inspections | 15 MB |
| documents/estimates/invoices | 20 MB |
| default | 10 MB |

### Content type whitelist

Documents:

```text
application/pdf
image/jpeg
image/png
```

Photos:

```text
image/jpeg
image/png
image/webp
```

Avatars:

```text
image/jpeg
image/png
image/webp
```

Reports/exports:

```text
application/pdf
text/csv
application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

MVP правило:
- если content type не входит в whitelist категории, вернуть `400`;
- если extension явно конфликтует с content type, вернуть `400`;
- если content type пустой, вернуть `400`.

Future hardening:
- Apache Tika для sniffing;
- antivirus scanning;
- quarantine status.

### Filename rules

`FilenameSanitizer` должен:
- удалить path separators `/` и `\`;
- удалить control characters;
- ограничить длину;
- заменить опасные символы на `_`;
- сохранить человекочитаемую часть для download filename;
- не использовать original filename как единственный источник object key uniqueness.

---

## Error contract

Единый формат:

```json
{
  "timestamp": "2026-04-20T10:15:30Z",
  "status": 400,
  "error": "Bad Request",
  "code": "FILE_VALIDATION_ERROR",
  "message": "Content type is not allowed for category ORDER_DOCUMENT",
  "path": "/api/files"
}
```

Рекомендуемые коды:

| Ситуация | HTTP | Code |
|---|---:|---|
| пустой файл | 400 | `EMPTY_FILE` |
| слишком большой файл | 413 | `FILE_TOO_LARGE` |
| запрещенный content type | 400 | `UNSUPPORTED_CONTENT_TYPE` |
| неизвестная category/ownerType | 400 | `INVALID_FILE_CONTEXT` |
| файл не найден | 404 | `FILE_NOT_FOUND` |
| файл удален | 410 | `FILE_DELETED` |
| MinIO недоступен | 503 | `STORAGE_UNAVAILABLE` |
| ошибка конфигурации bucket/credentials | 500 | `STORAGE_CONFIGURATION_ERROR` |
| object отсутствует при metadata AVAILABLE | 500 | `STORAGE_METADATA_INCONSISTENCY` |

---

## Service flow

### Upload sequence

```text
Controller
  -> validate multipart/request params
  -> FileStorageFacade.upload(...)
    -> generate fileId
    -> sanitize filename
    -> resolve category -> bucket
    -> calculate checksum while reading stream
    -> create metadata PENDING
    -> upload object to MinIO
    -> stat object / collect etag
    -> update metadata AVAILABLE
    -> return response
```

Implementation note:
- не читать большие файлы целиком в memory;
- если checksum нужен, использовать streaming wrapper или временное buffering только в рамках размера MVP;
- для 20 MB лимита допустим более простой подход, но в плане зафиксировать будущий streaming-friendly вариант.

### Download sequence

```text
Controller
  -> FileStorageFacade.download(fileId)
    -> metadata lookup
    -> require status AVAILABLE
    -> get object stream from MinIO
    -> return Resource/StreamingResponseBody with headers
```

### Presigned URL sequence

```text
Controller
  -> metadata lookup
  -> require status AVAILABLE
  -> ttl validation
  -> MinIO presigned GET
  -> return url + expiresAt
```

### Delete sequence

```text
Controller
  -> metadata lookup
  -> if already DELETED return success
  -> delete object from MinIO
  -> set metadata DELETED + deletedAt
```

Если MinIO delete fails:
- если object not found, metadata можно пометить `DELETED`;
- если MinIO unavailable, вернуть `503` и не менять metadata на `DELETED`, чтобы повтор был возможен.

---

## Security baseline Дня 12

Полная security-интеграция не входит в День 12, но сервис нельзя проектировать как будто безопасности не будет.

MVP:
- endpoint-ы пока могут быть открыты для local/dev;
- `uploadedBy` принимается как optional field/header;
- все access-sensitive decisions вынести в отдельный `FileAccessPolicy` interface или оставить TODO boundary, а не размазывать по controller.

Plan-ready interface:

```java
public interface FileAccessPolicy {
    void assertCanUpload(FileUploadContext context);
    void assertCanRead(FileMetadata metadata);
    void assertCanDelete(FileMetadata metadata);
}
```

В День 12 можно сделать `AllowAllFileAccessPolicy` для local MVP, но с явным package и тестом, чтобы 21-23.04 было куда подключать Auth/Core.

Нельзя:
- раздавать MinIO root credentials клиентам;
- делать buckets public;
- логировать presigned URLs целиком;
- считать `uploadedBy` доверенным security principal.

---

## Наблюдаемость и health

Actuator:

```text
GET /actuator/health
GET /actuator/info
```

Health должен проверять:
- приложение живо;
- PostgreSQL доступен стандартным health indicator;
- MinIO доступен хотя бы через bucket exists/stat или отдельный custom health indicator.

Логи:
- upload started/completed без содержимого файла;
- fileId, category, ownerType, ownerId;
- bucket + objectKey можно логировать на debug, но не на info, если есть риск утечки структуры;
- presigned URL query string не логировать.

Метрики optional:
- uploads count;
- downloads count;
- storage errors;
- uploaded bytes by category.

---

## Docker/local infrastructure

На День 12 достаточно использовать существующий root `docker-compose.yml` из `autoshop-core`, если новый проект лежит рядом.

Команды local smoke:

```bash
docker compose up -d postgres minio
```

MinIO:

```text
API: http://localhost:9000
Console: http://localhost:9001
User: minioadmin
Password: minioadmin
```

FileStorageService:

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

Service URL:

```text
http://localhost:8083
```

Future docker-compose service:
- добавить после появления Dockerfile;
- не обязательно в День 12, если локальный run через Gradle стабилен;
- но README должен указать, что сервис зависит от PostgreSQL и MinIO.

---

## Тест-план

### Unit tests

1. `BucketNameResolverTest`
   - `ORDER_DOCUMENT -> documents`;
   - `ORDER_INSPECTION_PHOTO -> car-inspections`;
   - `CUSTOMER_AVATAR -> avatars`;
   - unknown category невозможен через enum, но mapper должен быть покрыт.

2. `StorageObjectKeyFactoryTest`
   - object key содержит category/date/fileId;
   - original filename sanitized;
   - path traversal не попадает в key;
   - одинаковые filenames дают разные keys из-за fileId/checksum.

3. `FilenameSanitizerTest`
   - `"../secret.pdf"` превращается в safe filename;
   - control chars удаляются;
   - пустое имя заменяется на fallback.

4. `FileUploadValidatorTest`
   - пустой файл rejected;
   - превышение размера rejected;
   - запрещенный content type rejected;
   - валидный PDF для `ORDER_DOCUMENT` accepted;
   - валидный JPEG для `VEHICLE_PHOTO` accepted.

5. `PresignedUrlTtlValidatorTest`
   - default TTL;
   - TTL выше max rejected или capped, выбрать одно поведение и покрыть тестом.

### Service tests

1. `FileStorageServiceImplTest`
   - успешный upload создает metadata `AVAILABLE`;
   - MinIO upload failure переводит metadata в `UPLOAD_FAILED`;
   - download deleted file rejected;
   - delete повторно idempotent.

2. `FileMetadataServiceTest`
   - list by owner не возвращает deleted по умолчанию;
   - includeDeleted возвращает deleted;
   - фильтр category работает.

### Controller tests

1. `FileControllerTest`
   - multipart upload returns `201`;
   - invalid content type returns `400`;
   - too large returns `413`;
   - not found returns `404`;
   - deleted returns `410`;
   - presigned endpoint returns URL and expiresAt.

### Integration tests

Минимальный integration test:
- PostgreSQL Testcontainer;
- MinIO GenericContainer (`minio/minio`) или локальный тестовый S3-compatible container;
- application context starts;
- buckets created;
- upload -> metadata in DB -> download returns same bytes;
- presigned GET URL returns same bytes через HTTP client.

Если integration test с MinIO не успевает:
- оставить Testcontainers PostgreSQL;
- MinIO integration проверить ручным smoke;
- в README явно отметить test gap.

---

## Ручной smoke-сценарий

### 1. Поднять зависимости

```bash
docker compose up -d postgres minio
```

### 2. Запустить сервис

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

### 3. Проверить health

```bash
curl http://localhost:8083/actuator/health
```

Ожидаемо:

```json
{"status":"UP"}
```

### 4. Загрузить PDF

```bash
curl -i -X POST http://localhost:8083/api/files \
  -F "file=@./sample.pdf;type=application/pdf" \
  -F "category=ORDER_DOCUMENT" \
  -F "ownerType=ORDER" \
  -F "ownerId=42" \
  -F "uploadedBy=local-user"
```

Ожидаемо:
- `201 Created`;
- response содержит `id`;
- status `AVAILABLE`.

### 5. Проверить metadata

```bash
curl http://localhost:8083/api/files/{fileId}
```

### 6. Скачать через service endpoint

```bash
curl -L -o downloaded.pdf http://localhost:8083/api/files/{fileId}/download
```

Проверить:
- файл открывается;
- размер совпадает.

### 7. Получить presigned URL

```bash
curl -X POST http://localhost:8083/api/files/{fileId}/presigned-download-url
```

Скопировать `url` и проверить:

```bash
curl -L -o presigned.pdf "{url}"
```

### 8. Список файлов owner-а

```bash
curl "http://localhost:8083/api/files?ownerType=ORDER&ownerId=42"
```

### 9. Удалить файл

```bash
curl -i -X DELETE http://localhost:8083/api/files/{fileId}
```

Ожидаемо:
- `204 No Content`;
- повторный download -> `410 FILE_DELETED`;
- metadata доступна и показывает `DELETED`, если API так решено.

---

## README нового проекта

В README обязательно добавить:

```markdown
# AutoShop FileStorageService

## Purpose
Stores file bytes in MinIO and file metadata in PostgreSQL.

## Local dependencies
docker compose up -d postgres minio

## Run
./gradlew bootRun --args='--spring.profiles.active=local'

## Local URLs
- Service: http://localhost:8083
- MinIO API: http://localhost:9000
- MinIO Console: http://localhost:9001

## Buckets
- car-inspections
- documents
- avatars
- estimates

## API
- POST /api/files
- GET /api/files/{fileId}
- GET /api/files?ownerType=ORDER&ownerId=42
- GET /api/files/{fileId}/download
- POST /api/files/{fileId}/presigned-download-url
- DELETE /api/files/{fileId}
```

README не должен обещать:
- production security;
- public bucket access;
- image thumbnails, если они не реализованы;
- direct Core integration до 23.04.

---

## План разработки по блокам

### Блок 1. Создание нового проекта и skeleton

Цель:
получить отдельное приложение, которое стартует на `8083`.

Задачи:
- создать `autoshop-file-storage-service`;
- настроить `settings.gradle`;
- настроить `build.gradle`;
- создать `FileStorageServiceApplication`;
- добавить базовые profiles;
- добавить `.gitignore`;
- добавить пустой README;
- запустить `./gradlew test`.

Definition of done:
- проект компилируется;
- `./gradlew bootRun --args='--spring.profiles.active=local'` стартует;
- `GET /actuator/health` отвечает.

### Блок 2. Database + Liquibase

Цель:
создать устойчивое metadata-хранилище.

Задачи:
- решить `files_db` vs schema `files`;
- добавить Liquibase master changelog;
- добавить `file_metadata`;
- создать `FileMetadata`;
- создать enums;
- создать repository;
- добавить базовый repository test с PostgreSQL Testcontainers или локальным профилем.

Definition of done:
- Liquibase применяет миграцию;
- JPA validate проходит;
- repository сохраняет/читает metadata.

### Блок 3. MinIO configuration + buckets

Цель:
сервис умеет подключаться к MinIO и создавать нужные buckets.

Задачи:
- создать `StorageProperties`;
- создать `MinioConfiguration`;
- создать `BucketNameResolver`;
- создать `BucketInitializer`;
- на startup проверить/создать buckets;
- залогировать результат без credentials.

Definition of done:
- при старте local создаются buckets;
- повторный старт idempotent;
- если MinIO недоступен, сервис падает или health становится DOWN. Для MVP лучше fail fast при startup bucket initialization, чтобы не думать, что сервис работает.

### Блок 4. Upload flow

Цель:
загрузить файл в MinIO и сохранить metadata.

Задачи:
- создать DTO upload response;
- создать `FilenameSanitizer`;
- создать `FileUploadValidator`;
- создать `StorageObjectKeyFactory`;
- создать `ObjectStorageClient`;
- реализовать `MinioObjectStorageClient.putObject`;
- реализовать `FileStorageFacade.upload`;
- сделать controller `POST /api/files`;
- добавить rollback/failed status при MinIO error.

Definition of done:
- upload PDF/JPEG работает;
- metadata в БД `AVAILABLE`;
- object появляется в правильном bucket;
- невалидный файл rejected до MinIO upload.

### Блок 5. Metadata read/list

Цель:
дать Core/Web/Android стабильный способ читать metadata.

Задачи:
- `GET /api/files/{fileId}`;
- `GET /api/files?ownerType=&ownerId=`;
- pagination;
- category filter;
- includeDeleted flag;
- mapper entity -> response DTO.

Definition of done:
- owner list возвращает только свои файлы;
- deleted скрыты по умолчанию;
- DTO не раскрывает MinIO secret/internal details.

### Блок 6. Download through service

Цель:
дать простой backend-mediated download.

Задачи:
- `ObjectStorageClient.getObject`;
- `GET /api/files/{fileId}/download`;
- headers `Content-Type`, `Content-Length`, `Content-Disposition`;
- обработка deleted/missing/unavailable.

Definition of done:
- скачанные bytes совпадают с upload;
- deleted file не скачивается;
- MinIO missing object дает controlled error.

### Блок 7. Presigned download URL

Цель:
дать временную ссылку без public bucket.

Задачи:
- `PresignedUrlService`;
- `POST /api/files/{fileId}/presigned-download-url`;
- TTL validation;
- default/max TTL;
- не логировать URL целиком.

Definition of done:
- URL работает в течение TTL;
- URL ведет на MinIO object;
- deleted/missing file не получает URL;
- слишком большой TTL rejected или capped по выбранному правилу.

### Блок 8. Delete lifecycle

Цель:
сделать удаление безопасным и повторяемым.

Задачи:
- `DELETE /api/files/{fileId}`;
- metadata `DELETED`;
- `deletedAt`;
- object delete from MinIO;
- idempotent repeated delete.

Definition of done:
- после delete download возвращает `410`;
- list без includeDeleted файл не возвращает;
- повторный delete возвращает success без exception.

### Блок 9. Tests + smoke + README

Цель:
закрыть день не просто кодом, а проверенным сервисом.

Задачи:
- unit tests для resolver/key/validator/sanitizer;
- controller tests для основных endpoint-ов;
- service tests для lifecycle;
- integration/smoke с MinIO;
- README с командами запуска и API;
- checklist Day 23 integration notes.

Definition of done:
- `./gradlew test` проходит;
- ручной smoke проходит;
- README содержит актуальные команды.

---

## Почасовой план на 10 часов

### 0:00-0:40 - Project skeleton

- Создать новый проект.
- Настроить Gradle/Spring Boot/Java 17.
- Добавить Actuator.
- Проверить старт на `8083`.

Результат:
приложение стартует и отвечает health.

### 0:40-1:40 - Database schema

- Создать Liquibase.
- Создать `FileMetadata`.
- Создать repository.
- Проверить миграции.

Результат:
metadata persistence готова.

### 1:40-2:40 - MinIO client and buckets

- Настроить properties.
- Создать `MinioClient`.
- Реализовать startup bucket initialization.
- Проверить через MinIO Console.

Результат:
buckets создаются автоматически.

### 2:40-4:20 - Upload endpoint

- Validator.
- Sanitizer.
- Object key factory.
- Storage client put.
- Metadata lifecycle.
- Controller.

Результат:
можно загрузить файл и получить file id.

### 4:20-5:20 - Metadata API

- Get by id.
- List by owner.
- DTO mapper.
- Error handling not found/deleted.

Результат:
metadata contract готов для будущего Core.

### 5:20-6:30 - Download endpoint

- MinIO get object.
- Streaming response.
- Headers.
- Error cases.

Результат:
файл скачивается через сервис.

### 6:30-7:20 - Presigned download URL

- Generate URL.
- TTL.
- Response DTO.
- Smoke через curl.

Результат:
временная ссылка работает.

### 7:20-8:00 - Delete lifecycle

- Soft delete metadata.
- Delete object.
- Idempotency.

Результат:
удаление безопасно и проверяемо.

### 8:00-9:20 - Tests

- Unit tests.
- Controller tests.
- Service lifecycle tests.
- Если хватает времени - MinIO integration test.

Результат:
критичный путь покрыт.

### 9:20-10:00 - README + final smoke

- README.
- Smoke commands.
- Known limitations.
- Day 23 integration notes.

Результат:
сервис готов к подключению.

---

## Контракт для будущей интеграции Core <-> FileStorage 23.04

День 12 должен оставить Core понятный контракт.

### Что Core будет делать 23.04

Для заказа:

```text
POST /api/files
category=ORDER_DOCUMENT
ownerType=ORDER
ownerId={orderId}
```

Для фото осмотра заказа:

```text
POST /api/files
category=ORDER_INSPECTION_PHOTO
ownerType=ORDER
ownerId={orderId}
```

Для документов автомобиля:

```text
POST /api/files
category=VEHICLE_DOCUMENT
ownerType=VEHICLE
ownerId={vehicleId}
```

Для фото автомобиля:

```text
POST /api/files
category=VEHICLE_PHOTO
ownerType=VEHICLE
ownerId={vehicleId}
```

### Что Core не должен делать

- Не должен знать MinIO bucket.
- Не должен знать object key.
- Не должен хранить MinIO URL.
- Не должен напрямую использовать MinIO SDK.
- Не должен сохранять file bytes в свою БД.

### Что Core может хранить

Вариант MVP:
- вообще не хранить отдельную таблицу ссылок, а получать список по `ownerType/ownerId`;
- если нужен быстрый доступ, создать в Core таблицу `order_file_reference` / `vehicle_file_reference` с `fileId`, но без дублирования metadata.

Рекомендуемо для 23.04:
- начать без отдельной таблицы в Core, если список по owner покрывает UI;
- добавить reference table только если нужны порядок, caption, domain-specific flags.

---

## Риски и mitigations

### Риск 1. Metadata сохранена, object upload не удался

Причина:
MinIO операция вне DB transaction.

Mitigation:
- lifecycle `PENDING -> AVAILABLE`;
- при ошибке `UPLOAD_FAILED`;
- cleanup partial object;
- тест failure path.

### Риск 2. Object есть, metadata не сохранилась

Причина:
DB error после MinIO upload.

Mitigation:
- object key содержит fileId;
- при DB failure после upload попробовать удалить object;
- если delete не удался, log error с fileId/objectKey;
- future scheduled orphan cleanup.

### Риск 3. Клиент получит вечный доступ к файлу

Причина:
public bucket или permanent MinIO URL.

Mitigation:
- buckets private;
- только presigned URL;
- short TTL;
- не хранить URL.

### Риск 4. Path traversal через filename

Причина:
использование original filename в object key/download.

Mitigation:
- sanitizer;
- object key generated;
- tests на `../`.

### Риск 5. Несогласованная интеграция с Core 23.04

Причина:
День 12 не заложил owner contract.

Mitigation:
- `ownerType`, `ownerId`, `category` обязательны уже в MVP;
- list endpoint по owner;
- отдельный раздел README "Core integration".

### Риск 6. Сервис случайно станет image processing сервисом

Причина:
roadmap упоминает thumbnails/compression.

Mitigation:
- День 12 scope freeze: thumbnails optional;
- сначала upload/download/metadata;
- image processing только после рабочего storage lifecycle.

### Риск 7. Слишком большие файлы забьют память

Причина:
чтение MultipartFile в byte array.

Mitigation:
- лимиты размера;
- streaming-friendly design;
- для MVP 20 MB допустимы, но в коде не плодить ненужные копии.

---

## Definition of Done Дня 12

День считается завершенным, если:

- [ ] `autoshop-file-storage-service` создан как отдельный проект.
- [ ] Package name: `com.vladko.autoshopfilestorage`.
- [ ] Сервис стартует на `8083`.
- [ ] PostgreSQL metadata schema применяется через Liquibase.
- [ ] `file_metadata` содержит все поля MVP.
- [ ] MinIO client настроен через properties/env.
- [ ] Buckets `car-inspections`, `documents`, `avatars`, `estimates` создаются idempotently.
- [ ] `POST /api/files` загружает файл в правильный bucket.
- [ ] Metadata после upload имеет `AVAILABLE`.
- [ ] `GET /api/files/{fileId}` возвращает metadata.
- [ ] `GET /api/files?ownerType=&ownerId=` возвращает список файлов owner-а.
- [ ] `GET /api/files/{fileId}/download` скачивает bytes.
- [ ] `POST /api/files/{fileId}/presigned-download-url` возвращает рабочую временную ссылку.
- [ ] `DELETE /api/files/{fileId}` переводит файл в `DELETED` и делает download недоступным.
- [ ] Validation запрещает пустой файл, слишком большой файл и неподдержанный content type.
- [ ] Error response единый и понятный.
- [ ] Unit/controller/service tests проходят.
- [ ] Ручной smoke через MinIO проходит.
- [ ] README содержит команды запуска, buckets и API.
- [ ] В README или отдельном разделе зафиксирован контракт для Core-интеграции 23.04.

---

## Финальный чек-лист перед завершением дня

- [ ] Проверить, что в репозиторий не попали MinIO credentials сверх local defaults.
- [ ] Проверить, что buckets не public.
- [ ] Проверить, что response не раскрывает object key без необходимости.
- [ ] Проверить, что presigned URL не логируется полностью.
- [ ] Проверить, что `ownerType/ownerId/category` обязательны.
- [ ] Проверить, что deleted файлы не скачиваются.
- [ ] Проверить, что repeated delete безопасен.
- [ ] Проверить, что сервис не зависит от `autoshop-core` runtime classes.
- [ ] Проверить, что `./gradlew test` проходит.
- [ ] Проверить smoke на чистом MinIO volume или после удаления buckets.

---

## Короткая формула результата

К концу 20 апреля должен появиться не "MinIO helper", а полноценный микросервис хранения файлов:

```text
REST API
  -> validation/access boundary
  -> metadata lifecycle in PostgreSQL
  -> private MinIO buckets
  -> upload/download/presigned URL
  -> stable owner-based contract for Core
```

Такой результат позволит 23.04 подключить документы и фото к заказам/авто без прямой зависимости `Core` от MinIO и без переделки storage-архитектуры.
