# Подробный план на День 15: 23 апреля 2026

Тема дня:

```text
23.04 | 8 часов | Интеграция Core <-> FileStorage: документы и фото к заказам/авто
```

Главная цель:
подключить `autoshop-core` к отдельному микросервису `autoshop-files` так, чтобы документы и фотографии можно было безопасно привязывать к заказам и автомобилям через доменные endpoint'ы Core, а бинарные файлы и metadata оставались ответственностью FileStorageService.

Важно:
этот план рассчитан на отдельный микросервис FileStorage. Не переносить MinIO, bucket logic и metadata persistence внутрь `autoshop-core`.

---

## Основа плана

План опирается на фактическое состояние четырех проектов:

- `autoshop-core`
- `autoshop-auth`
- `autoshop-notification`
- `autoshop-files`

Ключевые найденные факты:

- `FileStorageService` уже имеет HTTP API `/api/files`: upload multipart, metadata, list by owner, download, presigned download URL, delete. См. `autoshop-files/src/main/java/com/vladko/autoshopfilestorage/file/FileController.java:33`.
- Upload в FileStorage уже принимает `category`, `ownerType`, `ownerId`, `uploadedBy`, `MultipartFile`. См. `FileController.java:44`.
- FileStorage уже умеет list by `ownerType + ownerId + category`. См. `FileController.java:61`.
- FileStorage уже умеет direct download, presigned download URL и soft delete. См. `FileController.java:73`, `FileController.java:87`, `FileController.java:96`.
- FileStorage metadata lifecycle уже хранится в PostgreSQL, а bytes идут в MinIO. См. `autoshop-files/src/main/java/com/vladko/autoshopfilestorage/file/FileService.java:66`.
- FileStorage уже имеет нужные категории для DAY 15: `ORDER_DOCUMENT`, `ORDER_ESTIMATE`, `ORDER_INSPECTION_PHOTO`, `VEHICLE_PHOTO`, `VEHICLE_DOCUMENT`. См. `autoshop-files/src/main/java/com/vladko/autoshopfilestorage/bucket/FileCategory.java:3`.
- FileStorage уже имеет `OwnerType.ORDER` и `OwnerType.VEHICLE`. См. `autoshop-files/src/main/java/com/vladko/autoshopfilestorage/file/OwnerType.java:3`.
- Сейчас FileStorage access policy открыта через `AllowAllFileAccessPolicy`, поэтому DAY 15 не должен оставить FileStorage публичной дырой. См. `autoshop-files/src/main/java/com/vladko/autoshopfilestorage/access/AllowAllFileAccessPolicy.java:6`.
- Core уже имеет `OrderController` с базовым `/api/orders/{id}` контрактом. См. `autoshop-core/src/main/java/com/vladko/autoshopcore/order/controller/OrderController.java:19`.
- Core уже имеет `VehicleController` с базовым `/api/vehicles/{id}` контрактом. См. `autoshop-core/src/main/java/com/vladko/autoshopcore/vehicle/controller/VehicleController.java:16`.
- Core уже валидирует Bearer token через AuthService и кладет роли в `SecurityContext`. См. `autoshop-core/src/main/java/com/vladko/autoshopcore/security/RestClientAuthServiceClient.java:33`.
- Core security уже разграничивает роли для orders/vehicles. См. `autoshop-core/src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java:74`.
- AuthService уже имеет endpoint `POST /api/auth/validate` и возвращает `userId`, `email`, `roles`, `jti`, `expiresAt`. См. `autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/controller/AuthController.java:55` и `autoshop-auth/src/main/java/com/vladko/autoshopauth/auth/dto/TokenValidationResponse.java:6`.
- AuthService роли: `ADMIN`, `MANAGER`, `MECHANIC`, `RECEPTIONIST`, `CLIENT`. См. `autoshop-auth/src/main/java/com/vladko/autoshopauth/role/entity/RoleName.java:3`.
- NotificationService показывает стиль отдельного микросервиса: собственная зона ответственности, HTTP/Kafka contracts, envelope, idempotency, без доменной связки с таблицами Core. См. `autoshop-notification/src/main/java/com/vladko/autoshopnotification/event/dto/NotificationEventEnvelope.java:8`.
- Есть конфликт портов: `autoshop-notification` в README использует `8083`, а `autoshop-files` сейчас тоже имеет `server.port=8083`. См. `autoshop-files/src/main/resources/application.properties:2`. DAY 15 должен это исправить для локального запуска всех сервисов.

---

## Что должно быть готово к концу дня

К концу 23 апреля 2026 должно быть готово:

- Core умеет работать с файлами заказов:
  - загрузить документ/смету/фото осмотра к заказу;
  - получить список файлов заказа;
  - получить metadata конкретного файла заказа;
  - скачать файл заказа через Core;
  - получить presigned download URL через Core;
  - удалить файл заказа через Core.
- Core умеет работать с файлами автомобилей:
  - загрузить фото автомобиля;
  - загрузить документ автомобиля;
  - получить список файлов автомобиля;
  - получить metadata конкретного файла автомобиля;
  - скачать файл автомобиля через Core;
  - получить presigned download URL через Core;
  - удалить файл автомобиля через Core.
