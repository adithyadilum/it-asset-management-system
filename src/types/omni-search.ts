export interface OmniSearchAssetResult {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  category: string;
  /**
   * Shown on the result row. A brand search returns rows whose visible text
   * would otherwise contain none of what was typed, which reads as a bug.
   */
  brand: string;
  model: string;
}

export interface OmniSearchUserResult {
  id: string;
  name: string;
  email: string;
  department: string;
}

export interface OmniSearchReportResult {
  id: string;
  label: string;
  description: string;
  href: string;
}

export interface OmniSearchResponse {
  query: string;
  assets: OmniSearchAssetResult[];
  users: OmniSearchUserResult[];
  reports: OmniSearchReportResult[];
}
