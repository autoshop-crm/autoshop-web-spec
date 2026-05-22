# CRM Staff — role matrix and screen composition contract

## 1. Purpose
Этот документ является **Phase 3 contract artifact** для staff CRM.

Он переводит уже собранные продуктовые договорённости в технический baseline для:
- visibility rules;
- editability rules;
- action availability;
- section composition;
- navigation implications.

Документ не отменяет `ContextProject/Now/CRM_STAFF_ROLE_MATRIX_OPEN_QUESTIONS_RU.md`.
Если решение ещё не подтверждено пользователем, это отмечается явно.

## 2. Role baseline
### Roles in scope
- `ADMIN`
- `MANAGER`
- `MECHANIC`
- `RECEPTIONIST`

### Interpretation rules
- `ADMIN` — superset staff capabilities.
- `MANAGER` — coordination + finance + assignment + procurement controls.
- `MECHANIC` — work execution + extra work initiation + requested parts initiation.
- `RECEPTIONIST` — intake + booking + customer context + check-in/no-show + limited operational visibility.

## 3. Confidence markers
В этой матрице используются такие маркеры:
- `CONFIRMED` — подтверждено backend contract и/или явно следует из product artifacts.
- `PROVISIONAL` — технически принято для реализации, но может потребовать отдельного user confirm.
- `OPEN` — вынесено в unresolved decisions и не должно считаться финальным поведением.

## 4. Order detail sections matrix
| Section | ADMIN | MANAGER | MECHANIC | RECEPTIONIST | Confidence |
|---|---|---|---|---|---|
| Header + crmStatus + lifecycle markers | visible/actionable | visible/actionable | visible/actionable | visible/actionable | CONFIRMED |
| Customer + vehicle summary | visible | visible | visible | visible | CONFIRMED |
| Customer email | visible | visible | visible read-only | visible | PROVISIONAL |
| Ordered works / service lines | visible/editable | visible/editable | visible/read-write for work context | visible/read-only | PROVISIONAL |
| Intake notes | visible/editable | visible/editable | visible/read-only | visible/editable | PROVISIONAL |
| Mechanic extra work block | visible/editable | visible/read-only + pricing follow-up | visible/editable | hidden | PROVISIONAL |
| Parts workspace summary | visible | visible | visible | visible limited | CONFIRMED |
| Parts procurement controls | visible/actionable | visible/actionable | visible/request-initiation only | hidden | CONFIRMED |
| Financial summary | visible/editable | visible/editable | visible limited/read-only | visible limited/read-only | PROVISIONAL |
| Loyalty block | visible/actionable | visible/actionable | visible read-only if allowed | visible/actionable | CONFIRMED |
| Timeline block | visible/full | visible/full | visible/full | visible/filtered-intent | PROVISIONAL |
| Files block | visible | visible | visible | visible | CONFIRMED |
| Approvals block | visible/actionable | visible/actionable | visible/create-request | visible/read-only | CONFIRMED |

## 5. Section-level access details
### 5.1 Header and lifecycle
- `ADMIN`: all lifecycle actions visible and actionable.
- `MANAGER`: all operational lifecycle actions visible and actionable.
- `MECHANIC`: status update visible and actionable; cancellation-like actions remain `OPEN` for final confirmation.
- `RECEPTIONIST`: booking/check-in/no-show lifecycle actions visible and actionable; advanced post-diagnosis transitions are `PROVISIONAL`.

### 5.2 Customer and vehicle block
- All staff roles see human-readable customer and vehicle context.
- Raw ids must not be primary identifiers in UI.
- Contact privacy split remains partially `OPEN`, but current baseline allows all staff roles to see enough contact context to support operations.

### 5.3 Ordered works and intake context
- `ADMIN`/`MANAGER`/`RECEPTIONIST` may see intake-origin data.
- `MECHANIC` must see the initial problem, service lines and operational notes necessary for repair.
- Exact editability split between manager/receptionist/mechanic remains `PROVISIONAL` until explicit confirmation.

### 5.4 Mechanic workspace
- `MECHANIC` can add/describe extra work and initiate approval-needed flows.
- `MANAGER` sees mechanic-originated work context and later prices/approves financial implications.
- `RECEPTIONIST` does not operate this block directly.
- `ADMIN` has superset visibility and control.

### 5.5 Parts workspace
- `MECHANIC` can search/select/request parts.
- `MANAGER`/`ADMIN` can execute procurement progression.
- `RECEPTIONIST` may see summary-level state, but not procurement details or actions.

### 5.6 Financial block
- `MANAGER`/`ADMIN` own full financial controls.
- `MECHANIC` may see limited totals needed for work awareness, but pricing authority remains outside mechanic role.
- `RECEPTIONIST` may see order total or customer-facing amount, but discount internals remain `OPEN`.

### 5.7 Approvals block
- `ADMIN`, `MANAGER`, `MECHANIC` can create approval requests.
- `ADMIN`, `MANAGER` can resolve staff-side approval operations.
- `RECEPTIONIST` sees status/read-only state only.

### 5.8 Loyalty block
- Loyalty visibility obeys backend settings first.
- `ADMIN`, `MANAGER`, `RECEPTIONIST` can operate staff-side loyalty actions when backend allows.
- `MECHANIC` may see read-only loyalty context only when `visible=true`.

### 5.9 Timeline block
- Staff timeline is visible to all staff roles.
- Filtering of especially sensitive entries for `RECEPTIONIST` remains `PROVISIONAL` and should be formalized before UI polish.

## 6. Action matrix
| Action | ADMIN | MANAGER | MECHANIC | RECEPTIONIST | Source |
|---|---|---|---|---|---|
| Assign employee | yes | yes | no | no | backend CONFIRMED |
| Update estimate | yes | yes | yes | no | backend CONFIRMED |
| Update status | yes | yes | yes | yes | backend CONFIRMED |
| Check-in | yes | yes | no | yes | backend CONFIRMED |
| Mark no-show | yes | yes | no | yes | backend CONFIRMED |
| Create approval request | yes | yes | yes | no | backend CONFIRMED |
| Approve/reject request on staff side | yes | yes | no | no | backend CONFIRMED |
| Create requested part | yes | yes | yes | no | backend CONFIRMED |
| Procurement quote/order/receive | yes | yes | no | no | backend CONFIRMED |
| Spend/apply loyalty | yes | yes | no | yes | backend CONFIRMED |
| Manage CRM settings | yes | no | no | no | PROVISIONAL-to-CONFIRMED product direction |

## 7. Order detail composition contract
### Top-level order of sections
1. Header / lifecycle summary
2. Customer + vehicle summary
3. Ordered works / intake context
4. Role-dependent actions rail
5. Mechanic work block
6. Parts workspace
7. Financial summary
8. Approvals block
9. Loyalty block
10. Files block
11. Timeline block

### Rationale
- first screenful must establish operational context;
- work and parts stay close for mechanic flow;
- money and approvals stay close for manager/admin flow;
- timeline remains supporting evidence, not the first interaction point.

## 8. Navigation implications
### Current implication
`AppLayout` should eventually gain dedicated CRM navigation entries for:
- CRM orders/search shell;
- CRM settings for `ADMIN`.

### Phase 3 contract decision
- No immediate navigation rewrite is required in this phase.
- But the contract explicitly reserves a future admin-only CRM settings entry.

## 9. Implementation rule for future phases
- JSX should consume policy/config functions rather than hardcoded role checks where possible.
- New role-aware screens should use this contract as the default policy source.
- Any unresolved field/action should be marked explicitly in config as `provisional` or `open` rather than embedded as an invisible assumption.