- Core перед каждым действием проверяет, что `orderId` или `vehicleId` реально существует.
- Core не хранит bytes и не ходит напрямую в MinIO.
- Core не создает отдельную таблицу file references в MVP DAY 15. Источник правды по metadata - FileStorageService.
- FileStorageService защищен хотя бы минимальной AuthService-интеграцией или internal-service guard. Предпочтительный вариант - AuthService-интеграция по тому же паттерну, что уже есть в Core.
- FileStorageService умеет брать `uploadedBy` из authenticated principal или проверять, что переданный `uploadedBy` не противоречит principal.
- Core прокидывает `Authorization: Bearer ...` в FileStorageService, если FileStorageService валидирует пользовательский токен.
- Роли согласованы с текущим Core security.
- Локальный запуск `Auth + Core + Files + Notification + PostgreSQL + MinIO` не конфликтует по портам.
- Есть unit/controller/integration smoke проверки, покрывающие happy path и основные ошибки.
- README или отдельный раздел документации фиксирует контракт Core <-> FileStorage.

---

## Архитектурное решение дня

Выбранный вариант:
Core предоставляет доменные file endpoint'ы, а внутри вызывает FileStorageService по HTTP.

Почему так:

- Клиентам удобнее работать с `/api/orders/{orderId}/files` и `/api/vehicles/{vehicleId}/files`, чем знать внутренний `ownerType/ownerId`.
- Core может проверить существование заказа/авто до upload/list/download/delete.
- Core может не дать привязать файл к неправильной сущности.
- FileStorageService остается универсальным storage-сервисом, который знает только `ownerType`, `ownerId`, `category`, metadata и MinIO.
- Не появляется cross-database FK между `core_db` и `files_db`.
- Не появляется дублирование metadata в Core.

Что не выбираем:

- Не даем фронту/Android напрямую формировать `ownerType` и `ownerId` без доменного фасада Core.
- Не переносим FileStorage metadata в Core.
- Не даем Core прямые MinIO credentials.
- Не добавляем Kafka file events в DAY 15, потому что задача - синхронная интеграция документов и фото.

---

## Граница ответственности

Core отвечает за:

- проверку существования `Order` и `Vehicle`;
- доменный URL contract;
- role-based authorization на уровне бизнес-операций;
- mapping `orderId -> OwnerType.ORDER + ownerId`;
- mapping `vehicleId -> OwnerType.VEHICLE + ownerId`;
- whitelist категорий для order/vehicle;
- проверку, что metadata файла из FileStorage принадлежит запрошенному owner;
- дружелюбные ошибки для клиентов;
- прокидывание bearer token/correlation id в FileStorage.

FileStorageService отвечает за:

- upload bytes в MinIO;
- download bytes из MinIO;
- presigned URL;
- metadata lifecycle;
- validation file size/content type/extension;
- bucket/object key generation;
- soft delete;
- storage availability errors;
- собственную security/access policy на случай прямого доступа.

AuthService отвечает за:

- проверку access token;
- выдачу `userId`, `email`, `roles`;
- единый источник ролей.

NotificationService в DAY 15 не меняется:

- документы/фото не отправляют email;
- Kafka file events не входят в scope;
- стиль событий NotificationService можно использовать позже, если появится `FILE_UPLOADED`.

---

## REST-контракт Core для заказов

Добавить в Core:

```http
POST /api/orders/{orderId}/files?category=ORDER_DOCUMENT
Content-Type: multipart/form-data
Authorization: Bearer <access-token>

file=<binary>
```

Допустимые категории для заказов:

- `ORDER_DOCUMENT`
- `ORDER_ESTIMATE`
- `ORDER_INSPECTION_PHOTO`

Endpoint'ы:

```http
POST   /api/orders/{orderId}/files
GET    /api/orders/{orderId}/files
GET    /api/orders/{orderId}/files/{fileId}
GET    /api/orders/{orderId}/files/{fileId}/download
POST   /api/orders/{orderId}/files/{fileId}/presigned-download-url
DELETE /api/orders/{orderId}/files/{fileId}
```

Query parameters for list:

```text
category optional
includeDeleted default false
page default 0
size default 20, max 100
```

Правила:

- `orderId` должен существовать в Core.
- `category`, если передана, должна быть одной из order-категорий.
- При metadata/download/presign/delete Core сначала получает metadata из FileStorage и проверяет:
  - `ownerType == ORDER`;
  - `ownerId == orderId.toString()`;
  - `category` входит в order whitelist.
- Если файл существует, но привязан к другому owner, Core возвращает `404`, а не раскрывает факт существования чужого файла.
- `uploadedBy` выставляется из `AuthenticatedUser.userId` или `AuthenticatedUser.email`; не принимать его от внешнего клиента.

---

## REST-контракт Core для автомобилей

Добавить в Core:

```http
POST /api/vehicles/{vehicleId}/files?category=VEHICLE_PHOTO
Content-Type: multipart/form-data
Authorization: Bearer <access-token>

file=<binary>
```

Допустимые категории для автомобилей:

- `VEHICLE_PHOTO`
- `VEHICLE_DOCUMENT`

Endpoint'ы:

