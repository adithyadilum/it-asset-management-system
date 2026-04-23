//web/src/types/maintenance.ts
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
  status: string;
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
}