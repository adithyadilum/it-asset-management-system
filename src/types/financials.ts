// web/src/types/financials.ts

export interface DepreciationLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  purchaseDate: string | null; // YYYY-MM-DD
  originalPrice: number;
  currencyCode: string; // Source currency of the purchase
  expectedLifespan: string;
  currentBookValue: number;
}

export interface TCOLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  purchaseDate: string | null; // YYYY-MM-DD
  originalPrice: number;
  currencyCode: string; // Source currency of the purchase
  totalRepairCosts: number;
  totalTCO: number;
}

export interface WriteOffsLedgerRecord {
  id: string;
  assetId: string; // Maps to assetTag
  category: string;
  disposalDate: Date | null;
  originalPrice: number;
  currencyCode: string; // Source currency of the purchase
  bookValue: number;
  estimatedSalvageValue: number;
  actualSalvageValue: number;
}
