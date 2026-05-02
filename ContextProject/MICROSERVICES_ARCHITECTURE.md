# Микросервисная архитектура CRM для автосервиса

## 🎯 Архитектура проекта (по рекомендации ментора)

### Гибридная архитектура: Core Monolith + 3 Microservices

Проект использует упрощенную микросервисную архитектуру, которая оптимальна для дипломного проекта:

1. **Core Application** (Монолит) - основная бизнес-логика
2. **NotificationService** - уведомления
3. **AuthService** - аутентификация и авторизация
4. **FileStorageService** - управление файлами

---

## 📦 Детальное описание сервисов

### 1. **Core Application** (Монолитное ядро)

```
Порт: 8080
БД: core_db (PostgreSQL)
Технологии: Spring Boot 3.x, Spring Data JPA, Spring Security
```

#### Ответственность:
```
├── Управление клиентами (Client Management)
│   ├── CRUD операции с клиентами
│   ├── Профили пользователей
│   ├── История взаимодействий
│   ├── Сегментация клиентов
│   └── Поиск и фильтрация
│
├── Управление автомобилями (Vehicle Management)
│   ├── Каталог автомобилей клиентов
│   ├── Технические характеристики
│   ├── История обслуживания
│   ├── Валидация VIN и номеров
│   └── Связь с клиентами (один клиент - много авто)
│
├── Управление заказами (Order Management)
│   ├── Создание и управление заказами
│   ├── Жизненный цикл заказа (NEW → IN_PROGRESS → COMPLETED)
│   ├── Назначение механиков
│   ├── Управление статусами
│   ├── Расчет стоимости (сметы)
│   ├── Применение скидок
│   └── История изменений
│
├── Управление запчастями (Parts Management)
│   ├── Внутренний каталог запчастей
│   ├── Управление складом (приход/расход)
│   ├── Резервирование под заказы
│   └── Учет остатков
│
├── Интеграция с внешними API
│   ├── UMAPI (каталог запчастей)
│   ├── Сравнение цен от поставщиков
│   ├── Кэширование данных (Redis - 24 часа)
│   └── Retry механизмы при ошибках
│
└── Программа лояльности (Loyalty Program)
    ├── Баланс баллов клиентов
    ├── Начисление/списание баллов
    ├── Уровни лояльности (Bronze, Silver, Gold, Platinum)
    ├── Расчет скидок
    └── История транзакций
```

#### REST API Endpoints:

**Клиенты:**
```
POST   /api/clients                    - Создание клиента
GET    /api/clients/{id}               - Получение клиента
PUT    /api/clients/{id}               - Обновление клиента
DELETE /api/clients/{id}               - Удаление клиента
GET    /api/clients                     - Список всех клиентов (пагинация)
GET    /api/clients/search              - Поиск клиентов (по имени, телефону, email)
GET    /api/clients/{id}/vehicles       - Все автомобили клиента
GET    /api/clients/{id}/orders         - История заказов клиента
GET    /api/clients/{id}/loyalty        - Баланс и статус лояльности
```

**Автомобили:**
```
POST   /api/vehicles                    - Добавление автомобиля
GET    /api/vehicles/{id}               - Получение автомобиля
PUT    /api/vehicles/{id}               - Обновление данных автомобиля
DELETE /api/vehicles/{id}               - Удаление автомобиля
GET    /api/vehicles/client/{clientId}  - Автомобили клиента
GET    /api/vehicles/vin/{vin}          - Поиск по VIN
GET    /api/vehicles/{id}/history       - История обслуживания автомобиля
GET    /api/vehicles/{id}/recommendations - Рекомендации по обслуживанию
```

**Заказы:**
```
POST   /api/orders                      - Создание заказа
GET    /api/orders/{id}                 - Получение заказа
PUT    /api/orders/{id}                 - Обновление заказа
DELETE /api/orders/{id}                 - Отмена заказа
GET    /api/orders                       - Список заказов (фильтры, пагинация)
PUT    /api/orders/{id}/status          - Изменение статуса
POST   /api/orders/{id}/assign-mechanic - Назначение механика
GET    /api/orders/active                - Активные заказы
GET    /api/orders/client/{clientId}    - Заказы клиента
GET    /api/orders/{id}/estimate        - Смета заказа
POST   /api/orders/{id}/estimate        - Создание/обновление сметы
```

**Запчасти:**
```
POST   /api/parts                       - Добавление запчасти
GET    /api/parts/{id}                  - Получение запчасти
PUT    /api/parts/{id}                  - Обновление запчасти
DELETE /api/parts/{id}                  - Удаление запчасти
GET    /api/parts/search                - Поиск запчастей (внутренний каталог + UMAPI)
GET    /api/parts/{id}/prices           - Сравнение цен от поставщиков
POST   /api/parts/{id}/reserve          - Резервирование запчасти
POST   /api/parts/inventory/adjust      - Корректировка остатков
GET    /api/parts/low-stock             - Запчасти с низким остатком
```

**Программа лояльности:**
```
GET    /api/loyalty/balance/{clientId}  - Баланс баллов
POST   /api/loyalty/points/add          - Начисление баллов
POST   /api/loyalty/points/deduct       - Списание баллов
GET    /api/loyalty/status/{clientId}   - Уровень лояльности
GET    /api/loyalty/history/{clientId}  - История операций
GET    /api/loyalty/tier/{clientId}     - Информация о текущем tier
```

#### Модульная структура (Package by Feature):

```
com.autoshop.crm.core/
├── modules/
│   ├── client/
│   │   ├── controller/
│   │   │   └── ClientController.java
│   │   ├── service/
│   │   │   ├── ClientService.java
│   │   │   └── ClientServiceImpl.java
│   │   ├── repository/
│   │   │   └── ClientRepository.java
│   │   ├── entity/
│   │   │   └── Client.java
│   │   └── dto/
│   │       ├── ClientCreateDto.java
│   │       ├── ClientUpdateDto.java
│   │       └── ClientResponseDto.java
│   │
│   ├── vehicle/
│   │   ├── controller/
│   │   │   └── VehicleController.java
│   │   ├── service/
│   │   │   ├── VehicleService.java
│   │   │   └── VinDecoderService.java
│   │   ├── repository/
│   │   │   └── VehicleRepository.java
│   │   └── entity/
│   │       └── Vehicle.java
│   │
│   ├── order/
│   │   ├── controller/
│   │   │   └── OrderController.java
│   │   ├── service/
│   │   │   ├── OrderService.java
│   │   │   ├── OrderWorkflowService.java
│   │   │   └── EstimateService.java
│   │   ├── repository/
│   │   │   ├── OrderRepository.java
│   │   │   └── EstimateRepository.java
│   │   └── entity/
│   │       ├── Order.java
│   │       ├── OrderItem.java
│   │       ├── Estimate.java
│   │       └── OrderStatus.java (enum)
│   │
│   ├── part/
│   │   ├── controller/
│   │   │   └── PartController.java
│   │   ├── service/
│   │   │   ├── PartService.java
│   │   │   ├── InventoryService.java
│   │   │   └── UmapiIntegrationService.java
│   │   ├── repository/
│   │   │   ├── PartRepository.java
│   │   │   └── InventoryRepository.java
│   │   └── entity/
│   │       ├── Part.java
│   │       └── InventoryTransaction.java
│   │
│   └── loyalty/
│       ├── controller/
│       │   └── LoyaltyController.java
│       ├── service/
│       │   ├── LoyaltyService.java
│       │   └── TierCalculationService.java
│       ├── repository/
│       │   ├── LoyaltyAccountRepository.java
│       │   └── LoyaltyTransactionRepository.java
│       └── entity/
│           ├── LoyaltyAccount.java
│           ├── LoyaltyTransaction.java
│           └── LoyaltyTier.java (enum)
│
└── shared/
    ├── config/
    │   ├── SecurityConfig.java
    │   ├── KafkaConfig.java
    │   ├── RedisConfig.java
    │   └── WebConfig.java
    ├── security/
    │   ├── JwtTokenProvider.java
    │   └── SecurityUtils.java
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   ├── ResourceNotFoundException.java
    │   └── BusinessException.java
    └── util/
        ├── DateUtils.java
        └── ValidationUtils.java
```

#### База данных (core_db):

