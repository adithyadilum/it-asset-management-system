import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useAssetColumns } from './use-asset-columns';

describe('useAssetColumns', () => {
  it('returns unified columns when view is unified', () => {
    const { result } = renderHook(() => useAssetColumns('unified', []));
    const columns = result.current;

    expect(columns).toBeDefined();
    expect(columns.length).toBe(6);
    expect((columns[0] as any).accessorKey).toBe('assetTag');
    expect((columns[1] as any).accessorKey).toBe('name');
    expect((columns[2] as any).accessorKey).toBe('category');
    expect((columns[3] as any).accessorKey).toBe('pillar');
    expect((columns[4] as any).accessorKey).toBe('status');
    expect(columns[5].id).toBe('assignment');
  });

  it('returns furniture columns when view is furniture', () => {
    const { result } = renderHook(() => useAssetColumns('furniture', []));
    const columns = result.current;

    expect(columns).toBeDefined();
    expect(columns.length).toBe(4);
    expect((columns[0] as any).accessorKey).toBe('assetTag');
    expect((columns[1] as any).accessorKey).toBe('name');
    expect((columns[2] as any).accessorKey).toBe('location');
    expect((columns[3] as any).accessorKey).toBe('condition');
  });

  it('returns office-electronics columns when view is office-electronics', () => {
    const { result } = renderHook(() => useAssetColumns('office-electronics', []));
    const columns = result.current;

    expect(columns).toBeDefined();
    expect(columns.length).toBe(5);
    expect((columns[0] as any).accessorKey).toBe('assetTag');
    expect((columns[1] as any).accessorKey).toBe('name');
    expect((columns[2] as any).accessorKey).toBe('location');
    expect(columns[3].id).toBe('ipOrMacAddress');
    expect(columns[4].id).toBe('electronicsCondition');
  });

  it('returns software columns when view is software', () => {
    const { result } = renderHook(() => useAssetColumns('software', []));
    const columns = result.current;

    expect(columns).toBeDefined();
    expect(columns.length).toBe(6);
    expect((columns[0] as any).accessorKey).toBe('assetTag');
    expect((columns[1] as any).accessorKey).toBe('name');
    expect((columns[2] as any).accessorKey).toBe('serialNumber');
    expect(columns[3].id).toBe('licenseType');
    expect(columns[4].id).toBe('availability');
    expect(columns[5].id).toBe('expirationDate');
  });

  it('returns default columns when view is hardware (fallback)', () => {
    const { result } = renderHook(() => useAssetColumns('hardware', []));
    const columns = result.current;

    expect(columns).toBeDefined();
    expect(columns.length).toBe(5);
    expect((columns[0] as any).accessorKey).toBe('assetTag');
    expect((columns[1] as any).accessorKey).toBe('name');
    expect((columns[2] as any).accessorKey).toBe('serialNumber');
    expect((columns[3] as any).accessorKey).toBe('assignedTo');
    expect((columns[4] as any).accessorKey).toBe('status');
  });
});
