export type Role = 'ADMIN' | 'MANAGER' | 'MECHANIC' | 'RECEPTIONIST' | 'CLIENT' | string;

export type OrderCrmStatus =
  | 'NEW'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'WAITING_FOR_VISIT'
  | 'ACCEPTED'
  | 'DIAGNOSIS_IN_PROGRESS'
  | 'WAITING_FOR_OWNER_APPROVAL'
  | 'WAITING_FOR_PART'
  | 'REPAIR_IN_PROGRESS'
  | 'READY_FOR_OWNER'
  | 'HANDED_OVER'
  | 'CANCELLED_NO_SHOW'
  | 'CANCELLED_BY_CUSTOMER'
  | 'CANCELLED_INTERNAL'
  | string;

export type LegacyOrderStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;

export type OrderStatus = OrderCrmStatus | LegacyOrderStatus;

export type OrderBookingChannel =
  | 'PHONE'
  | 'WHATSAPP'
  | 'TELEGRAM'
  | 'WEB'
  | 'IN_PERSON'
  | string;

export interface AuthUser {
  userId: number;
  email: string;
  roles: Role[];
  expiresAt?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
  userId: number;
  email: string;
  roles: Role[];
}

export interface RefreshResponse extends LoginResponse {}

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogManufacturer {
  type: string;
  manufacturerId: number;
  name: string;
}

export interface CatalogModelSeries {
  type: string;
  manufacturerId: number;
  modelSeriesId: number;
  name: string;
  productionFrom?: string | null;
  productionTo?: string | null;
}

export interface CatalogModification {
  type: string;
  modelSeriesId: number;
  modificationId: number;
  name: string;
  powerPs?: number | null;
  capacityLiters?: number | null;
  engineType?: string | null;
  bodyType?: string | null;
  fuelType?: string | null;
  displayName?: string | null;
}