**Таблицы:**
```sql
-- Клиенты
clients (id, first_name, last_name, phone, email, created_at, updated_at)

-- Автомобили
vehicles (id, client_id, make, model, year, vin, license_plate, created_at)

-- Заказы
orders (id, client_id, vehicle_id, status, mechanic_id, created_at, updated_at, completed_at)
order_items (id, order_id, part_id, quantity, price, labor_cost)
estimates (id, order_id, total_parts, total_labor, discount, final_amount, approved_at)

-- Запчасти
parts (id, name, description, category, current_stock, min_stock, price)
inventory_transactions (id, part_id, type, quantity, order_id, created_at)

-- Лояльность
loyalty_accounts (id, client_id, balance, tier, total_spent, created_at)
loyalty_transactions (id, account_id, type, points, description, created_at)
```

#### События (Kafka):

Монолит публикует события для уведомлений:
```
Topics:
├── order.created          → NotificationService
├── order.status.changed   → NotificationService
├── order.completed        → NotificationService
├── estimate.ready         → NotificationService
├── loyalty.points.earned  → NotificationService
└── vehicle.reminder       → NotificationService
```

#### Интеграции:

**Внутренние:**
- NotificationService (async через Kafka)
- AuthService (sync для проверки токенов)
- FileStorageService (sync для загрузки файлов)

**Внешние:**
- UMAPI (поиск запчастей, REST API, timeout 5s)
- Redis (кэширование UMAPI, TTL 24h)

---

### 2. **NotificationService** (Сервис уведомлений)

```
Порт: 8081
БД: notifications_db (PostgreSQL)
Технологии: Spring Boot, Spring Email, Mailjet SDK, Kafka Consumer
```

#### Ответственность:

```
├── Email уведомления
│   ├── Spring Email (основной)
│   ├── Mailjet SMTP integration
│   ├── Шаблоны Thymeleaf
│   └── HTML/Plain text форматы
│
├── SMS уведомления (опционально)
│   └── Twilio SDK
│
├── Push уведомления
│   └── Firebase Cloud Messaging
│
├── Управление шаблонами
│   ├── Динамические параметры
│   ├── Мультиязычность (i18n)
│   └── Персонализация
│
├── Очередь отправки
│   ├── Асинхронная обработка
│   ├── Retry механизмы
│   └── Dead Letter Queue
│
└── История уведомлений
    ├── Логирование всех отправок
    ├── Статусы (SENT, FAILED, PENDING)
    └── Аналитика открытий (email tracking)
```

#### REST API Endpoints:

```
POST   /api/notifications/email         - Отправка email
POST   /api/notifications/sms           - Отправка SMS
POST   /api/notifications/push          - Отправка push
POST   /api/notifications/batch         - Массовая рассылка
GET    /api/notifications/history/{clientId} - История уведомлений
GET    /api/notifications/{id}          - Статус уведомления
GET    /api/notifications/templates     - Список шаблонов
POST   /api/notifications/templates     - Создание шаблона
PUT    /api/notifications/templates/{id} - Обновление шаблона
```

#### Структура проекта:

```
com.autoshop.crm.notification/
├── controller/
│   └── NotificationController.java
│
├── service/
│   ├── NotificationService.java
│   ├── EmailService.java
│   ├── SmsService.java
│   ├── PushService.java
│   └── TemplateService.java
│
├── consumer/
│   └── OrderEventConsumer.java        (слушает Kafka)
│
├── config/
│   ├── MailjetConfig.java
│   ├── KafkaConsumerConfig.java
│   └── ThymeleafConfig.java
│
├── repository/
│   ├── NotificationRepository.java
│   └── TemplateRepository.java
│
├── entity/
│   ├── Notification.java
│   ├── Template.java
│   └── NotificationStatus.java (enum)
│
└── dto/
    ├── EmailRequest.java
    ├── SmsRequest.java
    └── PushRequest.java
```

#### Kafka Consumer:

Слушает события из Core Application:
```java
@KafkaListener(topics = "order.created")
public void handleOrderCreated(OrderCreatedEvent event) {
    emailService.sendEmail(
        event.getClientEmail(),
        "order-created-template",
        Map.of(
            "orderNumber", event.getOrderNumber(),
            "vehicleName", event.getVehicleName(),
            "clientName", event.getClientName()
        )
    );
}

@KafkaListener(topics = "order.status.changed")
public void handleOrderStatusChanged(OrderStatusChangedEvent event) {
    // Отправка уведомления о смене статуса
}

@KafkaListener(topics = "order.completed")
public void handleOrderCompleted(OrderCompletedEvent event) {
    // Уведомление о готовности авто
}

@KafkaListener(topics = "estimate.ready")
public void handleEstimateReady(EstimateReadyEvent event) {
    // Отправка сметы на email
}

@KafkaListener(topics = "loyalty.points.earned")
public void handleLoyaltyPoints(LoyaltyPointsEvent event) {
    // Уведомление о начислении баллов
}
```

#### Email конфигурация (Mailjet):

```yaml
# application.yml
spring:
  mail:
    host: in-v3.mailjet.com
    port: 587
    username: ${MAILJET_API_KEY}
    password: ${MAILJET_SECRET_KEY}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

mailjet:
  api-key: ${MAILJET_API_KEY}
  secret-key: ${MAILJET_SECRET_KEY}
  from-email: noreply@autoshop-crm.com
  from-name: AutoShop CRM
```

#### Шаблоны уведомлений:

**order-created.html** (Thymeleaf):
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
    <h2>Здравствуйте, <span th:text="${clientName}">Клиент</span>!</h2>
    <p>Ваш заказ <strong th:text="${orderNumber}">№12345</strong> успешно создан.</p>
    <p>Автомобиль: <span th:text="${vehicleName}">Toyota Camry</span></p>
    <p>Мы свяжемся с вами в ближайшее время.</p>
</body>
</html>
```

#### База данных (notifications_db):

```sql
notifications (
    id,
    type (EMAIL, SMS, PUSH),
    recipient,
    subject,
    content,
    template_id,
    status (PENDING, SENT, FAILED),
    sent_at,
    error_message,
    created_at
)

templates (
    id,
    name,
    subject,
    content,
    type,
    language,
    created_at,
    updated_at
)
```

#### Retry механизм:

```java
@Retryable(
    value = {MailSendException.class},
    maxAttempts = 3,
    backoff = @Backoff(delay = 2000)
)
public void sendEmail(EmailRequest request) {
    // Send logic
}
```

---

### 3. **AuthService** (Сервис аутентификации и авторизации)

```
Порт: 8082
БД: auth_db (PostgreSQL) + Redis (токены, blacklist)
Технологии: Spring Boot, Spring Security, JWT, Redis
Альтернатива: Keycloak (готовое решение)
```

#### Ответственность:

```
├── Аутентификация
│   ├── Регистрация пользователей
│   ├── Вход (login) - генерация JWT
│   ├── Выход (logout) - добавление токена в blacklist
│   ├── Обновление токена (refresh)
│   └── Валидация токенов
│
├── Авторизация
│   ├── Управление ролями (ADMIN, MANAGER, MECHANIC, CLIENT)
│   ├── Управление правами (permissions)
│   ├── RBAC (Role-Based Access Control)
│   └── Проверка доступа к ресурсам
│
├── Безопасность
│   ├── Хэширование паролей (BCrypt)
│   ├── JWT токены (Access + Refresh)
│   ├── Blacklist токенов (Redis)
│   ├── Rate limiting (защита от brute force)
│   └── 2FA (опционально)
│
└── Управление пользователями
    ├── CRUD операции
    ├── Смена пароля
    ├── Восстановление пароля
    └── Email верификация
```

#### REST API Endpoints:

```
POST   /api/auth/register               - Регистрация
POST   /api/auth/login                  - Вход (возвращает JWT)
POST   /api/auth/logout                 - Выход (blacklist токена)
POST   /api/auth/refresh                - Обновление токена
POST   /api/auth/verify-token           - Проверка токена
GET    /api/auth/me                     - Информация о текущем пользователе

POST   /api/auth/password/forgot        - Запрос сброса пароля
POST   /api/auth/password/reset         - Сброс пароля
PUT    /api/auth/password/change        - Смена пароля

GET    /api/auth/users                  - Список пользователей (admin)
GET    /api/auth/users/{id}             - Получение пользователя
PUT    /api/auth/users/{id}/role        - Изменение роли
DELETE /api/auth/users/{id}             - Деактивация пользователя

