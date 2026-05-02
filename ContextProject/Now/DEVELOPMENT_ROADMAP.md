# План разработки AutoShop CRM

> Комплексная система управления автосервисом с микросервисной архитектурой

---

## 📋 Общая структура

- [ ] **Backend Services** (4 микросервиса)
- [ ] **Mobile Application** (Android)
- [ ] **Web Applications** (2 приложения)
- [ ] **Infrastructure & DevOps**

---

## 🔧 1. Core Application (Монолитное ядро)

### 1.1. Инициализация проекта
- [ ] Создать Spring Boot проект (Java 17, Spring Boot 3.x)
- [ ] Настроить структуру проекта (модульная архитектура)
- [ ] Настроить Maven/Gradle dependencies
- [ ] Создать docker-compose для локальной разработки

### 1.2. База данных (PostgreSQL)
- [ ] Спроектировать схему БД (все таблицы)
- [ ] Настроить Flyway/Liquibase для миграций
- [ ] Создать JPA entities для всех доменов
- [ ] Настроить connection pool и оптимизацию

### 1.3. Модуль: Client Management
- [ ] Создать CRUD endpoints для клиентов
- [ ] Реализовать поиск и фильтрацию
- [ ] Добавить валидацию данных
- [ ] Реализовать сегментацию клиентов (VIP, обычные)

### 1.4. Модуль: Vehicle Management
- [ ] Создать CRUD endpoints для автомобилей
- [ ] Реализовать связь клиент-автомобиль (one-to-many)
- [ ] Добавить валидацию VIN и номеров
- [ ] Реализовать историю обслуживания

### 1.5. Модуль: Order Management
- [ ] Создать CRUD endpoints для заказов
- [ ] Реализовать жизненный цикл заказа (state machine)
- [ ] Реализовать назначение механиков
- [ ] Создать систему расчета смет
- [ ] Добавить управление скидками

### 1.6. Модуль: Parts Management
- [ ] Создать CRUD endpoints для запчастей
- [ ] Реализовать складской учет (приход/расход)
- [ ] Интегрировать UMAPI для внешнего каталога
- [ ] Настроить Redis для кэширования UMAPI
- [ ] Реализовать резервирование запчастей под заказы

### 1.7. Модуль: Loyalty Program
- [ ] Создать систему балов (начисление/списание)
- [ ] Реализовать уровни лояльности (Bronze/Silver/Gold/Platinum)
- [ ] Создать логику расчета скидок
- [ ] Реализовать историю транзакций

### 1.8. Интеграции
- [ ] Настроить Kafka producer для событий
- [ ] Реализовать интеграцию с AuthService (token validation)
- [ ] Реализовать интеграцию с FileStorageService
- [ ] Настроить retry механизмы для внешних API

### 1.9. Безопасность
- [ ] Настроить Spring Security
- [ ] Реализовать проверку JWT токенов
- [ ] Добавить role-based access control
- [ ] Настроить CORS

### 1.10. Тестирование
- [ ] Unit тесты для service layer
- [ ] Integration тесты для repositories
- [ ] API тесты (MockMvc)
- [ ] Настроить TestContainers для PostgreSQL

---

## 🔔 2. NotificationService

### 2.1. Инициализация проекта
- [ ] Создать Spring Boot проект
- [ ] Настроить структуру проекта
- [ ] Настроить dependencies (Spring Email, Kafka)

### 2.2. База данных
- [ ] Создать схему для notifications_db
- [ ] Настроить миграции
- [ ] Создать entities (Notification, Template)

### 2.3. Email уведомления
- [ ] Настроить Spring Email + Mailjet
- [ ] Создать систему шаблонов (Thymeleaf)
- [ ] Реализовать отправку email
- [ ] Добавить retry механизм

### 2.4. SMS и Push уведомления
- [ ] Интегрировать Twilio для SMS (опционально)
- [ ] Настроить Firebase Cloud Messaging для Push
- [ ] Реализовать отправку уведомлений

### 2.5. Kafka Consumer
- [ ] Настроить Kafka consumer
- [ ] Реализовать обработчики событий (OrderCreated, OrderStatusChanged и т.д.)
- [ ] Добавить error handling и DLQ

