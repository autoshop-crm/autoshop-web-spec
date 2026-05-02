# Подробный план на День 9: 17 апреля 2026

Основа плана:
- `ContextProject/Now/FULL_PLAN_TO_2026-05-01.md`
- `ContextProject/Now/DAY_1_2026-04-09_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_2_2026-04-10_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_3_2026-04-11_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_4_2026-04-12_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_5_2026-04-13_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_6_2026-04-14_DETAILED_PLAN.md`
- `ContextProject/Now/DAY_7_2026-04-15_DETAILED_PLAN.md`
- текущее состояние `Core` после реализации `Parts`

Главная цель дня:
Закрыть последний доменный модуль внутри `Core` — `Loyalty`, чтобы система умела вести счет лояльности клиента, хранить историю начислений и списаний, автоматически пересчитывать tier, а также корректно интегрироваться с уже готовыми `Customer`, `Order`, `Estimate`, `Parts` и статусами заказа.

К концу дня `Loyalty` должен быть не набором legacy-entity из старой схемы, а полноценным рабочим модулем в том же стиле, что уже реализованные:
- `client`
- `vehicle`
- `order`
- `parts`

---

## Что должно быть готово к концу 17 апреля 2026

- Есть отдельный модуль `loyalty` с нормальной package-структурой:
  - `entity`
  - `dto`
  - `repository`
  - `service`
  - `controller`
  - `exception`
- Legacy-сущности `LoyaltyAccount`, `LoyaltyTransactions`, `LoyaltyTiers` перестают быть "висящими рядом" и приводятся к текущему стилю проекта.
- Есть нормализованная схема БД через новый Liquibase changelog:
  - таблицы и колонки приведены к консистентному naming;
  - tier-данные сидируются миграцией;
  - account и transactions поднимаются на чистой БД;
  - схема не ломает уже готовые `Customer`, `Order`, `Parts`.
- Реализована модель:
  - один клиент -> один loyalty account;
  - один account -> много loyalty transactions;
  - один order -> много loyalty transactions при необходимости.
- Реализованы бизнес-сценарии:
  - получение или автосоздание счета лояльности;
  - просмотр текущего tier, баланса и истории операций;
  - применение баллов к заказу;
  - возврат баллов при отмене заказа;
  - начисление баллов после завершения заказа;
  - пересчет tier после изменения `totalSpent`.
- Есть интеграция с уже готовой финансовой моделью заказа:
  - `laborTotal`
  - `partsTotal`
  - `costsTotal`
  - `manualDiscountAmount`
  - `pointsDiscountAmount`
  - `loyaltyPointsSpent`
  - `discountAmount`
  - `finalAmount`
- Есть тесты на:
  - repository;
  - service;
  - controller;
  - интеграцию `Customer -> Order -> Parts -> Loyalty`.
- Есть ручной smoke-сценарий, который подтверждает:
  - клиент получает loyalty account;
  - заказ может использовать баллы;
  - завершенный заказ начисляет новые баллы;
  - отмененный заказ корректно возвращает списанные баллы.

---

## Главный результат дня

Не пытаться в этот день строить весь CRM/marketing-блок лояльности.
Задача дня не в push-кампаниях, купонах, промокодах, аналитике retention и не в интеграции с `NotificationService`, а в том, чтобы довести `Core` до состояния, где все основные бизнес-модули замкнуты:
- `Customer`
- `Vehicle`
- `Order`
- `Parts`
- `Loyalty`

Именно после этого `Core` можно считать функционально закрытым на уровне локальной бизнес-логики.

---

## MVP-граница Дня 9 после архитектурной проверки

Чтобы уложиться в 10 часов и не сломать уже готовый `Order/Estimate/Parts`, обязательный scope Дня 9:
- нормализовать legacy loyalty в отдельный модуль;
- реализовать account, tiers, transactions;
- реализовать lazy-create account;
- реализовать spend/remove/refund points для активного заказа;
- реализовать earn points при `COMPLETED`;
- реализовать refund при `CANCELLED`;
- использовать tier для cap списания и пересчета уровня клиента;
- сохранить один источник правды по order totals в `OrderFinancialsService`.

Необязательный/следующий scope:
- автоматический tier-discount в заказе;
- промо-кампании;
- ручная админская корректировка баланса;
- события Kafka по loyalty.