```http
POST   /api/vehicles/{vehicleId}/files
GET    /api/vehicles/{vehicleId}/files
GET    /api/vehicles/{vehicleId}/files/{fileId}
GET    /api/vehicles/{vehicleId}/files/{fileId}/download
POST   /api/vehicles/{vehicleId}/files/{fileId}/presigned-download-url
DELETE /api/vehicles/{vehicleId}/files/{fileId}
```

Правила:

- `vehicleId` должен существовать в Core.
- `category`, если передана, должна быть одной из vehicle-категорий.
- При metadata/download/presign/delete Core проверяет:
  - `ownerType == VEHICLE`;
  - `ownerId == vehicleId.toString()`;
  - `category` входит в vehicle whitelist.
- Если файл принадлежит другому автомобилю или заказу, вернуть `404`.

---

## Контракт Core -> FileStorage

Core вызывает существующий FileStorage API:

```http
POST /api/files?category={category}&ownerType={ownerType}&ownerId={ownerId}&uploadedBy={uploadedBy}
GET /api/files?ownerType={ownerType}&ownerId={ownerId}&category={category}&includeDeleted={includeDeleted}&page={page}&size={size}
GET /api/files/{fileId}
GET /api/files/{fileId}/download
POST /api/files/{fileId}/presigned-download-url
DELETE /api/files/{fileId}
```

Headers from Core to FileStorage:

```text
Authorization: Bearer <original-user-token>
X-Correlation-Id: <existing-or-generated-correlation-id>
X-Source-Service: autoshop-core
```

Core must not send:

```text
bucket
objectKey
raw MinIO URL
MinIO credentials
```

Response DTOs in Core should mirror FileStorage DTOs but live in Core package, because projects are separate and should not compile against each other.

Minimum Core DTOs:

```text
FileMetadataResponseDTO
OwnerFilesResponseDTO
PresignedUrlRequestDTO
PresignedUrlResponseDTO
FileCategoryDTO or shared enum copy
OwnerTypeDTO or internal enum
```

Recommended:

- Keep enum names exactly equal to FileStorage enum names.
- Do not expose `bucketName` or `objectKey` to Core clients.
- Do not expose deleted files by default.

---

## Security matrix

Use AuthService roles:

```text
ADMIN
MANAGER
MECHANIC
RECEPTIONIST
CLIENT
```

Core endpoint access:

```text
GET order files:        ADMIN, MANAGER, RECEPTIONIST, MECHANIC
POST order files:       ADMIN, MANAGER, RECEPTIONIST, MECHANIC
DELETE order files:     ADMIN, MANAGER

GET vehicle files:      ADMIN, MANAGER, RECEPTIONIST, MECHANIC
POST vehicle files:     ADMIN, MANAGER, RECEPTIONIST, MECHANIC
DELETE vehicle files:   ADMIN, MANAGER, RECEPTIONIST
```

Category-level rules inside service:

```text
ORDER_DOCUMENT:          upload ADMIN, MANAGER, RECEPTIONIST
ORDER_ESTIMATE:          upload ADMIN, MANAGER, MECHANIC
ORDER_INSPECTION_PHOTO:  upload ADMIN, MANAGER, MECHANIC
VEHICLE_DOCUMENT:        upload ADMIN, MANAGER, RECEPTIONIST
VEHICLE_PHOTO:           upload ADMIN, MANAGER, RECEPTIONIST, MECHANIC
```

FileStorage endpoint access:

- `GET /actuator/health` is public.
- `/api/files/**` requires valid Bearer token.
- FileStorage validates token via AuthService, same as Core.
- FileStorage access policy enforces a broad but non-open role policy:
  - read: `ADMIN`, `MANAGER`, `RECEPTIONIST`, `MECHANIC`;
  - upload: category matrix above;
  - delete: `ADMIN`, `MANAGER`, and optionally `RECEPTIONIST` for vehicle files.

Why FileStorage also needs security even if Core is the intended facade:

- local/dev users may call FileStorage directly;
- future Web/Android may use presigned flows;
- service-to-service mistakes should not expose all files;
- current `AllowAllFileAccessPolicy` was acceptable for DAY 12 MVP, but not for integrated DAY 15.

---

## Изменения в autoshop-files

### 1. Устранить порт-конфликт

Файл:

```text
autoshop-files/src/main/resources/application.properties
```

Изменить default port:

```properties
server.port=${SERVER_PORT:8084}
```

Почему:

- NotificationService уже использует `8083` в локальном контуре.
- DAY 15 требует одновременного запуска Auth, Core, Notification, Files.

Также обновить README:

```text
FileStorageService: http://localhost:8084
NotificationService: http://localhost:8083
```

### 2. Добавить Spring Security dependency

Файл:

```text
autoshop-files/build.gradle
```

Добавить:

```gradle
implementation 'org.springframework.boot:spring-boot-starter-security'
testImplementation 'org.springframework.security:spring-security-test'
```

### 3. Добавить AuthService client в FileStorage

Новый package:

```text
autoshop-files/src/main/java/com/vladko/autoshopfilestorage/security
```

Классы по аналогии с Core:

```text
AuthServiceProperties.java
AuthServiceClient.java
RestClientAuthServiceClient.java
AuthenticatedUser.java
AuthTokenValidationResponse.java
InvalidAccessTokenException.java
AuthServiceUnavailableException.java
BearerTokenAuthenticationFilter.java
FileStorageAuthenticationEntryPoint.java
FileStorageAccessDeniedHandler.java
SecurityErrorResponseWriter.java
SecurityConfiguration.java
```

