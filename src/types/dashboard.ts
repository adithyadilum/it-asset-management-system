export interface OverdueReturnRow {
  assignmentId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  employeeName: string;
  employeeEmail: string;
  department: string | null;
  expectedReturnDate: string;
  daysOverdue: number;
}

export interface PendingDisposalRow {
  disposalId: number;
  assetId: string;
  assetTag: string;
  assetName: string;
  requestedBy: string;
  requestedByEmail: string;
  daysPending: number;
}

export interface DepreciationLedgerRow {
  id: string;
  assetId: string;
  category: string;
  purchaseDate: string | Date | null;
  originalPrice: number;
  currencyCode: string;
  expectedLifespan: string;
  currentBookValue: number;
}

export interface WriteOffLedgerRow {
  id: string;
  assetId: string;
  category: string;
  disposalDate: string | Date | null;
  originalPrice: number;
  currencyCode: string;
  bookValue: number;
  estimatedSalvageValue: number;
  actualSalvageValue: number;
}

export interface HighMaintenanceRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  currentStatus: string;
  repairCount: number;
  totalDowntimeDays: number;
}

export interface RecentActivity {
  id: number;
  text: string;
  actionType: string;
  performedBy: string;
  performedAt: string;
}

export interface TopHighValueAssetRow {
  assetId: string;
  assetTag: string;
  assetName: string;
  location: string;
  originalCost: number | null;
  currentBookValue: number | null;
  currencyCode?: string;
}

export interface SoftwareOptimizationRow {
  id: string;
  productName: string;
  totalSeats: number;
  assignedSeats: number;
  idleSeats: number;
  costPerSeat: number;
  monthlyLeak: number;
  currencyCode?: string;
}

export interface InventoryStatusItem {
  name: string;
  value: number;
  color: string;
}

export interface InventoryStatusResponse {
  inventoryData: InventoryStatusItem[];
  utilizationRate: number;
}

export interface DepartmentAllocationItem {
  name: string;
  value: number;
}

export interface AssetsByCategoryItem {
  categoryName: string;
  pillar: string;
  count: number;
}

export interface DashboardKpiMetrics {
  totalActiveAssets: number;
  totalActiveAssetsChange: number;
  totalAssetValue?: number;
  totalAssetValueTrend?: number;
  netBookValue?: number;
  fleetHealthScore: number;
  fleetHealthLabel: string;
  inactiveSoftwareSeats: number;
  inactiveSoftwareCostLeak?: number;
  warrantyExpiries30Days: number;
  cumulativeRepairSpend?: number;
  repairSpendTrend?: number;
  softwareRenewals30Days: number;
  impactedSoftwareEmployees: number;
}

export interface DashboardBatchData {
  kpiMetrics: DashboardKpiMetrics;
  inventoryStatus: InventoryStatusResponse;
  departmentAllocation: DepartmentAllocationItem[];
  overdueReturns: OverdueReturnRow[];
  pendingDisposals: PendingDisposalRow[];
  highMaintenanceAssets: HighMaintenanceRow[];
  recentActivities: RecentActivity[];
  topHighValueAssets: TopHighValueAssetRow[];
  depreciationLedger?: DepreciationLedgerRow[];
  writeOffsLedger?: WriteOffLedgerRow[];
  softwareOptimization?: SoftwareOptimizationRow[];
}
