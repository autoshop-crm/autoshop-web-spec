# Client MVP: что делать прямо сейчас

Цель: довести **один вертикальный срез Customer** до рабочего состояния (БД -> DTO -> Service -> Controller -> Exceptions -> Tests).

## 0) Готовность окружения

- [ ] Поднять Postgres на `localhost:5433` с пользователем/паролем из `application.properties`:
  - `username=autoshop-admin`
  - `password=pass`
  - `db=postgres`
- [ ] Запустить приложение и убедиться, что Liquibase применил `src/main/resources/db/changelog/db.changelog-1.0.sql`.
- [ ] Проверить, что таблица `customer` создана.

Definition of Done:
- приложение стартует без ошибок миграций;
- таблица `customer` есть в БД.

## 1) DTO + Validation

Файлы:
- `src/main/java/com/vladko/autoshopcore/client/dto/CustomerCreateDTO.java`
- `src/main/java/com/vladko/autoshopcore/client/dto/CustomerUpdateDTO.java`
- `src/main/java/com/vladko/autoshopcore/client/dto/CustomerResponseDTO.java` (создать)

Сделать:
- [ ] `CustomerCreateDTO`: обязательные поля + валидация
  - `@NotBlank` для `firstName`, `lastName`, `phoneNumber`, `email`
  - `@Email` для `email`
  - `@Pattern` для `phoneNumber` (пример: `^\\+?[0-9]{10,15}$`)
- [ ] `CustomerUpdateDTO`: поля опциональные (без `@NotBlank`), но с форматной валидацией
  - `@Email` для `email` (если передан)
  - `@Pattern` для `phoneNumber` (если передан)
- [ ] `CustomerResponseDTO`: минимум поля
  - `id`, `firstName`, `lastName`, `email`, `phoneNumber`, `createdAt`, `updatedAt`

Definition of Done:
- DTO компилируются;
- валидация срабатывает на невалидные запросы.

## 2) Repository (минимум для поиска)

Файл:
- `src/main/java/com/vladko/autoshopcore/client/repository/CustomerRepository.java`

Сделать:
- [ ] Оставить `existsByEmail`, `existsByPhoneNumber`, `findByEmail`, `findByPhoneNumber`.
- [ ] Добавить методы поиска (case-insensitive):
  - `findByFirstNameContainingIgnoreCase(String firstName)`
  - `findByLastNameContainingIgnoreCase(String lastName)`
- [ ] Опционально: один метод общего поиска через `@Query` по 4 полям.

Definition of Done:
- есть возможность искать по `email`/`phoneNumber`/`firstName`/`lastName`.

## 3) Service слой

Файлы:
- `src/main/java/com/vladko/autoshopcore/client/service/CustomerService.java` (создать)
- `src/main/java/com/vladko/autoshopcore/client/service/CustomerServiceImpl.java` (создать)

Сделать методы:
- [ ] `create(CustomerCreateDTO dto)`
- [ ] `getById(Integer id)`
- [ ] `update(Integer id, CustomerUpdateDTO dto)`
- [ ] `delete(Integer id)`
- [ ] `search(String email, String phoneNumber, String firstName, String lastName)`

Правила:
- [ ] При create/update проверять уникальность `email` и `phoneNumber`.
- [ ] При отсутствии клиента бросать `not found` исключение.
- [ ] Для update менять только непустые/переданные поля.

Definition of Done:
- CRUD + search работают через сервис;
- бизнес-проверки централизованы в сервисе.

## 4) REST Controller

Файл:
- `src/main/java/com/vladko/autoshopcore/client/controller/CustomerController.java` (создать)

Эндпоинты:
- [ ] `POST /api/customers` -> `201 Created`
- [ ] `GET /api/customers/{id}` -> `200 OK`
- [ ] `PUT /api/customers/{id}` -> `200 OK`
- [ ] `DELETE /api/customers/{id}` -> `204 No Content`
- [ ] `GET /api/customers/search?email=&phoneNumber=&firstName=&lastName=` -> `200 OK`

Требования:
- [ ] использовать `@Valid` для body DTO;
- [ ] возвращать `CustomerResponseDTO`.

Definition of Done:
- эндпоинты доступны и выдают корректные HTTP-коды.

## 5) Ошибки (кастомные + global handler)

Файлы:
- `src/main/java/com/vladko/autoshopcore/client/exception/CustomerNotFoundException.java` (создать)
- `src/main/java/com/vladko/autoshopcore/client/exception/CustomerConflictException.java` (создать)
- `src/main/java/com/vladko/autoshopcore/shared/exception/GlobalExceptionHandler.java` (создать/дополнить)

Сделать:
- [ ] `CustomerNotFoundException` -> `404 Not Found`
- [ ] `CustomerConflictException` (email/phone уже заняты) -> `409 Conflict`
- [ ] `MethodArgumentNotValidException` -> `400 Bad Request` с полями ошибок

Definition of Done:
- ошибки возвращаются единообразно и с понятным payload.

## 6) Тесты (минимальный набор)

Минимум 2-3 теста:
- [ ] `CustomerRepository` тест: `existsByEmail`/`findByPhoneNumber`.
- [ ] `CustomerService` тест: create с уникальностью email/phone.
- [ ] `CustomerService` тест: update/delete или notFound сценарий.

Рекомендуемые файлы:
- `src/test/java/com/vladko/autoshopcore/client/repository/CustomerRepositoryTest.java`
- `src/test/java/com/vladko/autoshopcore/client/service/CustomerServiceTest.java`

Definition of Done:
- тесты запускаются и проходят локально.

## 7) Финальная проверка (перед переходом к Vehicle)

- [ ] Ручной smoke-test через Postman/HTTP client:
  1. Создать клиента
  2. Получить по id
  3. Обновить
  4. Найти через `/search`
  5. Удалить
- [ ] Убедиться, что конфликт по email/phone дает `409`, невалидный DTO дает `400`, отсутствующий id дает `404`.

Definition of Done:
- вертикальный срез `Client` завершен end-to-end и готов как база для `Vehicle`.