---

## Что не делаем в День 9

- Не делаем купоны, промокоды и акции.
- Не строим сложный rule-engine по начислениям.
- Не делаем временные кампании "двойные баллы по выходным".
- Не добавляем уведомления о начислении баллов через Kafka и email в этот день.
- Не строим отдельную админку для ручного редактирования loyalty account.
- Не делаем multi-currency или сложную денежную математику за пределами текущей `BigDecimal` модели.
- Не делаем полноценную авторизацию на loyalty endpoint'ах, потому что в текущем `Core` security пока сознательно открыт и интеграция с `AuthService` идет позже.

---

## Ключевой контекст проекта на старт Дня 9

Перед началом реализации важно зафиксировать текущее реальное состояние проекта, а не только план на бумаге:

- День 1 уже дал стабильную локальную инфраструктуру:
  - `Postgres`
  - `Redis`
  - `Kafka`
  - `MinIO`
  - `Mailhog`
- В `application.properties` уже есть каркас подключений под эти сервисы.
- `Core` уже имеет рабочие вертикальные модули:
  - `client`
  - `vehicle`
  - `order`
  - `parts`
- Для `Order` уже реализованы:
  - lifecycle;
  - assignment;
  - estimate;
  - parts reservation;
  - recalculation финансов через service-координацию.
- `Loyalty` пока существует только как legacy-модель:
  - `src/main/java/com/vladko/autoshopcore/entities/LoyaltyAccount.java`
  - `src/main/java/com/vladko/autoshopcore/entities/LoyaltyTransactions.java`
  - `src/main/java/com/vladko/autoshopcore/entities/LoyaltyTiers.java`
- Текущая loyalty-схема в `db.changelog-1.0.sql` еще не приведена к современному стилю проекта:
  - `Loyalty_tiers`
  - `Loyalty_accounts`
  - `Loyalty_transactions`
  - `TierID`
  - `AccountID`
  - `TransactionID`
- Уже есть устойчивый тестовый паттерн:
  - `MockMvc` для controller;
  - unit-тесты для service;
  - `DataJpaTest` + postgres-only testcontainers для repository/integration.

Из этого следует важная идея дня:
`Loyalty` надо делать не как исключение, а как следующий нормализованный домен по уже заданному шаблону.

---

## Архитектурные решения, которые надо зафиксировать утром

Перед кодингом нужно принять 9 решений и дальше не менять их посреди дня:

1. `Loyalty` выносится в отдельный пакет `com.vladko.autoshopcore.loyalty`, а не развивается дальше внутри общего пакета `entities`.
2. Legacy loyalty-таблицы нормализуются отдельным новым changelog'ом, а не ручными правками существующих changeset'ов.
3. Каждый `Customer` должен иметь один loyalty account:
   - для старых клиентов нужен backfill;
   - для новых клиентов account создается автоматически.
4. Tier-справочник фиксируется на MVP-уровне:
   - `BRONZE`
   - `SILVER`
   - `GOLD`
   - `PLATINUM`
5. Tier влияет на заказ двумя способами:
   - в MVP Дня 9 определяет максимальный процент заказа, который можно оплатить баллами;
   - `discountPercent` остается параметром tier-справочника для следующего расширения, но автоматический tier-discount в заказ в этот день не включается.
6. Баллы можно применять только к активному заказу:
   - `NEW`
   - `IN_PROGRESS`
7. При `CANCELLED` списанные по заказу баллы возвращаются через `REFUND` transaction.
8. При `COMPLETED` заказ начисляет баллы ровно один раз.
9. Все расчеты loyalty и order totals выполняются на backend в service-слое, а не передаются frontend-клиенту.

Если эти решения не принять утром, модуль быстро расползется в спор о том:
- когда создается account;
- где живет скидка tier;
- чем отличается discount от списанных баллов;
- в какой момент начислять баллы по заказу.

---

## Бизнес-допущения Дня 9, которые стоит зафиксировать сразу

Чтобы реализация была decision-complete, для MVP принимаются следующие правила:

- `1 point = 1` денежная единица скидки.
- Начисление баллов:
  - `earnedPoints = floor(finalAmount * 0.05)`.
