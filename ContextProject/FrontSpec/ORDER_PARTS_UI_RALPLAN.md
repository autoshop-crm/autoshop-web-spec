# Order Parts UI — RALPLAN для обновлённой работы с деталями

Дата: 2026-05-12
Проект: `autoshop-web-spec`
Статус: ready for implementation planning handoff
Основание:
- `ContextProject/FrontSpec/PARTS_FRONTEND_API_REPORT copy.md`
- `ContextProject/FrontSpec/ORDER_PARTS_PROCUREMENT_FRONTEND_API copy.md`
- текущий UI заказа в `src/pages/orders/OrderDetailsPage.tsx`

---

# 1. Контекст и задача

Нужно переработать UI работы с деталями в заказе.

Текущий экран построен вокруг технической модели:
- добавление детали через `Part ID`;
- управление уже добавленными строками прямо из order page;
- смешивание сценариев механика и менеджера;
- отсутствие цельного flow поиска по складу + UMAPI + requested-part lifecycle.

Целевое поведение:
- **механик** внутри заказа остаётся во вкладке/секции `Запчасти заказа`;
- механик вводит нужную деталь в поиск;
- получает **единый список** результатов из локального склада и `UMAPI`;
- выбирает **конкретную** деталь с артикулом;
- если локально деталь есть — она добавляется как обычная складская строка заказа;
- если локально детали нет — она всё равно добавляется в заказ как `requested part`;
- если такой артикул уже есть в заказе — количество увеличивается;
- после добавления механик не управляет строкой дальше;
- **менеджер** отдельно работает со складом и lifecycle закупки.

---

# 2. Intent

## 2.1 Почему это делается

Нужно перевести работу механика с деталей из технического CRUD-flow в реальный операционный workflow сервиса.

Механик должен:
- быстро найти нужную деталь;
- понимать, есть ли она на складе;
- видеть, что уже заказано и едет;
- выбрать правильный артикул;
- добавить его в заказ без знания внутренних `id` и складской структуры.

Менеджер должен:
- получить на своей стороне понятный поток закупки;
- видеть, какие позиции уже добавлены механиком;
- управлять закупкой и складом отдельно от mechanic UI.

---

# 3. Desired Outcome

После реализации:
- order page содержит рабочий раздел `Запчасти заказа` для mechanic-first сценария;
- поиск деталей опирается на backend-контракт unified/search + requested parts;
- UI корректно разделяет роли `MECHANIC` и `MANAGER`;
- список строк заказа показывает только релевантную для механика информацию;
- закупка и склад не смешиваются с mechanic workflow;
- появляется отдельный manager-only экран `Запчасти на складе`.

---

# 4. Зафиксированные продуктовые правила

## 4.1 Что остаётся внутри заказа

Внутри заказа остаётся та же зона `Запчасти заказа`.

Не создаём для механика отдельный экран склада.
Не создаём отдельный global parts page для mechanic flow.

## 4.2 Что появляется у менеджера

У менеджера появляется отдельная вкладка/страница `Запчасти на складе` со всеми складскими позициями.

## 4.3 Что делает механик

Механик:
- ищет деталь в поиске;
- получает общий список локальных и UMAPI-вариантов;
- сам выбирает конкретную строку с конкретным артикулом;
- добавляет её в заказ.

Если локально детали нет:
- она всё равно добавляется в заказ;
- дальше менеджер занимается заказом детали.

## 4.4 Что видит механик в списке деталей

Для каждой детали в списке нужно показывать состояние:
- `На складе`
- `Нет на складе`
- `В пути`

После добавления механик должен видеть только:
- `Название`
- `Артикул`
- `Бренд`
- `Статус`

## 4.5 Повторное добавление

Если деталь с тем же артикулом уже есть в заказе:
- повторное добавление не создаёт новую логическую позицию для механика;
- должно приводить к увеличению количества.

## 4.6 Что механик НЕ делает

