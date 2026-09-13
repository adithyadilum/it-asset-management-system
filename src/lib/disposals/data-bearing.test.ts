import { describe, expect, it } from 'vitest';

import {
  batchRequiresDataWipeConfirmation,
  requiresDataWipeConfirmation,
} from '@/lib/disposals/data-bearing';

describe('requiresDataWipeConfirmation', () => {
  it.each([
    'Laptop',
    'MacBook Pro',
    'Mobile Phone',
    'Server',
    'Desktop Workstation',
    'Tablet',
  ])('requires confirmation for %s', (name) => {
    expect(requiresDataWipeConfirmation(name)).toBe(true);
  });

  it.each([
    'Office Chair',
    'Standing Desk',
    'Filing Cabinet',
    'Monitor',
    'HDMI Cable',
    'UPS',
    'Battery Backup',
    'Projector',
    'Keyboard',
    'Mouse',
  ])('waives confirmation for %s', (name) => {
    expect(requiresDataWipeConfirmation(name)).toBe(false);
  });

  it.each(['Laptops', 'Smartphone', 'Notebook', 'PC', 'iPhone', 'Chromebook'])(
    'fails closed on %s rather than guessing',
    (name) => {
      // The point of the inverted rule: names a keyword list would miss are
      // covered by default instead of being silently exempt.
      expect(requiresDataWipeConfirmation(name)).toBe(true);
    }
  );

  it.each([
    ['Printer', 'spools documents to internal storage'],
    ['Multifunction Scanner', 'same, and often keeps scan history'],
    ['Photocopier', 'same'],
  ])('requires confirmation for %s because it %s', (name) => {
    expect(requiresDataWipeConfirmation(name)).toBe(true);
  });

  it('requires confirmation when the category is unknown', () => {
    expect(requiresDataWipeConfirmation('')).toBe(true);
    expect(requiresDataWipeConfirmation('   ')).toBe(true);
    expect(requiresDataWipeConfirmation(null)).toBe(true);
    expect(requiresDataWipeConfirmation(undefined)).toBe(true);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(requiresDataWipeConfirmation('  OFFICE CHAIR  ')).toBe(false);
    expect(requiresDataWipeConfirmation('  laptop  ')).toBe(true);
  });

  it('matches on word boundaries, not substrings', () => {
    // 'Deskphone' is not a desk, and treating it as one would waive the
    // confirmation on a device that stores contacts and call history.
    expect(requiresDataWipeConfirmation('Deskphone')).toBe(true);
  });
});

describe('batchRequiresDataWipeConfirmation', () => {
  it('requires confirmation when any asset in the batch does', () => {
    expect(
      batchRequiresDataWipeConfirmation(['Office Chair', 'Desk', 'Laptop'])
    ).toBe(true);
  });

  it('requires confirmation for a homogeneous batch of data-bearing assets', () => {
    expect(
      batchRequiresDataWipeConfirmation(['Laptop', 'Laptop', 'Laptop'])
    ).toBe(true);
  });

  it('waives confirmation only when every asset is exempt', () => {
    expect(
      batchRequiresDataWipeConfirmation(['Office Chair', 'Desk', 'Monitor'])
    ).toBe(false);
  });

  it('requires confirmation for an empty batch', () => {
    // Nothing resolved means nothing verified.
    expect(batchRequiresDataWipeConfirmation([])).toBe(true);
  });

  it('requires confirmation when a category failed to resolve', () => {
    expect(batchRequiresDataWipeConfirmation(['Office Chair', null])).toBe(
      true
    );
  });
});