- Tier в MVP Дня 9 применяется к cap списания баллов.
- Tier-discount не применяется автоматически в заказе в этот день, чтобы не сломать уже готовый смысл `discountAmount` из estimate.
- Баллы можно применить не ко всей сумме, а только в пределах:
  - баланса клиента;
  - лимита `maxPointsPaymentPercent` для текущего tier.
- В заказе должна появиться явная разбивка скидок:
  - `manualDiscountAmount`
  - `pointsDiscountAmount`
  - `discountAmount` как агрегат этих значений
  - `loyaltyPointsSpent`
- `finalAmount = costsTotal - discountAmount`.
- `costsTotal` остается суммой:
  - `laborTotal + partsTotal`
- `pointsDiscountAmount` должен пересчитываться после любого изменения:
  - labor estimate;
  - parts reservation/update/delete;
  - loyalty spend action;
  - tier change.

Важно:
- уже существующее поле `discountAmount` нельзя превращать только в loyalty-discount;
- ручная скидка estimate должна жить отдельно как `manualDiscountAmount`;
- итоговый `discountAmount = manualDiscountAmount + pointsDiscountAmount`;
- если после изменения estimate/parts текущий spend превышает новый cap, система автоматически возвращает излишек баллов через `REFUND` transaction.

Это намеренно простой и прозрачный MVP, который хорошо ложится на уже готовую модель `Order`.

---

## План по блокам дня

### Блок 1. Утренний аудит состояния Core после Parts

Время: `45-60 минут`

Что сделать:
- Проверить текущее состояние модулей:
  - `Customer`
  - `Vehicle`
  - `Order`
  - `Parts`
- Проверить, где сейчас реально живут loyalty-артефакты:
  - entity;
  - таблицы;
  - enum;
  - legacy naming.
- Сверить, как сейчас считается финансовая часть заказа:
  - `laborTotal`
  - `partsTotal`
  - `costsTotal`
  - `discountAmount`
  - `finalAmount`
- Зафиксировать, какие изменения order-модели потребуются для loyalty, чтобы не "допридумывать" это в середине реализации.

Что должно получиться:
- Есть точная стартовая точка дня.
- Нет риска писать второй параллельный вариант loyalty-модуля.

### Блок 2. Нормализация loyalty-модели и naming-контракта

Время: `45-60 минут`

Что сделать:
- Зафиксировать единый naming:
  - пакет `loyalty`;
  - таблицы в `snake_case`;
  - Java DTO/entity в `camelCase`;
  - endpoint'ы в стиле уже существующих модулей.
- Определить итоговые сущности дня:
  - `LoyaltyTier`
  - `LoyaltyAccount`
  - `LoyaltyTransaction`
- Определить обязательные поля:
  - `LoyaltyTier`: `id`, `name`, `entrySpentMoney`, `discountPercent`, `maxPointsPaymentPercent`
  - `LoyaltyAccount`: `id`, `customerId`, `tierId`, `balance`, `totalSpent`, `totalEarnedPoints`, `createdAt`, `updatedAt`
  - `LoyaltyTransaction`: `id`, `accountId`, `orderId`, `operationType`, `reason`, `pointsAmount`, `createdAt`
- Решить, что `OperationType` остается enum:
  - `EARN`
  - `SPEND`
  - `REFUND`
- Добавить `reason`, чтобы отличать:
  - начисление за завершение заказа;
  - первичное списание;
  - корректировку списания;
  - ручное снятие points с активного заказа;
  - возврат при отмене заказа.

Что важно понять:
- `Loyalty` должен выглядеть так же чисто, как уже очищенный `parts`, иначе в кодовой базе снова появятся "старый мир" и "новый мир" рядом.

Что должно получиться:
- Есть одна согласованная loyalty-модель, на которую опираются схема, entity, DTO и сервисы.

### Блок 3. Схема БД и Liquibase для Loyalty

Время: `1.5-2 часа`

Что сделать:
- Создать новый changelog после текущих `1.0 -> 1.3`.
- Нормализовать legacy loyalty-таблицы без переписывания уже примененных changeset'ов:
  - `Loyalty_tiers -> loyalty_tier`
  - `Loyalty_accounts -> loyalty_account`
  - `Loyalty_transactions -> loyalty_transaction`
  - `TierID -> id`
  - `AccountID -> id`
  - `TransactionID -> id`
  - `date_transaction -> created_at`
