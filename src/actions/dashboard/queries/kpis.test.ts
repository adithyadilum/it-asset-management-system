import { describe, expect, it } from 'vitest';
import { calculateFleetHealthScore, type FleetHealthInputs } from './kpis';
import {
  FLEET_HEALTH_WEIGHTS,
  TARGET_DEPLOYMENT_RATE,
} from '@/lib/constants/dashboard';

/** A fleet with nothing wrong with it, as a base to vary one thing at a time. */
const HEALTHY: FleetHealthInputs = {
  totalActiveAssets: 100,
  outOfActionCount: 0,
  deployableCount: 100,
  assignedCount: 85,
  openAssignmentCount: 85,
  overdueCount: 0,
  highRepairCount: 0,
  purchasedAssetCount: 100,
  supportCoveredCount: 100,
  totalSWSeats: 100,
  allocatedSWSeats: 100,
};

describe('calculateFleetHealthScore', () => {
  it('weights sum to one, so a perfect fleet scores exactly 100', () => {
    const total = Object.values(FLEET_HEALTH_WEIGHTS).reduce(
      (sum, w) => sum + w,
      0
    );
    expect(total).toBeCloseTo(1, 10);
    expect(calculateFleetHealthScore(HEALTHY)).toBe(100);
  });

  it('treats an empty fleet as a clean slate rather than a failure', () => {
    expect(
      calculateFleetHealthScore({
        totalActiveAssets: 0,
        outOfActionCount: 0,
        deployableCount: 0,
        assignedCount: 0,
        openAssignmentCount: 0,
        overdueCount: 0,
        highRepairCount: 0,
        purchasedAssetCount: 0,
        supportCoveredCount: 0,
        totalSWSeats: 0,
        allocatedSWSeats: 0,
      })
    ).toBe(100);
  });

  describe('deployment', () => {
    it('gives full marks at the target rate, so holding spares is not a defect', () => {
      // The point of the change: the old score divided assigned by every
      // active asset, so only a fleet with zero spare kit could score full
      // marks on utilisation.
      const atTarget = calculateFleetHealthScore({
        ...HEALTHY,
        assignedCount: Math.round(100 * TARGET_DEPLOYMENT_RATE),
        openAssignmentCount: Math.round(100 * TARGET_DEPLOYMENT_RATE),
      });
      expect(atTarget).toBe(100);
    });

    it('still gives full marks above the target', () => {
      expect(
        calculateFleetHealthScore({
          ...HEALTHY,
          assignedCount: 100,
          openAssignmentCount: 100,
        })
      ).toBe(100);
    });

    it('scores below the target proportionally', () => {
      // Half the target rate should surrender half the deployment weight.
      const half = calculateFleetHealthScore({
        ...HEALTHY,
        assignedCount: Math.round(100 * TARGET_DEPLOYMENT_RATE * 0.5),
        openAssignmentCount: 40,
      });
      expect(half).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.deployment * 0.5 * 100)
      );
    });

    it('does not count broken kit as capital you failed to deploy', () => {
      // 20 of 100 assets are unusable. Deployment is judged against the 80
      // that remain, so 68 assigned is the target rate and scores full marks;
      // the 20 are penalised once, by the condition component.
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        outOfActionCount: 20,
        deployableCount: 80,
        assignedCount: Math.round(80 * TARGET_DEPLOYMENT_RATE),
        openAssignmentCount: 68,
      });
      const conditionLoss = FLEET_HEALTH_WEIGHTS.condition * 0.2 * 100;
      expect(score).toBe(Math.round(100 - conditionLoss));
    });
  });

  describe('condition', () => {
    it('is the single largest lever, because unusable kit is the clearest defect', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        outOfActionCount: 100,
        deployableCount: 0, // everything is broken, nothing is deployable
      });
      // Condition contributes nothing and deployment drops out entirely, so
      // the remaining components renormalise over their own weight.
      const remaining = 1 - FLEET_HEALTH_WEIGHTS.deployment;
      const kept = remaining - FLEET_HEALTH_WEIGHTS.condition;
      expect(score).toBe(Math.round((kept / remaining) * 100));
    });

    it('was absent before: a fully broken but fully assigned fleet is not healthy', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        outOfActionCount: 30,
        deployableCount: 70,
        assignedCount: 70,
        openAssignmentCount: 70,
      });
      expect(score).toBeLessThan(100);
    });
  });

  describe('support cover', () => {
    it('counts an asset past its useful life as covered', () => {
      // Replacing it is already the plan, so having no warranty on it is not
      // an exposure. Under the old rule this was indistinguishable from a
      // brand-new asset with no cover.
      expect(
        calculateFleetHealthScore({ ...HEALTHY, supportCoveredCount: 100 })
      ).toBe(100);
    });

    it('penalises uncovered assets proportionally', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        supportCoveredCount: 50,
      });
      expect(score).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.support * 0.5 * 100)
      );
    });
  });

  describe('return discipline', () => {
    it('measures overdue against open assignments, not against a status count', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        openAssignmentCount: 50,
        overdueCount: 10,
      });
      expect(score).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.returns * 0.2 * 100)
      );
    });

    it('cannot go negative when every assignment is overdue', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        openAssignmentCount: 40,
        overdueCount: 40,
      });
      expect(score).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.returns * 100)
      );
    });

    it('clamps a numerator larger than its denominator instead of going below zero', () => {
      // Should be impossible now that both come from one query, but the score
      // must degrade gracefully rather than produce a negative component.
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        openAssignmentCount: 10,
        overdueCount: 40,
      });
      expect(score).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.returns * 100)
      );
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applicability', () => {
    it('drops software and renormalises when there are no licences', () => {
      // An organisation with no licences should not be marked down for the
      // seats it does not have.
      expect(
        calculateFleetHealthScore({
          ...HEALTHY,
          totalSWSeats: 0,
          allocatedSWSeats: 0,
        })
      ).toBe(100);
    });

    it('drops return discipline when nothing is on loan', () => {
      expect(
        calculateFleetHealthScore({
          ...HEALTHY,
          openAssignmentCount: 0,
          overdueCount: 0,
        })
      ).toBe(100);
    });

    it('scores unallocated licences against the licence weight only', () => {
      const score = calculateFleetHealthScore({
        ...HEALTHY,
        totalSWSeats: 100,
        allocatedSWSeats: 40,
      });
      expect(score).toBe(
        Math.round(100 - FLEET_HEALTH_WEIGHTS.licences * 0.6 * 100)
      );
    });
  });

  it('stays within 0 and 100 for a fleet where everything is wrong', () => {
    const score = calculateFleetHealthScore({
      totalActiveAssets: 100,
      outOfActionCount: 100,
      deployableCount: 100,
      assignedCount: 0,
      openAssignmentCount: 100,
      overdueCount: 100,
      highRepairCount: 100,
      purchasedAssetCount: 100,
      supportCoveredCount: 0,
      totalSWSeats: 100,
      allocatedSWSeats: 0,
    });
    expect(score).toBe(0);
  });
});