GET    /api/auth/roles                  - Список ролей
GET    /api/auth/permissions            - Список прав
```

#### Структура проекта:

```
com.autoshop.crm.auth/
├── controller/
│   ├── AuthController.java
│   └── UserManagementController.java
│
├── service/
│   ├── AuthService.java
│   ├── UserService.java
│   ├── TokenService.java
│   ├── RoleService.java
│   └── PasswordService.java
│
├── security/
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── SecurityConfig.java
│   └── UserDetailsServiceImpl.java
│
├── repository/
│   ├── UserRepository.java
│   ├── RoleRepository.java
│   ├── RefreshTokenRepository.java
│   └── TokenBlacklistRepository.java (Redis)
│
├── entity/
│   ├── User.java
│   ├── Role.java
│   ├── Permission.java
│   ├── RefreshToken.java
│   └── UserRole.java (enum)
│
└── dto/
    ├── RegisterRequest.java
    ├── LoginRequest.java
    ├── LoginResponse.java
    ├── TokenRefreshRequest.java
    └── UserDto.java
```

#### JWT структура:

**Access Token (15 минут):**
```json
{
  "sub": "user@example.com",
  "userId": "123",
  "roles": ["MANAGER", "MECHANIC"],
  "permissions": ["order:read", "order:write"],
  "iat": 1674567890,
  "exp": 1674568790
}
```

**Refresh Token (7 дней):**
```json
{
  "sub": "user@example.com",
  "tokenId": "uuid-4567",
  "type": "refresh",
  "iat": 1674567890,
  "exp": 1675172690
}
```

#### Роли и права:

```java
enum UserRole {
    ADMIN,        // Полный доступ к системе
    MANAGER,      // Управление заказами, клиентами, отчетами
    MECHANIC,     // Работа с заказами, обновление статусов
    RECEPTIONIST, // Создание заказов, работа с клиентами
    CLIENT        // Просмотр своих заказов и авто
}

// Permissions
order:read, order:write, order:delete
client:read, client:write, client:delete
vehicle:read, vehicle:write
part:read, part:write
report:read
```

#### База данных (auth_db):

```sql
users (
    id,
    email (unique),
    password_hash,
    first_name,
    last_name,
    phone,
    is_active,
    email_verified,
    created_at,
    updated_at
)

roles (
    id,
    name (unique),
    description
)

permissions (
    id,
    name (unique),
    resource,
    action
)

user_roles (
    user_id,
    role_id,
    PRIMARY KEY (user_id, role_id)
)

role_permissions (
    role_id,
    permission_id,
    PRIMARY KEY (role_id, permission_id)
)

refresh_tokens (
    id,
    user_id,
    token,
    expires_at,
    created_at
)
```

#### Redis хранилище:

```
// Blacklist токенов
key: "token:blacklist:{jti}"
value: "true"
TTL: время до истечения токена

// Refresh токены
key: "refresh_token:{tokenId}"
value: "{userId, expiresAt}"
TTL: 7 days
```

#### Security Config:

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http
            .csrf().disable()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/login", "/api/auth/register").permitAll()
                .requestMatchers("/api/auth/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, 
                UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

#### Альтернатива: Keycloak

Если использовать Keycloak вместо самописного AuthService:

**Преимущества:**
- ✅ Готовое решение (меньше кода)
- ✅ OAuth 2.0 / OpenID Connect
- ✅ Single Sign-On (SSO)
- ✅ Социальные логины (Google, Facebook)
- ✅ Admin UI из коробки
- ✅ 2FA из коробки

**Docker Compose:**
```yaml
keycloak:
  image: quay.io/keycloak/keycloak:latest
  ports:
    - "8080:8080"
  environment:
    KEYCLOAK_ADMIN: admin
    KEYCLOAK_ADMIN_PASSWORD: admin
  command: start-dev
```

**Интеграция в Spring:**
```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080/realms/autoshop-crm
```

---

### 4. **FileStorageService** (Сервис управления файлами)

```
Порт: 8083
БД: files_db (PostgreSQL) - метаданные
Storage: MinIO (S3-compatible) или локальная FS
Технологии: Spring Boot, MinIO SDK, ImageMagick (thumbnails)
```

#### Ответственность:

```
├── Загрузка файлов
│   ├── Multipart upload
│   ├── Валидация типов (MIME)
│   ├── Ограничение размера (10 MB)
│   └── Генерация уникальных имен
│
├── Хранение
│   ├── MinIO buckets (S3-compatible)
│   ├── Структурированная организация
│   └── Версионирование (опционально)
│
├── Обработка изображений
│   ├── Сжатие (оптимизация размера)
│   ├── Thumbnails (превью)
│   ├── Изменение размера
│   └── Конвертация форматов
│
├── Генерация URL
│   ├── Presigned URLs (временные ссылки)
│   ├── Public URLs
│   └── CDN integration (опционально)
│
├── Управление доступом
│   ├── Проверка прав (через AuthService)
│   ├── Private/Public файлы
│   └── Ограничение по ролям
│
└── Очистка
    ├── Удаление старых файлов
    ├── Удаление неиспользуемых файлов
    └── Scheduled jobs
```

#### REST API Endpoints:

```
POST   /api/files/upload                - Загрузка файла
POST   /api/files/upload/multiple       - Загрузка нескольких файлов
GET    /api/files/{fileId}              - Скачивание файла
GET    /api/files/{fileId}/metadata     - Метаданные файла
GET    /api/files/{fileId}/presigned-url - Временная ссылка (S3)
GET    /api/files/{fileId}/thumbnail    - Превью изображения
DELETE /api/files/{fileId}              - Удаление файла

GET    /api/files/entity/{entityType}/{entityId} - Файлы сущности
       Пример: /api/files/entity/ORDER/123
       Пример: /api/files/entity/VEHICLE/456

POST   /api/files/cleanup/unused        - Очистка неиспользуемых
```

#### Структура проекта:

```
com.autoshop.crm.filestorage/
├── controller/
│   └── FileStorageController.java
│
├── service/
│   ├── FileStorageService.java
│   ├── ImageProcessingService.java
│   ├── MinioService.java
│   └── FileCleanupService.java
│
├── config/
│   ├── MinioConfig.java
│   └── FileStorageConfig.java
│
├── repository/
│   └── FileMetadataRepository.java
│
├── entity/
│   ├── FileMetadata.java
│   ├── FileType.java (enum)
│   └── EntityType.java (enum)
│
├── dto/
│   ├── FileUploadResponse.java
│   └── FileMetadataDto.java
│
└── exception/
    ├── FileUploadException.java
    └── FileNotFoundException.java
```

#### MinIO конфигурация:

```yaml
# application.yml
minio:
  url: http://localhost:9000
  access-key: ${MINIO_ACCESS_KEY}
  secret-key: ${MINIO_SECRET_KEY}
  buckets:
    car-inspections: car-inspections
    documents: documents
    avatars: avatars
    estimates: estimates
```

#### Bucket структура:

```
MinIO Buckets:
├── car-inspections/        (Фото осмотра авто)
│   ├── 2024/01/vehicle-123/
│   │   ├── front-view.jpg
│   │   ├── back-view.jpg
│   │   └── damage-photo.jpg
│   └── thumbnails/
│
├── documents/              (Документы, акты, чеки)
│   ├── 2024/01/order-456/
│   │   ├── work-order.pdf
│   │   └── receipt.pdf
│   └── contracts/
│
├── avatars/                (Аватарки пользователей)
│   ├── user-123.jpg
│   └── thumbnails/
│
└── estimates/              (Сгенерированные сметы PDF)
    └── 2024/01/
        └── estimate-789.pdf
```

#### База данных (files_db):

```sql
file_metadata (
    id,
    original_name,
    stored_name,
    bucket,
    path,
    mime_type,
    size_bytes,
    entity_type (ORDER, VEHICLE, CLIENT, ESTIMATE),
    entity_id,
    uploaded_by,
    is_public,
    created_at
)

-- Индексы
CREATE INDEX idx_entity ON file_metadata(entity_type, entity_id);
CREATE INDEX idx_bucket ON file_metadata(bucket);
```

#### Image Processing:

```java
@Service
public class ImageProcessingService {
    
    public byte[] createThumbnail(byte[] originalImage, int width, int height) {
        // Использование Thumbnailator или ImageMagick
        return Thumbnails.of(new ByteArrayInputStream(originalImage))
            .size(width, height)
            .outputFormat("jpg")
            .toBytes();
    }
    