- Добавить ограничения:
  - `balance >= 0`
  - `total_spent >= 0`
  - `total_earned_points >= 0`
  - `points_amount >= 0`
  - `discount_percent between 0 and 100`
  - `max_points_payment_percent between 0 and 100`
- Добавить индексы:
  - уникальный `customer_id` в `loyalty_account`
  - индекс по `tier_id`
  - индекс по `account_id`
  - индекс по `order_id`
  - индекс по `operation_type`
- Добавить seed-данные по tier через Liquibase.
- Добавить order-поля:
  - `manual_discount_amount`
  - `points_discount_amount`
  - `loyalty_points_spent`

Что важно понять:
- Loyalty в этом проекте должен подниматься на чистой БД так же предсказуемо, как уже поднимаются `Customer`, `Vehicle`, `Order`, `Parts`.
- Нельзя оставлять `TierID`/`AccountID` в старом стиле, если весь новый код уже живет на нормализованных таблицах.

Что должно получиться:
- Схема loyalty поднимается с нуля.
- Она консистентна с текущей архитектурой `Core`.

### Блок 4. Seed tiers и tier-логика

Время: `1-1.5 часа`

Что сделать:
- Зафиксировать стартовые уровни:
  - `BRONZE`: `entrySpentMoney = 0`, `discountPercent = 0`, `maxPointsPaymentPercent = 10`
  - `SILVER`: `entrySpentMoney = 10000`, `discountPercent = 3`, `maxPointsPaymentPercent = 20`
  - `GOLD`: `entrySpentMoney = 30000`, `discountPercent = 5`, `maxPointsPaymentPercent = 30`
  - `PLATINUM`: `entrySpentMoney = 70000`, `discountPercent = 7`, `maxPointsPaymentPercent = 40`
- Зафиксировать правило выбора tier:
  - tier определяется по `totalSpent`;
  - выбирается максимальный tier, у которого `entrySpentMoney <= totalSpent`;
  - tier пересчитывается после каждого изменения `totalSpent`.
- Определить, где живет tier-logic:
  - в `LoyaltyTierService` или `LoyaltyAccountService`;
  - не в controller и не в ручных условиях в `OrderService`.

Что должно получиться:
- Tier-справочник заранее согласован и не переизобретается по ходу разработки.

### Блок 5. DTO и API-контракт Loyalty

Время: `1-1.5 часа`

Что сделать:
- Создать DTO:
  - `LoyaltyTierResponseDTO`
  - `LoyaltyAccountResponseDTO`
  - `LoyaltyTransactionResponseDTO`
  - `OrderLoyaltySpendDTO`
- Расширить `OrderResponseDTO`, если нужно, чтобы клиент видел:
  - `manualDiscountAmount`
  - `pointsDiscountAmount`
  - `loyaltyPointsSpent`
- Зафиксировать минимальный API:
  - `GET /api/loyalty/accounts/customer/{customerId}`
  - `GET /api/loyalty/accounts/{accountId}/transactions`
  - `GET /api/loyalty/tiers`
  - `PUT /api/orders/{orderId}/loyalty/spend`
  - `DELETE /api/orders/{orderId}/loyalty/spend`
- Если нужен технический endpoint инициализации для существующих клиентов, разрешить:
  - `POST /api/loyalty/accounts/customer/{customerId}/initialize`
  но предпочтительнее делать account лениво/автоматически без отдельного ручного endpoint'а.

Что важно решить:
- Loyalty API не должен размазываться по разным модулям.
- Операции чтения счета живут в loyalty-controller, а применение баллов к заказу логично живет рядом с order-business action.

Что должно получиться:
- Есть понятный внешний контракт для loyalty-модуля и его интеграции с заказом.

### Блок 6. Account lifecycle: создание и backfill

Время: `1-1.5 часа`

Что сделать:
- Реализовать сервис получения loyalty account по `customerId`.
- Зафиксировать правило:
  - если у клиента нет account, он создается автоматически с tier `BRONZE`, `balance = 0`, `totalSpent = 0`, `totalEarnedPoints = 0`.
- Для уже существующих клиентов выбрать безопасный вариант:
  - либо lazy-create при первом обращении;
  - либо отдельный backfill service/test fixture.