Properties:

```properties
app.auth.base-url=${APP_AUTH_BASE_URL:http://localhost:8082}
app.auth.validate-path=${APP_AUTH_VALIDATE_PATH:/api/auth/validate}
app.auth.connect-timeout=${APP_AUTH_CONNECT_TIMEOUT:1s}
app.auth.read-timeout=${APP_AUTH_READ_TIMEOUT:2s}
app.auth.enabled=${APP_AUTH_ENABLED:true}
```

Important:

- If `app.auth.enabled=false`, allow local tests with test profile only.
- In normal local profile, keep security enabled.
- Error format should match existing `ApiErrorResponse`.

### 4. Replace AllowAll policy

Current file:

```text
autoshop-files/src/main/java/com/vladko/autoshopfilestorage/access/AllowAllFileAccessPolicy.java
```

Do not delete immediately if tests depend on it. Instead:

- keep it for `test` profile or local-disabled mode;
- add production/default implementation:

```text
RoleBasedFileAccessPolicy.java
```

Policy input:

- `FileUploadContext`
- `FileMetadata`
- authenticated roles from SecurityContext.

Rules:

- upload category matrix;
- read allowed for staff roles;
- delete allowed for admin/manager plus receptionist for vehicle files if accepted;
- no `CLIENT` access in DAY 15 unless a customer portal exists. It does not exist yet.

### 5. uploadedBy hardening

Current API accepts `uploadedBy` as request param.

DAY 15 rule:

- external clients must not be able to spoof `uploadedBy`;
- if token is present, FileStorage should derive uploader from principal;
- if Core passes `uploadedBy`, FileStorage should either:
  - ignore it and write authenticated `userId`, or
  - reject if it differs from authenticated `userId`.

Recommended implementation:

```text
FileController -> current authenticated user -> FileService.upload(... uploadedByFromPrincipal ...)
```

Keep request param backward compatible only as optional fallback for tests or `app.auth.enabled=false`.

### 6. Add category-owner validation inside FileStorage

Even though Core validates category owner mapping, FileStorage should reject impossible combinations:

```text
OwnerType.ORDER   allows ORDER_DOCUMENT, ORDER_ESTIMATE, ORDER_INSPECTION_PHOTO
OwnerType.VEHICLE allows VEHICLE_PHOTO, VEHICLE_DOCUMENT
OwnerType.CUSTOMER allows CUSTOMER_DOCUMENT, CUSTOMER_AVATAR
OwnerType.EMPLOYEE allows EMPLOYEE_AVATAR
```

Add:

```text
OwnerCategoryPolicy.java
```

Use it in:

- upload;
- list by owner if category is present;
- optional metadata validation helper.

### 7. FileStorage tests

Add/update:

```text
FileStorageSecurityConfigurationTest
RoleBasedFileAccessPolicyTest
OwnerCategoryPolicyTest
FileControllerSecurityTest
```

Must cover:

- no token -> `401`;
- invalid role -> `403`;
- allowed upload category -> `201`;
- disallowed owner/category pair -> `400`;
- `CLIENT` cannot read staff files;
- health endpoint remains public.

---

## Изменения в autoshop-core

### 1. Add FileStorage integration package

New package:

```text
autoshop-core/src/main/java/com/vladko/autoshopcore/filestorage
```

Recommended structure:

```text
filestorage/
  client/
    FileStorageClient.java
    RestClientFileStorageClient.java
    FileStorageClientConfiguration.java
    FileStorageProperties.java
  controller/
    OrderFileController.java
    VehicleFileController.java
  dto/
    FileMetadataResponseDTO.java
    OwnerFilesResponseDTO.java
    PresignedUrlRequestDTO.java
    PresignedUrlResponseDTO.java
  service/
    OrderFileService.java
    OrderFileServiceImpl.java
    VehicleFileService.java
    VehicleFileServiceImpl.java
    FileOwnerValidator.java
    FileCategoryPolicy.java
    CurrentUserFileContext.java
  exception/
    FileStorageUnavailableException.java
    FileStorageAccessException.java
    FileOwnerMismatchException.java
    InvalidFileCategoryException.java
    FileAttachmentNotFoundException.java
```

Alternative:
use one unified `CoreFileService`, but keep separate controllers. Separate order/vehicle services are easier to read for DAY 15.

### 2. Add Core properties

Files:

```text
autoshop-core/src/main/resources/application.properties
autoshop-core/src/main/resources/application-prod.properties
autoshop-core/src/main/resources/application-local.properties.example
```

Add:

```properties
app.file-storage.base-url=${APP_FILE_STORAGE_BASE_URL:http://localhost:8084}
app.file-storage.connect-timeout=${APP_FILE_STORAGE_CONNECT_TIMEOUT:1s}
app.file-storage.read-timeout=${APP_FILE_STORAGE_READ_TIMEOUT:10s}
app.file-storage.enabled=${APP_FILE_STORAGE_ENABLED:true}
```

Remove or mark historical:

```properties
app.minio.url
app.minio.access-key
app.minio.secret-key
```