    public byte[] compressImage(byte[] originalImage, float quality) {
        // Сжатие изображения
    }
}
```

#### Presigned URL (MinIO):

```java
public String generatePresignedUrl(String bucket, String objectName, int expiryMinutes) {
    return minioClient.getPresignedObjectUrl(
        GetPresignedObjectUrlArgs.builder()
            .method(Method.GET)
            .bucket(bucket)
            .object(objectName)
            .expiry(expiryMinutes, TimeUnit.MINUTES)
            .build()
    );
}
```

#### Scheduled cleanup:

```java
@Scheduled(cron = "0 0 3 * * *")  // Каждый день в 3:00
public void cleanupUnusedFiles() {
    LocalDateTime threshold = LocalDateTime.now().minusDays(30);
    List<FileMetadata> orphanFiles = fileMetadataRepository
        .findUnusedFilesBefore(threshold);
    
    orphanFiles.forEach(file -> {
        minioService.deleteFile(file.getBucket(), file.getPath());
        fileMetadataRepository.delete(file);
    });
}
```

---

## 📱 Android Application (Mobile App)

```
Технологии: 
├── Kotlin
├── Jetpack Compose (UI)
├── MVVM Architecture
├── Retrofit (HTTP client)
├── Room (локальная БД)
├── Hilt (Dependency Injection)
├── Coil (Image loading)
└── Firebase Cloud Messaging (Push)
```

### Функциональность:

#### 1. Аутентификация
```
├── Экран логина
├── Регистрация клиентов
├── Восстановление пароля
├── JWT токены (secure storage)
└── Автоматический refresh токенов
```

#### 2. "Мой гараж" (My Garage)
```
├── Список автомобилей клиента
├── Добавление нового автомобиля
│   ├── VIN сканер (камера + OCR)
│   ├── Номер авто
│   └── Технические характеристики
├── Детальная информация об авто
│   ├── Фото автомобиля
│   ├── История обслуживания
│   ├── Напоминания о ТО
│   └── Рекомендации по обслуживанию
└── Редактирование/удаление
```

#### 3. Заказы (Orders)
```
├── История заказов
│   ├── Фильтры (все, активные, завершенные)
│   ├── Поиск по номеру/дате
│   └── Сортировка
│
├── Детали заказа
│   ├── Статус (real-time updates)
│   ├── Список работ и запчастей
│   ├── Смета (цена)
│   ├── Назначенный механик
│   ├── Фото осмотра
│   └── Комментарии
│
└── Создание заказа
    ├── Выбор автомобиля
    ├── Описание проблемы (text + voice)
    ├── Загрузка фото
    └── Предпочитаемая дата
```

#### 4. Программа лояльности
```
├── Баланс баллов
├── Текущий уровень (Bronze/Silver/Gold/Platinum)
├── Прогресс до следующего уровня
├── История начислений/списаний
├── Доступные скидки
└── Персональные предложения
```

#### 5. Уведомления
```
├── Push notifications
│   ├── Смена статуса заказа
│   ├── Готовность автомобиля
│   ├── Напоминания о ТО
│   └── Начисление баллов
│
└── Внутренние уведомления
    ├── История уведомлений
    ├── Прочитано/непрочитано
    └── Переход к связанному заказу
```

#### 6. Профиль
```
├── Личные данные
│   ├── ФИО
│   ├── Телефон
│   ├── Email
│   └── Аватар (upload)
│
├── Настройки
│   ├── Push уведомления (on/off)
│   ├── Email уведомления
│   ├── Язык приложения
│   └── Тема (светлая/темная)
│
└── Безопасность
    ├── Смена пароля
    └── Выход из аккаунта
```

### Архитектура Android App:

```
com.autoshop.crm.android/
├── di/                     (Hilt modules)
│   ├── NetworkModule.kt
│   ├── DatabaseModule.kt
│   └── RepositoryModule.kt
│
├── data/
│   ├── remote/
│   │   ├── api/
│   │   │   ├── AuthApi.kt
│   │   │   ├── VehicleApi.kt
│   │   │   ├── OrderApi.kt
│   │   │   └── LoyaltyApi.kt
│   │   ├── dto/
│   │   └── interceptor/
│   │       └── AuthInterceptor.kt (JWT)
│   │
│   ├── local/
│   │   ├── database/
│   │   │   └── AppDatabase.kt
│   │   ├── dao/
│   │   │   ├── VehicleDao.kt
│   │   │   └── OrderDao.kt
│   │   └── entity/
│   │
│   └── repository/
│       ├── AuthRepository.kt
│       ├── VehicleRepository.kt
│       ├── OrderRepository.kt
│       └── LoyaltyRepository.kt
│
├── domain/
│   ├── model/
│   │   ├── Vehicle.kt
│   │   ├── Order.kt
│   │   └── LoyaltyAccount.kt
│   └── usecase/
│       ├── GetVehiclesUseCase.kt
│       ├── CreateOrderUseCase.kt
│       └── GetLoyaltyBalanceUseCase.kt
│
├── presentation/
│   ├── auth/
│   │   ├── LoginScreen.kt
│   │   ├── LoginViewModel.kt
│   │   └── RegisterScreen.kt
│   │
│   ├── garage/
│   │   ├── GarageScreen.kt
│   │   ├── GarageViewModel.kt
│   │   ├── VehicleDetailScreen.kt
│   │   └── AddVehicleScreen.kt
│   │
│   ├── orders/
│   │   ├── OrdersScreen.kt
│   │   ├── OrdersViewModel.kt
│   │   ├── OrderDetailScreen.kt
│   │   └── CreateOrderScreen.kt
│   │
│   ├── loyalty/
│   │   ├── LoyaltyScreen.kt
│   │   └── LoyaltyViewModel.kt
│   │
│   └── profile/
│       ├── ProfileScreen.kt
│       └── ProfileViewModel.kt
│
├── ui/
│   ├── theme/
│   │   ├── Color.kt
│   │   ├── Theme.kt
│   │   └── Type.kt
│   └── components/
│       ├── VehicleCard.kt
│       ├── OrderCard.kt
│       └── StatusBadge.kt
│
└── util/
    ├── Constants.kt
    ├── NetworkResult.kt
    └── Extensions.kt
```

### API Integration:

```kotlin
// Retrofit API Client
interface VehicleApi {
    @GET("/api/vehicles/client/{clientId}")
    suspend fun getClientVehicles(
        @Path("clientId") clientId: Long,
        @Header("Authorization") token: String
    ): List<VehicleDto>
    
    @POST("/api/vehicles")
    suspend fun createVehicle(
        @Body vehicle: CreateVehicleRequest,
        @Header("Authorization") token: String
    ): VehicleDto
}

// Repository
class VehicleRepository @Inject constructor(
    private val vehicleApi: VehicleApi,
    private val vehicleDao: VehicleDao,
    private val authManager: AuthManager
) {
    suspend fun getVehicles(): Result<List<Vehicle>> {
        return try {
            val token = authManager.getAccessToken()
            val vehicles = vehicleApi.getClientVehicles(
                clientId = authManager.getUserId(),
                token = "Bearer $token"
            )
            // Cache в Room
            vehicleDao.insertAll(vehicles.map { it.toEntity() })
            Result.success(vehicles.map { it.toDomain() })
        } catch (e: Exception) {
            // Fallback к локальному кэшу
            Result.success(vehicleDao.getAll().map { it.toDomain() })
        }
    }
}
```

### Firebase Push Notifications:

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        remoteMessage.data.let { data ->
            when (data["type"]) {
                "ORDER_STATUS_CHANGED" -> {
                    showNotification(
                        title = "Статус заказа изменен",
                        body = data["message"] ?: "",
                        orderId = data["orderId"]
                    )
                }
                "ORDER_COMPLETED" -> {
                    showNotification(
                        title = "Автомобиль готов!",
                        body = "Ваш ${data["vehicleName"]} готов к выдаче"
                    )
                }
                "LOYALTY_POINTS" -> {
                    showNotification(
                        title = "Начислены баллы",
                        body = "Вам начислено ${data["points"]} баллов"
                    )
                }
            }
        }
    }
}
```

### Jetpack Compose UI Example:

```kotlin
@Composable
fun GarageScreen(viewModel: GarageViewModel = hiltViewModel()) {
    val vehicles by viewModel.vehicles.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    
    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Мой гараж") })
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* Add vehicle */ }) {
                Icon(Icons.Default.Add, "Добавить авто")
            }
        }
    ) { padding ->
        when {
            isLoading -> LoadingIndicator()
            vehicles.isEmpty() -> EmptyState()
            else -> LazyColumn(modifier = Modifier.padding(padding)) {
                items(vehicles) { vehicle ->
                    VehicleCard(
                        vehicle = vehicle,
                        onClick = { /* Navigate to details */ }
                    )
                }
            }
        }
    }
}

@Composable
fun VehicleCard(vehicle: Vehicle, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(8.dp)
            .clickable(onClick = onClick)
    ) {
        Row(modifier = Modifier.padding(16.dp)) {
            AsyncImage(
                model = vehicle.photoUrl,
                contentDescription = null,
                modifier = Modifier.size(80.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column {
                Text(
                    text = "${vehicle.make} ${vehicle.model}",
                    style = MaterialTheme.typography.titleMedium
                )
                Text(
                    text = vehicle.licensePlate,
                    style = MaterialTheme.typography.bodyMedium
                )
                Text(
                    text = "${vehicle.year} год",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
}
```

---

## 🌐 WEB Applications (Web Interfaces)

### Обзор:

Два веб-приложения для различных типов пользователей:

1. **Client Portal** - веб-портал для клиентов (аналог мобильного приложения)
2. **Business Dashboard** - панель управления для бизнеса (менеджеры, механики, администраторы)

```
Технологии:
├── React 18 + TypeScript
├── Vite (build tool)
├── React Router (навигация)
├── Redux Toolkit (state management)
├── RTK Query (API integration)
├── Material-UI (MUI) или Ant Design
├── Axios (HTTP client)
├── React Hook Form (формы)
├── Chart.js / Recharts (графики)
└── PWA support (Progressive Web App)
```

---

### 1. **Client Portal** (Клиентский портал)

```
URL: https://client.autoshop-crm.com
Порт (dev): 3000
Аналог: Android Application (те же функции, но в браузере)
```

#### Функциональность:

#### 1.1. Аутентификация
```
├── Страница входа (Login)
│   ├── Email + Password
│   ├── "Запомнить меня"
│   └── Ссылка на восстановление пароля
│
├── Регистрация (Sign Up)
│   ├── ФИО, email, телефон, пароль
│   ├── Email верификация
│   └── Автоматический логин после регистрации
│
└── Восстановление пароля
    ├── Отправка ссылки на email
    └── Форма сброса пароля
```

#### 1.2. "Мой гараж" (My Garage)
```
├── Список автомобилей
│   ├── Карточки с фото, маркой, моделью, номером
│   ├── Grid или List view
│   └── Поиск и фильтрация
│
├── Добавление автомобиля
│   ├── Форма: марка, модель, год, VIN, госномер
│   ├── Загрузка фото
│   └── Автозаполнение по VIN (опционально)
│
├── Детали автомобиля
│   ├── Полная информация
│   ├── Галерея фото
│   ├── История обслуживания (таблица)
│   ├── График расходов
│   ├── Напоминания о ТО
│   └── Рекомендации
│
└── Редактирование/удаление
```

#### 1.3. Заказы (Orders)
```
├── Список заказов
│   ├── Таблица или карточки
│   ├── Фильтры: все, активные, завершенные, отмененные
│   ├── Поиск по номеру заказа
│   ├── Сортировка по дате
│   └── Пагинация
│
├── Создание заказа
│   ├── Выбор автомобиля (dropdown)
│   ├── Описание проблемы (textarea)
│   ├── Загрузка фото (drag & drop)
│   ├── Предпочитаемая дата
│   └── Комментарии
│
├── Детали заказа
│   ├── Статус (визуальный timeline)
│   ├── Информация о заказе
│   ├── Список работ и запчастей (таблица)
│   ├── Смета с детализацией
│   ├── Назначенный механик
│   ├── Фото осмотра (галерея)
│   ├── Комментарии и обновления
│   └── Кнопки: Скачать смету PDF, Связаться
│
└── История
    └── Все прошлые заказы с возможностью повтора
```

#### 1.4. Программа лояльности
```
├── Dashboard
│   ├── Текущий баланс баллов (большой счетчик)
│   ├── Уровень лояльности (Bronze/Silver/Gold/Platinum)
│   ├── Прогресс-бар до следующего уровня
│   └── Доступные скидки
│
├── История транзакций
│   ├── Таблица начислений/списаний
│   ├── Фильтр по дате
│   └── Экспорт в CSV
│
└── Бонусы и акции
    ├── Персональные предложения
    └── Условия программы лояльности
```

#### 1.5. Профиль
```
├── Личные данные
│   ├── ФИО, email, телефон
│   ├── Аватар (upload + crop)
│   └── Редактирование
│
├── Безопасность
│   ├── Смена пароля
│   └── История входов
│
├── Настройки уведомлений
│   ├── Email уведомления (чекбоксы)
│   ├── SMS уведомления
│   └── Push уведомления (если PWA)
│
└── Выход
```

#### Структура проекта (Client Portal):

```
client-portal/
├── public/
│   ├── index.html
│   ├── manifest.json          (PWA)
│   └── service-worker.js      (PWA)
│
├── src/
│   ├── api/
│   │   ├── axiosConfig.ts
│   │   ├── authApi.ts
│   │   ├── vehicleApi.ts
│   │   ├── orderApi.ts
│   │   └── loyaltyApi.ts
│   │
│   ├── store/
│   │   ├── store.ts           (Redux store)
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── vehicleSlice.ts
│   │   │   ├── orderSlice.ts
│   │   │   └── loyaltySlice.ts
│   │   └── api/
│   │       └── apiSlice.ts    (RTK Query)
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Loader.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   │
│   │   ├── vehicle/
│   │   │   ├── VehicleCard.tsx
│   │   │   ├── VehicleList.tsx
│   │   │   ├── VehicleForm.tsx
│   │   │   └── VehicleDetails.tsx
│   │   │
│   │   ├── order/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderList.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   └── OrderTimeline.tsx
│   │   │
│   │   └── loyalty/
│   │       ├── LoyaltyCard.tsx
│   │       ├── PointsHistory.tsx
│   │       └── TierProgress.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ForgotPasswordPage.tsx
│   │   │
│   │   ├── garage/
│   │   │   ├── GaragePage.tsx
│   │   │   ├── VehicleDetailPage.tsx
│   │   │   └── AddVehiclePage.tsx
│   │   │
│   │   ├── orders/
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   └── CreateOrderPage.tsx
│   │   │
│   │   ├── loyalty/
│   │   │   └── LoyaltyPage.tsx
│   │   │
│   │   └── profile/
│   │       └── ProfilePage.tsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── PublicRoute.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useVehicles.ts
│   │   └── useOrders.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   └── validators.ts
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── vehicle.types.ts
│   │   ├── order.types.ts
│   │   └── loyalty.types.ts
│   │
│   ├── styles/
│   │   ├── theme.ts           (MUI theme)
│   │   └── global.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

#### Примеры кода (Client Portal):

**API Integration:**
```typescript
// src/api/vehicleApi.ts
import axios from './axiosConfig';
import { Vehicle, CreateVehicleDto } from '../types/vehicle.types';

export const vehicleApi = {
  getMyVehicles: async (): Promise<Vehicle[]> => {
    const response = await axios.get('/api/vehicles/my');
    return response.data;
  },

  getVehicleById: async (id: number): Promise<Vehicle> => {
    const response = await axios.get(`/api/vehicles/${id}`);
    return response.data;
  },

  createVehicle: async (data: CreateVehicleDto): Promise<Vehicle> => {
    const response = await axios.post('/api/vehicles', data);
    return response.data;
  },

  deleteVehicle: async (id: number): Promise<void> => {
    await axios.delete(`/api/vehicles/${id}`);
  }
};
```

**Redux Slice:**
```typescript
// src/store/slices/vehicleSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { vehicleApi } from '../../api/vehicleApi';
import { Vehicle } from '../../types/vehicle.types';

export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchAll',
  async () => {
    return await vehicleApi.getMyVehicles();
  }
);

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
}

const initialState: VehicleState = {
  vehicles: [],
  loading: false,
  error: null
};

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch vehicles';
      });
  }
});

