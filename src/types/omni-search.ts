export interface OmniSearchAssetResult {
  id: string;
  assetTag: string;
  name: string | null;
  serialNumber: string | null;
  category: string;
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
