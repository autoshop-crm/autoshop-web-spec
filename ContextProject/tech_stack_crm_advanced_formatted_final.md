# Tech Stack: CRM Автосервиса (Hybrid Architecture)

Этот стек объединяет **монолитное ядро** для основной бизнес-логики с **микросервисами** для изолированных задач. Архитектура балансирует между простотой разработки и современными подходами к масштабированию.

---

## 📋 Оглавление

1. [Архитектура системы](#architecture)
2. [Core Monolith (Основное приложение)](#core)
3. [Microservices](#microservices)
   - [Notification Service](#notification)
   - [Auth Service](#auth)
   - [File Storage Service](#filestorage)
4. [Android Application](#android)
5. [Data & Storage](#data)
6. [Security (JWT / Keycloak)](#security)
7. [Async Messaging (Kafka)](#async)
8. [Testing (TestContainers)](#testing)
9. [DevOps & Infrastructure](#devops)

---

---

## Архитектура системы {#architecture}

### Hybrid Architecture: Монолит + Микросервисы

Система построена по принципу **разумного разделения**:

```
┌─────────────────────────────────────────────────────┐
│                 API Gateway                         │
│              (NGINX / Spring Cloud)                 │
└───────┬─────────────┬───────────┬──────────────────┘
        │             │           │
  ┌─────▼─────┐ ┌────▼────┐ ┌────▼─────┐ ┌──────────┐
  │   Core    │ │ Notifi- │ │   Auth   │ │  File    │
  │ Monolith  │ │ cation  │ │ Service  │ │ Storage  │
  │           │ │ Service │ │          │ │ Service  │
  └─────┬─────┘ └────┬────┘ └────┬─────┘ └────┬─────┘
        │            │           │            │
        └────────────┴───────────┴────────────┘
                     ↓
              ┌──────────────┐
              │    Kafka     │
              └──────────────┘
                     ↓
        ┌────────────┴────────────┐
        │                         │
   PostgreSQL                  MinIO
```

### Core Monolith
**Порт:** 8080  
**Содержит:**
- Управление клиентами (CRUD, поиск, фильтрация)
- Управление автомобилями (каталог, история)
- Управление заказами (статусы, workflow)
- Интеграция с внешним API запчастей (UMAPI)
- REST API для Web и Android

**Почему монолит?**
- ✅ Нет проблем с распределенными транзакциями
- ✅ Проще разрабатывать и тестировать
- ✅ Логически связанные сущности (Клиент → Авто → Заказ) в одной БД
- ✅ Быстрее для малого/среднего бизнеса

### Microservices

#### Notification Service
**Порт:** 8081  
**Задача:** Email уведомления (Spring Mail + Mailjet/SMTP)  
**Почему отдельный?** Изолированная задача, может падать без влияния на core

#### Auth Service (альтернатива: Keycloak)
**Порт:** 8082  
**Задача:** Аутентификация, авторизация, управление токенами  
**Почему отдельный?** Безопасность — критичная и изолированная зона

#### File Storage Service
**Порт:** 8083  
**Задача:** Работа с MinIO (загрузка/скачивание документов авто)  
**Почему отдельный?** Тяжелые операции с файлами, S3-совместимость

### Android Application
**Технологии:** Kotlin, MVVM, Retrofit  
**Назначение:** Мобильный клиент для конечных пользователей (клиентов автосервиса)

---

## Core Monolith (Основное приложение) {#core}

Используем многослойную архитектуру. Главный принцип: бизнес-логика не зависит от фреймворка (насколько это возможно в Spring).

### 1. Core Stack

```
├── Java JDK 17+ (LTS)
└── Spring Boot 3.2.x
    ├── spring-boot-starter-web
    ├── spring-boot-starter-data-jpa
    ├── spring-boot-starter-security
    ├── spring-boot-starter-data-redis (для сессий)
    ├── spring-boot-starter-amqp (RabbitMQ)
    └── spring-boot-starter-actuator
```

### 2. Зависимости для "Core Monolith" (pom.xml)

```xml
<dependencies>
    <dependency>
        <groupId>org.liquibase</groupId>
        <artifactId>liquibase-core</artifactId>
    </dependency>

    <dependency>
        <groupId>io.minio</groupId>
        <artifactId>minio</artifactId>
        <version>8.5.x</version>
    </dependency>

    <dependency>
        <groupId>org.springframework.kafka</groupId>
        <artifactId>spring-kafka</artifactId>
    </dependency>
</dependencies>
```

---

## Data & Storage (Postgres + MinIO) {#data}

Мы разделяем хранение структурированных данных и бинарных файлов.

### 1. PostgreSQL (Структурированные данные)

Используем Liquibase для миграций.

- **Location**: `src/main/resources/db/changelog`
- **Master file**: `db.changelog-master.yaml`
- **Changesets**: отдельные файлы в формате YAML, XML или SQL

**Пример структуры:**
```
src/main/resources/db/changelog/
├── db.changelog-master.yaml
├── changesets/
│   ├── 001-init-schema.yaml
│   ├── 002-add-users.yaml
│   └── 003-add-audit.yaml
```

**db.changelog-master.yaml:**
```yaml
databaseChangeLog:
  - include:
      file: db/changelog/changesets/001-init-schema.yaml
  - include:
      file: db/changelog/changesets/002-add-users.yaml
  - include:
      file: db/changelog/changesets/003-add-audit.yaml
```

**Пример 001-init-schema.yaml:**
```yaml
databaseChangeLog:
  - changeSet:
      id: 1
      author: vlad
      changes:
        - createTable:
            tableName: files
            columns:
              - column:
                  name: id
                  type: UUID
                  constraints:
                    primaryKey: true
              - column:
                  name: bucket_name
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
              - column:
                  name: file_path
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
              - column:
                  name: original_filename
                  type: VARCHAR(255)
              - column:
                  name: mime_type
                  type: VARCHAR(100)
              - column:
                  name: size_bytes
                  type: BIGINT
              - column:
                  name: created_at
                  type: TIMESTAMP
                  defaultValueComputed: NOW()
```

### 2. MinIO (S3 Object Storage)

Используется для хранения "тяжелого" контента. Это прямой аналог AWS S3, запускаемый локально.

**Use Cases**:
- Фото осмотра авто: Механик делает фото → Android → Backend → MinIO Bucket `car-inspections`
- Документы: Сгенерированные PDF сметы → MinIO Bucket `documents`
- Аватарки: Bucket `avatars`

**Реализация Service**:

```java
@Service
public class MinioStorageService {
    private final MinioClient minioClient;

    // Streaming upload (без загрузки всего файла в RAM)
    public void uploadFile(InputStream stream, String bucket, String filename, String contentType) {
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucket)
                .object(filename)
                .stream(stream, -1, 10485760)
                .contentType(contentType)
                .build());
    }
    
    // Генерация временной ссылки (Presigned URL) для скачивания
    public String generatePresignedUrl(String filename) {
        return minioClient.getPresignedObjectUrl(...);
    }
}
```

---

## Security (JWT / Keycloak) {#security}

Система использует **stateless аутентификацию** через JWT токены либо через Keycloak.

### Вариант 1: JWT (самостоятельная реализация)

**API Chain** (для Web и Android)
- Клиент: Web Admin Panel, Android App
- Механизм: Stateless JWT
- Flow: Login → Получаем Access/Refresh Token → Шлем в заголовке `Authorization: Bearer ...`
- Storage:
  - Web: LocalStorage или SessionStorage (HTTPS обязательно)
  - Android: Encrypted SharedPreferences

**Конфигурация Spring Security:**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // JWT не требует CSRF
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/mechanic/**").hasAnyRole("ADMIN", "MECHANIC")
                .requestMatchers("/api/client/**").hasAnyRole("ADMIN", "OPERATOR", "CLIENT")
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

**JWT Filter:**

```java
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) {
        String token = extractToken(request);
        if (token != null && jwtTokenProvider.validateToken(token)) {
            Authentication auth = jwtTokenProvider.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        filterChain.doFilter(request, response);
    }
}
```

**Токены:**
- **Access Token:** 30 минут (короткий срок для безопасности)
- **Refresh Token:** 7 дней (для продления без повторного логина)
- **Хранение blacklist:** Redis (если нужно инвалидировать токены)

---

### Вариант 2: Keycloak (рекомендуется для production)

**Преимущества:**
- ✅ Готовое решение (OAuth2/OpenID Connect)
- ✅ Admin UI из коробки
- ✅ 2FA, Social Login (Google, Facebook)
- ✅ Управление ролями и правами
- ✅ Session management

**Интеграция:**

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
</dependency>
```

```java
// Security Config для Keycloak
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtConverter()))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(new KeycloakRoleConverter());
        return converter;
    }
}
```

**application.yml:**

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8180/realms/autoshop
          jwk-set-uri: http://localhost:8180/realms/autoshop/protocol/openid-connect/certs
```

**Keycloak Setup:**
- Realm: `autoshop`
- Client: `autoshop-crm` (confidential)
- Roles: `admin`, `operator`, `mechanic`, `client`

---

### Роли и права

```
ROLE_ADMIN (Администратор)
├── Полный доступ к системе
├── Управление пользователями
├── Финансовые отчеты
└── Настройки системы

ROLE_OPERATOR (Оператор/Диспетчер)
├── Управление клиентами
├── Создание/редактирование заказов
├── Назначение механиков
└── Работа с запчастями

ROLE_MECHANIC (Механик)
├── Просмотр своих заказов
├── Обновление статусов
├── Загрузка фото/документов
└── Комментарии к работе

ROLE_CLIENT (Клиент)
├── Просмотр своих авто
├── История обслуживания
├── Баланс и бонусы (если будет loyalty)
└── Уведомления
```

---

## Async Messaging (Kafka) {#async}

Используем Apache Kafka для event-driven коммуникации между сервисами.

### Зачем Kafka вместо RabbitMQ?

- ✅ Высокая пропускная способность
- ✅ Event sourcing и аудит (события хранятся)
- ✅ Масштабируемость (partitions)
- ✅ Популярен в микросервисах

### Топики (Topics)

**orders.events**
- Producer: Core Monolith (Order Module)
- Consumers: Notification Service
- Events:
  - `OrderCreated` — новый заказ создан
  - `OrderStatusChanged` — статус изменен
  - `OrderCompleted` — заказ завершен
  - `OrderCancelled` — заказ отменен

**notifications.commands**
- Producer: Core Monolith
- Consumer: Notification Service
- Commands:
  - `SendEmailCommand` — отправить email
  - `SendEstimateCommand` — отправить смету

**files.events**
- Producer: File Storage Service
- Consumer: Core Monolith (для обновления записей в БД)
- Events:
  - `FileUploaded` — файл загружен
  - `FileDeleted` — файл удален

### Конфигурация Spring Kafka

**Core Monolith (Producer):**

```java
@Configuration
public class KafkaProducerConfig {
    
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        return new DefaultKafkaProducerFactory<>(config);
    }
    
    @Bean
    public KafkaTemplate<String, Object> kafkaTemplate() {
        return new KafkaTemplate<>(producerFactory());
    }
}
```

**Отправка события:**

```java
@Service
public class OrderService {
    
    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;
    
    public Order createOrder(OrderDTO orderDTO) {
        Order order = // ... создание заказа
        orderRepository.save(order);
        
        // Отправляем событие в Kafka
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(),
            order.getClientId(),
            order.getVehicleId(),
            LocalDateTime.now()
        );
        kafkaTemplate.send("orders.events", event);
        
        return order;
    }
}
```

**Notification Service (Consumer):**

```java
@Service
public class OrderEventListener {
    
    @KafkaListener(topics = "orders.events", groupId = "notification-service")
    public void handleOrderEvent(OrderEvent event) {
        if (event instanceof OrderCreatedEvent) {
            // Отправить email клиенту: "Заказ создан"
            emailService.sendOrderConfirmation(event.getClientId());
        } else if (event instanceof OrderCompletedEvent) {
            // Отправить email: "Автомобиль готов!"
            emailService.sendOrderCompletion(event.getClientId());
        }
    }
}
```

### Event Schema (примеры)

```java
// OrderCreatedEvent.java
public class OrderCreatedEvent {
    private Long orderId;
    private Long clientId;
    private Long vehicleId;
    private LocalDateTime timestamp;
    // getters, setters, constructor
}

// SendEmailCommand.java
public class SendEmailCommand {
    private String to;
    private String subject;
    private String template;
    private Map<String, Object> data;
}
```

### Преимущества для архитектуры

1. **Decoupling**: Core Monolith не знает о Notification Service
2. **Resilience**: Если Notification Service упал, события накопятся в Kafka
3. **Audit Trail**: Все события хранятся (можно replay)
4. **Scalability**: Можно добавлять новых consumers без изменения producers

---

## Microservices {#microservices}

### 1. Notification Service {#notification}

**Порт:** 8081  
**Технологии:** Spring Boot, Spring Mail, Mailjet/SMTP  
**База данных:** Своя PostgreSQL (notification_db) для истории отправок

**Ответственность:**
- Прослушивание Kafka топика `orders.events`
- Отправка email уведомлений
- Шаблоны сообщений (Thymeleaf)
- История отправленных уведомлений
- Retry logic при ошибках

**API:**
```
POST /api/notifications/email
GET  /api/notifications/history/{clientId}
POST /api/notifications/test (для тестирования)
```

**Email Templates:**
- `order_created.html` — "Заказ принят"
- `order_completed.html` — "Автомобиль готов"
- `estimate_ready.html` — "Смета готова"

**Конфигурация (application.yml):**

```yaml
spring:
  mail:
    host: smtp.mailjet.com
    port: 587
    username: ${MAILJET_API_KEY}
    password: ${MAILJET_SECRET_KEY}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true

kafka:
  bootstrap-servers: localhost:9092
  consumer:
    group-id: notification-service
```

---

### 2. Auth Service {#auth}

**Опция A: Свой микросервис**

**Порт:** 8082  
**Технологии:** Spring Boot, Spring Security, JWT, Redis (черный список токенов)  
**База данных:** auth_db (PostgreSQL) — пользователи, роли

**Ответственность:**
- Регистрация новых пользователей
- Логин (генерация JWT Access/Refresh Token)
- Валидация токенов
- Refresh token logic
- Управление ролями
- Инвалидация токенов (blacklist в Redis)

**API:**
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/validate-token
GET  /api/auth/me (текущий пользователь)
```

**Response (Login):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "dGhpc2lzcmVmcmVzaA...",
  "expiresIn": 1800,
  "tokenType": "Bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "roles": ["ROLE_ADMIN"]
  }
}
```

---

**Опция B: Keycloak (рекомендуется)**

**Запуск через Docker:**

```bash
docker run -d \
  -p 8180:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

**Конфигурация Realm:**
1. Создать Realm `autoshop`
2. Создать Client `autoshop-crm` (Type: confidential)
3. Создать Roles: `admin`, `operator`, `mechanic`, `client`
4. Настроить User Federation (если нужна интеграция с AD/LDAP)

**Все микросервисы** используют Keycloak для валидации токенов (OAuth2 Resource Server).

---

### 3. File Storage Service {#filestorage}

**Порт:** 8083  
**Технологии:** Spring Boot, MinIO Java SDK  
**База данных:** files_db (PostgreSQL) — метаданные файлов

**Ответственность:**
- Загрузка файлов в MinIO
- Генерация presigned URLs (для скачивания без авторизации на время)
- Сжатие изображений (thumbnails)
- Управление бакетами
- Метаданные файлов (имя, размер, MIME-type, кто загрузил)

**MinIO Buckets:**
```
car-documents     — документы автомобилей (ПТС, страховка)
order-attachments — фото дефектов, акты выполненных работ
user-avatars      — аватарки пользователей
```

**API:**

```
POST /api/files/upload
  Body: MultipartFile + metadata (bucket, entityType, entityId)
  Response: { "fileId": "uuid", "url": "https://..." }

GET  /api/files/{fileId}
  Response: Redirect to presigned URL

GET  /api/files/{fileId}/presigned-url?expiresIn=3600
  Response: { "url": "https://minio...", "expiresAt": "..." }

DELETE /api/files/{fileId}

GET  /api/files/by-entity?entityType=ORDER&entityId=123
  Response: [ { fileId, filename, size, uploadedAt }, ... ]
```

**MinIO Service:**

```java
@Service
public class MinioStorageService {
    
    private final MinioClient minioClient;
    
    public FileMetadata uploadFile(InputStream stream, String filename, 
                                    String contentType, String bucket) {
        String objectName = UUID.randomUUID() + "_" + filename;
        
        minioClient.putObject(
            PutObjectArgs.builder()
                .bucket(bucket)
                .object(objectName)
                .stream(stream, -1, 10485760) // 10MB parts
                .contentType(contentType)
                .build()
        );
        
        // Сохранить метаданные в PostgreSQL
        return fileMetadataRepository.save(...);
    }
    
    public String getPresignedUrl(String bucket, String objectName, int expiresInSeconds) {
        return minioClient.getPresignedObjectUrl(
            GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(bucket)
                .object(objectName)
                .expiry(expiresInSeconds)
                .build()
        );
    }
}
```

**Интеграция:**
- Core Monolith вызывает File Storage Service через REST API
- Android App загружает фото → File Storage Service → MinIO
- File Storage Service отправляет событие в Kafka `files.events`

---

## Android Application {#android}

### Технологии

**Язык:** Kotlin  
**Архитектура:** MVVM + Clean Architecture  
**Min SDK:** 24 (Android 7.0)  
**Target SDK:** 34 (Android 14)

### Основные библиотеки

```gradle
dependencies {
    // Dependency Injection
    implementation "com.google.dagger:hilt-android:2.48"
    
    // Networking
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.squareup.retrofit2:converter-gson:2.9.0"
    implementation "com.squareup.okhttp3:okhttp:4.11.0"
    implementation "com.squareup.okhttp3:logging-interceptor:4.11.0"
    
    // Async
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    
    // Local DB
    implementation "androidx.room:room-runtime:2.5.2"
    implementation "androidx.room:room-ktx:2.5.2"
    
    // Image Loading
    implementation "io.coil-kt:coil:2.4.0"
    
    // UI
    implementation "androidx.compose.ui:ui:1.5.0"
    implementation "androidx.compose.material3:material3:1.1.1"
    
    // Navigation
    implementation "androidx.navigation:navigation-compose:2.7.1"
}
```

### Модули приложения

```
app/
├── data/
│   ├── remote/        (Retrofit API)
│   ├── local/         (Room Database)
│   └── repository/    (Repository implementations)
│
├── domain/
│   ├── model/         (Domain entities)
│   ├── repository/    (Repository interfaces)
│   └── usecase/       (Business logic)
│
├── presentation/
│   ├── auth/          (Login, Register)
│   ├── garage/        ("Мой гараж")
│   ├── orders/        (Список заказов клиента)
│   └── profile/       (Профиль, настройки)
│
└── di/                (Hilt modules)
```

### Функции приложения

#### 1. Авторизация
- Логин по email/паролю
- Сохранение JWT в Encrypted SharedPreferences
- Auto-refresh token

#### 2. "Мой гараж"
```kotlin
// Экран показывает:
data class GarageResponse(
    val vehicles: List<Vehicle>,
    val upcomingMaintenance: List<MaintenanceReminder>
)

data class Vehicle(
    val id: Long,
    val make: String,
    val model: String,
    val year: Int,
    val vin: String,
    val licensePlate: String,
    val mileage: Int,
    val photoUrl: String?
)
```

#### 3. История обслуживания
- Список всех заказов по автомобилю
- Детали заказа (работы, запчасти, стоимость)
- Просмотр документов (PDF, фото)

#### 4. Уведомления
- Firebase Cloud Messaging (FCM)
- Push при изменении статуса заказа
- Напоминания о ТО

#### 5. Профиль
- Редактирование данных
- Контактная информация
- Выход из аккаунта

### Retrofit API Client

```kotlin
interface AutoshopApi {
    
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse
    
    @GET("api/garage/{clientId}")
    suspend fun getGarage(@Path("clientId") clientId: Long): GarageResponse
    
    @GET("api/orders/by-client/{clientId}")
    suspend fun getOrders(@Path("clientId") clientId: Long): List<Order>
    
    @Multipart
    @POST("api/files/upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part,
        @Part("bucket") bucket: RequestBody
    ): FileUploadResponse
}
```

### Interceptor для JWT

```kotlin
class AuthInterceptor(private val tokenManager: TokenManager) : Interceptor {
    
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = tokenManager.getAccessToken()
        
        val authenticatedRequest = request.newBuilder()
            .header("Authorization", "Bearer $token")
            .build()
        
        return chain.proceed(authenticatedRequest)
    }
}
```

Используем брокер сообщений для развязывания компонентов и выполнения долгих задач.

### Очереди (Queues)

**q.reports.generation**:
- Producer: Web (Менеджер нажал "Отчет за месяц")
- Consumer: Report Service. Генерирует PDF, загружает в MinIO, сохраняет ссылку в БД, отправляет уведомление

**q.notifications.email**:
- Payload: `{ "to": "client@mail.com", "template": "ORDER_READY", "data": {...} }`
- Logic: Отправка писем через SendGrid/SMTP. Если упало — Retry mechanism (Dead Letter Queue)

**q.images.processing** (Опционально):
- Logic: Сжатие фото, загруженных с телефона, создание миниатюр (thumbnails)

### Конфигурация

```java
@Configuration
public class RabbitConfig {
    public static final String REPORT_QUEUE = "q.reports.generation";

    @Bean
    public Queue reportQueue() {
        return new Queue(REPORT_QUEUE, true); // durable
    }
    
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
```

---

## Testing (TestContainers) {#testing}

Никаких H2 (In-memory DB). Тестируем в окружении, идентичном проду.

### Базовый класс для Integration Tests

Все интеграционные тесты наследуются от этого класса. Он поднимает Docker-контейнеры один раз на весь прогон тестов.

```java
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(initializers = {AbstractIntegrationTest.Initializer.class})
public abstract class AbstractIntegrationTest {

    // Поднимаем PostgreSQL
    static final PostgreSQLContainer<?> postgreSQLContainer = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("integration-tests-db");

    // Поднимаем Redis
    static final GenericContainer<?> redisContainer = new GenericContainer<>("redis:7.0")
            .withExposedPorts(6379);

    // Поднимаем MinIO
    static final MinIOContainer minioContainer = new MinIOContainer("minio/minio:RELEASE.2023-09-04T19-57-37Z")
            .withEnv("MINIO_ROOT_USER", "minioadmin")
            .withEnv("MINIO_ROOT_PASSWORD", "minioadmin");

    // Поднимаем RabbitMQ
    static final RabbitMQContainer rabbitContainer = new RabbitMQContainer("rabbitmq:3.12-management");

    @BeforeAll
    static void startContainers() {
        Startables.deepStart(Stream.of(
            postgreSQLContainer, redisContainer, minioContainer, rabbitContainer
        )).join();
    }

    static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext ctx) {
            TestPropertyValues.of(
                "spring.datasource.url=" + postgreSQLContainer.getJdbcUrl(),
                "spring.datasource.username=" + postgreSQLContainer.getUsername(),
                "spring.datasource.password=" + postgreSQLContainer.getPassword(),
                "spring.data.redis.host=" + redisContainer.getHost(),
                "spring.data.redis.port=" + redisContainer.getMappedPort(6379),
                "minio.url=" + minioContainer.getS3URL(),
                "spring.rabbitmq.host=" + rabbitContainer.getHost(),
                "spring.rabbitmq.port=" + rabbitContainer.getAmqpPort()
            ).applyTo(ctx.getEnvironment());
        }
    }
}
```

---

## DevOps & Infrastructure {#devops}

Всё окружение запускается одной командой.

### docker-compose.yml

```yaml
version: '3.9'

services:
  # 1. База данных (Core Monolith)
  postgres-core:
    image: postgres:15-alpine
    container_name: crm-postgres-core
    environment:
      POSTGRES_DB: autoshop_core
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - ./data/postgres-core:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d autoshop_core"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. MinIO (S3 Storage)
  minio:
    image: minio/minio:latest
    container_name: crm-minio
    command: server --console-address ":9001" /data
    ports:
      - "9000:9000" # API
      - "9001:9001" # Console UI
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: password123
    volumes:
      - ./data/minio:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  # 3. Kafka (Message Broker)
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: crm-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: crm-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    healthcheck:
      test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server=localhost:9092"]
      interval: 30s
      timeout: 10s
      retries: 5

  # 4. Keycloak (Auth Service - опционально)
  keycloak:
    image: quay.io/keycloak/keycloak:latest
    container_name: crm-keycloak
    command: start-dev
    ports:
      - "8180:8080"
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-auth:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: password
    depends_on:
      - postgres-auth

  postgres-auth:
    image: postgres:15-alpine
    container_name: crm-postgres-auth
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: password
    volumes:
      - ./data/postgres-auth:/var/lib/postgresql/data

  # 5. Core Monolith (Backend API)
  core-api:
    build:
      context: ./core-monolith
      dockerfile: Dockerfile
    container_name: crm-core-api
    depends_on:
      postgres-core:
        condition: service_healthy
      kafka:
        condition: service_healthy
      minio:
        condition: service_healthy
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-core:5432/autoshop_core
      SPRING_DATASOURCE_USERNAME: user
      SPRING_DATASOURCE_PASSWORD: password
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: admin
      MINIO_SECRET_KEY: password123

  # 6. Notification Service
  notification-service:
    build:
      context: ./notification-service
      dockerfile: Dockerfile
    container_name: crm-notification-service
    depends_on:
      - kafka
      - postgres-notification
    ports:
      - "8081:8081"
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-notification:5432/notifications
      MAILJET_API_KEY: ${MAILJET_API_KEY}
      MAILJET_SECRET_KEY: ${MAILJET_SECRET_KEY}

  postgres-notification:
    image: postgres:15-alpine
    container_name: crm-postgres-notification
    environment:
      POSTGRES_DB: notifications
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - ./data/postgres-notification:/var/lib/postgresql/data

  # 7. File Storage Service
  file-storage-service:
    build:
      context: ./file-storage-service
      dockerfile: Dockerfile
    container_name: crm-file-storage
    depends_on:
      - minio
      - postgres-files
      - kafka
    ports:
      - "8083:8083"
    environment:
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: admin
      MINIO_SECRET_KEY: password123
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres-files:5432/files

  postgres-files:
    image: postgres:15-alpine
    container_name: crm-postgres-files
    environment:
      POSTGRES_DB: files
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - ./data/postgres-files:/var/lib/postgresql/data

volumes:
  postgres_core_data:
  postgres_auth_data:
  postgres_notification_data:
  postgres_files_data:
  minio_data:
```

### Запуск системы

```bash
# Старт всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Логи конкретного сервиса
docker-compose logs -f core-api

# Остановка
docker-compose down

# Остановка с удалением данных
docker-compose down -v
```

### Порты сервисов

```
Core Monolith:         http://localhost:8080
Notification Service:  http://localhost:8081
Auth Service:          http://localhost:8082  (если свой)
File Storage Service:  http://localhost:8083

Keycloak Admin:        http://localhost:8180
MinIO Console:         http://localhost:9001
Kafka:                 localhost:9092
PostgreSQL:            localhost:5432
```

### Healthcheck Endpoints

```
Core API:              GET http://localhost:8080/actuator/health
Notification Service:  GET http://localhost:8081/actuator/health
File Storage Service:  GET http://localhost:8083/actuator/health
```

Всё окружение запускается одной командой.

### docker-compose.yml

```yaml
version: '3.9'

---

## Testing (TestContainers) {#testing}

Никаких H2 (In-memory DB). Тестируем в окружении, идентичном проду.

### Базовый класс для Integration Tests

Все интеграционные тесты наследуются от этого класса. Он поднимает Docker-контейнеры один раз на весь прогон тестов.

```java
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ContextConfiguration(initializers = {AbstractIntegrationTest.Initializer.class})
public abstract class AbstractIntegrationTest {

    // Поднимаем PostgreSQL
    static final PostgreSQLContainer<?> postgreSQLContainer = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("integration-tests-db");

    // Поднимаем MinIO
    static final MinIOContainer minioContainer = new MinIOContainer("minio/minio:RELEASE.2023-09-04T19-57-37Z")
            .withEnv("MINIO_ROOT_USER", "minioadmin")
            .withEnv("MINIO_ROOT_PASSWORD", "minioadmin");

    // Поднимаем Kafka
    static final KafkaContainer kafkaContainer = new KafkaContainer(
            DockerImageName.parse("confluentinc/cp-kafka:7.5.0")
    );

    @BeforeAll
    static void startContainers() {
        Startables.deepStart(Stream.of(
            postgreSQLContainer, minioContainer, kafkaContainer
        )).join();
    }

    static class Initializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
        @Override
        public void initialize(ConfigurableApplicationContext ctx) {
            TestPropertyValues.of(
                "spring.datasource.url=" + postgreSQLContainer.getJdbcUrl(),
                "spring.datasource.username=" + postgreSQLContainer.getUsername(),
                "spring.datasource.password=" + postgreSQLContainer.getPassword(),
                "minio.url=" + minioContainer.getS3URL(),
                "spring.kafka.bootstrap-servers=" + kafkaContainer.getBootstrapServers()
            ).applyTo(ctx.getEnvironment());
        }
    }
}
```

### Пример теста сервиса заказов

```java
public class OrderServiceTest extends AbstractIntegrationTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Test
    void testCreateOrder_shouldSendKafkaEvent() {
        // Given
        OrderDTO orderDTO = new OrderDTO(/* ... */);

        // When
        Order order = orderService.createOrder(orderDTO);

        // Then
        assertThat(order.getId()).isNotNull();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.NEW);

        // Verify Kafka event was sent
        verify(kafkaTemplate).send(eq("orders.events"), any(OrderCreatedEvent.class));
    }
}
```

### Тестирование микросервисов

**Notification Service Test:**

```java
@SpringBootTest
@EmbeddedKafka(partitions = 1, topics = {"orders.events"})
public class OrderEventListenerTest {

    @Autowired
    private EmbeddedKafkaBroker embeddedKafka;

    @Autowired
    private KafkaTemplate<String, OrderEvent> kafkaTemplate;

    @MockBean
    private EmailService emailService;

    @Test
    void testOrderCreatedEvent_shouldSendEmail() throws Exception {
        // Given
        OrderCreatedEvent event = new OrderCreatedEvent(1L, 100L, 200L);

        // When
        kafkaTemplate.send("orders.events", event).get();

        // Wait for async processing
        Thread.sleep(1000);

        // Then
        verify(emailService).sendOrderConfirmation(100L);
    }
}
```

---

## Итоговая архитектура

### Уровень сложности

**Architecture**: Средний-Выше среднего
- Монолит для основной логики (избегаем распределенных транзакций)
- Микросервисы для изолированных задач
- Event-driven через Kafka

**Технологии**: Высокий
- Spring Boot 3.x (современный стек)
- JWT / Keycloak (production-ready security)
- Kafka (enterprise message broker)
- MinIO (S3-compatible storage)
- TestContainers (тестирование как в проде)
- Android (Kotlin, MVVM, Clean Architecture)

**Соответствует уровню**: Middle+ Backend / Full-stack разработчик

### Преимущества архитектуры

✅ **Простота разработки** — монолит проще писать и отлаживать  
✅ **Нет распределенных транзакций** — ACID гарантии  
✅ **Микросервисы там, где нужно** — изоляция тяжелых задач  
✅ **Event-driven** — слабая связанность компонентов  
✅ **Production-ready** — Kafka, Keycloak, MinIO  
✅ **Тестируемость** — TestContainers для integration tests  

### Что демонстрирует проект

**Backend:**
- Spring Boot 3, Spring Data JPA, Spring Security
- Integration с внешним API (UMAPI)
- Kafka для асинхронной обработки
- MinIO (S3) для файлов
- JWT / Keycloak для auth
- Liquibase миграции
- TestContainers

**Frontend:**
(если делать) Vue.js 3, Pinia, API integration

**Mobile:**
- Kotlin, MVVM, Clean Architecture
- Retrofit, Room, Coroutines
- JWT authentication
- File uploads

**DevOps:**
- Docker, Docker Compose
- Multi-service orchestration
- Environment configuration

---

**Рекомендация**: Эта архитектура идеально подходит для дипломного проекта. Она показывает понимание современных подходов без избыточной сложности полных микросервисов.
