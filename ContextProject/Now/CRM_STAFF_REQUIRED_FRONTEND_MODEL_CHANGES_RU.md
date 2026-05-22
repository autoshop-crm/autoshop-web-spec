# CRM Staff — required frontend model changes baseline

## Purpose
Этот документ фиксирует **первую волну обязательных frontend model/API changes**, без которых staff CRM implementation будет опираться на неверные или слишком бедные данные.

## 1. Order model fields to add
В `src/types/models.ts` и связанных frontend models нужно заложить поддержку:
- `crmStatus`
- `legacyStatus`
- `plannedVisitAt`
- `plannedSlotMinutes`
- `bookingChannel`
- `intakeNotes`
- `requiresOwnerApprovalForEveryExtraWork`
- `plannedDropOff`
- `checkedInAt`
- `readyForOwnerAt`
- `handedOverAt`
- `cancelledAt`
- `cancellationReason`
- `serviceLines`

## 2. DTO families to introduce
Нужны отдельные DTO / typed response families для:
- `OrderServiceLineDTO`
- `OrderSearchResponseDTO`
- `OrderQueueSummaryDTO`
- `OrderTimelineEntryResponseDTO`
- approval DTO family
- loyalty settings DTO family
- service catalog DTO family

## 3. Frontend view models to introduce
Нужны frontend-level models, отделённые от raw API DTO:
- `OrderListItemViewModel`
- `OrderDetailViewModel`
- `ApprovalRequestViewModel`
- `RequestedPartViewModel`
- `TimelineEntryViewModel`
- `LoyaltySettingsViewModel`
- `MechanicWorkDraftViewModel`
- `ManagerPricingDraftViewModel`

## 4. Status system changes
Нужно пересобрать status model вокруг:
- полного CRM enum;
- явного legacy enum;
- enum -> localized label;
- enum -> badge/tone mapping;
- optional CRM -> legacy projection helper для transition cases.

## 5. API layer gaps
Нужны новые frontend API modules или расширения существующих modules для:
- CRM order search;
- queue summary;
- order timeline;
- order approvals;
- service catalog;
- CRM loyalty settings.

## 6. Current codebase mismatch to fix
Сейчас baseline mismatch выглядит так:
- `OrdersPage` опирается на старый статусный flow вместо CRM search read-model;
- `OrderDetailsPage` ещё не собран вокруг единого `OrderDetailViewModel`;
- `OrderCreatePage` не покрывает новый booking/intake contract полностью;
- frontend status helpers знают только legacy-simple status set.

## 7. Priority order
Порядок закрытия gaps фиксируется так:
1. typed domain alignment;
2. status/enum helpers;
3. API modules and mappers;
4. role-aware view models;
5. только после этого — major UI composition work.

## 8. Phase dependency note
Этот документ является прямым входом для:
- `Phase 1 — CRM domain model alignment`
- `Phase 2 — CRM API and mapper foundation`