После добавления строки механик не должен:
- удалять её;
- менять количество;
- заменять деталь;
- управлять закупочными переходами;
- принимать деталь на склад.

Эти действия — зона manager/admin flow.

---

# 5. Brownfield evidence

## 5.1 Текущее состояние фронта

Сейчас `src/pages/orders/OrderDetailsPage.tsx`:
- показывает блок `Запчасти заказа` внутри order page;
- ранее использовал добавление через `Part ID`;
- содержит order-operations, loyalty, files и parts в одном экране;
- уже частично изменён в сторону поиска, но ещё не соответствует полной новой модели requested parts.

## 5.2 Backend parts API

Из `PARTS_FRONTEND_API_REPORT copy.md` подтверждено:
- есть локальный поиск по `/api/parts`;
- есть unified search по `/api/parts/unified/search`;
- есть order-scoped сценарий для работы с деталями;
- mechanic имеет read-доступ к поиску и может менять состав деталей заказа через соответствующие order endpoints.

## 5.3 Backend requested parts / procurement API

Из `ORDER_PARTS_PROCUREMENT_FRONTEND_API copy.md` подтверждено:
- появилась отдельная сущность `requested part`;
- есть lifecycle:
  - `OUT_OF_STOCK`
  - `ORDERED_IN_TRANSIT`
  - `IN_STOCK_RESERVED`
- mechanic может:
  - просматривать requested parts;
  - создавать requested parts;
  - видеть общий overview;
- manager может:
  - получать quotes;
  - переводить requested part в ordered state;
  - принимать деталь на склад.

---

# 6. Principles

1. **Mechanic-first UX** — механику нельзя показывать технические действия, не относящиеся к его роли.
2. **One search, one choice** — механик работает с единым списком результатов, а не с разрозненными источниками данных.
3. **Article-driven workflow** — ключом операционного UI выступает артикул и его статус, а не внутренний `id`.
4. **Role separation** — mechanic flow, warehouse flow и procurement flow разделены по интерфейсу и действиям.
5. **Backend as source of truth** — фронт не должен сам выдумывать складской/закупочный state machine, если он уже определён контрактом.

---

# 7. Decision Drivers

Три главных драйвера решения:

1. **Скорость работы механика**
   - минимум кликов;
   - поиск по смыслу детали, а не по техническому идентификатору.

2. **Корректность операционного процесса**
   - отсутствие смешения ролей;
   - невозможность mechanic-side закупочных действий.

3. **Расширяемость модели**
   - локальные детали и requested parts — разные backend-сущности;
   - UI должен агрегировать их безопасно и прозрачно.

---

# 8. Viable Options

## Option A — единый раздел `Запчасти заказа` с unified search и unified overview

### Суть
В order page остаётся один раздел `Запчасти заказа`.
Внутри него:
- блок поиска и добавления;
- единый агрегированный список уже добавленных строк.

### Плюсы
- полностью соответствует зафиксированному UX;
- минимизирует когнитивную нагрузку механика;
- не заставляет пользователя понимать разницу между local и requested сущностями;
- упрощает сценарий “нашёл → выбрал → добавил”.

### Минусы
- на фронте нужен слой агрегации данных;
- сложнее view-model и role-based actions.

### Вывод
Это **основной выбранный вариант**.

## Option B — две отдельные секции внутри order page: локальные детали и requested parts

### Плюсы
- технически ближе к backend-модели;
- легче реализовать без unified view-model.

### Минусы
- механик должен понимать внутреннее различие между сущностями;
- UX хуже: требуется решать, куда смотреть и что добавлять;
- нарушается принцип one search, one choice.

### Причина отклонения
Неподходяще для mechanic-first сценария.

## Option C — отдельный global parts page и переход из заказа

### Плюсы
- можно сделать мощный каталог/поиск.

### Минусы
- ломает зафиксированное решение “всё внутри заказа”;
- отрывает механика от контекста конкретного order;
- увеличивает количество переходов.

### Причина отклонения
Противоречит требованиям пользователя.