### 2.6. Управление шаблонами
- [ ] Создать CRUD endpoints для шаблонов
- [ ] Реализовать динамические параметры
- [ ] Добавить поддержку мультиязычности

### 2.7. Тестирование
- [ ] Unit тесты
- [ ] Integration тесты с Kafka (TestContainers)
- [ ] Тесты email отправки (mock SMTP)

---

## 🔐 3. AuthService

### 3.1. Инициализация проекта
- [ ] Создать Spring Boot проект
- [ ] Настроить структуру проекта
- [ ] Настроить dependencies (Spring Security, JWT, Redis)

### 3.2. База данных
- [ ] Создать схему auth_db
- [ ] Настроить миграции
- [ ] Создать entities (User, Role, Permission, RefreshToken)

### 3.3. Аутентификация
- [ ] Реализовать регистрацию пользователей
- [ ] Реализовать login (генерация JWT)
- [ ] Реализовать logout (blacklist)
- [ ] Реализовать refresh token механизм

### 3.4. Авторизация
- [ ] Реализовать управление ролями
- [ ] Реализовать управление правами (permissions)
- [ ] Настроить RBAC
- [ ] Создать endpoint для проверки токенов

### 3.5. Безопасность
- [ ] Настроить BCrypt для паролей
- [ ] Реализовать token blacklist в Redis
- [ ] Добавить rate limiting для login
- [ ] Реализовать восстановление пароля

### 3.6. Redis интеграция
- [ ] Настроить Redis connection
- [ ] Реализовать хранение refresh tokens
- [ ] Реализовать token blacklist

### 3.7. Тестирование
- [ ] Unit тесты для authentication logic
- [ ] Integration тесты с Redis
- [ ] Security тесты

---

## 📁 4. FileStorageService

### 4.1. Инициализация проекта
- [ ] Создать Spring Boot проект
- [ ] Настроить структуру проекта
- [ ] Настроить dependencies (MinIO SDK)

### 4.2. База данных
- [ ] Создать схему files_db
- [ ] Настроить миграции
- [ ] Создать entity FileMetadata

### 4.3. MinIO интеграция
- [ ] Настроить MinIO connection
- [ ] Создать buckets (car-inspections, documents, avatars, estimates)
- [ ] Реализовать upload/download файлов
- [ ] Реализовать presigned URLs

### 4.4. Обработка изображений
- [ ] Настроить ImageMagick/Thumbnailator
- [ ] Реализовать создание thumbnails
- [ ] Реализовать сжатие изображений

### 4.5. Управление файлами
- [ ] Создать CRUD endpoints для файлов
- [ ] Реализовать связь файлов с сущностями (Order, Vehicle и т.д.)
- [ ] Реализовать валидацию типов файлов
- [ ] Добавить ограничения размера

### 4.6. Очистка
- [ ] Реализовать scheduled job для удаления старых файлов
- [ ] Добавить удаление неиспользуемых файлов

### 4.7. Тестирование
- [ ] Unit тесты
- [ ] Integration тесты с MinIO (TestContainers)
- [ ] Тесты обработки изображений

---

## 📱 5. Android Application

### 5.1. Инициализация проекта
- [ ] Создать Android проект (Kotlin)
- [ ] Настроить Gradle dependencies
- [ ] Настроить Jetpack Compose
- [ ] Настроить Hilt (DI)

### 5.2. Архитектура
- [ ] Настроить MVVM pattern
- [ ] Создать базовую структуру пакетов (data, domain, presentation)
- [ ] Настроить Navigation Component

### 5.3. Networking
- [ ] Настроить Retrofit
- [ ] Создать API interfaces (AuthApi, VehicleApi, OrderApi, LoyaltyApi)
- [ ] Настроить JWT interceptor
- [ ] Реализовать automatic token refresh

### 5.4. Локальная БД
- [ ] Настроить Room database
- [ ] Создать DAOs
- [ ] Создать entities для offline кэширования

### 5.5. Экраны: Аутентификация
- [ ] Создать экран Login
- [ ] Создать экран Registration
- [ ] Создать экран Forgot Password
- [ ] Реализовать secure token storage (EncryptedSharedPreferences)