export default vehicleSlice.reducer;
```

**React Component:**
```typescript
// src/pages/garage/GaragePage.tsx
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Grid, Button, CircularProgress } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { fetchVehicles } from '../../store/slices/vehicleSlice';
import VehicleCard from '../../components/vehicle/VehicleCard';
import { RootState, AppDispatch } from '../../store/store';

const GaragePage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { vehicles, loading } = useSelector((state: RootState) => state.vehicles);

  useEffect(() => {
    dispatch(fetchVehicles());
  }, [dispatch]);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div>
      <h1>Мой гараж</h1>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => navigate('/garage/add')}
      >
        Добавить автомобиль
      </Button>
      
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {vehicles.map((vehicle) => (
          <Grid item xs={12} sm={6} md={4} key={vehicle.id}>
            <VehicleCard
              vehicle={vehicle}
              onClick={() => navigate(`/garage/${vehicle.id}`)}
            />
          </Grid>
        ))}
      </Grid>
    </div>
  );
};

export default GaragePage;
```

---

### 2. **Business Dashboard** (Панель для бизнеса)

```
URL: https://admin.autoshop-crm.com
Порт (dev): 3001
Для: Менеджеры, Механики, Администраторы
```

#### Функциональность:

#### 2.1. Дашборд (Dashboard)
```
├── Сводка (Overview)
│   ├── Активные заказы (счетчик)
│   ├── Заказы за сегодня
│   ├── Выручка за месяц
│   ├── Количество клиентов
│   └── График выручки (7/30 дней)
│
├── Быстрые действия
│   ├── Создать новый заказ
│   ├── Добавить клиента
│   └── Просмотреть склад
│
└── Уведомления
    ├── Новые заказы
    ├── Требующие внимания
    └── Истекающие сроки
```

#### 2.2. Управление заказами (Order Management)
```
├── Список заказов
│   ├── Таблица с фильтрами
│   │   ├── По статусу (NEW, IN_PROGRESS, COMPLETED)
│   │   ├── По механику
│   │   ├── По дате
│   │   └── По клиенту
│   ├── Поиск (номер заказа, клиент, авто)
│   ├── Сортировка
│   ├── Bulk actions (массовые операции)
│   └── Экспорт в Excel
│
├── Создание заказа
│   ├── Выбор клиента (autocomplete)
│   ├── Выбор автомобиля клиента
│   ├── Список работ (multi-select)
│   ├── Добавление запчастей
│   ├── Назначение механика
│   ├── Расчет сметы (автоматически)
│   └── Примечания
│
├── Детали заказа
│   ├── Информация о заказе
│   ├── Клиент и автомобиль
│   ├── Timeline статусов
│   ├── Список работ и запчастей (редактируемая таблица)
│   ├── Смета (редактирование цен)
│   ├── Применение скидок/бонусов
│   ├── Фото осмотра (галерея с комментариями)
│   ├── История изменений (audit log)
│   ├── Назначение/смена механика
│   ├── Изменение статуса
│   └── Генерация PDF (смета, акт выполненных работ)
│
└── Канбан-доска (Kanban Board)
    ├── Колонки: Новые | В работе | На проверке | Завершены
    ├── Drag & Drop перемещение
    └── Фильтр по механику
```

#### 2.3. Управление клиентами (Client Management)
```
├── Список клиентов
│   ├── Таблица с фильтрами
│   ├── Поиск (имя, телефон, email)
│   ├── Сегментация (VIP, обычные, неактивные)
│   └── Экспорт
│
├── Добавление клиента
│   ├── Форма с валидацией
│   └── Автоматическая регистрация в системе лояльности
│
├── Профиль клиента
│   ├── Личные данные (редактирование)
│   ├── Автомобили клиента
│   ├── История заказов (таблица)
│   ├── График расходов
│   ├── Баланс лояльности
│   ├── Статистика (LTV, частота визитов)
│   └── Добавить заметку (CRM notes)
│
└── История взаимодействий
    ├── Звонки, встречи, заказы
    └── Timeline
```

#### 2.4. Управление автомобилями
```
├── Каталог автомобилей всех клиентов
│   ├── Таблица с поиском
│   ├── Фильтр по марке, модели, году
│   └── Группировка по клиентам
│
├── Детали автомобиля
│   ├── Технические характеристики
│   ├── История обслуживания
│   ├── Рекомендации по ТО
│   └── Фото
│
└── Напоминания о ТО
    └── Массовая рассылка клиентам
```

#### 2.5. Управление запчастями (Parts Management)
```
├── Каталог запчастей
│   ├── Таблица с поиском
│   ├── Фильтры (категория, наличие)
│   ├── Сортировка (по цене, остатку)
│   └── CRUD операции
│
├── Складской учет
│   ├── Приход товара
│   ├── Списание
│   ├── Корректировка остатков
│   └── История движения
│
├── Интеграция с UMAPI
│   ├── Поиск запчастей
│   ├── Сравнение цен
│   └── Добавление в каталог
│
└── Уведомления
    └── Низкий остаток (low stock alerts)
```

#### 2.6. Отчеты и аналитика (Reports & Analytics)
```
├── Финансовые отчеты
│   ├── Выручка (день, месяц, год)
│   ├── Прибыль
│   ├── График динамики
│   └── Экспорт в Excel/PDF
│
├── Аналитика заказов
│   ├── Количество заказов
│   ├── Средний чек
│   ├── Конверсия
│   └── Популярные услуги
│
├── Аналитика клиентов
│   ├── Новые vs постоянные
│   ├── LTV (Lifetime Value)
│   ├── Churn rate
│   └── RFM анализ
│
├── Эффективность механиков
│   ├── Количество заказов
│   ├── Среднее время выполнения
│   ├── Рейтинг
│   └── Загрузка
│
└── Custom отчеты
    ├── Конструктор отчетов
    └── Сохраненные шаблоны
```

#### 2.7. Сотрудники (Staff Management)
```
├── Список сотрудников
│   ├── Таблица
│   ├── Фильтр по роли
│   └── Статус (активный/неактивный)
│
├── Добавление сотрудника
│   ├── ФИО, email, телефон
│   ├── Роль (ADMIN, MANAGER, MECHANIC, RECEPTIONIST)
│   ├── График работы
│   └── Автоматическая регистрация в AuthService
│
├── Профиль сотрудника
│   ├── Личные данные
│   ├── Назначенные заказы
│   ├── Статистика работы
│   └── История активности
│
└── Рабочее расписание
    ├── Календарь смен
    └── Назначение на заказы
```

#### 2.8. Настройки (Settings)
```
├── Общие настройки
│   ├── Название автосервиса
│   ├── Контакты, адрес
│   ├── Логотип
│   └── Рабочие часы
│
├── Прайс-лист услуг
│   ├── Категории работ
│   ├── Стоимость
│   └── Редактирование
│
├── Программа лояльности
│   ├── Настройка уровней
│   ├── Правила начисления баллов
│   └── Скидки
│
├── Шаблоны уведомлений
│   ├── Email шаблоны
│   ├── SMS шаблоны
│   └── Редактор
│
└── Интеграции
    ├── UMAPI (API ключи)
    ├── Mailjet (настройки)
    └── Firebase (Push)
