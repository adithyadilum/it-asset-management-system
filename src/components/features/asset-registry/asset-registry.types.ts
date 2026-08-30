import type { RegistryFilterField } from './registry-config';

export type AssetRegistryCategory = {
  id: number;
  name: string;
  prefix: string;
  pillar: string;
};

export type AssetRegistryRow = {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  status: string;
  condition: string | null;
  categoryId: number;
  category: string;
  pillar: string;
  model: string;
  locationId: number | null;
  location: string | null;
  assignedTo: string | null;
  /** State of the open assignment, when there is one. */
  assignmentState?: string | null;
  instanceAttributes: Record<string, unknown> | null;
  updatedAt: Date | string;
  // SAM fields
  totalSeats?: number | null;
  availableSeats?: number | null;
  expiryDate?: string | null;
  licenseType?: string | null;
};

export type AssetRegistryResult = {
  data: AssetRegistryRow[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

export type AppliedFilter = {
  field: RegistryFilterField;
  operator: 'is' | 'is not';
  value: string;
};

export type CategoryOption = {
  id?: number;
  name: string;
  isAll?: boolean;
};
