# Database Schema - AutoShop CRM

## Схема базы данных

### Customer (Клиенты)
```
Customer
-
CustomerID PK int
first_name string INDEX
last_name string
email string UNIQUE
number string
```

### Cars (Автомобили)
```
Cars
-
CarID PK int
customer_id int FK >- Customer.CustomerID
brand string
model string
vin string UNIQUE
license_plate string
```

### Employee (Персонал)
```
Employee
-
EmployeeID PK int
full_name string
function enum // [ADMIN, MANAGER, MECHANIC, RECEPTIONIST]
```

### Order (Заказы)
```
Order
-
OrderID PK int
employee_id int FK >- Employee.EmployeeID
customer_id int FK >- Customer.CustomerID
car_id int FK >- Cars.CarID
problem text
status enum // [NEW, DIAGNOSIS, AWAITING_PARTS, IN_PROGRESS, COMPLETED]
costs_total money
discount_amount money
final_amount money
created_at timestamp
completed_at timestamp
```

### Parts (Запчасти)
```
Parts
-
PartID PK int
brand string
name string
article_number string UNIQUE
cost money
stock_quantity int
```

### Order_Items (Позиции заказа)
```
Order_Items
-
OrderItemID PK int
order_id int FK >- Order.OrderID
part_id int FK >- Parts.PartID
quantity int
price_at_sale money
```

### Loyalty_tiers (Уровни лояльности)
```
Loyalty_tiers
-
TierID PK int
name string // [Bronze, Silver, Gold, Platinum]
entry_spent_money money
discount_percent int
max_points_payment_percent int
```

### Loyalty_accounts (Счета лояльности)
```
Loyalty_accounts
-
AccountID PK int
customer_id int FK - Customer.CustomerID // 1-to-1
tier_id int FK >- Loyalty_tiers.TierID
balance int
total_spent money
total_scores int
```

### Loyalty_transactions (Транзакции лояльности)
```
Loyalty_transactions
-
TransactionID PK int
account_id int FK >- Loyalty_accounts.AccountID
order_id int FK >- Order.OrderID
date_transaction timestamp
count_scores int
operation_type enum // [EARN, SPEND, REFUND]
```

---

## Легенда

- **PK** - Primary Key (первичный ключ)
- **FK** - Foreign Key (внешний ключ)
- **UNIQUE** - уникальное значение
- **INDEX** - индексированное поле
- **>-** - связь "один ко многим" (one-to-many)
- **-** - связь "один к одному" (one-to-one)

---

## Связи между таблицами

- `Customer` ← **1:N** → `Cars` (один клиент - много машин)
- `Customer` ← **1:1** → `Loyalty_accounts` (один клиент - один счет лояльности)
- `Customer` ← **1:N** → `Order` (один клиент - много заказов)
- `Cars` ← **1:N** → `Order` (одна машина - много заказов)
- `Employee` ← **1:N** → `Order` (один сотрудник - много заказов)
- `Order` ← **1:N** → `Order_Items` (один заказ - много позиций)
- `Parts` ← **1:N** → `Order_Items` (одна запчасть - много позиций в разных заказах)
- `Loyalty_tiers` ← **1:N** → `Loyalty_accounts` (один уровень - много счетов)
- `Loyalty_accounts` ← **1:N** → `Loyalty_transactions` (один счет - много транзакций)
- `Order` ← **1:N** → `Loyalty_transactions` (один заказ - много транзакций лояльности)