---

# 9. ADR

## Decision
Выбрать **Option A**: один раздел `Запчасти заказа` внутри order page с unified search, unified results и unified overview, плюс отдельный manager-only экран `Запчасти на складе`.

## Drivers
- mechanic-first UX;
- работа по артикулу и статусу;
- разделение ролей mechanic/manager;
- готовые backend-контракты для local parts и requested parts.

## Alternatives considered
- две секции по backend-сущностям;
- отдельный global page для mechanic workflow.

## Why chosen
Этот вариант лучше всего соответствует пользовательскому сценарию и меньше всего заставляет mechanic-side UI раскрывать внутреннюю backend-модель.

## Consequences
- нужен unified view-model на фронте;
- нужен role-based rendering для действий;
- нужен отдельный manager-only маршрут для склада;
- текущий `OrderDetailsPage` потребуется декомпозировать.

## Follow-ups
- вынести parts UI в отдельные компоненты;
- определить единый mapping статусов;
- определить manager-only flow для склада и procurement actions.

---

# 10. Scope

## 10.1 In Scope

### A. Mechanic UI inside order
- единый поиск детали внутри `Запчасти заказа`;
- единый список результатов из local + UMAPI;
- отображение статуса по каждой найденной детали;
- добавление local detail в order parts;
- добавление unavailable detail в requested parts;
- увеличение количества при повторном добавлении того же артикула;
- read-only список уже добавленных строк для механика.

### B. Unified overview of current order parts
- агрегация `OrderPartItem` и `OrderRequestedPart` в один UI-список;
- единый статусный mapping;
- скрытие manager-only/procurement-only полей от механика.

### C. Manager warehouse screen
- отдельная вкладка/страница `Запчасти на складе`;
- базовый список всех складских деталей;
- поиск и фильтр по наличию;
- foundation для будущих manager flows.

### D. Role-based behavior
- `MECHANIC`: поиск + добавление;
- `MANAGER`: склад + закупка + расширенные действия;
- `RECEPTIONIST`: read-only overview;
- `ADMIN`: полный доступ.

## 10.2 Out of Scope / Non-goals

В первую реализацию не входят:
- редактирование/удаление строк заказа механиком;
- изменение количества механиком;
- ручной edit закупочных полей механиком;
- показ менеджерских полей механику:
  - supplier,
  - purchase price,
  - sale price,
  - delivery window,
  - quote metadata;
- полноценный procurement cockpit внутри order page;
- умный аналоговый matching beyond backend contract;
- перенос mechanic workflow на отдельный global page.

---

# 11. Decision Boundaries

OMX/implementation может самостоятельно принимать решения по:
- выделению React-компонентов и их именам;
- деталям локального state management;
- способу объединения local/requested данных в view-model;
- форме status chip / badge;
- debounce/search UX;
- технической структуре manager warehouse route.

Нужно отдельное подтверждение пользователя, если потребуется:
- менять глобальную навигацию приложения сильнее, чем добавление manager-only screen;
- менять backend contracts;
- вводить новые статусы, которых нет в документации;
- раскрывать механику дополнительные поля beyond agreed set.

---

# 12. UI information architecture

## 12.1 Order page

### Раздел `Запчасти заказа`
Разбить на два функциональных блока:

#### Блок 1 — Поиск и добавление
Показывает:
- строку поиска;
- unified list результатов;
- статус по каждой найденной позиции;
- CTA `Добавить`.

#### Блок 2 — Уже добавленные детали заказа
Показывает:
- `Название`
- `Артикул`
- `Бренд`
- `Статус`

Для механика — без edit/delete actions.

## 12.2 Manager warehouse page

Отдельная страница/вкладка:
- список складских деталей;
- поиск;
- фильтр `только доступные`;
- основа для дальнейших manager-side операций.

---

# 13. Data model / frontend view models

## 13.1 Existing domain models

Нужно поддержать в фронте:
- `OrderPartItem`
- `OrderRequestedPart`
- `UnifiedPartSearchResponse`