```

#### Структура проекта (Business Dashboard):

```
business-dashboard/
├── public/
│   └── index.html
│
├── src/
│   ├── api/
│   │   ├── axiosConfig.ts
│   │   ├── authApi.ts
│   │   ├── orderApi.ts
│   │   ├── clientApi.ts
│   │   ├── vehicleApi.ts
│   │   ├── partApi.ts
│   │   ├── reportApi.ts
│   │   └── staffApi.ts
│   │
│   ├── store/
│   │   ├── store.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── orderSlice.ts
│   │       ├── clientSlice.ts
│   │       ├── partSlice.ts
│   │       └── uiSlice.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumbs.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── QuickActions.tsx
│   │   │
│   │   ├── order/
│   │   │   ├── OrderTable.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderDetails.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   ├── OrderKanban.tsx
│   │   │   └── EstimateEditor.tsx
│   │   │
│   │   ├── client/
│   │   │   ├── ClientTable.tsx
│   │   │   ├── ClientForm.tsx
│   │   │   ├── ClientProfile.tsx
│   │   │   └── ClientStats.tsx
│   │   │
│   │   ├── part/
│   │   │   ├── PartTable.tsx
│   │   │   ├── PartForm.tsx
│   │   │   ├── InventoryManager.tsx
│   │   │   └── UmapiSearch.tsx
│   │   │
│   │   ├── report/
│   │   │   ├── RevenueReport.tsx
│   │   │   ├── OrderReport.tsx
│   │   │   ├── ClientReport.tsx
│   │   │   └── CustomReportBuilder.tsx
│   │   │
│   │   └── common/
│   │       ├── DataTable.tsx
│   │       ├── SearchBar.tsx
│   │       ├── DateRangePicker.tsx
│   │       └── FileUploader.tsx
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   │
│   │   ├── orders/
│   │   │   ├── OrdersPage.tsx
│   │   │   ├── OrderDetailPage.tsx
│   │   │   ├── CreateOrderPage.tsx
│   │   │   └── OrderKanbanPage.tsx
│   │   │
│   │   ├── clients/
│   │   │   ├── ClientsPage.tsx
│   │   │   ├── ClientDetailPage.tsx
│   │   │   └── CreateClientPage.tsx
│   │   │
│   │   ├── vehicles/
│   │   │   └── VehiclesPage.tsx
│   │   │
│   │   ├── parts/
│   │   │   ├── PartsPage.tsx
│   │   │   └── InventoryPage.tsx
│   │   │
│   │   ├── reports/
│   │   │   └── ReportsPage.tsx
│   │   │
│   │   ├── staff/
│   │   │   └── StaffPage.tsx
│   │   │
│   │   └── settings/
│   │       └── SettingsPage.tsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   ├── PrivateRoute.tsx
│   │   └── RoleBasedRoute.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePermissions.ts
│   │   ├── useOrders.ts
│   │   └── useClients.ts
│   │
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── exportUtils.ts
│   │
│   ├── types/
│   │   ├── auth.types.ts
│   │   ├── order.types.ts
│   │   ├── client.types.ts
│   │   ├── vehicle.types.ts
│   │   ├── part.types.ts
│   │   └── report.types.ts
│   │
│   ├── styles/
│   │   ├── theme.ts
│   │   └── global.css
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

#### Примеры кода (Business Dashboard):

**Order Table Component:**
```typescript
// src/components/order/OrderTable.tsx
import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { MoreVert as MoreIcon } from '@mui/icons-material';
import { Order, OrderStatus } from '../../types/order.types';
import { useNavigate } from 'react-router-dom';

interface OrderTableProps {
  orders: Order[];
  onStatusChange: (orderId: number, status: OrderStatus) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({ orders, onStatusChange }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'NEW': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'default';
    }
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Номер заказа</TableCell>
          <TableCell>Клиент</TableCell>
          <TableCell>Автомобиль</TableCell>
          <TableCell>Статус</TableCell>
          <TableCell>Механик</TableCell>
          <TableCell>Сумма</TableCell>
          <TableCell>Дата</TableCell>
          <TableCell>Действия</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.map((order) => (
          <TableRow
            key={order.id}
            hover
            onClick={() => navigate(`/orders/${order.id}`)}
            style={{ cursor: 'pointer' }}
          >
            <TableCell>#{order.id}</TableCell>
            <TableCell>{order.client.fullName}</TableCell>
            <TableCell>{order.vehicle.displayName}</TableCell>
            <TableCell>
              <Chip
                label={order.status}
                color={getStatusColor(order.status)}
                size="small"
              />
            </TableCell>
            <TableCell>{order.mechanic?.name || 'Не назначен'}</TableCell>
            <TableCell>{order.totalAmount} ₽</TableCell>
            <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <IconButton
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedOrder(order);
                }}
              >
                <MoreIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          navigate(`/orders/${selectedOrder?.id}`);
          setAnchorEl(null);
        }}>
          Открыть
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedOrder) {
            onStatusChange(selectedOrder.id, 'IN_PROGRESS');
          }
          setAnchorEl(null);
        }}>
          В работу
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedOrder) {
            onStatusChange(selectedOrder.id, 'COMPLETED');
          }
          setAnchorEl(null);
        }}>
          Завершить
        </MenuItem>
      </Menu>
    </Table>
  );
};

export default OrderTable;
```

**Kanban Board:**
```typescript
// src/components/order/OrderKanban.tsx
import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Paper, Typography, Card, CardContent } from '@mui/material';
import { Order, OrderStatus } from '../../types/order.types';

interface OrderKanbanProps {
  orders: Order[];
  onDragEnd: (orderId: number, newStatus: OrderStatus) => void;
}

const columns = [
  { id: 'NEW', title: 'Новые' },
  { id: 'IN_PROGRESS', title: 'В работе' },
  { id: 'COMPLETED', title: 'Завершены' }
];

const OrderKanban: React.FC<OrderKanbanProps> = ({ orders, onDragEnd }) => {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    
    const orderId = parseInt(result.draggableId);
    const newStatus = result.destination.droppableId as OrderStatus;
    
    onDragEnd(orderId, newStatus);
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(order => order.status === status);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: '16px', overflow: 'auto' }}>
        {columns.map((column) => (
          <div key={column.id} style={{ minWidth: '300px', flex: 1 }}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {column.title}
              </Typography>
              
              <Droppable droppableId={column.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    style={{ minHeight: '500px' }}
                  >
                    {getOrdersByStatus(column.id as OrderStatus).map((order, index) => (
                      <Draggable
                        key={order.id}
                        draggableId={order.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 2 }}
                          >
                            <CardContent>
                              <Typography variant="subtitle2">
                                #{order.id}
                              </Typography>
                              <Typography variant="body2">
                                {order.client.fullName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {order.vehicle.displayName}
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {order.totalAmount} ₽
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </Paper>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default OrderKanban;
```

**Role-Based Route:**
```typescript
// src/routes/RoleBasedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types/auth.types';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactElement;
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  const hasRole = user.roles.some(role => allowedRoles.includes(role));

  if (!hasRole) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default RoleBasedRoute;

// Usage in routes:
<Route
  path="/staff"
  element={
    <RoleBasedRoute allowedRoles={['ADMIN']}>
      <StaffPage />
    </RoleBasedRoute>
  }
/>
```

---

### Общие компоненты обоих приложений:

#### Аутентификация (Shared):
```typescript
// Axios interceptor для автоматического добавления JWT
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8080'
});

// Request interceptor - добавляем токен
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - обновление токена при 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        
        const { accessToken } = response.data;
        localStorage.setItem('access_token', accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
```

#### PWA Support (Progressive Web App):

Оба приложения можно сделать PWA для установки на устройства:

