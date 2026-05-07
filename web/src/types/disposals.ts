// types/disposals.ts

export type DisposalReviewDetails = {
  disposalId: number;
  assetId: string;
  assetTag: string;
  serialNumber: string | null;
  assetName: string | null;
  category: string;
  brand: string;
  requestedBy: string;
  requestedAt: string; // ISO
  reason: string;
  justification: string | null;
  dateCreated: string | null;
  purchaseDate: string | null; // ISO date string if present
  originalCost: number | null;
  currentBookValue?: number | null;
  warrantyStatus: 'Valid' | 'Expired' | 'Unknown';
};

// Form state interface mimicking the master data pattern
export type DisposalFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};