### 5.6. Экраны: Мой гараж
- [ ] Создать экран списка автомобилей
- [ ] Создать экран добавления автомобиля
- [ ] Создать экран деталей автомобиля
- [ ] Реализовать VIN сканер (опционально)

### 5.7. Экраны: Заказы
- [ ] Создать экран списка заказов
- [ ] Создать экран создания заказа
- [ ] Создать экран деталей заказа
- [ ] Реализовать timeline статусов

### 5.8. Экраны: Лояльность
- [ ] Создать экран баланса и уровня
- [ ] Создать экран истории транзакций
- [ ] Реализовать визуализацию прогресса

### 5.9. Экраны: Профиль
- [ ] Создать экран профиля
- [ ] Реализовать редактирование данных
- [ ] Реализовать upload аватара
- [ ] Создать экран настроек

### 5.10. Push уведомления
- [ ] Настроить Firebase Cloud Messaging
- [ ] Создать NotificationService
- [ ] Реализовать обработчики уведомлений

### 5.11. UI/UX
- [ ] Создать Material Design theme
- [ ] Реализовать темную/светлую тему
- [ ] Создать reusable компоненты (VehicleCard, OrderCard)
- [ ] Добавить loading states и error handling

### 5.12. Тестирование
- [ ] Unit тесты для ViewModels
- [ ] Unit тесты для UseCases
- [ ] UI тесты (Compose Testing)

---

## 🌐 6. Client Portal (Web - для клиентов)

### 6.1. Инициализация проекта
- [ ] Создать React + TypeScript проект (Vite)
- [ ] Настроить структуру проекта
- [ ] Настроить dependencies (React Router, Redux Toolkit, MUI)

### 6.2. State Management
- [ ] Настроить Redux store
- [ ] Создать slices (auth, vehicles, orders, loyalty)
- [ ] Настроить RTK Query для API calls

### 6.3. Routing
- [ ] Настроить React Router
- [ ] Создать PrivateRoute component
- [ ] Настроить маршруты для всех страниц

### 6.4. API интеграция
- [ ] Настроить Axios
- [ ] Создать API clients (authApi, vehicleApi, orderApi)
- [ ] Настроить JWT interceptor
- [ ] Реализовать automatic token refresh

### 6.5. Страницы: Аутентификация
- [ ] Создать LoginPage
- [ ] Создать RegisterPage
- [ ] Создать ForgotPasswordPage

### 6.6. Страницы: Мой гараж
- [ ] Создать GaragePage (список авто)
- [ ] Создать VehicleDetailPage
- [ ] Создать AddVehiclePage
- [ ] Реализовать VehicleCard component

### 6.7. Страницы: Заказы
- [ ] Создать OrdersPage (список)
- [ ] Создать OrderDetailPage
- [ ] Создать CreateOrderPage
- [ ] Реализовать OrderTimeline component

### 6.8. Страницы: Лояльность
- [ ] Создать LoyaltyPage
- [ ] Реализовать визуализацию баланса и уровня
- [ ] Создать таблицу истории транзакций

### 6.9. Страницы: Профиль
- [ ] Создать ProfilePage
- [ ] Реализовать редактирование данных
- [ ] Реализовать upload аватара
- [ ] Создать страницу настроек

### 6.10. UI/UX
- [ ] Настроить MUI theme
- [ ] Реализовать responsive design
- [ ] Создать reusable компоненты
- [ ] Добавить loading states и error handling

### 6.11. PWA Support
- [ ] Настроить manifest.json
- [ ] Создать service worker
- [ ] Настроить offline кэширование

### 6.12. Тестирование
- [ ] Unit тесты для компонентов (Jest + React Testing Library)
- [ ] Integration тесты

---

## 💼 7. Business Dashboard (Web - для бизнеса)

### 7.1. Инициализация проекта
- [ ] Создать React + TypeScript проект (Vite)
- [ ] Настроить структуру проекта
- [ ] Настроить dependencies (React Router, Redux Toolkit, MUI/Ant Design)

### 7.2. State Management
- [ ] Настроить Redux store
- [ ] Создать slices (auth, orders, clients, parts, ui)
- [ ] Настроить RTK Query