export interface Vehicle {
  id: number;
  customerId: number;
  brand: string;
  model: string;
  vin: string;
  licensePlate: string;
  umapiType?: string | null;
  umapiManufacturerId?: number | null;
  umapiManufacturerName?: string | null;
  umapiModelSeriesId?: number | null;
  umapiModelSeriesName?: string | null;
  umapiModificationId?: number | null;
  umapiModificationName?: string | null;
  umapiEngineDescription?: string | null;
  umapiCatalogLinkedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderServiceLineDTO {
  id: number;
  serviceCatalogItemId?: number | null;
  name: string;
  description?: string | null;
  quantity?: number | null;
  unitPrice?: string | null;
  lineTotal?: string | null;
  source?: string | null;
  requiresOwnerApproval?: boolean | null;
  approvedByOwner?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface Order {
  id: number;
  customerId: number;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerEmail?: string | null;
  customerPhoneNumber?: string | null;
  vehicleId: number;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  vehicleVin?: string | null;
  vehicleLicensePlate?: string | null;
  employeeId?: number | null;
  employeeFirstName?: string | null;
  employeeLastName?: string | null;
  employeeEmail?: string | null;
  problem: string;
  status: OrderStatus;
  crmStatus?: OrderCrmStatus | null;
  legacyStatus?: LegacyOrderStatus | null;
  plannedVisitAt?: string | null;
  plannedSlotMinutes?: number | null;
  bookingChannel?: OrderBookingChannel | null;
  intakeNotes?: string | null;
  requiresOwnerApprovalForEveryExtraWork?: boolean | null;
  plannedDropOff?: boolean | null;
  checkedInAt?: string | null;
  readyForOwnerAt?: string | null;
  handedOverAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  laborTotal?: string | null;
  partsTotal?: string | null;
  costsTotal?: string | null;
  manualDiscountAmount?: string | null;
  pointsDiscountAmount?: string | null;
  loyaltyPointsSpent?: number | null;
  discountAmount?: string | null;
  finalAmount?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  serviceLines?: OrderServiceLineDTO[];
}

export interface OrderSearchResponseDTO {
  page: number;
  size: number;
  hasMore: boolean;
  totalElements?: number | null;
  items: Order[];
  loyaltySettings?: LoyaltySettingsDTO | null;
}

export interface OrderQueueSummaryDTO {
  totalOpenOrders?: number | null;
  waitingForVisit?: number | null;
  accepted?: number | null;
  diagnosisInProgress?: number | null;
  waitingForOwnerApproval?: number | null;
  waitingForPart?: number | null;
  repairInProgress?: number | null;
  readyForOwner?: number | null;
  overdueCount?: number | null;
  todayArrivalsCount?: number | null;
  unassignedBookingsCount?: number | null;
}

export type OrderTimelineActorType = 'SYSTEM' | 'CUSTOMER' | 'RECEPTIONIST' | 'MECHANIC' | 'MANAGER' | 'ADMIN' | 'AUTOMATION_JOB' | string;

export interface OrderTimelineEntryResponseDTO {
  id: number;
  orderId?: number | null;
  eventType: string;
  actorType?: OrderTimelineActorType | null;
  actorId?: number | null;
  effectiveStatus?: OrderCrmStatus | null;
  summary?: string | null;
  title?: string | null;
  description?: string | null;
  detailsJson?: string | null;
  actorUserId?: number | null;
  actorDisplayName?: string | null;
  occurredAt?: string | null;
  createdAt?: string | null;
}

export type ApprovalRequestStatus = 'OPEN' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | string;

export type ApprovalType = 'EXTRA_WORK' | 'PART_ONLY' | 'MIXED_SCOPE_CHANGE' | string;

export type ApprovalProposalStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CONVERTED_TO_WORK' | 'CANCELLED' | string;

export interface ApprovalRequestedPartDTO {
  articleNumber: string;
  brand?: string | null;
  name?: string | null;
  umapiArticleId?: number | null;
  matchedLocalPartId?: number | null;
  quantity?: number | null;
}

export interface ApprovalRequestDTO {
  requestId: number;
  orderId: number;
  proposalId?: number | null;
  approvalType?: ApprovalType | null;
  requestStatus: ApprovalRequestStatus;
  proposalStatus?: ApprovalProposalStatus | null;
  requestToken?: string | null;
  title?: string | null;
  description?: string | null;
  laborAmount?: string | null;
  partsAmount?: string | null;
  totalAmount?: string | null;
  requestedAt: string;
  expiresAt?: string | null;
  customerContactChannel?: string | null;
  requestedPart?: ApprovalRequestedPartDTO | null;
}

export interface ApprovalDecisionDTO {
  decisionToken: string;
  comment?: string | null;
}

export interface ApprovalRequestCreateDTO {
  title?: string | null;
  description?: string | null;
  laborAmount?: string | null;
  partsAmount?: string | null;
  requiresApproval?: boolean | null;
  requestedPart?: ApprovalRequestedPartDTO | null;
  customerContactChannel?: string | null;
}

export interface LoyaltySettingsDTO {
  enabled: boolean;
  visible: boolean;
  spendEnabled: boolean;
  earnEnabled: boolean;
  pointsPerCurrencyUnit?: number | null;
  currencyUnitsPerPoint?: number | null;
  updatedAt?: string | null;
}

export interface ServiceCatalogCategoryDTO {
  id: number;
  name: string;
  displayOrder?: number | null;
  active?: boolean | null;
}

export interface ServiceCatalogItemDTO {
  id: number;
  categoryId?: number | null;
  categoryName?: string | null;
  name: string;
  description?: string | null;
  basePrice?: number | null;
  active?: boolean | null;
  defaultDurationMinutes?: number | null;
  inspectionItems?: string[] | null;
}

export interface ServiceCatalogCategoryCreateDTO {
  name: string;
  displayOrder?: number | null;
  active?: boolean | null;
}

export interface ServiceCatalogItemCreateDTO {
  categoryId?: number | null;
  name: string;
  description?: string | null;
  basePrice: number;
  active?: boolean | null;
  defaultDurationMinutes?: number | null;
  inspectionItems?: string[] | null;
}

export interface ServiceCatalogItemUpdateDTO extends ServiceCatalogItemCreateDTO {}

export interface OrderListItemViewModel {
  id: number;
  customerId: number;
  vehicleId: number;
  employeeId?: number | null;
  problem: string;
  crmStatus: OrderCrmStatus;
  legacyStatus?: LegacyOrderStatus | null;
  statusLabel: string;
  statusGroupLabel?: string | null;
  plannedVisitAt?: string | null;
  finalAmount?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequestedPartViewModel {
  id: number;
  articleNumber: string;
  brand?: string | null;
  name: string;
  quantity: number;
  status: RequestedPartStatus;
  statusLabel: string;
  purchasePrice?: number | null;
  salePrice?: number | null;
  selectedSupplier?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
}

export interface TimelineEntryViewModel {
  id: number;
  eventType: string;
  title: string;
  description?: string | null;
  detailsJson?: string | null;
  actorDisplayName?: string | null;
  createdAt: string;
}

export interface ApprovalRequestViewModel {
  id: number;
  status: ApprovalRequestStatus;
  statusLabel: string;
  title?: string | null;
  description?: string | null;
  laborAmount?: string | null;
  partsAmount?: string | null;
  totalAmount?: string | null;
  requestedByDisplayName?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  decidedAt?: string | null;
}

export interface LoyaltySettingsViewModel {
  enabled: boolean;
  visible: boolean;
  spendEnabled: boolean;
  earnEnabled: boolean;
  statusLabel: string;
}

export type ApprovalScenario = 'LABOR' | 'PART' | 'LABOR_AND_PART';

export interface MechanicWorkDraftViewModel {
  serviceCatalogItemId?: number | null;
  approvalScenario: ApprovalScenario;
  title: string;
  description?: string | null;
  laborAmount?: string | null;
  partsAmount?: string | null;
  requestedPartArticleNumber?: string | null;
  requestedPartBrand?: string | null;
  requestedPartName?: string | null;
  requestedPartQuantity?: string | null;
  requiresOwnerApproval: boolean;
}

export interface ManagerPricingDraftViewModel {
  approvalRequestId?: number | null;
  laborAmount?: string | null;
  partsAmount?: string | null;
  discountAmount?: string | null;
  finalAmount?: string | null;
  comment?: string | null;
}

export interface OrderDetailViewModel {
  order: Order;
  crmStatus: OrderCrmStatus;
  legacyStatus?: LegacyOrderStatus | null;
  customer?: Customer | null;
  vehicle?: Vehicle | null;
  serviceLines: OrderServiceLineDTO[];
  requestedParts: RequestedPartViewModel[];
  approvals: ApprovalRequestViewModel[];
  timeline: TimelineEntryViewModel[];
  loyaltySettings?: LoyaltySettingsViewModel | null;
}

export interface OrderPartItem {
  id: number;
  orderId: number;
  partId: number;
  articleNumber?: string | null;
  brand?: string | null;
  name?: string | null;
  quantity: number;
  unitPrice?: string | null;
  lineTotal?: string | null;
}

export interface Part {
  id: number;
  brand?: string | null;
  name: string;
  articleNumber: string;
  cost: number;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExternalPartItem {
  source?: string | null;
  umapiArticleId?: number | null;
  articleNumber?: string | null;
  brandId?: number | null;
  brand?: string | null;
  name?: string | null;
  shortDescription?: string | null;
  status?: string | null;
  mediaFile?: string | null;
}

export interface UnifiedPartSearchItem {
  sourceType: 'LOCAL' | 'EXTERNAL' | string;
  articleNumber?: string | null;
  brand?: string | null;
  name?: string | null;
  localPart?: Part | null;
  externalPart?: ExternalPartItem | null;
  matchedLocalPart?: Part | null;
  exactLocalMatch?: boolean;
  availableLocally?: boolean;
}

export interface UnifiedPartSearchResponse {
  articleNumber: string;
  brand?: string | null;
  externalCached?: boolean;
  externalFallback?: boolean;
  items: UnifiedPartSearchItem[];
}

export interface VehicleScopedMatchedProductGroup {
  productGroupId: number;
  name: string;
  normalizedName?: string | null;
  score?: number | null;
}

export interface VehicleScopedPartSearchItem {
  productGroupId?: number | null;
  productGroupName?: string | null;
  umapiArticleId?: number | null;
  articleNumber: string;
  brand?: string | null;
  name: string;
  shortDescription?: string | null;
  source?: string | null;
  mediaFile?: string | null;
  supplierQuoteSearchUrl?: string | null;
  matchedLocalPart?: Part | null;
  exactLocalMatch?: boolean;
  availableLocally?: boolean;
  canAddAsLocal?: boolean;
  canAddAsRequested?: boolean;
}

export interface VehicleScopedPartSearchResponse {
  orderId: number;
  vehicleId?: number | null;
  vehicleBrand?: string | null;
  vehicleModel?: string | null;
  modificationId?: number | null;
  modificationName?: string | null;
  query: string;
  catalogLinked: boolean;
  productGroupsCached?: boolean;
  productGroupsFallback?: boolean;
  articlesCached?: boolean;
  articlesFallback?: boolean;
  matchedProductGroups: VehicleScopedMatchedProductGroup[];
  items: VehicleScopedPartSearchItem[];
}

export type RequestedPartStatus = 'OUT_OF_STOCK' | 'ORDERED_IN_TRANSIT' | 'IN_STOCK_RESERVED' | string;

export interface OrderRequestedPart {
  id: number;
  orderId: number;
  articleNumber: string;
  brand?: string | null;
  name: string;
  umapiArticleId?: number | null;
  matchedLocalPartId?: number | null;
  requestedQuantity: number;
  status: RequestedPartStatus;
  selectedSupplier?: string | null;
  selectedQuoteSignature?: string | null;
  purchasePrice?: number | null;
  salePrice?: number | null;
  currency?: string | null;
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  quoteFetchedAt?: string | null;
  orderedAt?: string | null;
  receivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderRequestedPartQuote {
  provider: string;
  sourceCode?: string | null;
  requestedCode?: string | null;
  articleNumber: string;
  brand?: string | null;
  name?: string | null;
  description?: string | null;
  cross?: boolean;
  purchasePrice: number;
  currency?: string | null;
  quantityRaw?: string | null;
  availableQuantityParsed?: number | null;
  minOrderQuantity?: number | null;
  deliveryDaysMin?: number | null;
  deliveryDaysMax?: number | null;
  supplyProbabilityPercent?: number | null;
  recommendedSalePrice?: number | null;
  marginAmount?: number | null;
  fetchedAt?: string | null;
  expiresAt?: string | null;
  positionSignature?: string | null;
}

export interface OrderRequestedPartQuotesResponse {
  query: string;
  provider?: string | null;
  cached?: boolean;
  fallback?: boolean;
  cachedAt?: string | null;
  cacheExpiresAt?: string | null;
  quotes: OrderRequestedPartQuote[];
}

export type OrderPartsOverviewItemType = 'LOCAL' | 'REQUESTED' | string;

export interface OrderPartsOverviewItem {
  itemType: OrderPartsOverviewItemType;
  id: number;
  orderId: number;
  localPartId?: number | null;
  articleNumber: string;
  brand?: string | null;
  name: string;
  quantity: number;
  requestedStatus?: RequestedPartStatus | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  availableLocally: boolean;
}

export interface OrderPartsOverviewResponse {
  orderId: number;
  items: OrderPartsOverviewItem[];
}

export interface LoyaltyAccount {
  id: number;
  customerId: number;
  pointsBalance: number;
  totalPointsEarned: number;
  totalPointsSpent: number;
  currentTierId?: number | null;
  currentTierName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  id: string;
  category: string;
  ownerType: string;
  ownerId: string;
  uploadedBy?: string | null;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  checksumSha256?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface OwnerFilesResponse {
  items: FileItem[];
  page: number;
  size: number;
  totalElements: number;
}

export interface StaffUserCreatePayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface StaffUserResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  createdAt?: string;
}

export interface EmployeeDirectoryItem {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  function: Role | string;
  createdAt?: string | null;
}


export interface EmployeeAvailabilityConflictDTO {
  orderId: number;
  plannedVisitAt: string;
  slotMinutes: number;
  status: string;
}

export interface EmployeeAvailabilitySearchItem extends EmployeeDirectoryItem {
  available: boolean;
  conflictingOrdersCount: number;
  availabilityReason: string;
  nextConflict?: EmployeeAvailabilityConflictDTO | null;
}

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}
