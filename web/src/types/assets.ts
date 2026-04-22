// AssetType enum represents different types of assets in Epic 8.
export enum AssetType {
    IMAGE = 'image',
    VIDEO = 'video',
    DOCUMENT = 'document',
    AUDIO = 'audio',
    OTHER = 'other',
}

// Asset interface defines the structure of an asset object.
export interface Asset {
    id: string;
    type: AssetType;
    url: string;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

// Filters interface for searching and filtering assets.
export interface AssetFilters {
    type?: AssetType;
    searchTerm?: string;
    dateRange?: {
        startDate: string;
        endDate: string;
    };
}

// API response structure for fetching assets.
export interface FetchAssetsResponse {
    assets: Asset[];
    total: number;
    page: number;
    pageSize: number;
}

// Props for AssetList component.
export interface AssetListProps {
    assets: Asset[];
    filters: AssetFilters;
    onFilterChange: (filters: AssetFilters) => void;
    onAssetSelect: (asset: Asset) => void;
}

// Props for AssetItem component.
export interface AssetItemProps {
    asset: Asset;
    onSelect: (asset: Asset) => void;
}