### 7.3. Routing & Security
- [ ] Настроить React Router
- [ ] Создать RoleBasedRoute component
- [ ] Настроить маршруты с проверкой прав

### 7.4. API интеграция
- [ ] Настроить Axios
- [ ] Создать все API clients
- [ ] Настроить JWT interceptor

### 7.5. Layout
- [ ] Создать DashboardLayout
- [ ] Создать Sidebar с навигацией
- [ ] Создать Header с профилем пользователя
- [ ] Реализовать Breadcrumbs

### 7.6. Dashboard & Analytics
- [ ] Создать DashboardPage с метриками
- [ ] Реализовать StatsCard компоненты
- [ ] Создать RevenueChart (Chart.js/Recharts)
- [ ] Добавить QuickActions

### 7.7. Управление заказами
- [ ] Создать OrdersPage с таблицей
- [ ] Создать OrderDetailPage
- [ ] Создать CreateOrderPage с формой
- [ ] Реализовать OrderKanban (drag & drop)
- [ ] Создать EstimateEditor

### 7.8. Управление клиентами
- [ ] Создать ClientsPage с таблицей
- [ ] Создать ClientDetailPage с полным профилем
- [ ] Создать CreateClientPage
- [ ] Реализовать ClientStats компонент

### 7.9. Управление запчастями
- [ ] Создать PartsPage с таблицей
- [ ] Создать InventoryManager
- [ ] Реализовать UmapiSearch для поиска внешних запчастей
- [ ] Создать форму приход/расход

### 7.10. Отчеты и аналитика
- [ ] Создать ReportsPage
- [ ] Реализовать RevenueReport с графиками
- [ ] Реализовать OrderReport
- [ ] Реализовать ClientReport (LTV, RFM анализ)
- [ ] Создать CustomReportBuilder

### 7.11. Управление сотрудниками
- [ ] Создать StaffPage
- [ ] Реализовать CRUD для сотрудников
- [ ] Создать календарь смен

### 7.12. Настройки
- [ ] Создать SettingsPage
- [ ] Реализовать настройки автосервиса
- [ ] Создать редактор прайс-листа
- [ ] Настроить программу лояльности
- [ ] Создать редактор шаблонов уведомлений

### 7.13. UI/UX
- [ ] Настроить theme (темная тема для dashboard)
- [ ] Создать реиспользуемые компоненты (DataTable, SearchBar, DateRangePicker)
- [ ] Реализовать responsive design
- [ ] Добавить loading states и error handling

### 7.14. Тестирование
- [ ] Unit тесты для компонентов
- [ ] Integration тесты

---

## 🐳 8. Infrastructure & DevOps

### 8.1. Docker
- [ ] Создать Dockerfile для каждого микросервиса
- [ ] Создать Dockerfile для web приложений (multi-stage build)
- [ ] Создать docker-compose.yml для development
- [ ] Настроить docker-compose для всех зависимостей (PostgreSQL, Redis, Kafka, MinIO)

### 8.2. CI/CD
- [ ] Настроить GitHub Actions для каждого репозитория
- [ ] Создать workflow для build и test
- [ ] Создать workflow для Docker build & push
- [ ] Настроить автоматический deploy (опционально)

### 8.3. Мониторинг
- [ ] Настроить Spring Boot Actuator для всех сервисов
- [ ] Настроить Prometheus для сбора метрик
- [ ] Настроить Grafana для визуализации (опционально)

### 8.4. Логирование
- [ ] Настроить централизованное логирование (опционально - ELK Stack)
- [ ] Настроить structured logging (JSON format)

### 8.5. Distributed Tracing
- [ ] Настроить Zipkin/Jaeger для трассировки (опционально)

### 8.6. Kubernetes (опционально для production)
- [ ] Создать Deployment манифесты для каждого сервиса
- [ ] Создать Service манифесты
- [ ] Настроить ConfigMaps и Secrets
- [ ] Настроить Ingress
- [ ] Настроить HorizontalPodAutoscaler

### 8.7. Документация
- [ ] Создать README для каждого репозитория
- [ ] Создать API документацию (Swagger/OpenAPI)
- [ ] Создать deployment guide
- [ ] Создать архитектурную диаграмму