Do not necessarily delete them on DAY 15 if other code still compiles against them, but document:
Core must not use MinIO directly after FileStorage integration.

### 3. Implement FileStorage RestClient

Use existing Core style:

- Core already uses `RestClient` for Auth, UMAPI, Carreta.
- Keep the same timeout/error mapping approach.

Client methods:

```java
FileMetadataResponseDTO upload(
        OwnerType ownerType,
        String ownerId,
        FileCategory category,
        String uploadedBy,
        MultipartFile file,
        String bearerToken,
        String correlationId
);

OwnerFilesResponseDTO listByOwner(...);
FileMetadataResponseDTO getMetadata(UUID fileId, ...);
ResponseEntity<Resource> download(UUID fileId, ...);
PresignedUrlResponseDTO presignedDownloadUrl(UUID fileId, PresignedUrlRequestDTO request, ...);
void delete(UUID fileId, ...);
```

Multipart note:

- Use `MultipartBodyBuilder` or equivalent Spring multipart body.
- Preserve original filename and content type.
- Do not buffer huge files unnecessarily where avoidable.
- MVP max is 25 MB, so byte buffering is tolerable for DAY 15 only if streaming takes too long, but leave TODO for streaming.

Download note:

- For direct Core download, prefer streaming response from FileStorage to client.
- If implementation time is tight, proxy as byte array with size limit aligned to FileStorage max upload size.
- Preserve:
  - `Content-Type`;
  - `Content-Length`;
  - `Content-Disposition`.

### 4. Implement category policy in Core

Add:

```text
FileCategoryPolicy.java
```

Rules:

```text
ORDER -> ORDER_DOCUMENT, ORDER_ESTIMATE, ORDER_INSPECTION_PHOTO
VEHICLE -> VEHICLE_PHOTO, VEHICLE_DOCUMENT
```

Methods:

```java
void assertOrderCategory(FileCategory category);
void assertVehicleCategory(FileCategory category);
void assertOwnerMatches(FileMetadataResponseDTO metadata, OwnerType expectedType, String expectedOwnerId);
```

Return `404` for owner mismatch on file id operations.

Reason:
if a user can guess `fileId`, they must not learn that the file exists on a different order/vehicle.

### 5. Implement OrderFileService

Dependencies:

```text
OrderRepository
FileStorageClient
FileCategoryPolicy
CurrentUserFileContext
```

Methods:

```java
FileMetadataResponseDTO upload(Integer orderId, FileCategory category, MultipartFile file);
OwnerFilesResponseDTO list(Integer orderId, FileCategory category, boolean includeDeleted, int page, int size);
FileMetadataResponseDTO getMetadata(Integer orderId, UUID fileId);
ResponseEntity<Resource> download(Integer orderId, UUID fileId);
PresignedUrlResponseDTO presignedDownloadUrl(Integer orderId, UUID fileId, PresignedUrlRequestDTO request);
void delete(Integer orderId, UUID fileId);
```

Validation flow:

```text
1. find order by id in Core; if absent -> OrderNotFoundException
2. validate category whitelist
3. call FileStorage
4. for fileId operations, verify metadata owner before returning/downloading/deleting
5. map FileStorage errors to Core errors
```

### 6. Implement VehicleFileService

Dependencies:

```text
VehicleRepository
FileStorageClient
FileCategoryPolicy
CurrentUserFileContext
```

Methods mirror `OrderFileService`.

Validation flow:

```text
1. find vehicle by id in Core; if absent -> VehicleNotFoundException
2. validate category whitelist
3. call FileStorage
4. verify owner on fileId operations
5. map errors
```

### 7. Implement controllers

Order controller:

```text
autoshop-core/src/main/java/com/vladko/autoshopcore/filestorage/controller/OrderFileController.java
```

Base mapping:

```java
@RequestMapping("/api/orders/{orderId}/files")
```

Vehicle controller:

```text
autoshop-core/src/main/java/com/vladko/autoshopcore/filestorage/controller/VehicleFileController.java
```

Base mapping:

```java
@RequestMapping("/api/vehicles/{vehicleId}/files")
```

Controller methods:

```text
POST ""
GET ""
GET "/{fileId}"
GET "/{fileId}/download"
POST "/{fileId}/presigned-download-url"
DELETE "/{fileId}"
```

### 8. Update Core SecurityConfiguration

File:

```text
autoshop-core/src/main/java/com/vladko/autoshopcore/configuration/SecurityConfiguration.java
```

Add file endpoint matchers before broader `/api/orders/**` and `/api/vehicles/**` rules:

```java
.requestMatchers(HttpMethod.GET, "/api/orders/*/files", "/api/orders/*/files/**")
    .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MECHANIC")
.requestMatchers(HttpMethod.POST, "/api/orders/*/files")
    .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MECHANIC")
.requestMatchers(HttpMethod.DELETE, "/api/orders/*/files/**")
    .hasAnyRole("ADMIN", "MANAGER")

.requestMatchers(HttpMethod.GET, "/api/vehicles/*/files", "/api/vehicles/*/files/**")
    .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MECHANIC")
.requestMatchers(HttpMethod.POST, "/api/vehicles/*/files")
    .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MECHANIC")
.requestMatchers(HttpMethod.DELETE, "/api/vehicles/*/files/**")
    .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")
```

