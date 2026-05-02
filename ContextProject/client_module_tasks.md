# Модуль управления клиентами (Client Management Module)

## 📋 Что должен уметь модуль

### Основные функции:

1. **CRUD операции** — создание, чтение, обновление, удаление клиентов
2. **Поиск и фильтрация** — по имени, телефону, email
3. **Связь с другими модулями** — автомобили, заказы, программа лояльности
4. **Валидация данных** — проверка корректности email, телефона
5. **Обработка ошибок** — корректные HTTP статусы и сообщения об ошибках

---

## 🗂️ Структура модуля

```
com.autoshop.crm.core/
└── modules/
    └── client/
        ├── controller/      → REST API endpoints
        ├── service/         → Бизнес-логика
        ├── repository/      → Работа с БД
        ├── entity/          → JPA сущности
        ├── dto/             → Data Transfer Objects
        ├── mapper/          → Конвертация DTO ↔ Entity
        └── exception/       → Кастомные исключения
```

---

## 📊 Схема БД для клиента

Согласно `DATABASE_SCHEMA.md`:

```sql
CREATE TABLE customer (
    customer_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    number VARCHAR(20) NOT NULL,  -- телефон
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customer_first_name ON customer(first_name);
CREATE INDEX idx_customer_email ON customer(email);
CREATE INDEX idx_customer_number ON customer(number);
```

**Связи:**

- `Customer` ← **1:N** → `Cars` (один клиент - много машин)
- `Customer` ← **1:1** → `Loyalty_accounts` (один клиент - один счет лояльности)
- `Customer` ← **1:N** → `Order` (один клиент - много заказов)

---

## ✅ Детальный чек-лист задач

### 1. Слой Entity (JPA)

- [x] Создать JPA entity `Client` с маппингом на таблицу `customer`
- [x] Настроить все поля согласно схеме БД (id, firstName, lastName, email, phoneNumber)
- [x] Добавить временные метки (createdAt, updatedAt) с автоматическим заполнением
- [ ] Настроить связь `@OneToMany` с Vehicle (список автомобилей)
- [ ] Настроить связь `@OneToMany` с Order (список заказов)
- [ ] Настроить связь `@OneToOne` с LoyaltyAccount (счет лояльности)
- [ ] Добавить методы `@PrePersist` и `@PreUpdate` для автоматического обновления timestamps

---

### 2. Слой Repository

- [ ] Создать интерфейс `ClientRepository`, наследующий от `BaseRepository<Client, Long>`
- [ ] Добавить метод поиска по email
- [ ] Добавить метод поиска по телефону
- [ ] Добавить метод поиска по имени/фамилии (игнорируя регистр)
- [ ] Добавить метод проверки существования клиента по email
- [ ] Добавить метод проверки существования клиента по телефону
- [ ] Настроить поддержку пагинации для получения списка клиентов

---

### 3. Слой DTO (Data Transfer Objects)

- [ ] Создать `ClientCreateDto` для создания клиента
  
  - Поля: firstName, lastName, email, phoneNumber
  - Добавить валидацию: @NotBlank, @Email, @Pattern для телефона

- [ ] Создать `ClientUpdateDto` для обновления клиента
  
  - Все поля опциональные (можно обновлять частично)
  - Добавить валидацию для каждого поля

- [ ] Создать `ClientResponseDto` для ответа API
  
  - Включить: id, firstName, lastName, email, phoneNumber
  - Добавить: totalOrders (количество заказов)
  - Добавить: totalSpent (общая сумма потраченных денег)
  - Добавить: loyaltyTier (уровень лояльности)
  - Добавить: loyaltyPoints (баланс баллов)
  - Добавить: createdAt, updatedAt

- [ ] Создать `ClientSearchDto` для параметров поиска
  
  - Поля: query, email, phoneNumber, loyaltyTier
  - Параметры пагинации: page, size, sortBy, sortDirection

---

### 4. Слой Mapper