---

## 📊 Приоритизация

### Фаза 1: MVP (Minimum Viable Product)
1. ✅ Core Application (базовый CRUD)
2. ✅ AuthService
3. ✅ Business Dashboard (основные функции)
4. ✅ Infrastructure (Docker Compose для development)

### Фаза 2: Extended Features
1. ✅ NotificationService
2. ✅ FileStorageService
3. ✅ Client Portal (Web)
4. ✅ Расширенная аналитика в Business Dashboard

### Фаза 3: Mobile & Advanced
1. ✅ Android Application
2. ✅ Программа лояльности (полная реализация)
3. ✅ Advanced отчеты и аналитика
4. ✅ PWA для Client Portal

### Фаза 4: Production Ready
1. ✅ Полное тестирование всех компонентов
2. ✅ CI/CD pipelines
3. ✅ Мониторинг и логирование
4. ✅ Kubernetes deployment (опционально)

---

## 🚀 MVP: Детальный план задач

> **Цель MVP**: Создать работающую систему с базовым функционалом для демонстрации основных возможностей CRM

### Компоненты MVP:
- ✅ Core Application (с основным CRUD)
- ✅ AuthService (аутентификация и авторизация)
- ✅ Business Dashboard (веб-интерфейс для управления)
- ✅ Infrastructure (Docker Compose)

---

### MVP-1: Core Application (Базовый функционал)

#### Задачи:
1. **Инициализация и настройка проекта**
   - [ ] Создать Spring Boot проект с модульной структурой
   - [ ] Настроить PostgreSQL и создать базовую схему БД
   - [ ] Настроить Flyway для миграций
   - [ ] Создать docker-compose для локальной БД

2. **Модуль: Управление клиентами**
   - [ ] Создать entity `Client` и repository
   - [ ] Реализовать CRUD endpoints (`POST /api/clients`, `GET /api/clients/{id}`, `PUT`, `DELETE`)
   - [ ] Добавить поиск по имени/телефону/email
   - [ ] Добавить базовую валидацию (required fields, email format)

3. **Модуль: Управление автомобилями**
   - [ ] Создать entity `Vehicle` с связью one-to-many к `Client`
   - [ ] Реализовать CRUD endpoints
   - [ ] Добавить endpoint `GET /api/vehicles/client/{clientId}` для получения авто клиента
   - [ ] Добавить валидацию VIN (опционально) и госномера

4. **Модуль: Управление заказами**
   - [ ] Создать entities: `Order`, `OrderItem`, `OrderStatus` (enum)
   - [ ] Реализовать CRUD endpoints для заказов
   - [ ] Реализовать базовый state machine (NEW → IN_PROGRESS → COMPLETED)
   - [ ] Создать endpoint для изменения статуса `PUT /api/orders/{id}/status`
   - [ ] Реализовать связь заказа с клиентом и автомобилем

5. **Модуль: Управление запчастями (упрощенно)**
   - [ ] Создать entity `Part` (id, name, price, stock)
   - [ ] Реализовать CRUD endpoints
   - [ ] Добавить поиск по названию
   - [ ] Реализовать связь `OrderItem` → `Part`

6. **Базовая безопасность**
   - [ ] Настроить Spring Security
   - [ ] Временно: Basic Auth или простая JWT проверка (до готовности AuthService)
   - [ ] Настроить CORS для frontend

7. **Базовое тестирование**
   - [ ] Unit тесты для критичных service методов
   - [ ] Integration тесты для основных endpoints (MockMvc)

**Результат**: Backend API готов для работы с клиентами, автомобилями, заказами и запчастями.

---

### MVP-2: AuthService

#### Задачи:
1. **Инициализация проекта**
   - [ ] Создать Spring Boot проект
   - [ ] Настроить PostgreSQL (auth_db)
   - [ ] Настроить Redis для token storage

2. **База данных**
   - [ ] Создать entities: `User`, `Role` (enum: ADMIN, MANAGER, MECHANIC, CLIENT)
   - [ ] Настроить миграции
   - [ ] Наполнить базовыми ролями