Keep service-level category checks too. URL-level roles are necessary but not sufficient.

### 9. Update Core GlobalExceptionHandler

File:

```text
autoshop-core/src/main/java/com/vladko/autoshopcore/shared/exception/GlobalExceptionHandler.java
```

Add handlers:

```text
InvalidFileCategoryException -> 400
FileAttachmentNotFoundException -> 404
FileStorageAccessException -> 403 or 401 depending cause
FileStorageUnavailableException -> 503
FileOwnerMismatchException -> 404
```

Do not leak FileStorage internal stack traces.

### 10. Optional: add actuator dependency checks

If time remains:

- Core health indicator for FileStorage:
  - calls `GET {file-storage}/actuator/health`;
  - timeout less than 1 second;
  - reports `DOWN` without breaking startup.

This is optional for DAY 15. Do not let it block file operations.

---

## Ошибки и HTTP mapping

Core should map FileStorage responses:

```text
400 from FileStorage -> 400 invalid file/category/request
401 from FileStorage -> 401 if user token invalid
403 from FileStorage -> 403 file access denied
404 from FileStorage -> 404 file not found
409 from FileStorage -> 409 conflict
413 from FileStorage -> 400 or 413 file too large; prefer 413 if available
5xx / timeout -> 503 file storage unavailable
```

Owner mismatch:

```text
FileStorage returns metadata for UUID,
but ownerType/ownerId does not match requested Core owner
-> Core returns 404.
```

Reason:
avoid cross-owner information disclosure.

---

## DTO contract

Core response for metadata:

```json
{
  "id": "08bc1b5e-6f3d-4d38-9a2d-6c4f748b56d9",
  "category": "ORDER_DOCUMENT",
  "ownerType": "ORDER",
  "ownerId": "42",
  "uploadedBy": "7",
  "originalFilename": "diagnostics.pdf",
  "contentType": "application/pdf",
  "sizeBytes": 120345,
  "checksumSha256": "abc...",
  "status": "AVAILABLE",
  "createdAt": "2026-04-23T10:15:30Z",
  "updatedAt": "2026-04-23T10:15:31Z",
  "deletedAt": null
}
```

Core list response:

```json
{
  "files": [],
  "page": 0,
  "size": 20,
  "totalElements": 0
}
```

Presigned URL response:

```json
{
  "fileId": "08bc1b5e-6f3d-4d38-9a2d-6c4f748b56d9",
  "url": "http://localhost:9000/...",
  "expiresAt": "2026-04-23T10:30:30Z"
}
```

Do not expose:

```text
bucketName
objectKey
MinIO credentials
server filesystem paths
```

---

## Конкретный порядок разработки на 8 часов

### Блок 0. Быстрый стартовый аудит - 20 минут

Проверить:

- `autoshop-core` собирается или хотя бы понятно, какие изменения уже в worktree;
- `autoshop-files` собирается;
- AuthService endpoint `/api/auth/validate` работает;
- FileStorage endpoint `/api/files` работает в текущем MVP;
- локальные порты: Core `8080`, Auth `8082`, Notification `8083`, Files должен стать `8084`.

Команды:

```bash
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
./gradlew test

cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-files
./gradlew test
```

Если Core тесты падают из-за незавершенной предыдущей разработки, зафиксировать baseline и не смешивать фиксы с DAY 15 без необходимости.

### Блок 1. FileStorage security и port fix - 1 час 30 минут

Сделать:

- сменить default port FileStorage на `8084`;
- добавить Spring Security;
- добавить AuthService client/properties/filter;
- добавить SecurityConfiguration;
- заменить default access policy на role-based;
- оставить `AllowAllFileAccessPolicy` только для test/local-disabled профиля;
- добавить owner-category policy;
- защитить `uploadedBy` от spoofing.

Проверить:

- `/actuator/health` без токена -> `200`;
- `/api/files` без токена -> `401`;
- upload allowed role -> `201`;
- forbidden role/category -> `403` или `400`, в зависимости от причины.

### Блок 2. Core FileStorage client - 1 час 20 минут

Сделать:

- добавить `FileStorageProperties`;
- добавить `FileStorageClientConfiguration`;
- добавить `RestClientFileStorageClient`;
- добавить DTOs;
- добавить exceptions;
- реализовать multipart upload;
- реализовать list/metadata/presign/delete;
- реализовать download proxy.

Проверить unit-тестами:

- correct URL/query params;
- Authorization header forwarded;
- correlation header forwarded;
- 404/503 mapping.

### Блок 3. Core domain services - 1 час 20 минут

Сделать:

- `FileCategoryPolicy`;
- `CurrentUserFileContext`;
- `OrderFileServiceImpl`;
- `VehicleFileServiceImpl`.

Проверить:

- order not found -> `OrderNotFoundException`;
- vehicle not found -> `VehicleNotFoundException`;
- wrong category for owner -> `InvalidFileCategoryException`;
- metadata owner mismatch -> `FileAttachmentNotFoundException` or `FileOwnerMismatchException` mapped to `404`;
- uploadedBy comes from current authenticated user.

### Блок 4. Core controllers и security matchers - 1 час

Сделать:

