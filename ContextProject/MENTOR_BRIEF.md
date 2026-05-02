# Дипломный проект: CRM-система для автосервиса

## 🎯 Цель проекта

Разработка полнофункциональной CRM-системы для автоматизации бизнес-процессов автосервиса с мобильным приложением для клиентов и веб-панелью для персонала.

---

## 🛠 Технологический стек

### Backend
- **Java 17+** + **Spring Boot 3.2.x**
- **Spring Security** (гибридная аутентификация: JWT для мобилки + Redis Sessions для Web)
- **PostgreSQL 15** (основная БД) + **Flyway** (миграции)
- **Redis** (кэширование + сессии)
- **MinIO** (S3-совместимое хранилище для файлов/фото)
- **RabbitMQ** (асинхронная обработка: email, уведомления, отчеты)

### Frontend Web
- **Vue.js 3.x** + **Vite**
- **Pinia** (state management)
- Ролевой доступ для администраторов, операторов, механиков

### Mobile
- **Android** (Kotlin)
- **MVVM + Clean Architecture**
- **Retrofit** для REST API
- **Room** для локального кэша

### DevOps
- **Docker Compose** (оркестрация всех сервисов)
- **TestContainers** (интеграционное тестирование)
- **GitHub Actions** (CI/CD)

### Интеграции
- **UMAPI** — каталог автозапчастей (поиск, цены, наличие)
- **SendGrid/SMTP** — email-уведомления
- **Firebase Cloud Messaging** — push-уведомления

---

## 📋 Основной функционал

### Для персонала автосервиса (Web)
1. **CRM-модуль**: управление клиентами, история обслуживания
2. **Управление заказами**: от создания до завершения (статусы, назначение механиков)
3. **Каталог запчастей**: интеграция с UMAPI, сравнение цен от поставщиков
4. **Генерация смет**: автоматический расчет + PDF-документы
5. **Аналитика и отчеты**: финансы, эффективность механиков, популярные услуги
6. **Программа лояльности**: начисление/списание баллов, уровни клиентов

### Для клиентов (Android приложение)
1. **"Мой гараж"**: все автомобили клиента с полной историей обслуживания
2. **Отслеживание заказов**: статусы в реальном времени
3. **Умные напоминания**: ТО, замена масла, техосмотр, страховка
4. **Документы**: хранение актов, чеков, фото ремонта
5. **Баллы лояльности**: просмотр баланса, использование скидок
6. **Push-уведомления**: готовность авто, сметы, спецпредложения

---

## 🏗 Архитектура

### Backend (Clean Architecture)
```
Controller Layer (REST API)
    ↓
Service Layer (бизнес-логика)
    ↓
Repository Layer (Spring Data JPA)
    ↓
Database (PostgreSQL)
```

### Безопасность (Hybrid Security)
- **JWT** (stateless) для мобильного приложения
- **Session-based** (Redis) для веб-панели
- Ролевая модель: `admin`, `operator`, `mechanic`, `client`
- BCrypt для паролей, HTTPS/TLS 1.3

### Асинхронная обработка
- **RabbitMQ** очереди:
  - `q.reports.generation` — генерация отчетов
  - `q.notifications.email` — email-рассылка
  - `q.images.processing` — сжатие фото с телефона

### Файловое хранилище
- **MinIO** (S3-compatible)
- Bucket-ы: `car-inspections`, `documents`, `avatars`
- Streaming upload (без загрузки в RAM)

---

## 🧪 Тестирование

- **Unit Tests**: JUnit 5 + Mockito (покрытие \u003e 80%)
- **Integration Tests**: Spring Test + **TestContainers** (PostgreSQL, Redis, MinIO, RabbitMQ в Docker)
- **E2E Tests**: REST Assured для API

---

## 🚀 Развертывание

Полное окружение запускается одной командой:
```bash
docker-compose up
```

**Поднимаются сервисы:**
- PostgreSQL (БД)
- Redis (кэш + сессии)
- MinIO (файлы)
- RabbitMQ (очереди)
- Backend API (Spring Boot)

---

## 💡 Уникальные особенности

1. **Гибридная безопасность** — две цепочки фильтров Spring Security для разных клиентов
2. **MinIO вместо локального файл-стораджа** — production-ready S3-хранилище
3. **TestContainers** — тестирование в реальном окружении (не H2)
4. **Clean Architecture** — бизнес-логика независима от фреймворка
5. **Программа лояльности с геймификацией** — уровни, баллы, достижения
6. **AI-предиктивная аналитика** (опционально) — предсказание поломок на основе истории

---

## 📊 Уровень сложности

- **Архитектура**: Выше среднего (Clean Architecture, гибридная безопасность, async messaging)
- **Инфраструктура**: Высокий (Docker Compose, MinIO, RabbitMQ, Redis)
- **Код-качество**: Высокий (строгое тестирование, миграции БД, аудит логи)

**Соответствует уровню**: Middle+ Backend разработчик

---

## 📦 Результат

### Артефакты:
1. Backend API (Spring Boot)
2. Web Admin Panel (Vue.js)
3. Android Mobile App (Kotlin)
4. Docker Compose конфигурация
5. Полная документация (Swagger/OpenAPI)
6. Набор тестов (Unit + Integration)

### Демонстрация:
- Работающая система в Docker
- Мобильное приложение на Android
- Web-панель с аналитикой
- Интеграция с внешними API

---

**Технологии покрывают**: Backend (Spring), Frontend (Vue), Mobile (Android), DevOps (Docker), Databases (PostgreSQL, Redis), Message Queues (RabbitMQ), Object Storage (MinIO), Security (JWT, OAuth2), Testing (JUnit, TestContainers)