- [ ] Создать `ClientMapper` для конвертации между DTO и Entity
- [ ] Реализовать метод `toEntity(ClientCreateDto)` → Client
- [ ] Реализовать метод `toResponseDto(Client)` → ClientResponseDto
- [ ] Реализовать метод `updateEntityFromDto(Client, ClientUpdateDto)` для частичного обновления
- [ ] Добавить вспомогательные методы:
  - Подсчет общей суммы потраченных денег из заказов
  - Получение уровня лояльности из LoyaltyAccount
  - Получение баланса баллов из LoyaltyAccount

---

### 5. Слой Service

- [ ] Создать интерфейс `ClientService` с методами:
  
  - `createClient(ClientCreateDto)` → ClientResponseDto
  - `getClientById(Long id)` → ClientResponseDto
  - `updateClient(Long id, ClientUpdateDto)` → ClientResponseDto
  - `deleteClient(Long id)` → void
  - `getAllClients(Pageable)` → Page<ClientResponseDto>
  - `searchClients(ClientSearchDto)` → List<ClientResponseDto>
  - `existsByEmail(String)` → boolean
  - `existsByPhoneNumber(String)` → boolean

- [ ] Создать `ClientServiceImpl` с реализацией всех методов

- [ ] В методе `createClient`:
  
  - Проверить, что email не занят (выбросить исключение если занят)
  - Проверить, что телефон не занят (выбросить исключение если занят)
  - Сохранить клиента в БД
  - Вернуть DTO с данными созданного клиента

- [ ] В методе `getClientById`:
  
  - Найти клиента по ID
  - Выбросить исключение `ClientNotFoundException` если не найден
  - Вернуть DTO

- [ ] В методе `updateClient`:
  
  - Найти клиента по ID (выбросить исключение если не найден)
  - Проверить уникальность email/телефона при их изменении
  - Обновить только переданные поля (частичное обновление)
  - Сохранить изменения
  - Вернуть обновленный DTO

- [ ] В методе `deleteClient`:
  
  - Проверить существование клиента
  - Удалить клиента из БД

- [ ] В методе `getAllClients`:
  
  - Получить страницу клиентов с учетом пагинации и сортировки
  - Конвертировать в DTO

- [ ] В методе `searchClients`:
  
  - Реализовать поиск по имени/фамилии/email/телефону
  - Применить фильтры из SearchDto
  - Вернуть список найденных клиентов

---

### 6. Слой Controller (REST API)

- [ ] Создать `ClientController` с базовым маппингом `/api/clients`

- [ ] Реализовать endpoint `POST /api/clients` (создание клиента)
  
  - Принимать `@Valid @RequestBody ClientCreateDto`
  - Возвращать статус 201 Created
  - Возвращать ClientResponseDto

- [ ] Реализовать endpoint `GET /api/clients/{id}` (получение клиента)
  
  - Принимать `@PathVariable Long id`
  - Возвращать ClientResponseDto

- [ ] Реализовать endpoint `PUT /api/clients/{id}` (обновление клиента)
  
  - Принимать `@PathVariable Long id` и `@Valid @RequestBody ClientUpdateDto`
  - Возвращать обновленный ClientResponseDto

- [ ] Реализовать endpoint `DELETE /api/clients/{id}` (удаление клиента)
  
  - Принимать `@PathVariable Long id`
  - Возвращать статус 204 No Content

- [ ] Реализовать endpoint `GET /api/clients` (список клиентов с пагинацией)
  
  - Принимать параметры: page, size, sortBy, sortDirection
  - Возвращать `Page<ClientResponseDto>`

- [ ] Реализовать endpoint `GET /api/clients/search` (поиск клиентов)
  
  - Принимать параметры: query, email, phoneNumber
  - Возвращать `List<ClientResponseDto>`

- [ ] Реализовать дополнительные endpoints:
  
  - `GET /api/clients/{id}/vehicles` — получить автомобили клиента
  - `GET /api/clients/{id}/orders` — получить заказы клиента
  - `GET /api/clients/{id}/loyalty` — получить данные программы лояльности

---

### 7. Обработка исключений

- [ ] Создать кастомное исключение `ClientNotFoundException`

- [ ] Создать кастомное исключение `DuplicateEmailException`

- [ ] Создать кастомное исключение `DuplicatePhoneException`