- `OrderFileController`;
- `VehicleFileController`;
- update `SecurityConfiguration`;
- update `GlobalExceptionHandler`.

Проверить:

- unauthenticated request -> `401`;
- role without access -> `403`;
- valid role -> reaches service;
- endpoint paths do not collide with existing `/api/orders/{id}` and `/api/vehicles/{id}`.

### Блок 5. Tests - 1 час 20 минут

Core tests:

```text
RestClientFileStorageClientTest
OrderFileServiceTest
VehicleFileServiceTest
OrderFileControllerTest
VehicleFileControllerTest
```

FileStorage tests:

```text
FileStorageSecurityConfigurationTest
RoleBasedFileAccessPolicyTest
OwnerCategoryPolicyTest
FileControllerSecurityTest
```

Minimum assertions:

- upload order document happy path;
- upload vehicle photo happy path;
- list by owner;
- presigned download URL;
- delete;
- wrong category rejected;
- owner mismatch hidden as 404;
- FileStorage unavailable returns 503 from Core.

### Блок 6. Local smoke and docs - 1 час

Update docs:

- `autoshop-files/README.md`;
- optionally `autoshop-core/README.md` if exists;
- add section to project context if needed.

Manual smoke:

```bash
# 1. Start infra
docker compose up -d postgres redis minio kafka mailhog

# 2. Start Auth
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-auth
./gradlew bootRun --args='--spring.profiles.active=local'

# 3. Start FileStorage
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-files
SERVER_PORT=8084 ./gradlew bootRun

# 4. Start Core
cd /Users/vladislavkovrigin/Projects/IdeaProjects/autoshop-core
APP_FILE_STORAGE_BASE_URL=http://localhost:8084 ./gradlew bootRun --args='--spring.profiles.active=local'
```

Smoke scenario:

```text
1. Login via AuthService, receive access token.
2. Create or reuse customer, vehicle, order in Core.
3. Upload PDF to /api/orders/{orderId}/files?category=ORDER_DOCUMENT.
4. GET /api/orders/{orderId}/files returns uploaded file.
5. GET /api/orders/{orderId}/files/{fileId} returns metadata with ownerType ORDER and ownerId orderId.
6. POST /api/orders/{orderId}/files/{fileId}/presigned-download-url returns URL.
7. GET /api/orders/{orderId}/files/{fileId}/download returns bytes.
8. Upload image to /api/vehicles/{vehicleId}/files?category=VEHICLE_PHOTO.
9. GET /api/vehicles/{vehicleId}/files returns uploaded image.
10. Try to read vehicle file through order endpoint -> 404.
11. DELETE order file.
12. Repeat download -> 404 or file unavailable depending final mapping.
```

---

## Acceptance criteria

Functional:

- `POST /api/orders/{orderId}/files` uploads a valid order document/photo to FileStorage and returns metadata.
- `GET /api/orders/{orderId}/files` returns only files owned by that order.
- `GET /api/orders/{orderId}/files/{fileId}` returns metadata only when the file belongs to that order.
- `GET /api/orders/{orderId}/files/{fileId}/download` streams or returns the binary file.
- `POST /api/orders/{orderId}/files/{fileId}/presigned-download-url` returns a valid temporary URL.
- `DELETE /api/orders/{orderId}/files/{fileId}` deletes the file through FileStorage.
- Same set works for `/api/vehicles/{vehicleId}/files`.

Security:

- No `/api/files/**` call in FileStorage is allowed without token, except health.
- Core file endpoints require AuthService-validated token.
- Category-level role restrictions are enforced.
- User cannot attach `VEHICLE_PHOTO` to order or `ORDER_DOCUMENT` to vehicle.
- User cannot access a file through the wrong order/vehicle URL even if they know `fileId`.
- `uploadedBy` cannot be spoofed by request param.

Architecture:

- Core does not use MinIO SDK.
- Core does not store file bytes.
- Core does not create cross-service FK to FileStorage DB.
- FileStorage does not query Core database.
- DTOs are duplicated intentionally per service boundary; no compile-time dependency between services.

Reliability:

- FileStorage timeout from Core returns `503`.
- File validation errors return clear `400` or `413`.
- Deleted/unavailable files return stable errors.
- Port conflict with NotificationService is fixed.

Tests:

- Core service tests cover order/vehicle owner validation.
- Core controller tests cover security and HTTP contract.
- FileStorage security tests cover token required and role/category rules.
- Existing FileStorage upload/download tests still pass.

---

## Что не делаем в День 15

- Не делаем direct browser upload через presigned PUT.
- Не делаем thumbnails, compression, image resize.
- Не делаем virus scanning.
- Не делаем file versioning.
- Не делаем OCR/recognition документов.
- Не делаем Kafka `FILE_UPLOADED` event.
- Не добавляем attachments в notification emails.
- Не добавляем customer portal доступ для роли `CLIENT`.
- Не переносим FileStorage в Core.
- Не добавляем FK между `files_db` и `core_db`.
- Не делаем hard delete без metadata audit.
- Не меняем существующую модель `Order` или `Vehicle` ради file references, если MVP работает через FileStorage metadata.

---

## Основные риски и защита

### Риск 1. Публичный FileStorage

Проблема:
текущий `AllowAllFileAccessPolicy` разрешает все.

