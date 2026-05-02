# Структура обучения: AutoShop CRM

> Комплексная структура для изучения всех технологий, необходимых для разработки проекта

---

## 📚 Содержание

1. [Backend Development (Java/Spring)](#backend-development)
2. [Frontend Development (React/TypeScript)](#frontend-development)
3. [Mobile Development (Android/Kotlin)](#mobile-development)
4. [Базы данных](#databases)
5. [Messaging & Queues](#messaging-queues)
6. [DevOps & Infrastructure](devops-infrastructure)
7. [Безопасность](#security)
8. [Тестирование](#testing)
9. [Дополнительные технологии](#additional-technologies)

---

## 1. Backend Development (Java/Spring) {#backend-development}

### 1.1. Java Core

- [ ] **Java 17+ новые возможности**
  
  - Records
  - Sealed classes
  - Pattern matching
  - Text blocks
  - Switch expressions

- [ ] **ООП и принципы проектирования**
  
  - SOLID принципы
  - Design Patterns (Factory, Builder, Strategy, Observer и др.)
  - Clean Code принципы

- [ ] **Коллекции и Streams API**
  
  - List, Set, Map (реализации и их различия)
  - Stream API (map, filter, reduce, collect)
  - Optional
  - Работа с датами (LocalDate, LocalDateTime)

- [ ] **Multithreading**
  
  - Thread, Runnable, ExecutorService
  - Synchronization, Locks
  - CompletableFuture
  - Thread-safe коллекции

### 1.2. Spring Framework

- [ ] **Spring Core**
  
  - Dependency Injection (DI)
  - Inversion of Control (IoC)
  - Bean lifecycle
  - @Component, @Service, @Repository
  - @Autowired, @Qualifier
  - Configuration (@Configuration, @Bean)

- [ ] **Spring Boot**
  
  - Auto-configuration
  - Application.properties / application.yml
  - Profiles (dev, prod)
  - @SpringBootApplication
  - Starters
  - Spring Boot CLI

- [ ] **Spring MVC / Web**
  
  - REST API concepts
  - @RestController, @RequestMapping
  - @GetMapping, @PostMapping, @PutMapping, @DeleteMapping
  - @PathVariable, @RequestParam, @RequestBody
  - ResponseEntity
  - Exception handling (@ExceptionHandler, @ControllerAdvice)
  - Validation (@Valid, @NotNull, @Size, создание custom валидаторов)

- [ ] **Spring Data JPA**
  
  - JPA entity (@Entity, @Id, @GeneratedValue)
  - Relationships (@OneToMany, @ManyToOne, @ManyToMany)
  - JpaRepository, CrudRepository
  - JPQL и Native queries
  - Specifications для динамических запросов
  - @Query
  - Pagination и Sorting
  - Entity lifecycle (persist, merge, remove)
  - Lazy vs Eager loading
  - Cascade types

- [ ] **Spring Security**
  
  - Authentication vs Authorization
  - SecurityFilterChain
  - UserDetails, UserDetailsService
  - PasswordEncoder (BCrypt)
  - JWT authentication
  - @PreAuthorize, @Secured
  - CORS configuration
  - CSRF protection

- [ ] **Spring Kafka**
  
  - Kafka basics (Producer, Consumer, Topics, Partitions)
  - @KafkaListener
  - KafkaTemplate
  - Consumer groups
  - Error handling и retry
  - Dead Letter Queue (DLQ)

- [ ] **Spring Redis**
  
  - RedisTemplate
  - @Cacheable, @CacheEvict
  - Cache configuration
  - Pub/Sub (опционально)

### 1.3. Database Integration

- [ ] **Flyway / Liquibase**
  
  - Database migrations
  - Версионирование схемы
  - Rollback strategies

- [ ] **Hibernate / JPA Advanced**
  
  - N+1 problem и решения
  - Fetch strategies
  - Second-level cache
  - Query optimization

### 1.4. API Design

- [ ] **RESTful API Best Practices**
  
  - HTTP методы и их использование
  - Статус коды (200, 201, 400, 401, 404, 500)
  - Resource naming
  - Versioning API
  - HATEOAS (опционально)

- [ ] **Swagger / OpenAPI**
  
  - @ApiOperation, @ApiResponse
  - Генерация документации
  - Swagger UI

### 1.5. Микросервисы

- [ ] **Microservices Architecture**
  - Принципы микросервисной архитектуры
  - Service communication (sync vs async)
  - API Gateway pattern
  - Service Discovery (Eureka - опционально)
  - Circuit Breaker (Resilience4j - опционально)

---

## 2. Frontend Development (React/TypeScript) {#frontend-development}

### 2.1. JavaScript Fundamentals

- [ ] **Modern JavaScript (ES6+)**
  - let, const
  - Arrow functions
  - Destructuring
  - Spread/rest operators
  - Template literals
  - Promises, async/await
  - Modules (import/export)
  - Array methods (map, filter, reduce, forEach)
  - Object methods

### 2.2. TypeScript

- [ ] **TypeScript Basics**
  
  - Типы (string, number, boolean, array, tuple)
  - Interfaces
  - Type aliases
  - Union и Intersection types
  - Generics
  - Enums
  - Type assertions

- [ ] **TypeScript Advanced**
  
  - Utility types (Partial, Pick, Omit, Record)
  - Mapped types
  - Conditional types
  - Type guards
  - tsconfig.json настройка

### 2.3. React

- [ ] **React Fundamentals**
  
  - JSX
  - Components (functional components)
  - Props
  - State (useState)
  - Events
  - Conditional rendering
  - Lists and keys
  - Forms (controlled components)

- [ ] **React Hooks**
  
  - useState
  - useEffect
  - useContext
  - useReducer
  - useCallback
  - useMemo
  - useRef
  - Custom hooks

- [ ] **React Advanced**
  
  - Component lifecycle
  - Error boundaries
  - Performance optimization (React.memo, lazy loading)
  - Code splitting
  - Portals
  - Refs and DOM manipulation

### 2.4. React Ecosystem

- [ ] **React Router**
  
  - Routes, Route, Link
  - useNavigate, useParams
  - Protected routes
  - Nested routes
  - Route parameters

- [ ] **Redux Toolkit**
  
  - Store, Slices, Reducers
  - configureStore
  - createSlice
  - useSelector, useDispatch
  - Async logic (createAsyncThunk)
  - RTK Query (для API calls)

- [ ] **Material-UI (MUI)**
  
  - Core components (Button, TextField, Dialog, Table и др.)
  - Layout (Grid, Container, Box)
  - Theming (createTheme, ThemeProvider)
  - Styling (sx prop, styled components)
  - Icons (@mui/icons-material)
  - Forms (react-hook-form интеграция)

- [ ] **Additional Libraries**
  
  - Axios (HTTP client)
  - React Hook Form (формы и валидация)
  - Chart.js / Recharts (графики)
  - date-fns / dayjs (работа с датами)
  - React Beautiful DnD (drag and drop для kanban)

### 2.5. Build Tools

- [ ] **Vite**
  - Project setup
  - Configuration (vite.config.ts)
  - Environment variables
  - Build optimization
  - Dev server

### 2.6. Web Fundamentals

- [ ] **HTML/CSS**
  
  - Semantic HTML
  - Flexbox
  - Grid
  - Responsive design
  - Media queries
  - CSS modules

- [ ] **Progressive Web Apps (PWA)**
  
  - Service Workers
  - Manifest.json
  - Offline caching strategies
  - Push notifications (web)

---

## 3. Mobile Development (Android/Kotlin) {#mobile-development}

### 3.1. Kotlin Language

- [ ] **Kotlin Basics**
  
  - Variables (val, var)
  - Data types
  - Functions
  - Classes and Objects
  - Null safety (?, ?., !!)
  - Collections (List, Set, Map)
  - Extension functions
  - Lambdas и Higher-order functions

- [ ] **Kotlin Advanced**
  
  - Coroutines (suspend functions, launch, async)
  - Flow (StateFlow, SharedFlow)
  - Sealed classes
  - Data classes
  - Object declarations
  - Companion objects

### 3.2. Android Fundamentals

- [ ] **Android Basics**
  
  - Activity lifecycle
  - Fragments
  - Intents
  - Resources (strings, drawables, layouts)
  - Permissions
  - Gradle build system

- [ ] **Modern Android (Jetpack)**
  
  - Architecture Components
  - ViewModel
  - LiveData
  - Navigation Component
  - Room Database
  - WorkManager (фоновые задачи)

### 3.3. Jetpack Compose

- [ ] **Compose Basics**
  
  - Composable functions
  - State management (remember, mutableStateOf)
  - Modifier
  - Layout composables (Column, Row, Box, LazyColumn)
  - Material Design components
  - Theming

- [ ] **Compose Advanced**
  
  - Side effects (LaunchedEffect, DisposableEffect)
  - Navigation with Compose
  - ViewModel integration
  - State hoisting
  - Recomposition optimization

### 3.4. Architecture

- [ ] **MVVM Pattern**
  
  - Model-View-ViewModel
  - Separation of concerns
  - Data flow

- [ ] **Clean Architecture (опционально)**
  
  - Layers (presentation, domain, data)
  - Use Cases
  - Repositories

### 3.5. Networking

- [ ] **Retrofit**
  - API interface definition
  - Converters (Gson, Moshi)
  - Interceptors (logging, authentication)
  - Error handling
  - Coroutines integration

### 3.6. Dependency Injection

- [ ] **Hilt**
  - @HiltAndroidApp
  - @Inject
  - @Module, @Provides
  - @Singleton, @ViewModelScoped
  - Constructor injection

### 3.7. Local Storage

- [ ] **Room Database**
  
  - Entity, DAO, Database
  - Queries (@Query, @Insert, @Update, @Delete)
  - Relationships
  - Migration strategies

- [ ] **SharedPreferences / DataStore**
  
  - Key-value storage
  - Preferences DataStore
  - Proto DataStore

### 3.8. Push Notifications

- [ ] **Firebase Cloud Messaging (FCM)**
  - Setup и configuration
  - Receiving notifications
  - Handling notification clicks
  - Topics subscription

### 3.9. Image Loading

- [ ] **Coil**
  - AsyncImage
  - Image transformations
  - Caching strategies

---

## 4. Базы данных {#databases}

### 4.1. PostgreSQL

- [ ] **SQL Fundamentals**
  
  - SELECT, INSERT, UPDATE, DELETE
  - WHERE, ORDER BY, LIMIT
  - JOIN (INNER, LEFT, RIGHT, FULL)
  - GROUP BY, HAVING
  - Aggregate functions (COUNT, SUM, AVG, MAX, MIN)
  - Subqueries

- [ ] **PostgreSQL Specific**
  
  - Data types (serial, uuid, jsonb)
  - Indexes (B-tree, Hash, GIN)
  - Constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK)
  - Transactions (BEGIN, COMMIT, ROLLBACK)
  - Views
  - Triggers и Functions (опционально)
  - Performance tuning (EXPLAIN, ANALYZE)

- [ ] **Database Design**
  
  - Normalization (1NF, 2NF, 3NF)
  - Entity-Relationship diagrams
  - Schema design best practices

### 4.2. Redis

- [ ] **Redis Basics**
  
  - Data structures (String, Hash, List, Set, Sorted Set)
  - GET, SET, DEL
  - EXPIRE (TTL)
  - KEYS, SCAN

- [ ] **Redis Advanced**
  
  - Pub/Sub
  - Transactions (MULTI, EXEC)
  - Persistence (RDB, AOF)
  - Eviction policies
  - Use cases (caching, session storage, rate limiting)

---

## 5. Messaging & Queues {#messaging-queues}

### 5.1. Apache Kafka

- [ ] **Kafka Fundamentals**
  
  - Topics, Partitions, Offsets
  - Producers
  - Consumers, Consumer Groups
  - Brokers, Zookeeper

- [ ] **Kafka Advanced**
  
  - Message ordering
  - Delivery semantics (at-most-once, at-least-once, exactly-once)
  - Replication
  - Retention policies
  - Consumer lag monitoring

- [ ] **Spring Kafka**
  
  - Producer configuration
  - Consumer configuration
  - Error handling strategies
  - Retry и DLQ

---

## 6. DevOps & Infrastructure {#devops-infrastructure}

### 6.1. Docker

- [ ] **Docker Basics**
  
  - Images vs Containers
  - Dockerfile (FROM, RUN, COPY, CMD, ENTRYPOINT, EXPOSE)
  - Building images (docker build)
  - Running containers (docker run)
  - docker ps, docker logs, docker exec
  - Volumes (data persistence)
  - Networks

- [ ] **Docker Advanced**
  
  - Multi-stage builds
  - .dockerignore
  - Image optimization (layer caching)
  - Docker Hub / Container Registry

### 6.2. Docker Compose

- [ ] **Docker Compose**
  - docker-compose.yml syntax
  - Services, Networks, Volumes
  - Environment variables
  - Depends_on
  - docker-compose up/down/logs
  - Scaling services

### 6.3. Git & GitHub

- [ ] **Git Fundamentals**
  
  - git init, clone
  - git add, commit
  - git push, pull
  - git branch, checkout, merge
  - git rebase
  - git stash
  - .gitignore

- [ ] **Git Advanced**
  
  - Branching strategies (Git Flow, GitHub Flow)
  - Pull Requests / Merge Requests
  - Resolving conflicts
  - git cherry-pick
  - git reset vs revert

### 6.4. CI/CD

- [ ] **GitHub Actions**
  
  - Workflows (.github/workflows)
  - Jobs, Steps
  - Triggers (push, pull_request, schedule)
  - Secrets и environment variables
  - Matrix builds
  - Caching dependencies
  - Artifacts

- [ ] **CI/CD Concepts**
  
  - Continuous Integration
  - Continuous Deployment
  - Build automation
  - Testing automation

### 6.5. Nginx

- [ ] **Nginx Basics**
  - Configuration syntax
  - Server blocks
  - Location blocks
  - Reverse proxy
  - Static file serving
  - CORS configuration

### 6.6. MinIO / S3

- [ ] **Object Storage**
  - Buckets
  - Objects
  - Presigned URLs
  - Access control (public vs private)
  - SDK usage (Java, JavaScript)

### 6.7. Kubernetes (опционально для production)

- [ ] **Kubernetes Basics**
  
  - Pods
  - Deployments
  - Services (ClusterIP, NodePort, LoadBalancer)
  - ConfigMaps и Secrets
  - Namespaces

- [ ] **Kubernetes Advanced**
  
  - Ingress
  - HorizontalPodAutoscaler
  - Persistent Volumes
  - Helm charts

---

## 7. Безопасность {#security}

### 7.1. Authentication & Authorization

- [ ] **JWT (JSON Web Tokens)**
  
  - Token structure (header, payload, signature)
  - Access tokens vs Refresh tokens
  - Token expiration
  - Token validation
  - Best practices (хранение, передача)

- [ ] **OAuth 2.0 (опционально)**
  
  - Authorization flow
  - Grant types
  - Resource server vs Authorization server

- [ ] **RBAC (Role-Based Access Control)**
  
  - Roles vs Permissions
  - Implementing RBAC in Spring
  - Frontend authorization

### 7.2. Security Best Practices

- [ ] **OWASP Top 10**
  
  - Injection attacks (SQL injection)
  - Broken Authentication
  - Sensitive Data Exposure
  - XSS (Cross-Site Scripting)
  - CSRF (Cross-Site Request Forgery)
  - Security Misconfiguration

- [ ] **Data Security**
  
  - Password hashing (BCrypt, Argon2)
  - Encryption at rest
  - Encryption in transit (HTTPS/TLS)
  - Input validation и sanitization

- [ ] **API Security**
  
  - Rate limiting
  - API keys management
  - CORS policy
  - HTTPS only

---

## 8. Тестирование {#testing}

### 8.1. Backend Testing (Java/Spring)

- [ ] **JUnit 5**
  
  - @Test, @BeforeEach, @AfterEach
  - Assertions
  - @ParameterizedTest
  - Test lifecycle

- [ ] **Mockito**
  
  - @Mock, @InjectMocks
  - when().thenReturn()
  - verify()
  - ArgumentCaptor

- [ ] **Spring Boot Testing**
  
  - @SpringBootTest
  - @WebMvcTest
  - @DataJpaTest
  - MockMvc
  - TestRestTemplate

- [ ] **TestContainers**
  
  - PostgreSQL container
  - Kafka container
  - Integration testing with real databases

- [ ] **Testing Best Practices**
  
  - Unit tests vs Integration tests
  - Test coverage (JaCoCo)
  - Given-When-Then pattern
  - Test naming conventions

### 8.2. Frontend Testing (React)

- [ ] **Jest**
  
  - Test syntax (describe, it, test)
  - Matchers (expect, toBe, toEqual)
  - Mocking (jest.fn, jest.mock)
  - Async testing

- [ ] **React Testing Library**
  
  - render
  - screen queries (getByRole, getByText, getByTestId)
  - fireEvent
  - waitFor
  - User events testing

- [ ] **Component Testing**
  
  - Testing props
  - Testing state changes
  - Testing user interactions
  - Testing async operations

### 8.3. Mobile Testing (Android)

- [ ] **JUnit для Android**
  
  - Unit тесты для ViewModel
  - Unit тесты для UseCases

- [ ] **Compose Testing**
  
  - ComposeTestRule
  - onNodeWithText, onNodeWithTag
  - performClick
  - assertIsDisplayed

- [ ] **Instrumentation Tests**
  
  - UI testing
  - Navigation testing
  - End-to-end flows

### 8.4. API Testing

- [ ] **Postman**
  
  - Creating requests
  - Collections
  - Environment variables
  - Automated tests (опционально)

- [ ] **REST Assured (опционально)**
  
  - API testing in Java
  - Request/Response validation

---

## 9. Дополнительные технологии {#additional-technologies}

### 9.1. Мониторинг и Логирование

- [ ] **Spring Boot Actuator**
  
  - Health checks
  - Metrics endpoints
  - Custom metrics

- [ ] **Logging**
  
  - SLF4J + Logback
  - Log levels (TRACE, DEBUG, INFO, WARN, ERROR)
  - MDC (Mapped Diagnostic Context)
  - Structured logging (JSON format)

- [ ] **Prometheus (опционально)**
  
  - Metrics collection
  - Scraping endpoints
  - Query language (PromQL)

- [ ] **Grafana (опционально)**
  
  - Dashboards
  - Visualization
  - Alerts

### 9.2. Distributed Tracing (опционально)

- [ ] **Zipkin / Jaeger**
  - Trace propagation
  - Span creation
  - Trace visualization

### 9.3. Email & SMS

- [ ] **JavaMail / Spring Email**
  
  - SMTP configuration
  - Sending emails
  - HTML templates (Thymeleaf)

- [ ] **Mailjet / SendGrid**
  
  - API integration
  - Email templates
  - Delivery tracking

- [ ] **Twilio (для SMS)**
  
  - API setup
  - Sending SMS

### 9.4. File Processing

- [ ] **Image Processing**
  
  - Thumbnailator (Java)
  - Image resizing
  - Format conversion
  - Compression

- [ ] **PDF Generation**
  
  - iText / Apache PDFBox
  - Creating PDF documents
  - Adding images и tables

### 9.5. External APIs Integration

- [ ] **REST Client**
  
  - RestTemplate (Spring)
  - WebClient (reactive)
  - Retry mechanisms
  - Circuit breaker (Resilience4j)

- [ ] **API Versioning**
  
  - URL versioning
  - Header versioning
  - Backward compatibility

---

## 📊 Приоритеты изучения

### Фаза 1: Критически важное (для MVP)

1. ✅ **Java Core** + **Spring Boot** + **Spring Data JPA**
2. ✅ **Spring Security** (JWT)
3. ✅ **PostgreSQL** (SQL basics)
4. ✅ **React** + **TypeScript** + **Redux Toolkit**
5. ✅ **Material-UI**
6. ✅ **Docker** + **Docker Compose**
7. ✅ **Git** (основы)

### Фаза 2: Важное (для Extended Features)

1. ✅ **Spring Kafka**
2. ✅ **Redis**
3. ✅ **MinIO / S3**
4. ✅ **Email integration**
5. ✅ **Тестирование** (JUnit, Mockito, Jest)

### Фаза 3: Расширенное (для Mobile & Advanced)

1. ✅ **Kotlin** + **Jetpack Compose**
2. ✅ **Android Architecture** (MVVM, Clean Architecture)
3. ✅ **Retrofit** + **Hilt**
4. ✅ **Room Database**
5. ✅ **Firebase Cloud Messaging**

### Фаза 4: Production Ready (опционально)

1. ✅ **CI/CD** (GitHub Actions)
2. ✅ **Мониторинг** (Actuator, Prometheus)
3. ✅ **Kubernetes**
4. ✅ **Advanced Security**

---

## 🎯 Рекомендации по изучению

### Стратегия обучения:

1. **Изучай постепенно**: Не пытайся выучить все сразу
2. **Практика важнее теории**: Пиши код параллельно с изучением
3. **Начни с MVP технологий**: Сначала освой критически важные технологии
4. **Используй официальную документацию**: Лучший источник информации
5. **Делай пет-проекты**: Маленькие проекты для закрепления знаний

### Ресурсы для изучения:

- **Официальная документация** (Spring, React, Kotlin)
- **YouTube каналы** (Amigoscode, Traversy Media, freeCodeCamp)
- **Курсы** (Udemy, Coursera, Pluralsight)
- **Книги** (Spring in Action, Effective Java, React documentation)
- **GitHub repositories** (примеры проектов)

### Время на изучение:

- **Если начинаешь с нуля**: 3-4 месяца для MVP технологий
- **Если есть базовые знания**: 1-2 месяца для MVP технологий
- **Полный стек**: 6-8 месяцев для всех технологий

---

## 📝 Структура для конспектов

Рекомендуемая структура для каждой темы:

```
/learning/
├── backend/
│   ├── java/
│   │   ├── java-core.md
│   │   ├── collections.md
│   │   └── multithreading.md
│   ├── spring/
│   │   ├── spring-core.md
│   │   ├── spring-boot.md
│   │   ├── spring-data-jpa.md
│   │   └── spring-security.md
│   └── kafka/
│       └── kafka-basics.md
├── frontend/
│   ├── javascript/
│   │   └── es6-features.md
│   ├── typescript/
│   │   └── typescript-basics.md
│   ├── react/
│   │   ├── react-fundamentals.md
│   │   ├── hooks.md
│   │   └── redux-toolkit.md
│   └── mui/
│       └── material-ui-basics.md
├── mobile/
│   ├── kotlin/
│   │   └── kotlin-basics.md
│   ├── compose/
│   │   └── jetpack-compose.md
│   └── architecture/
│       └── mvvm-pattern.md
├── databases/
│   ├── postgresql.md
│   └── redis.md
├── devops/
│   ├── docker.md
│   ├── docker-compose.md
│   └── git.md
└── testing/
    ├── junit.md
    ├── jest.md
    └── testcontainers.md
```

---

**Всего технологий для изучения**: ~50+

**Критически важных для MVP**: ~15

**Примерное время для полного освоения**: 6-8 месяцев (с практикой)
