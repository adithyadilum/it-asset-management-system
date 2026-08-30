import { describe, expect, it } from 'vitest';

import {
  areValuesEqual,
  buildEventDetailsSentence,
  describeAuditAction,
  describeAuditEvent,
  describeEntityType,
  formatAuditValue,
} from './audit-events';

describe('describeAuditAction', () => {
  it('uses a written past-tense phrase, not suffix guessing', () => {
    // The previous implementation appended "ed" based on the last letter, so
    // these are the cases it got wrong.
    expect(describeAuditAction('ASSIGN')).toBe('assigned');
    expect(describeAuditAction('ACCESS_DENIED')).toBe('was denied access to');
    expect(describeAuditAction('STATUS_CHANGE')).toBe('changed the status of');
    expect(describeAuditAction('IMPORT')).toBe('imported');
  });

  it('covers the action strings written outside the union', () => {
    expect(describeAuditAction('ASSET_DISPOSED')).toBe('disposed of');
    expect(describeAuditAction('DISPOSAL_REJECTED')).toBe(
      'rejected the disposal of'
    );
    expect(describeAuditAction('BULK_TRANSFER')).toBe('bulk-transferred');
  });

  it('degrades readably for an unknown action', () => {
    expect(describeAuditAction('SOME_NEW_THING')).toBe('some new thing');
  });
});

describe('describeEntityType', () => {
  it('maps stored type names to nouns people use', () => {
    expect(describeEntityType('asset_assignment')).toBe('assignment');
    expect(describeEntityType('MaintenanceTicket')).toBe('maintenance ticket');
    expect(describeEntityType('Asset')).toBe('asset');
  });

  it('splits an unmapped camelCase type', () => {
    expect(describeEntityType('SoftwareLicense')).toBe('software license');
  });
});

describe('describeAuditEvent', () => {
  it('names the actor, the action and the thing', () => {
    expect(
      describeAuditEvent({
        actionType: 'ASSIGN',
        entityType: 'Asset',
        entityLabel: 'AST-1023',
        actorName: 'Priya',
      })
    ).toBe('Priya assigned asset AST-1023');
  });

  it('omits the entity for actions that are about the actor', () => {
    // "Priya signed in session" is the failure mode being prevented here.
    expect(
      describeAuditEvent({
        actionType: 'LOGIN',
        entityType: 'sessions',
        actorName: 'Priya',
      })
    ).toBe('Priya signed in');
  });

  it('falls back to System for an unattributed row', () => {
    expect(
      describeAuditEvent({ actionType: 'IMPORT', entityType: 'Asset' })
    ).toBe('System imported asset');
  });

  it('drops a missing label rather than printing undefined', () => {
    expect(
      describeAuditEvent({
        actionType: 'UPDATE',
        entityType: 'Category',
        entityLabel: null,
        actorName: 'Sam',
      })
    ).toBe('Sam updated category');
  });
});

describe('formatAuditValue', () => {
  it('renders assignment state through its display label', () => {
    expect(formatAuditValue('state', 'pending approval')).toBe(
      'Pending assignment'
    );
  });

  it('formats money-ish fields as currency', () => {
    expect(formatAuditValue('totalCost', 1234)).toContain('1,234');
  });

  it('handles empty, boolean, array and object values', () => {
    expect(formatAuditValue('name', null)).toBe('-');
    expect(formatAuditValue('name', '')).toBe('-');
    expect(formatAuditValue('isActive', true)).toBe('Yes');
    expect(formatAuditValue('tags', ['a', 'b'])).toBe('a, b');
    expect(formatAuditValue('meta', { a: 1 })).toBe('{"a":1}');
  });
});

describe('areValuesEqual', () => {
  it('ignores key order', () => {
    // JSON.stringify comparison reported these as different, producing a
    // phantom "Changed" row on every save.
    expect(areValuesEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it('compares arrays element-wise', () => {
    expect(areValuesEqual([1, 2], [1, 2])).toBe(true);
    expect(areValuesEqual([1, 2], [2, 1])).toBe(false);
  });

  it('detects a real difference', () => {
    expect(areValuesEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('buildEventDetailsSentence', () => {
  it('describes sign-in and sign-out without a diff', () => {
    expect(buildEventDetailsSentence('LOGIN', 'sessions', null, null)).toBe(
      'User signed in'
    );
    expect(buildEventDetailsSentence('LOGOUT', 'sessions', null, null)).toBe(
      'User signed out'
    );
  });

  it('reports the role on a denied access row', () => {
    expect(
      buildEventDetailsSentence('ACCESS_DENIED', 'URL', null, {
        role: 'Employee',
      })
    ).toBe('Access denied for role [Employee]');
  });

  it('names the first changed field', () => {
    expect(
      buildEventDetailsSentence(
        'UPDATE',
        'Asset',
        { status: 'Available' },
        { status: 'Assigned' }
      )
    ).toBe('Changed Status from [Available] → [Assigned]');
  });

  it('labels an assignment state change in user-facing wording', () => {
    expect(
      buildEventDetailsSentence(
        'ASSIGN',
        'asset_assignment',
        { state: 'pending approval' },
        { state: 'assigned' }
      )
    ).toBe('Changed State from [Pending assignment] → [Assigned]');
  });

  it('describes a create with no diff payload', () => {
    expect(buildEventDetailsSentence('CREATE', 'Asset', null, null)).toBe(
      'Created asset'
    );
  });
});