3. **Аутентификация**
   - [ ] Реализовать регистрацию: `POST /api/auth/register`
   - [ ] Реализовать login с генерацией JWT: `POST /api/auth/login`
   - [ ] Реализовать logout с blacklist: `POST /api/auth/logout`
   - [ ] Настроить JWT (access token 15 мин)
   - [ ] Реализовать refresh token механизм

4. **Проверка токенов**
   - [ ] Создать endpoint `POST /api/auth/verify-token` для других сервисов
   - [ ] Реализовать token blacklist в Redis

5. **RBAC (Role-Based Access Control)**
   - [ ] Добавить роли в JWT claims
   - [ ] Создать endpoint `GET /api/auth/me` для получения текущего пользователя

6. **Безопасность**
   - [ ] Настроить BCrypt для хэширования паролей
   - [ ] Добавить rate limiting для login endpoint

7. **Тестирование**
   - [ ] Unit тесты для authentication logic
   - [ ] Integration тесты (login, logout, token refresh)

**Результат**: Полноценный сервис аутентификации с JWT, готовый к интеграции с другими сервисами.

---

### MVP-3: Business Dashboard (Web)

#### Задачи:
1. **Инициализация проекта**
   - [ ] Создать React + TypeScript проект (Vite)
   - [ ] Настроить Redux Toolkit и RTK Query
   - [ ] Настроить React Router
   - [ ] Установить Material-UI

2. **Аутентификация**
   - [ ] Создать LoginPage с формой
   - [ ] Реализовать интеграцию с AuthService (login endpoint)
   - [ ] Настроить хранение JWT в localStorage
   - [ ] Создать Axios interceptor для автоматической передачи токена
   - [ ] Реализовать PrivateRoute для защищенных страниц

3. **Layout**
   - [ ] Создать базовый DashboardLayout (Header + Sidebar + Content)
   - [ ] Создать Sidebar с навигацией (Заказы, Клиенты, Автомобили, Запчасти)
   - [ ] Добавить кнопку Logout в Header

4. **Управление клиентами**
   - [ ] Создать ClientsPage с таблицей (Material-UI Table)
   - [ ] Добавить кнопку "Добавить клиента"
   - [ ] Создать модальное окно CreateClientModal с формой
   - [ ] Реализовать редактирование клиента
   - [ ] Добавить поиск по имени

5. **Управление автомобилями**
   - [ ] Создать VehiclesPage с таблицей
   - [ ] Добавить фильтр по клиенту
   - [ ] Создать форму добавления автомобиля (с выбором клиента)

6. **Управление заказами**
   - [ ] Создать OrdersPage с таблицей
   - [ ] Показывать: номер заказа, клиент, автомобиль, статус, дата
   - [ ] Добавить фильтр по статусу (NEW, IN_PROGRESS, COMPLETED)
   - [ ] Создать CreateOrderPage с формой:
     - Выбор клиента (autocomplete)
     - Выбор автомобиля клиента
     - Добавление запчастей (select)
   - [ ] Создать OrderDetailPage с возможностью изменения статуса

7. **Управление запчастями**
   - [ ] Создать PartsPage с таблицей
   - [ ] Добавить кнопку "Добавить запчасть"
   - [ ] Создать форму добавления/редактирования запчасти

8. **API интеграция**
   - [ ] Создать API clients (authApi, clientApi, vehicleApi, orderApi, partApi)
   - [ ] Настроить Redux slices для каждого домена
   - [ ] Реализовать loading states и error handling

9. **UI/UX**
   - [ ] Настроить MUI theme
   - [ ] Добавить Loader компонент для загрузки
   - [ ] Добавить Toast notifications для успешных операций/ошибок

**Результат**: Полнофункциональная веб-панель для управления всеми сущностями CRM.

---

### MVP-4: Infrastructure (Docker Compose)

#### Задачи:
1. **Создать репозиторий infrastructure**
   - [ ] Создать GitHub репозиторий `autoshop-infrastructure`
   - [ ] Создать структуру папок

2. **Docker Compose для development**
   - [ ] Создать `docker-compose.yml` с сервисами:
     - PostgreSQL (core_db)
     - PostgreSQL (auth_db)
     - Redis
     - Core Application
     - AuthService
   - [ ] Создать `.env.example` с переменными окружения
   - [ ] Настроить сети для связи между контейнерами