## 13.2 New frontend view-models

### `OrderPartOverviewItem`
Предлагаемый UI-агрегат:

```ts
interface OrderPartOverviewItem {
  sourceType: 'LOCAL' | 'REQUESTED';
  articleNumber: string;
  brand: string | null;
  name: string;
  status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'IN_TRANSIT';
  displayStatusLabel: 'На складе' | 'Нет на складе' | 'В пути';
  localPartId?: number | null;
  orderPartItemId?: number | null;
  requestedPartId?: number | null;
}
```

### `SearchResultListItem`
```ts
interface SearchResultListItem {
  sourceType: 'LOCAL' | 'EXTERNAL';
  articleNumber: string;
  brand: string | null;
  name: string;
  status: 'IN_STOCK' | 'OUT_OF_STOCK' | 'IN_TRANSIT';
  canAdd: boolean;
  matchedLocalPartId?: number | null;
  localPart?: Part | null;
  externalPart?: ExternalPartItem | null;
}
```

---

# 14. API plan

## 14.1 For search

Использовать как основной механизм mechanic-side выбора:
- `GET /api/parts/unified/search`

Цель:
- получить единый список local + external вариантов;
- понять, есть ли локальное совпадение;
- использовать backend-сопоставление вместо самодельной логики на фронте.

## 14.2 For local order part add

Использовать:
- `POST /api/orders/{orderId}/parts`

Когда применять:
- выбранная механиком деталь существует как local part;
- добавляется складская строка заказа.

## 14.3 For requested part add

Использовать:
- `POST /api/orders/{orderId}/requested-parts`

Когда применять:
- локальной складской позиции нет;
- нужен requested-part lifecycle.

## 14.4 For current order overview

Нужны чтения:
- `GET /api/orders/{orderId}/parts`
- `GET /api/orders/{orderId}/requested-parts`

Фронт агрегирует оба ответа в единый overview-список.

## 14.5 For manager warehouse page

Использовать:
- `GET /api/parts`
- при необходимости `availableOnly=true`

---

# 15. Status mapping plan

Нужно унифицировать отображение статусов для mechanic UI.

## 15.1 Requested part statuses

Backend:
- `OUT_OF_STOCK`
- `ORDERED_IN_TRANSIT`
- `IN_STOCK_RESERVED`

UI mapping:
- `OUT_OF_STOCK` -> `Нет на складе`
- `ORDERED_IN_TRANSIT` -> `В пути`
- `IN_STOCK_RESERVED` -> `На складе`

## 15.2 Local part statuses

Для local part статус в mechanic UI вычисляется как:
- если деталь уже в заказе как local reserved item -> `На складе`
- если unified search показывает внешний вариант без локального наличия -> `Нет на складе`
- если backend вернёт requested-part state по тому же артикулу -> `В пути`

Важно:
- не изобретать фронтовый state machine шире, чем backend contract;
- где возможно, статус должен вытекать из server response и article-level aggregation.

---

# 16. Role matrix

| Capability | ADMIN | MANAGER | MECHANIC | RECEPTIONIST |
|---|---|---:|---:|---:|
| Смотреть unified search | yes | yes | yes | yes |
| Добавлять local part в заказ | yes | yes | yes | no |
| Создавать requested part | yes | yes | yes | no |
| Менять уже добавленные строки заказа | yes | yes | no | no |
| Выполнять procurement transitions | yes | yes | no | no |
| Смотреть requested parts overview | yes | yes | yes | yes |
| Работать со складским экраном | yes | yes | no | no |

---

# 17. Implementation plan by phases

## Phase 1 — contracts and decomposition

### Goals
- привести типы и API-слой к новой модели;
- отделить parts UI от остального `OrderDetailsPage`.

### Tasks
1. Добавить/актуализировать frontend-типы:
   - `OrderRequestedPart`
   - `UnifiedPartSearchResponse`
   - unified view-models