Защита:
в DAY 15 добавить AuthService validation и role-based access policy. Если времени мало, минимум - internal token guard плюс TODO на полноценный Auth, но preferred path - полноценный Bearer flow как в Core.

### Риск 2. Файл можно скачать через неправильный owner

Проблема:
FileStorage `GET /api/files/{fileId}` сам по себе не знает, через какой order/vehicle URL пришел пользователь.

Защита:
Core после получения metadata всегда проверяет `ownerType/ownerId/category`. При mismatch вернуть `404`.

### Риск 3. Категории перепутаются

Проблема:
`FileCategory` общий enum в FileStorage, но Core endpoint доменный.

Защита:
добавить `FileCategoryPolicy` в Core и `OwnerCategoryPolicy` в FileStorage.

### Риск 4. Port conflict

Проблема:
NotificationService и FileStorageService оба могут стартовать на `8083`.

Защита:
закрепить FileStorage на `8084`, обновить env/docs/Core base URL.

### Риск 5. Multipart proxy будет хрупким

Проблема:
передача multipart из Core в FileStorage через RestClient требует аккуратной сборки body.

Защита:
покрыть клиент тестом, сохранить filename/content type, ограничить размер через существующие лимиты FileStorage.

### Риск 6. Сервисные ошибки FileStorage потекут наружу

Проблема:
MinIO/DB/timeout ошибки могут раскрыть внутренности.

Защита:
Core мапит все FileStorage 5xx/timeouts в `FileStorageUnavailableException` -> `503` с коротким сообщением.

### Риск 7. uploadedBy spoofing

Проблема:
текущий API принимает `uploadedBy` как request param.

Защита:
Core не принимает `uploadedBy` от клиента. FileStorage предпочитает authenticated principal.

---

## Suggested commit slicing

Commit 1:

```text
files: secure file storage API with auth service validation
```

Includes:

- security dependency;
- AuthService client;
- SecurityConfiguration;
- RoleBasedFileAccessPolicy;
- OwnerCategoryPolicy;
- port change to 8084;
- FileStorage tests.

Commit 2:

```text
core: add file storage HTTP client
```

Includes:

- properties;
- RestClient config;
- DTOs;
- exceptions;
- client tests.

Commit 3:

```text
core: expose order and vehicle file endpoints
```

Includes:

- services;
- controllers;
- security matchers;
- exception handler;
- service/controller tests.

Commit 4:

```text
docs: document core file storage integration smoke flow
```

Includes:

- README updates;
- local run instructions;
- smoke checklist.

---

## Final checklist before closing DAY 15

- [ ] FileStorage default port is not conflicting with NotificationService.
- [ ] FileStorage `/api/files/**` is protected.
- [ ] FileStorage role policy exists and is tested.
- [ ] FileStorage owner-category policy exists and is tested.
- [ ] Core has `app.file-storage.*` properties.
- [ ] Core has FileStorage RestClient wrapper.
- [ ] Core forwards bearer token to FileStorage.
- [ ] Core forwards/generates correlation id.
- [ ] Core has order file endpoints.
- [ ] Core has vehicle file endpoints.
- [ ] Core validates order existence before order file operations.
- [ ] Core validates vehicle existence before vehicle file operations.
- [ ] Core rejects wrong category for owner.
- [ ] Core hides owner mismatch as `404`.
- [ ] Direct download works through Core.
- [ ] Presigned download URL works through Core.
- [ ] Delete works through Core.
- [ ] Tests pass in `autoshop-files`.
- [ ] Tests pass in `autoshop-core`, or baseline failures are documented if caused by previous unfinished work.
- [ ] Manual smoke executed with Auth + Core + Files + MinIO.
- [ ] README/docs updated.

---

## ADR: Core file facade over FileStorage API

Decision:
Expose order/vehicle file operations through Core and call FileStorageService internally over HTTP.

Drivers:

- clients should use domain URLs;
- Core must validate `Order` and `Vehicle`;
- FileStorage must remain reusable and independent;
- no cross-service database coupling;
- no direct MinIO access from Core.

Alternatives considered:

1. Clients call FileStorage directly with `ownerType/ownerId`.
   - Pro: less Core code.
   - Con: clients can form wrong owner references; Core cannot validate order/vehicle existence in the main flow.

2. Core stores file references in its own tables.
   - Pro: faster local reads and stronger Core-side attachment model.
   - Con: duplicated source of truth, sync problems, more migrations, not needed for DAY 15 MVP.

3. Core uses MinIO SDK directly.
   - Pro: fewer network hops.
   - Con: violates microservice boundary, duplicates validation/storage logic, leaks storage credentials into Core.

Chosen:
Core facade + FileStorage metadata source of truth.

Consequences:

- Core needs a resilient HTTP client and error mapping.
- FileStorage must be secured independently.
- DTO contracts must remain stable between services.
- Future direct client upload can be added with presigned PUT without changing existing Core facade.

Follow-ups after DAY 15:

- presigned PUT upload flow for Web/Android;
- thumbnails for vehicle photos;
- virus scanning lifecycle states;
- optional `FILE_UPLOADED` event;
- customer-facing file access for role `CLIENT`;
- API gateway route design for public deployment.