- Для новых клиентов решить интеграцию:
  - либо вызывать создание account прямо из `CustomerService.create`;
  - либо оставить lazy-create, но зафиксировать это как официальный контракт.

Рекомендуемый MVP-вариант:
- использовать lazy-create + покрыть это тестами;
- не усложнять день жесткой синхронной связью `CustomerService -> LoyaltyService`, если это не нужно прямо сейчас.

Что должно получиться:
- Любой существующий и новый customer может участвовать в loyalty-процессах без ручной подготовки данных.

### Блок 7. Интеграция Loyalty с Order financial model

Время: `2-2.5 часа`

Что сделать:
- Пересмотреть текущую модель `Order`, которая уже умеет:
  - `laborTotal`
  - `partsTotal`
  - `costsTotal`
  - `discountAmount`
  - `finalAmount`
- Добавить loyalty-aware поля:
  - `manualDiscountAmount`
  - `pointsDiscountAmount`
  - `loyaltyPointsSpent`
- Зафиксировать порядок расчета:
  1. `costsTotal = laborTotal + partsTotal`
  2. `manualDiscountAmount` приходит из estimate и не считается loyalty-модулем
  3. `spendableBase = costsTotal - manualDiscountAmount`
  4. `allowedByTierCap = floor(spendableBase * maxPointsPaymentPercent / 100)`
  5. `pointsDiscountAmount = min(requestedPoints, balance, allowedByTierCap)`
  6. `discountAmount = manualDiscountAmount + pointsDiscountAmount`
  7. `finalAmount = costsTotal - discountAmount`
- Обновить общий financial coordinator заказа так, чтобы пересчет заказа учитывал loyalty и parts в одном месте.

Что важно понять:
- Loyalty нельзя прикручивать отдельным "post-processing", иначе `Parts` и `Estimate` начнут расходиться с итоговой суммой.
- У заказа должен остаться один источник правды по суммам.

Что должно получиться:
- Любое изменение в order/parts/loyalty приводит к предсказуемому пересчету тех же самых итоговых полей.

### Блок 8. Business rules: списание баллов на заказ

Время: `1.5-2 часа`

Что сделать:
- Реализовать отдельное предметное действие:
  - применить баллы к заказу;
  - обновить количество примененных баллов;
  - убрать примененные баллы из заказа.
- Зафиксировать правила:
  - использовать баллы можно только у `NEW` и `IN_PROGRESS`;
  - использовать баллы можно только если у клиента есть loyalty account;
  - использовать баллы можно только в пределах:
    - `balance`;
    - `maxPointsPaymentPercent` tier'а;
    - текущей суммы заказа после ручной скидки estimate.
- При применении баллов:
  - баланс account уменьшается сразу;
  - создается `SPEND` transaction;
  - `loyaltyPointsSpent` и `pointsDiscountAmount` обновляются в заказе.
- При изменении/снятии баллов до завершения заказа:
  - делать корректирующий `REFUND` transaction;
  - вернуть разницу на баланс;
  - пересчитать order totals.
- При пересчете активного заказа после изменения estimate/parts:
  - effective balance считать как `account.balance + order.loyaltyPointsSpent`;
  - если текущий spend больше нового cap, вернуть излишек;
  - не оставлять account и order в рассинхроне.

Что важно понять:
- Нельзя просто записать число в `discountAmount`.
- Нужна отдельная доменная операция, иначе нельзя будет корректно вернуть баллы при отмене заказа или понять историю.

Что должно получиться:
- Списание баллов управляется отдельной бизнес-логикой и оставляет прозрачный аудит.

### Блок 9. Business rules: начисление баллов и возврат при отмене

Время: `1.5-2 часа`

Что сделать:
- Зафиксировать правило начисления:
  - начисление происходит только при переходе заказа в `COMPLETED`;
  - начисление происходит ровно один раз на заказ;
  - база для начисления — `finalAmount` после всех скидок.
- Реализовать:
  - `EARN` transaction;
  - увеличение `balance`;
  - увеличение `totalEarnedPoints`;
  - увеличение `totalSpent`;
  - пересчет tier.
- Зафиксировать правило отмены:
  - если заказ отменяется после списания баллов, создается `REFUND` transaction;
  - баланс восстанавливается;
  - физического "earn" не происходит;
  - `totalSpent` не увеличивается.
