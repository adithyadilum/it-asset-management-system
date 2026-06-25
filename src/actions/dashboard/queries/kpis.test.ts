import { describe, it, expect } from 'vitest';
import { calculateFleetHealthScore } from './kpis';

describe('calculateFleetHealthScore', () => {
  it('should return 100 when there are no active assets and no software seats (empty state)', () => {
    const score = calculateFleetHealthScore({
      totalActiveAssets: 0,
      assignedCountHealth: 0,
      overdueCountHealth: 0,
      highRepairCount: 0,
      warrantyCovered: 0,
      totalSWSeats: 0,
      allocatedSWSeats: 0,
    });
    expect(score).toBe(100);
  });

  it('should calculate score correctly when only assets exist but no software seats', () => {
    // 10 assets, 5 assigned (utilization = 50%), 0 overdue, 0 high repair, 0 warranty.
    // Software is not applicable.
    // Sum of applicable weights: utilization (0.3) + overdue (0.2) + repairs (0.2) + warranty (0.15) = 0.85.
    // Weighted values: (0.5 * 0.3) + (1.0 * 0.2) + (1.0 * 0.2) + (0.0 * 0.15) = 0.15 + 0.2 + 0.2 = 0.55.
    // Expected score: Math.round((0.55 / 0.85) * 100) = 65.
    const score = calculateFleetHealthScore({
      totalActiveAssets: 10,
      assignedCountHealth: 5,
      overdueCountHealth: 0,
      highRepairCount: 0,
      warrantyCovered: 0,
      totalSWSeats: 0,
      allocatedSWSeats: 0,
    });
    expect(score).toBe(65);
  });

  it('should calculate score correctly when only software seats exist but no assets', () => {
    // 0 assets. Software is applicable: 100 total seats, 60 allocated (softwareRate = 60%).
    // Sum of applicable weights: software (0.15) = 0.15.
    // Weighted values: (0.6 * 0.15) = 0.09.
    // Expected score: Math.round((0.09 / 0.15) * 100) = 60.
    const score = calculateFleetHealthScore({
      totalActiveAssets: 0,
      assignedCountHealth: 0,
      overdueCountHealth: 0,
      highRepairCount: 0,
      warrantyCovered: 0,
      totalSWSeats: 100,
      allocatedSWSeats: 60,
    });
    expect(score).toBe(60);
  });

  it('should calculate score correctly when both assets and software seats exist', () => {
    // 10 assets, 8 assigned (utilization = 80%), 2 overdue (overdueRate = 1 - 2/8 = 75%),
    // 1 high repair (repairRate = 1 - 1/10 = 90%), 4 warranty (warrantyCovered = 40%).
    // 100 software seats, 90 allocated (softwareRate = 90%).
    // Sum of weights: 0.3 + 0.2 + 0.2 + 0.15 + 0.15 = 1.0.
    // Weighted values:
    // - Utilization: 0.8 * 0.3 = 0.24
    // - Overdue: 0.75 * 0.2 = 0.15
    // - Repairs: 0.9 * 0.2 = 0.18
    // - Warranty: 0.4 * 0.15 = 0.06
    // - Software: 0.9 * 0.15 = 0.135
    // Total sum = 0.24 + 0.15 + 0.18 + 0.06 + 0.135 = 0.765.
    // Expected score: Math.round(0.765 * 100) = 77.
    const score = calculateFleetHealthScore({
      totalActiveAssets: 10,
      assignedCountHealth: 8,
      overdueCountHealth: 2,
      highRepairCount: 1,
      warrantyCovered: 4,
      totalSWSeats: 100,
      allocatedSWSeats: 90,
    });
    expect(score).toBe(77);
  });
});
