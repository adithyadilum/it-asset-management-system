import { useMemo } from 'react';
import type {
  AssetRegistryRow,
  AppliedFilter,
  CategoryOption,
} from './asset-registry.types';

function normalizeCategoryLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/s$/, '');
}

export function useAssetFiltering(
  rows: AssetRegistryRow[],
  appliedFilters: AppliedFilter[],
  selectedCategoryOption: CategoryOption
): AssetRegistryRow[] {
  return useMemo(() => {
    const statusFilter = appliedFilters.find(
      (filter) => filter.field === 'Status'
    );
    const conditionFilter = appliedFilters.find(
      (filter) => filter.field === 'Condition'
    );
    const locationFilter = appliedFilters.find(
      (filter) => filter.field === 'Location'
    );
    const modelFilter = appliedFilters.find(
      (filter) => filter.field === 'Model'
    );
    const assignedToFilter = appliedFilters.find(
      (filter) => filter.field === 'Assigned To'
    );
    const pillarFilter = appliedFilters.find(
      (filter) => filter.field === 'Pillar'
    );
    const categoryFilter = appliedFilters.find(
      (filter) => filter.field === 'Category'
    );

    const backendStatusFilter =
      statusFilter?.operator === 'is' ? statusFilter.value : undefined;
    const shouldHideDisposedByDefault = backendStatusFilter !== 'Disposed';

    let nextRows = rows;

    // DEFAULT hide from registry
    if (shouldHideDisposedByDefault) {
      nextRows = nextRows.filter((row) => row.status !== 'Disposed');
    }

    if (!selectedCategoryOption.isAll && !selectedCategoryOption.id) {
      const selectedCategoryToken = normalizeCategoryLabel(
        selectedCategoryOption.name
      );

      nextRows = nextRows.filter((row) => {
        const rowCategoryToken = normalizeCategoryLabel(row.category);
        return rowCategoryToken === selectedCategoryToken;
      });
    }

    if (statusFilter?.operator === 'is not') {
      nextRows = nextRows.filter((row) => row.status !== statusFilter.value);
    }

    if (conditionFilter) {
      nextRows = nextRows.filter((row) => {
        const condition = row.condition ?? '-';
        return conditionFilter.operator === 'is not'
          ? condition !== conditionFilter.value
          : condition === conditionFilter.value;
      });
    }

    if (locationFilter) {
      nextRows = nextRows.filter((row) => {
        const location = row.location ?? '-';
        return locationFilter.operator === 'is not'
          ? location !== locationFilter.value
          : location === locationFilter.value;
      });
    }

    if (modelFilter) {
      nextRows = nextRows.filter((row) => {
        return modelFilter.operator === 'is not'
          ? row.model !== modelFilter.value
          : row.model === modelFilter.value;
      });
    }

    if (assignedToFilter) {
      nextRows = nextRows.filter((row) => {
        const assignedTo = row.assignedTo ?? '-';
        return assignedToFilter.operator === 'is not'
          ? assignedTo !== assignedToFilter.value
          : assignedTo === assignedToFilter.value;
      });
    }

    if (pillarFilter) {
      nextRows = nextRows.filter((row) => {
        return pillarFilter.operator === 'is not'
          ? row.pillar !== pillarFilter.value
          : row.pillar === pillarFilter.value;
      });
    }

    if (categoryFilter) {
      nextRows = nextRows.filter((row) => {
        return categoryFilter.operator === 'is not'
          ? row.category !== categoryFilter.value
          : row.category === categoryFilter.value;
      });
    }

    return nextRows;
  }, [rows, appliedFilters, selectedCategoryOption]);
}
