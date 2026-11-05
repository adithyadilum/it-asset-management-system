export type CostComponent =
  'directDepreciation' | 'sharedDepreciation' | 'software' | 'repairs';
export interface CostPerson {
  id: string;
  name: string;
  email: string;
  department: string | null;
}
export interface CostAsset {
  id: string;
  tag: string;
  name: string | null;
  category: string;
  pillar: string;
  purchaseDate: string | null;
  cost: string | null;
  currency: string | null;
  exchangeRate: string | null;
  residual: string | null;
  purchaseResidual?: string | null;
  lifeMonths: number | null;
  disposedAt: string | null;
  purchaseCount: number;
  licenseId?: string | null;
  licenseType?: string | null;
  totalSeats?: number | null;
  licenseExpiry?: string | null;
}
export interface CostInterval {
  from: string;
  to: string | null;
}
export interface CostAssignment extends CostInterval {
  id: number;
  assetId: string;
  userId: string | null;
  acceptedAt: string | null;
  acceptanceStatus: string | null;
}
export interface CostGroup {
  id: number;
  name: string;
  departmentId: number | null;
  locationId: number | null;
  coverageFrom: string;
}
export interface CostMembership extends CostInterval {
  id: number;
  groupId: number;
  userId: string;
  reason: string;
}
export interface CostPolicy extends CostInterval {
  id: number;
  assetId: string;
  groupId: number;
  shared: boolean;
}
export interface CostTerm extends CostInterval {
  id: number;
  licenseId: string;
  assetId: string;
  amount: string | null;
  currency: string;
  exchangeRate: string | null;
  seats: number;
  allocationLifeMonths: number | null;
}
export interface CostSoftwareAllocation extends CostInterval {
  id: number;
  licenseId: string;
  userId: string;
  expiresAt: string | null;
}
export interface CostRepair {
  id: number;
  assetId: string;
  amount: string | null;
  currency: string;
  exchangeRate: string | null;
  completedAt: string | null;
}
export interface PerHeadDataset {
  people: CostPerson[];
  assets: CostAsset[];
  assignments: CostAssignment[];
  groups: CostGroup[];
  memberships: CostMembership[];
  policies: CostPolicy[];
  terms: CostTerm[];
  softwareAllocations: CostSoftwareAllocation[];
  repairs: CostRepair[];
}
export interface PersonCostDetail {
  assetId: string;
  assetTag: string;
  component: CostComponent;
  amount: number;
  groupId: number | null;
  source: string;
  month: string;
}
export interface PersonAssetValue {
  assetId: string;
  assetTag: string;
  kind: 'Direct' | 'Shared' | 'Software seat';
  acquisitionShare: number | null;
  bookShare: number | null;
  wholeAcquisitionValue: number | null;
  wholeBookValue: number | null;
}
export interface PersonCostRow extends CostPerson {
  eligibleInPeriod: boolean;
  directDepreciation: number;
  sharedDepreciation: number;
  software: number;
  repairs: number;
  totalCost: number;
  currentAcquisitionValue: number;
  currentBookValue: number;
  assetCount: number;
  softwareSeats: number;
  incomplete: boolean;
}
export interface CostException {
  source: string;
  assetId: string | null;
  message: string;
}
export interface PerHeadReport {
  people: PersonCostRow[];
  details: Record<string, PersonCostDetail[]>;
  currentAssets: Record<string, PersonAssetValue[]>;
  summary: {
    sourceCost: number;
    allocatedCost: number;
    overheadCost: number;
    unusedSoftwareCost: number;
    unallocatedCost: number;
    peopleCount: number;
    averageCost: number;
    currentAcquisitionValue: number;
    currentBookValue: number;
    incompleteRecords: number;
  };
  trend: {
    month: string;
    allocated: number;
    overhead: number;
    total: number;
  }[];
  exceptions: CostException[];
  metadata: {
    generatedAt: string;
    asOf: string;
    from: string;
    to: string;
    timezone: string;
    policyVersion: string;
    currency: string;
    coverageFrom: string | null;
    fxBasis: string;
  };
}
