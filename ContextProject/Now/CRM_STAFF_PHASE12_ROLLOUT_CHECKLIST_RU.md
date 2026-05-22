# CRM Staff Phase 12 — Rollout checklist

## Цель
Финально проверить, что после Phase 0–11 staff surfaces согласованы по доступам, ошибкам и основным рабочим сценариям.

## Role guard regression
- `ADMIN`: видит `/staff`, `/admin/crm-settings`, `/parts`, `/orders`, `/vehicles`, `/customers`.
- `MANAGER`: не видит и не открывает `/staff`, `/admin/crm-settings`; видит `/parts`, `/orders`, `/vehicles`, `/customers`.
- `MECHANIC`: не видит и не открывает `/staff`, `/admin/crm-settings`, `/parts`; видит `/orders`, `/vehicles`.
- `RECEPTIONIST`: не видит и не открывает `/staff`, `/admin/crm-settings`, `/parts`; видит `/orders`, `/vehicles`, `/customers`.

## Orders list
- CRM filters работают: `status`, `employeeId`, `plannedFrom`, `plannedTo`, `q`, `page`, `size`.
- Строки списка показывают читаемый клиент/автомобиль вместо raw ID.
- Прямой переход на `/orders` без нужной роли показывает access denied state.

## Order detail
- Блоки `Согласования` и `История заказа` загружаются без placeholder'ов.
- `MANAGER/ADMIN` может approve/reject open approvals.
- `MECHANIC` может создать approval request на допработу.
- Ошибки `400/404/409` показываются человекочитаемо и не оставляют страницу в сломанном состоянии.

## Admin settings
- `/admin/crm-settings` доступен только `ADMIN`.
- Категория услуги создаётся из UI.
- Услуга создаётся и редактируется из UI.
- Loyalty settings отображаются как read-only panel до появления backend write contract.

## Parts and vehicles
- `/parts` открывается только для `ADMIN/MANAGER`.
- `/vehicles` открывается только для staff-ролей CRM.
- Прямые URL без роли показывают access denied state, а не рабочий экран.

## Notes
- Неблокирующий build warning про large Vite chunks остаётся допустимым для этой фазы.
- Backend gap: write endpoint для `loyalty settings` всё ещё отсутствует в текущем контракте.