2. Добавить/актуализировать API-клиенты:
   - `partsApi.unifiedSearch(...)`
   - `ordersRequestedPartsApi.create(...)`
   - `ordersRequestedPartsApi.listByOrder(...)`
3. Выделить parts-related UI в отдельные компоненты, например:
   - `OrderPartsSearchPanel`
   - `OrderPartsOverviewTable`
   - `OrderPartStatusChip`
4. Упростить `OrderDetailsPage` до orchestration-level контейнера.

### Acceptance criteria
- данные local/requested/search typed и доступны из API-слоя;
- parts UI можно развивать независимо от loyalty/files/order-operations.

## Phase 2 — mechanic search flow

### Goals
- реализовать поиск детали и выбор конкретного артикула.

### Tasks
1. Добавить единое поле поиска.
2. Реализовать вызов unified search.
3. Отрисовать единый список результатов.
4. Показать по каждой строке:
   - название,
   - бренд,
   - артикул,
   - статус,
   - действие `Добавить`.
5. Обработать состояния:
   - loading,
   - empty,
   - partial backend error,
   - no results.

### Acceptance criteria
- mechanic может найти деталь без знания `id`;
- список содержит local и external варианты;
- статус читается визуально сразу.

## Phase 3 — add flow and article merge logic

### Goals
- реализовать корректное добавление local/requested строк.

### Tasks
1. Для local result использовать add-to-order-part endpoint.
2. Для unavailable result использовать create-requested-part endpoint.
3. После add action перечитывать order overview.
4. Реализовать merge rule по артикулу:
   - повторное добавление увеличивает количество.
5. Обработать backend conflict/validation errors.

### Acceptance criteria
- local item добавляется как складская строка;
- unavailable item добавляется как requested part;
- повторное добавление того же артикула увеличивает количество.

## Phase 4 — mechanic read-only overview

### Goals
- привести таблицу added parts к согласованному mechanic UX.

### Tasks
1. Сагрегировать `parts + requested-parts` в unified list.
2. Показать только agreed fields:
   - название,
   - артикул,
   - бренд,
   - статус.
3. Удалить для механика:
   - quantity edit,
   - delete action,
   - replace action.
4. Добавить status chips.

### Acceptance criteria
- mechanic видит только нужную operational summary;
- нет лишних manager/procurement controls.

## Phase 5 — manager warehouse screen

### Goals
- вынести склад в отдельный manager-only route.

### Tasks
1. Добавить маршрут/пункт навигации `Запчасти на складе`.
2. Реализовать список складских деталей.
3. Добавить базовый поиск и фильтры.
4. Ограничить доступ по роли.

### Acceptance criteria
- manager имеет отдельный складской экран;
- mechanic не вынужден идти в складской раздел для работы с деталями заказа.

## Phase 6 — procurement handoff foundation

### Goals
- подготовить manager-side lifecycle переходов без смешения с mechanic UI.

### Tasks
1. Определить место отображения requested parts для manager view.
2. Подготовить action slots для:
   - quotes,
   - order,
   - receive.
3. Не раскрывать эти действия механику.

### Acceptance criteria
- manager-side расширение возможно без переделки mechanic workflow.

---

# 18. Verification plan

## 18.1 Unit-level
- status mapping local/requested -> display labels;
- article merge behavior;
- unified view-model builders.

## 18.2 Integration-level
- local result add flow;
- requested part add flow;
- repeat add same article;
- role-based visibility of actions.

## 18.3 UI-level
- mechanic sees search and read-only overview;
- manager sees warehouse route;
- receptionist sees read-only overview only.

## 18.4 Observability / diagnostics
- log API failures for unified search;
- preserve backend error messages in user-facing alerts where useful;
- avoid blocking full order page if one parts source fails.

---

# 19. Risks and pre-mortem

## Scenario 1 — unified search не даёт достаточно данных для статуса

### Risk
Backend unified response может не закрывать article-level state полностью для mechanic UI.