**manifest.json:**
```json
{
  "name": "AutoShop CRM - Client Portal",
  "short_name": "AutoShop",
  "description": "Управление автомобилями и заказами",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1976d2",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**service-worker.js** (кэширование для offline):
```javascript
const CACHE_NAME = 'autoshop-v1';
const urlsToCache = ['/', '/index.html', '/static/css/main.css', '/static/js/main.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

### Deployment:

#### Docker для WEB приложений:

**Dockerfile (Client Portal):**
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://core-application:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Docker Compose (добавить к существующему):

```yaml
  # Web Applications
  client-portal:
    build: ./client-portal
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: http://localhost:8080
      VITE_AUTH_SERVICE_URL: http://localhost:8082
    depends_on:
      - core-application
      - auth-service

  business-dashboard:
    build: ./business-dashboard
    ports:
      - "3001:80"
    environment:
      VITE_API_URL: http://localhost:8080
      VITE_AUTH_SERVICE_URL: http://localhost:8082
    depends_on:
      - core-application
      - auth-service
```

---

### Технологические преимущества WEB приложений:

#### ✅ Client Portal:
- Доступ с любого устройства (десктоп, планшет, телефон)
- PWA - можно установить как native app
- Синхронизация с Android app (единый backend)
- Не требует установки из App Store

#### ✅ Business Dashboard:
- Удобная работа на больших экранах
- Rich UI для сложных операций (таблицы, графики)
- Быстрая разработка и деплой
- Легкое обновление (не нужно проходить модерацию)

#### ✅ Общие преимущества:
- React + TypeScript - type safety
- Redux Toolkit - предсказуемое состояние
- Material-UI - готовые компоненты
- Responsive design - адаптация под любые экраны
- SEO friendly (для публичных страниц)

---

## 🔗 Межсервисное взаимодействие

### Синхронное (REST):

```
Android App → Core Application:
├── GET /api/clients/{id}
├── GET /api/vehicles/client/{clientId}
├── POST /api/orders
└── GET /api/loyalty/balance/{clientId}

Android App → AuthService:
├── POST /api/auth/login
├── POST /api/auth/refresh
└── GET /api/auth/me

Core Application → FileStorageService:
├── POST /api/files/upload (загрузка фото осмотра)
└── GET /api/files/entity/ORDER/{orderId}

Core Application → AuthService:
└── POST /api/auth/verify-token (проверка JWT)

NotificationService → Core Application:
└── GET /api/clients/{id} (получение данных для email)
```

### Асинхронное (Kafka):

```
Producer: Core Application
Consumer: NotificationService

Topics:
├── order.created
├── order.status.changed
├── order.completed
├── estimate.ready
├── loyalty.points.earned
└── vehicle.reminder
```

---

## 🗄️ Базы данных

### PostgreSQL:

```
1. core_db        - вся бизнес-логика (клиенты, авто, заказы, запчасти, лояльность)
2. auth_db        - пользователи, роли, токены
3. notifications_db - история уведомлений, шаблоны
4. files_db       - метаданные файлов
```

### Redis:

```
1. AuthService:
   ├── Token blacklist
   └── Refresh tokens

2. Core Application:
   └── UMAPI cache (24 часа)
```

### MinIO (S3):

```
FileStorageService:
├── car-inspections bucket
├── documents bucket
├── avatars bucket
└── estimates bucket
```

---

## 🐳 Docker Compose

```yaml
version: '3.8'

services:
  # Databases
  postgres-core:
    image: postgres:15
    environment:
      POSTGRES_DB: core_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - core-db-data:/var/lib/postgresql/data

  postgres-auth:
    image: postgres:15
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - auth-db-data:/var/lib/postgresql/data

  postgres-notifications:
    image: postgres:15
    environment:
      POSTGRES_DB: notifications_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5434:5432"
    volumes:
      - notifications-db-data:/var/lib/postgresql/data

  postgres-files:
    image: postgres:15
    environment:
      POSTGRES_DB: files_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5435:5432"
    volumes:
      - files-db-data:/var/lib/postgresql/data

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # Kafka
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # MinIO
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

  # Services
  core-application:
    build: ./core-application
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-core:5432/core_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092
      AUTH_SERVICE_URL: http://auth-service:8082
      FILE_STORAGE_SERVICE_URL: http://file-storage-service:8083
    depends_on:
      - postgres-core
      - redis
      - kafka

  auth-service:
    build: ./auth-service
    ports:
      - "8082:8082"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-auth:5432/auth_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_REDIS_HOST: redis
      SPRING_REDIS_PORT: 6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_TOKEN_EXPIRATION: 900000
      JWT_REFRESH_TOKEN_EXPIRATION: 604800000
    depends_on:
      - postgres-auth
      - redis

  notification-service:
    build: ./notification-service
    ports:
      - "8081:8081"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-notifications:5432/notifications_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:29092
      MAILJET_API_KEY: ${MAILJET_API_KEY}
      MAILJET_SECRET_KEY: ${MAILJET_SECRET_KEY}
    depends_on:
      - postgres-notifications
      - kafka

  file-storage-service:
    build: ./file-storage-service
    ports:
      - "8083:8083"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-files:5432/files_db
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      MINIO_URL: http://minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    depends_on:
      - postgres-files
      - minio

volumes:
  core-db-data:
  auth-db-data:
  notifications-db-data:
  files-db-data:
  redis-data:
  minio-data:
```

---

## 🔐 Безопасность

### 1. Аутентификация:
```
├── JWT токены (Access 15 мин + Refresh 7 дней)
├── Secure storage в Android (EncryptedSharedPreferences)
├── Token blacklist в Redis
└── Автоматический refresh при 401
```

### 2. Авторизация:
```
├── RBAC (Role-Based Access Control)
├── Spring Security annotations (@PreAuthorize)
├── Gateway level authorization
└── Resource ownership validation
```

### 3. Защита данных:
```
├── HTTPS only (SSL/TLS)
├── Пароли: BCrypt hash
├── Sensitive data: encryption at rest
└── CORS configuration
```

### 4. Rate Limiting:
```
├── Login endpoint: 5 попыток / 15 минут
├── API Gateway: 100 req/min per IP
└── Kafka: message throttling
```

---

## 📊 Мониторинг и логирование

### Spring Boot Actuator:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      show-details: always
```

### Prometheus Metrics:
```
├── HTTP request metrics
├── Database connection pool
├── Kafka lag
└── Custom business metrics
```

### Centralized Logging:
```
ELK Stack (опционально):
├── Elasticsearch (хранилище логов)
├── Logstash (агрегация)
└── Kibana (визуализация)
```

### Distributed Tracing:
```
Zipkin или Jaeger:
└── Трассировка запросов через все сервисы
```

---

## 🚀 Deployment Strategy

### Вариант 1: Multi-Repo (Рекомендуемый)

Вы можете держать каждый микросервис в отдельном репозитории на GitHub. Для оркестрации используется один общий репозиторий `infrastructure` или `deployment`.

#### Структура репозиториев:
1. `autoshop-core` (Monolith)
2. `autoshop-notification`
3. `autoshop-auth`
4. `autoshop-files`
5. `autoshop-android`
6. `autoshop-web-client`
7. `autoshop-web-admin`
8. **`autoshop-infrastructure`** (Здесь лежит docker-compose.yml)

#### Как это работает в Docker Compose:

Да, Docker Compose идеально подходит для этого. Вы создаете "инфраструктурный" проект, который собирает все вместе.

**Файловая структура на машине разработчика:**
```
/projects/autoshop/
├── core-service/       (git clone ...)
├── auth-service/       (git clone ...)
├── notification/       (git clone ...)
├── file-service/       (git clone ...)
└── infrastructure/     (git clone ...)
    ├── docker-compose.yml
    └── .env
```

**docker-compose.yml (в папке infrastructure):**
```yaml
version: '3.8'

services:
  core-app:
    build: ../core-service  # Указываем путь к папке соседнего проекта
    ports:
      - "8080:8080"
    depends_on:
      - postgres-core
  
  auth-service:
    build: ../auth-service
    ports:
      - "8082:8082"
  
  notification-service:
    build: ../notification
    ports:
      - "8081:8081"

  # ... базы данных и остальное
```

### Вариант 2: Mono-Repo

Все сервисы лежат в одном большом репозитории в разных папках.
*Проще с точки зрения git, но сложнее CI/CD пайплайны.*

### Production (Kubernetes):
```
Kubernetes:
├── Deployments для каждого сервиса
├── Services (ClusterIP, LoadBalancer)
├── ConfigMaps (конфигурация)
├── Secrets (API keys, passwords)
├── Ingress (маршрутизация)
└── HorizontalPodAutoscaler (автомасштабирование)
```

---

## 📈 Преимущества данной архитектуры

### ✅ Упрощение:
- Основная логика в одном сервисе (проще разрабатывать)
- Меньше межсервисных вызовов
- Проще тестировать и деплоить

### ✅ Разделение ответственности:
- NotificationService - независимая отправка уведомлений
- AuthService - централизованная аутентификация
- FileStorageService - специализированная работа с файлами

### ✅ Масштабируемость:
- Можно масштабировать Core Application отдельно
- NotificationService и FileStorageService можно запускать в нескольких экземплярах
- Kafka обеспечивает асинхронность

### ✅ Готовность к росту:
- При необходимости можно выделить дополнительные сервисы из Core
- Модульная структура позволяет легко мигрировать

---

## 🎯 Итоговая рекомендация

Данная архитектура **оптимальна для дипломного проекта**, потому что:

1. ✅ **Не избыточная** - 4 сервиса вместо 12+
2. ✅ **Демонстрирует навыки** - микросервисы, Kafka, Docker
3. ✅ **Реалистичная** - можно реализовать в одиночку
4. ✅ **Масштабируемая** - готова к росту бизнеса
5. ✅ **Соответствует best practices** - разделение ответственности
6. ✅ **Впечатляет на защите** - полноценное mobile app + backend

**Общая технологическая стек:**
- Spring Boot 3.x (Java 17)
- PostgreSQL (4 БД)
- Redis (кэш + токены)
- Kafka (события)
- MinIO/S3 (файлы)
- Kotlin + Jetpack Compose (Android)
- Docker + Docker Compose
