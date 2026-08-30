import { describe, expect, it } from 'vitest';

import { assignmentStateEnum } from '@/db/schema';

import {
  ASSIGNMENT_STATE_FILTER_OPTIONS,
  ASSIGNMENT_STATE_LABELS,
  formatAssignmentState,
} from './labels';

describe('assignment state labels', () => {
  it('covers every value in the database enum', () => {
    // A state added to the schema without a label here would otherwise reach
    // the UI as the raw enum string, which is the bug this map exists to fix.
    expect(Object.keys(ASSIGNMENT_STATE_LABELS).sort()).toEqual(
      [...assignmentStateEnum.enumValues].sort()
    );
  });

  it('renames the misleading pending state', () => {
    expect(formatAssignmentState('pending approval')).toBe(
      'Pending assignment'
    );
  });

  it('never leaks a raw underscore or lowercase enum value', () => {
    for (const label of Object.values(ASSIGNMENT_STATE_LABELS)) {
      expect(label).not.toMatch(/_/);
      expect(label[0]).toBe(label[0].toUpperCase());
    }
  });

  it('falls back to the raw value for an unknown state', () => {
    expect(formatAssignmentState('something-new')).toBe('something-new');
  });

  it('exposes filter options keyed by the stored value', () => {
    // The value must stay the enum, or report filtering silently returns
    // nothing: the query compares against the column.
    const pending = ASSIGNMENT_STATE_FILTER_OPTIONS.find(
      (option) => option.value === 'pending approval'
    );

    expect(pending).toEqual({
      value: 'pending approval',
      label: 'Pending assignment',
    });
    expect(ASSIGNMENT_STATE_FILTER_OPTIONS).toHaveLength(
      assignmentStateEnum.enumValues.length
    );
  });
});