### Mitigation
- использовать requested-parts list как дополнительный источник истины;
- сделать явный article-to-status mapper в frontend adapter layer.

## Scenario 2 — local и requested строки конфликтуют в агрегированном UI

### Risk
Один и тот же артикул может существовать в разных backend сущностях, что приведёт к дублирующимся строкам.

### Mitigation
- заранее определить merge policy в adapter layer;
- приоритет отображения статуса: `В пути` > `На складе` > `Нет на складе` для article-level overview, если backend не даёт готовый overview.

## Scenario 3 — `OrderDetailsPage` станет слишком сложной

### Risk
Все новые flows останутся в одном giant component.

### Mitigation
- декомпозировать на контейнер + feature components;
- вынести API adapters и mappers из page component.

---

# 20. Concrete file plan

## Existing files to modify
- `src/pages/orders/OrderDetailsPage.tsx`
- `src/api/ordersApi.ts`
- `src/api/partsApi.ts`
- `src/types/models.ts`
- `src/app/App.tsx`
- `src/layouts/AppLayout.tsx` или соответствующий navigation component

## New files likely needed
- `src/api/orderRequestedPartsApi.ts`
- `src/components/orders/OrderPartsSearchPanel.tsx`
- `src/components/orders/OrderPartsOverviewTable.tsx`
- `src/components/orders/OrderPartStatusChip.tsx`
- `src/utils/orderPartsMapper.ts`
- `src/pages/parts/PartsWarehousePage.tsx`

## Optional new files
- `src/hooks/useOrderPartsOverview.ts`
- `src/hooks/useUnifiedPartSearch.ts`

---

# 21. Team / execution handoff guidance

## Recommended next mode
Рекомендуемый следующий шаг: **`$ralph`** для последовательной реализации по фазам 1–4, затем отдельный lane/phase для manager warehouse page.

## Alternative mode
Если нужно распараллелить работу:
- **`$team`**

## Suggested staffing lanes for `team`

### Lane 1 — API and models
- ownership:
  - `src/api/*`
  - `src/types/models.ts`
  - mapper layer
- reasoning: `medium`

### Lane 2 — Mechanic order parts UI
- ownership:
  - `src/pages/orders/*`
  - `src/components/orders/*`
- reasoning: `high`

### Lane 3 — Manager warehouse page
- ownership:
  - `src/pages/parts/*`
  - navigation integration
- reasoning: `medium`

### Lane 4 — Verification and polish
- ownership:
  - smoke checks,
  - role visibility review,
  - acceptance criteria verification
- reasoning: `medium`

## Available agent types roster
- `default`
- `explorer`
- `worker`

## Suggested launch hints
- `$ralph ContextProject/FrontSpec/ORDER_PARTS_UI_RALPLAN.md`
- `$team ContextProject/FrontSpec/ORDER_PARTS_UI_RALPLAN.md`

## Team verification path
1. Verify role matrix against UI rendering.
2. Verify search → add local part.
3. Verify search → add requested part.
4. Verify repeat add same article.
5. Verify mechanic cannot edit added rows.
6. Verify manager sees warehouse route.

---

# 22. Final acceptance checklist

- [ ] В order page остаётся единый раздел `Запчасти заказа`
- [ ] Механик ищет деталь без использования `Part ID`
- [ ] Поиск показывает local + UMAPI результаты
- [ ] У каждой строки виден статус `На складе / Нет на складе / В пути`
- [ ] Механик выбирает конкретную деталь по артикулу
- [ ] Unavailable деталь всё равно добавляется в заказ
- [ ] При повторном добавлении того же артикула количество увеличивается
- [ ] Механик не может редактировать уже добавленные строки
- [ ] Механик после добавления видит только `Название / Артикул / Бренд / Статус`
- [ ] Менеджер имеет отдельную вкладку/страницу `Запчасти на складе`
- [ ] Procurement actions скрыты от механика
- [ ] UI не смешивает складской и mechanic order flow