- Проверить защиту от повторной обработки:
  - повторный `COMPLETED` не должен начислять еще раз;
  - повторный `CANCELLED` не должен дублировать `REFUND`.
- Идемпотентность нельзя строить только по `operationType`, потому что у одного order могут быть несколько `SPEND`/`REFUND` при корректировках.
- Для этого transaction должен иметь `reason`, а проверки должны отличать `ORDER_COMPLETED` и `ORDER_CANCELLED` от обычных корректировок.

Что должно получиться:
- Order lifecycle и loyalty lifecycle становятся согласованными.

### Блок 10. Repository слой Loyalty

Время: `1-1.5 часа`

Что сделать:
- Создать repository:
  - `LoyaltyAccountRepository`
  - `LoyaltyTierRepository`
  - `LoyaltyTransactionRepository`
- Минимальный набор методов:
  - `findByCustomerId`
  - `findTopBy...` или equivalent для tier-подбора
  - `findAllByAccountIdOrderByIdDesc`
  - `existsByOrderIdAndOperationType`
  - выборка transactions по order
- Если нужно для согласованности списания, использовать блокировки там, где реально есть риск гонок:
  - account balance update;
  - order loyalty application.
- Для MVP это не optional: списание баллов должно брать pessimistic lock на account и order.

Что важно понять:
- Repository должен обслуживать реальные бизнес-сценарии дня, а не быть "универсальным storage API".

Что должно получиться:
- Service слой loyalty опирается на четкие методы поиска, проверки и истории.

### Блок 11. Controller, exceptions и HTTP-контракт

Время: `1-1.5 часа`

Что сделать:
- Добавить понятные domain exceptions:
  - `LoyaltyAccountNotFoundException`
  - `LoyaltyTierNotFoundException`
  - `InsufficientLoyaltyBalanceException`
  - `InvalidLoyaltyOperationException`
- Подключить их в `GlobalExceptionHandler`.
- Проверить HTTP-коды:
  - `404` для отсутствующего клиента/account/order
  - `409` для нехватки баланса, попытки повторно начислить или применить баллы в terminal state
  - `400` для невалидного payload

Что должно получиться:
- Loyalty API ведет себя так же предсказуемо, как уже готовые `Customer`, `Vehicle`, `Order`, `Parts`.

### Блок 12. Тесты Дня 9

Время: `2.5-3 часа`

Минимальный обязательный набор:

- Repository tests:
  - поиск account по `customerId`;
  - выборка transaction history по account;
  - выбор tier по `entrySpentMoney`;
  - проверка ограничений уникальности `customer_id`.

- Service tests:
  - lazy-create account для клиента без loyalty data;
  - применение баллов в пределах лимита;
  - отказ при нехватке баланса;
  - отказ при превышении tier cap;
  - возврат баллов при уменьшении spend;
  - начисление баллов на `COMPLETED`;
  - возврат баллов на `CANCELLED`;
  - пересчет tier после роста `totalSpent`;
  - защита от двойного начисления.

- Controller tests:
  - чтение account;
  - чтение tiers;
  - чтение transactions;
  - `PUT /api/orders/{id}/loyalty/spend`;
  - `DELETE /api/orders/{id}/loyalty/spend`;
  - ключевые `400/404/409`.

- Integration tests на реальной БД:
  - `Customer -> LoyaltyAccount` auto-create;
  - `Customer -> Vehicle -> Order -> Parts -> Loyalty spend`;
  - `Order COMPLETED` начисляет баллы;
  - `Order CANCELLED` возвращает ранее списанные баллы;
  - изменение `Parts` или `Estimate` после spend корректно пересчитывает cap и final totals;
  - history transactions отражает реальную последовательность `SPEND / REFUND / EARN`.

Что должно получиться:
- Loyalty покрыт тем же многослойным тестовым подходом, что и уже готовые домены.

### Блок 13. Ручной smoke-run

Время: `45-60 минут`

Проверочный сценарий:

1. создать клиента;
2. получить loyalty account клиента;
3. убедиться, что стартовый tier = `BRONZE`;
4. создать авто;
5. создать первый заказ для накопления баллов;
6. назначить механика;
7. задать `laborTotal`;
8. добавить запчасть в заказ;
9. завершить первый заказ;
10. проверить:
   - появился `EARN`;
   - баланс вырос;
   - `totalSpent` вырос;
   - tier пересчитался, если порог достигнут.
