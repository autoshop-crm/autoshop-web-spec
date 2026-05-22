# CRM Staff — unresolved role matrix questions

## Purpose
Этот документ фиксирует **непринятые role decisions**, которые нельзя бесшумно придумать в процессе разработки UI.

Он служит входом для будущей `Phase 3 — Role matrix and screen composition contract`.

## 1. Cross-role policy questions
Нужно подтвердить:
- какие действия для запрещённой роли должны быть `hidden`, а какие `disabled-but-visible`;
- должны ли role differences отражаться только в actions или также в структуре секций;
- нужно ли скрывать некоторые блоки полностью, если роль видит итоговые данные в другом месте;
- допустим ли read-only доступ к manager/admin данным для `MECHANIC` или `RECEPTIONIST`.

## 2. Header and lifecycle
Нужно подтвердить по ролям `ADMIN / MANAGER / RECEPTIONIST / MECHANIC`:
- кто видит все lifecycle timestamps, а кто только subset;
- кто может менять `crmStatus` напрямую;
- кто видит lifecycle actions, но не может их нажать;
- должен ли `RECEPTIONIST` видеть продвинутые post-diagnosis состояния;
- должен ли `MECHANIC` видеть cancel-like actions/states как управляемые действия.

## 3. Customer and vehicle context
Нужно подтвердить:
- кто видит телефон клиента;
- кто видит email клиента;
- кто видит полные vehicle identifiers (`VIN`, номер) без ограничений;
- нужны ли отдельные privacy rules для `RECEPTIONIST` vs `MECHANIC`;
- допустим ли read-only доступ механика к контактным данным клиента.

## 4. Ordered works and extra works
Нужно подтвердить:
- может ли `MECHANIC` добавлять только draft extra works или сразу operational work items;
- может ли `MANAGER` редактировать описания работ, добавленных механиком;
- может ли `RECEPTIONIST` видеть/редактировать custom works после старта ремонта;
- нужен ли `ADMIN` полный override для всех work states;
- как именно маркировать работы, ожидающие согласования владельца.

## 5. Parts / procurement block
Нужно подтвердить:
- должен ли `MECHANIC` видеть только requested parts или также quote/order/receive progression;
- какие procurement actions доступны `MANAGER` и `ADMIN`;
- должен ли `RECEPTIONIST` видеть parts block целиком или только summary;
- нужно ли скрывать supplier/procurement details от неуправленческих ролей.

## 6. Financial block
Нужно подтвердить:
- видит ли `MECHANIC` финансовые totals полностью, частично или не видит вообще;
- может ли `RECEPTIONIST` видеть итоговую сумму заказа;
- кто может менять цену нестандартной работы;
- кто видит manual discount, loyalty discount и final amount по отдельности;
- нужен ли read-only financial summary для ролей без права редактирования.

## 7. Approvals block
Нужно подтвердить:
- кто может создавать approval request;
- кто видит текущие approval requests списком;
- кто видит decision history и комментарии;
- должен ли `RECEPTIONIST` видеть approval state без права действия;
- как отображать approval token-derived states без технических деталей.

## 8. Loyalty block
Нужно подтвердить:
- какие staff-роли видят loyalty section, если backend `visible=true`;
- кто может spend/apply loyalty changes;
- видит ли `MECHANIC` loyalty summary;
- нужно ли скрывать loyalty controls от `RECEPTIONIST`, оставляя read-only баланс;
- нужно ли показывать причину, почему loyalty недоступна.

## 9. Timeline block
Нужно подтвердить:
- кто видит full staff timeline;
- есть ли staff roles, которым нужен фильтрованный timeline вместо полного;
- должны ли procurement/internal notes скрываться от `RECEPTIONIST`;
- должен ли `MECHANIC` видеть финансовые/manager-only timeline entries.

## 10. Order creation flow
Нужно подтвердить:
- может ли `MANAGER` делать те же create actions, что и `RECEPTIONIST`, или нужна другая форма;
- должен ли `MANAGER` иметь раннее назначение механика прямо в create flow;
- какие поля обязательны для `RECEPTIONIST` на первом экране;
- допускается ли создание заказа без selected standard services;
- кто может выбирать `bookingChannel`, `plannedVisitAt`, `immediate drop-off` path.

## 11. Admin CRM settings
Нужно подтвердить:
- должен ли settings surface быть доступен только `ADMIN`;
- нужен ли `MANAGER` read-only доступ к услугам/ценам/loyalty settings;
- какие изменения в catalog/pricing требуют audit-friendly UX;
- какие блоки settings входят в MVP: только service catalog и loyalty, или ещё дополнительные CRM dictionaries.

## 12. Decision rule for upcoming phases
До закрытия этих вопросов:
- можно готовить технические hooks, policies и config skeletons;
- нельзя считать role matrix утверждённой спецификацией поведения;
- спорные места должны быть оформлены как explicit TODO/decision points, а не спрятаны в JSX.
