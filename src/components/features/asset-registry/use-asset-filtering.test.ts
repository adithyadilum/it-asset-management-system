import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAssetFiltering } from './use-asset-filtering';
import type { AssetRegistryRow } from './asset-registry.types';

const mockRows: AssetRegistryRow[] = [
  {
    id: '1',
    assetTag: 'TAG-1',
    name: 'Laptop A',
    serialNumber: 'SN-1',
    status: 'Available',
    condition: 'Good',
    categoryId: 1,
    category: 'Laptops',
    pillar: 'Hardware',
    model: 'Model X',
    locationId: 10,
    location: 'Office A',
    assignedTo: null,
    instanceAttributes: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    assetTag: 'TAG-2',
    name: 'Chair B',
    serialNumber: 'SN-2',
    status: 'Assigned',
    condition: 'Fair',
    categoryId: 2,
    category: 'Chairs',
    pillar: 'Furniture',
    model: 'Model Y',
    locationId: 11,
    location: 'Office B',
    assignedTo: 'John Doe',
    instanceAttributes: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    assetTag: 'TAG-3',
    name: 'Software C',
    serialNumber: 'SN-3',
    status: 'Disposed',
    condition: null,
    categoryId: 3,
    category: 'OS',
    pillar: 'Software',
    model: 'Model Z',
    locationId: null,
    location: null,
    assignedTo: null,
    instanceAttributes: null,
    updatedAt: new Date().toISOString(),
  },
];

describe('useAssetFiltering', () => {
  it('hides disposed assets by default', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(mockRows, [], { name: 'All', isAll: true })
    );
    expect(result.current.length).toBe(2);
    expect(result.current.find((r) => r.id === '3')).toBeUndefined();
  });

  it('includes disposed assets if backend status filter is set to Disposed', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Status', operator: 'is', value: 'Disposed' }],
        { name: 'All', isAll: true }
      )
    );
    // When backend status filter is "Disposed", shouldHideDisposedByDefault is false.
    // However, the check "statusFilter.operator === 'is not'" handles the exclusion.
    // Since there's no "is not" filter, it will return the matching ones (including status === Disposed).
    expect(result.current.length).toBe(3);
  });

  it('filters by category options name when not isAll and no category id is set', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(mockRows, [], { name: 'Chairs' })
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('2');
  });

  it('filters by status with operator is not', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Status', operator: 'is not', value: 'Available' }],
        { name: 'All', isAll: true }
      )
    );
    // Disposed is hidden by default. Remaining should not be "Available", which leaves John Doe's chair.
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('2');
  });

  it('filters by condition (is and is not)', () => {
    // Condition is 'Good'
    const { result: isResult } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Condition', operator: 'is', value: 'Good' }],
        { name: 'All', isAll: true }
      )
    );
    expect(isResult.current.length).toBe(1);
    expect(isResult.current[0].id).toBe('1');

    // Condition is not 'Good'
    const { result: isNotResult } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Condition', operator: 'is not', value: 'Good' }],
        { name: 'All', isAll: true }
      )
    );
    expect(isNotResult.current.length).toBe(1);
    expect(isNotResult.current[0].id).toBe('2');
  });

  it('filters by location', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Location', operator: 'is', value: 'Office B' }],
        { name: 'All', isAll: true }
      )
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('2');
  });

  it('filters by model', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Model', operator: 'is', value: 'Model X' }],
        { name: 'All', isAll: true }
      )
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('1');
  });

  it('filters by assignedTo', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Assigned To', operator: 'is', value: 'John Doe' }],
        { name: 'All', isAll: true }
      )
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('2');
  });

  it('filters by pillar', () => {
    const { result } = renderHook(() =>
      useAssetFiltering(
        mockRows,
        [{ field: 'Pillar', operator: 'is', value: 'Hardware' }],
        { name: 'All', isAll: true }
      )
    );
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('1');
  });
});