- [ ] В `GlobalExceptionHandler` (shared/exception/) добавить обработчики:
  
  - `@ExceptionHandler(ClientNotFoundException.class)` → 404 Not Found
  - `@ExceptionHandler(DuplicateEmailException.class)` → 409 Conflict
  - `@ExceptionHandler(DuplicatePhoneException.class)` → 409 Conflict
  - `@ExceptionHandler(MethodArgumentNotValidException.class)` → 400 Bad Request с деталями валидации

- [ ] Создать DTO для ошибок:
  
  - `ErrorResponse` (statusCode, message, timestamp)
  - `ValidationErrorResponse` (statusCode, message, fieldErrors, timestamp)

---

### 8. Тестирование

#### Unit тесты для Service

- [ ] Создать `ClientServiceImplTest` с использованием Mockito
- [ ] Тест: успешное создание клиента
- [ ] Тест: создание клиента с дубликатом email → выбрасывает исключение
- [ ] Тест: создание клиента с дубликатом телефона → выбрасывает исключение
- [ ] Тест: получение клиента по ID (успешно)
- [ ] Тест: получение несуществующего клиента → выбрасывает исключение
- [ ] Тест: успешное обновление клиента
- [ ] Тест: обновление с дубликатом email → выбрасывает исключение
- [ ] Тест: удаление клиента (успешно)
- [ ] Тест: удаление несуществующего клиента → выбрасывает исключение
- [ ] Достичь покрытия тестами > 80%

#### Integration тесты для Repository

- [ ] Создать `ClientRepositoryTest` с использованием `@DataJpaTest`
- [ ] Настроить TestContainers с PostgreSQL
- [ ] Тест: сохранение и получение клиента из БД
- [ ] Тест: поиск клиента по email
- [ ] Тест: поиск клиента по телефону
- [ ] Тест: поиск по имени/фамилии (игнорируя регистр)
- [ ] Тест: проверка уникальности email
- [ ] Тест: проверка уникальности телефона
- [ ] Тест: пагинация работает корректно

#### API тесты (MockMvc)

- [ ] Создать `ClientControllerTest` с использованием `@WebMvcTest`
- [ ] Тест: POST /api/clients с валидными данными → 201 Created
- [ ] Тест: POST /api/clients с невалидным email → 400 Bad Request
- [ ] Тест: POST /api/clients с невалидным телефоном → 400 Bad Request
- [ ] Тест: POST /api/clients с пустыми обязательными полями → 400 Bad Request
- [ ] Тест: GET /api/clients/{id} существующего клиента → 200 OK
- [ ] Тест: GET /api/clients/{id} несуществующего клиента → 404 Not Found
- [ ] Тест: PUT /api/clients/{id} с валидными данными → 200 OK
- [ ] Тест: DELETE /api/clients/{id} → 204 No Content
- [ ] Тест: GET /api/clients с пагинацией → 200 OK с корректной структурой Page
- [ ] Тест: GET /api/clients/search с параметрами → 200 OK

---

## 🎯 Критерии готовности модуля

- [ ] Все CRUD операции работают через REST API
- [ ] Валидация данных работает корректно
- [ ] Уникальность email и телефона проверяется
- [ ] Обработка ошибок возвращает корректные HTTP статусы
- [ ] Пагинация и сортировка работают
- [ ] Поиск по различным критериям работает
- [ ] Unit тесты покрывают > 80% кода Service
- [ ] Integration тесты проверяют работу с БД
- [ ] API тесты проверяют все endpoints
- [ ] Можно создать клиента, получить его, обновить и удалить через API

---

## 📚 Дополнительные фичи (после MVP)

- [ ] Soft delete (помечать клиентов как удаленных, а не удалять физически)
- [ ] Audit logging (кто и когда изменил данные клиента)
- [ ] Экспорт списка клиентов в CSV/Excel
- [ ] Импорт клиентов из файла
- [ ] Продвинутый поиск с множественными фильтрами
- [ ] Сегментация клиентов (VIP, постоянные, новые)
- [ ] История изменений профиля клиента
- [ ] Валидация телефона по международному формату (libphonenumber)
- [ ] Дедупликация клиентов (поиск похожих записей)
- [ ] Кэширование часто запрашиваемых клиентов (Redis)
