export type Role = 'ADMIN' | 'MANAGER' | 'MECHANIC' | 'RECEPTIONIST' | 'CLIENT' | string;

export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | string;

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

export interface Order {
  id: number;
  customerId: number;
  vehicleId: number;
  employeeId?: number | null;
  problem: string;
  status: OrderStatus;
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

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}