3. **Dockerfiles**
   - [ ] Создать Dockerfile для Core Application
   - [ ] Создать Dockerfile для AuthService
   - [ ] Создать Dockerfile для Business Dashboard (multi-stage build: build + nginx)

4. **Nginx для Business Dashboard**
   - [ ] Настроить nginx.conf для SPA
   - [ ] Настроить proxy для API requests (/api → core-application:8080)

5. **Документация**
   - [ ] Создать README.md с инструкциями по запуску
   - [ ] Документировать environment variables
   - [ ] Добавить troubleshooting секцию

6. **Скрипты**
   - [ ] Создать скрипт для первичной инициализации БД (seed data)
   - [ ] Создать скрипт для остановки и очистки всех контейнеров

**Результат**: Весь MVP запускается одной командой `docker-compose up`.

---

### Критерии готовности MVP:

- [ ] ✅ **Backend API работает**: Можно создавать клиентов, автомобили, заказы, запчасти через API
- [ ] ✅ **Аутентификация работает**: Можно зарегистрироваться, войти, получить JWT токен
- [ ] ✅ **Web Dashboard работает**: Можно управлять всеми сущностями через браузер
- [ ] ✅ **Docker Compose**: Вся система запускается одной командой
- [ ] ✅ **Интеграция**: Frontend корректно вызывает Backend API с JWT аутентификацией
- [ ] ✅ **Базовые тесты**: Критичные endpoints покрыты тестами
- [ ] ✅ **Можно продемонстрировать**: Полный user flow (создать клиента → добавить авто → создать заказ)

---

### Примерное время разработки MVP:

- **Core Application**: 2-3 недели
- **AuthService**: 1-2 недели
- **Business Dashboard**: 2-3 недели
- **Infrastructure**: 3-5 дней
- **Интеграция и тестирование**: 1 неделя

**Итого: ~6-8 недель** для полного MVP

---

### После MVP — следующие шаги:

1. Добавить **NotificationService** (Фаза 2)
2. Добавить **FileStorageService** (Фаза 2)
3. Разработать **Client Portal** для клиентов (Фаза 2)
4. Добавить расширенную аналитику в Business Dashboard (Фаза 2)
5. Разработать **Android Application** (Фаза 3)
6. Полностью реализовать программу лояльности (Фаза 3)
7. Подготовить к production: CI/CD, мониторинг, документация (Фаза 4)


---

## 🎯 Метрики успеха

- [ ] Все микросервисы запускаются через docker-compose
- [ ] API покрытие тестами > 70%
- [ ] Все основные user flows работают end-to-end
- [ ] Документация актуальна и полная
- [ ] Приложение готово к демонстрации на защите диплома

---

**Общее количество задач**: ~200+ (с подзадачами)

**Примерное время разработки**: 4-6 месяцев (в зависимости от темпа)

**Технологический стек**:
- Backend: Java 17, Spring Boot 3.x, PostgreSQL, Redis, Kafka, MinIO
- Frontend: React 18, TypeScript, Redux Toolkit, Material-UI
- Mobile: Kotlin, Jetpack Compose, Room, Retrofit
- DevOps: Docker, Docker Compose, GitHub Actions



3. Глубокий «Мой гараж 2.0»
Финансовая аналитика по авто: графики расходов по категориям (ТО, кузов, резина, тюнинг), прогноз затрат, сравнение «сколько тратят владельцы такой же модели».
​

Цифровой досье для продажи: кнопка «подготовить отчёт для продажи» — приложение собирает историю визитов, чеков, рекомендаций и формирует экспортируемый PDF/ссылку для покупателя.
​

4. Интеграция с API запчастей и маркетплейс‑логика
Подбор запчастей по VIN и смете: после диагностики пользователь видит варианты запчастей от разных поставщиков (оригинал/аналог, цены, сроки), может выбрать комплект самостоятельно, а сервис только ставит.
​

Режим “со своим маслом/деталями” с расчётом гарантий и стоимости работ: система сразу пересчитывает смету и условия гарантии по схеме «вы свои детали — наша гарантия только на работу».