11. создать второй заказ;
12. задать `laborTotal`;
13. применить баллы к второму заказу;
14. проверить:
   - `manualDiscountAmount`
   - `pointsDiscountAmount`
   - `discountAmount`
   - `finalAmount`
15. завершить второй заказ;
16. проверить:
   - появились `SPEND` и новый `EARN`;
   - баланс обновился с учетом списания и начисления.

Дополнительный негативный smoke-case:

1. создать следующий заказ после накопления баллов;
2. применить баллы;
3. отменить заказ;
4. проверить:
   - появился `REFUND`;
   - баланс восстановлен;
   - `totalSpent` не увеличен;
   - начисления за отмененный заказ нет.

Что должно получиться:
- Есть живой end-to-end сценарий, который доказывает, что loyalty не изолирован, а встроен в текущий бизнес-поток сервиса.

---

## Пошаговый чеклист на 17 апреля 2026

- [ ] Проверить текущее состояние `Core` после `Parts`.
- [ ] Выписать, какие loyalty-сущности и таблицы сейчас legacy.
- [ ] Зафиксировать итоговую loyalty-модель.
- [ ] Создать новый loyalty changelog.
- [ ] Нормализовать loyalty tables и column names.
- [ ] Добавить seed tiers.
- [ ] Создать пакет `loyalty` и вынести туда entity/DTO/repository/service/controller/exception.
- [ ] Реализовать account lifecycle.
- [ ] Реализовать tier calculation.
- [ ] Реализовать transaction history.
- [ ] Интегрировать loyalty в order financial recalculation.
- [ ] Добавить order-поля под tier discount и points discount.
- [ ] Реализовать spend/remove loyalty points для заказа.
- [ ] Реализовать earn on `COMPLETED`.
- [ ] Реализовать refund on `CANCELLED`.
- [ ] Обновить `GlobalExceptionHandler`.
- [ ] Написать repository tests.
- [ ] Написать service tests.
- [ ] Написать controller tests.
- [ ] Написать integration tests с `Customer`, `Order`, `Parts`.
- [ ] Прогнать ручной smoke-сценарий.

---

## Definition of Done на День 9

День считается завершенным, если выполнено все:

- `Loyalty` существует как полноценный доменный модуль, а не legacy-код рядом.
- Liquibase поднимает loyalty-схему с нуля без ручных правок.
- У каждого клиента можно получить loyalty account.
- Заказ умеет применять и возвращать баллы.
- Завершение заказа начисляет баллы и обновляет tier.
- Отмена заказа корректно возвращает списанные баллы.
- Финансовые поля заказа остаются консистентными после loyalty-операций.
- Есть тесты на repository/service/controller/integration.
- Есть рабочий ручной сценарий `Customer -> Order -> Parts -> Loyalty -> Completed/Cancelled`.

---

## Что особенно важно не сломать в текущей инфраструктуре

- Не ломать уже готовый `OrderFinancialsService` и не допускать появления второго независимого калькулятора сумм.
- Не откатывать нормализованный стиль `Order` и `Parts` обратно к legacy naming.
- Не тащить Kafka/Redis/MinIO в loyalty-модуль без прямой необходимости в этот день.
- Для repository/integration тестов использовать тот же безопасный postgres-only паттерн testcontainers, который уже был выровнен после `Parts`.
- Не внедрять loyalty как "магические side-effects" в controller:
  все изменения баланса, tier и order totals должны жить в сервисной координации.

---

## Ожидаемый результат после Дня 9

После этого дня `Core` должен быть функционально собран в единое бизнес-ядро автосервиса:

- клиент создается;
- машина привязывается к клиенту;
- заказ создается и ведет lifecycle;
- механик назначается;
- смета считается;
- запчасти резервируются и списываются;
- loyalty account существует;
- баллы можно применить;
- завершенный заказ начисляет баллы;
- отмененный заказ возвращает ранее списанные баллы.

Именно в таком состоянии `Core` уже готов переходить от "локально рабочей бизнес-логики" к следующим шагам общего плана:
- интеграции;
- события;
- файловые вложения;
- web/android клиентам;
- общей авторизации через `AuthService`.
