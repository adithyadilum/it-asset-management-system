export type MaintenanceTicketType = 'VENDOR' | 'INTERNAL';
export type MaintenanceTicketStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AssetStatus = 'Available' | 'Assigned' | 'In Repair' | 'Defective' | 'Lost' | 'Retired' | 'Disposed';
export type WarrantyStatus = 'Active' | 'Expired';

export interface MaintenanceTicket {
  id: number;
  assetId: string;
  ticketType: MaintenanceTicketType;
  vendorName: string | null;
  rmaNumber: string | null;
  reportedIssue: string;
  resolutionNotes: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  estimatedReturnDate: string | null;
  actualCompletionDate: string | null;
  status: MaintenanceTicketStatus;
  dispatchedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string | null;
  imageUrl?: string | null;
  status: AssetStatus;
  condition: string | null;
  modelId: number;
  locationId: number | null;
  serialNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: number;
  name: string;
  brandId: number;
  categoryId: number;
}

export interface Brand {
  id: number;
  name: string;
}

export interface Category {
  id: number;
  name: string;
  pillar: string;
}

export interface Purchase {
  id: number;
  assetId: string;
  purchaseDate: string | null;
  basePrice: string | null;
  totalCost: string | null;
  warrantyExpiry: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface PendingReviewTicket extends MaintenanceTicket {
  asset: Asset;
  model: Model;
  brand: Brand;
  category: Category;
  purchase: Purchase | null;
  reportedBy: User;
}

export interface IssueReviewPanelData {
  ticket: PendingReviewTicket;
  warrantyStatus: WarrantyStatus;
  bookValue: number;
  originalCost: number | string;
  totalTCO?: number;
}

export interface Vendor {
  id: number;
  companyName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  isActive?: boolean | null;
}

export interface InitiateRepairFormData {
  vendorId: string;
  rmaNumber: string;
  estimatedCost?: string;
  currencyCode?: string;
  expectedReturnDate?: string;
}

export interface ActiveRepairTicket {
  id: number;
  assetId: string;
  asset: Asset; // Kept from previous fix!
  ticketType: 'VENDOR' | 'INTERNAL';
  vendorName: string | null;
  rmaNumber: string | null;
  reportedIssue: string;
  estimatedCost: string | null;
  currencyCode: string | null;
  estimatedReturnDate: string | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface CompleteRepairFormData {
  actualCost: string;
  currencyCode?: string;
  resolutionNotes: string;
  updateStatusTo: 'Available' | 'Disposed';
}

export interface LogCompleteRepairData {
  ticketId: number;
  actualCost: string;
  currencyCode?: string;
  resolutionNotes: string;
  updateStatusTo: 'Available' | 'Disposed';
}

export interface RepairHistoryTicket {
  id: number;
  assetId: string;
  vendorName: string | null;
  actualCompletionDate: string | null;
  actualCost: string | null;
  currencyCode?: string | null;
  resolutionNotes: string | null;
  status: 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetMaintenanceRecord {
  id: number;
  assetId: string;
  ticketType: 'VENDOR' | 'INTERNAL';
  vendorName: string | null;
  reportedIssue: string;
  resolutionNotes: string | null;
  actualCost: string | null;
  actualCompletionDate: Date | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}