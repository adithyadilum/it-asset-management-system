// web/src/types/financials.ts

export interface DepreciationLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  purchaseDate: string | null; // YYYY-MM-DD
  originalPrice: number;
  expectedLifespan: string;
  currentBookValue: number;
}

export interface TCOLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  purchaseDate: string | null; // YYYY-MM-DD
  originalPrice: number;
  totalRepairCosts: number;
  totalTCO: number;
}

export interface WriteOffsLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  disposalDate: Date | null;
  originalPrice: number;
  bookValue: number;
  salvageValue: number;
}