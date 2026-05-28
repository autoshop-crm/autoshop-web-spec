# AutoShop CRM Web MVP

Frontend для работников AutoShop, привязанный к реальному backend-контуру через gateway.

## Локальный контур

- Frontend UI: `http://localhost:5173/crm/`
- Backend gateway: `http://localhost:8088`
- В dev-режиме браузер должен обращаться только к `http://localhost:5173/api/...`
- Дальше Vite proxy перенаправляет `/api/*` в `http://localhost:8088`

Ожидаемый login flow в DevTools:
- request URL: `http://localhost:5173/api/auth/login`
- proxy target: `http://localhost:8088/api/auth/login`

Admin API:
- request URL: `http://localhost:5173/api/admin/users`
- dev proxy target: `http://localhost:8082/api/admin/users`
- причина: локальный nginx gateway сейчас не маршрутизирует `/api/admin/*` в `auth` сервис

## Что реализовано

- login / me / logout / refresh token flow;
- role-based layout для `ADMIN`, `MANAGER`, `MECHANIC`, `RECEPTIONIST`;
- поиск и создание клиентов;
- карточка клиента с loyalty, автомобилями и заказами;
- поиск/создание автомобилей;
- поиск/создание заказов;
- карточка заказа с обновлением статуса, назначением сотрудника, сметой, loyalty, запчастями и файлами;
- admin-экран создания сотрудников.
- переключение светлой и тёмной темы с сохранением выбора в `localStorage`.

## Запуск

1. Скопируйте `.env.example` в `.env`
2. Поднимите backend-контур
3. Установите зависимости:

```bash
npm install
```

4. Запустите один dev server:

```bash
npm run dev
```

5. Откройте только canonical URL:

```text
http://localhost:5173/crm/
```

## Диагностика login

Если `POST /api/auth/login` возвращает `404`, это почти всегда означает, что:
- открыт старый Vite instance;
- UI открыт не через `http://localhost:5173/crm/`;
- dev server не был перезапущен после обновления proxy-конфига.

В консоли Vite должны появляться строки вида:

```text
[dev-proxy] /api/* is proxied to http://localhost:8088
[dev-proxy] POST /api/auth/login -> http://localhost:8088
```

## Локальный логин

- `admin@autoshop.local`
- `Admin123!`
