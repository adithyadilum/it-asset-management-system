import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeAssetDetailDialog } from './employee-asset-detail-dialog';
import type { EmployeeAssignedAsset } from '@/actions/employee';

const equipment: EmployeeAssignedAsset = {
  assignmentId: 1,
  assetId: 'laptop',
  assetTag: 'LAP-001',
  serialNumber: 'ABC 123',
  modelName: 'Latitude 5440',
  brandName: 'Dell',
  categoryName: 'Laptop',
  status: 'Assigned',
  assignedDate: '2026-11-01T00:00:00+05:30',
  pillar: 'Hardware',
  assignmentState: 'pending approval',
  expectedReturnDate: null,
  isOverdue: false,
  imageUrl: null,
  assignedByName: null,
  condition: null,
  technicalDetails: {
    ram_gb: 0,
    touch_screen: false,
    ports: ['USB-C', 'HDMI'],
    cpu: { brand: 'Intel', model: 'i7' },
  },
};

describe('employee asset details', () => {
  it('hands pending assignments to the existing review flow without accepting them', async () => {
    const onOpenChange = vi.fn(),
      onRequestAccept = vi.fn(),
      onRequestReject = vi.fn();
    render(
      <EmployeeAssetDetailDialog
        target={{ kind: 'equipment', asset: equipment }}
        open
        onOpenChange={onOpenChange}
        onRequestAccept={onRequestAccept}
        onRequestReject={onRequestReject}
      />
    );
    expect(screen.getByText('Confirm your assignment')).toBeVisible();
    expect(screen.queryByText('Good')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Review & accept' })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onRequestAccept).toHaveBeenCalledWith(equipment);
    expect(onRequestReject).not.toHaveBeenCalled();
  });
  it('keeps zero, false, array and nested specifications readable', async () => {
    render(
      <EmployeeAssetDetailDialog
        target={{ kind: 'equipment', asset: equipment }}
        open
        onOpenChange={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Specifications' }));
    const panel = screen.getByRole('tabpanel');
    for (const text of ['0', 'No', 'USB-C, HDMI', 'Brand: Intel; Model: i7'])
      expect(within(panel).getByText(text)).toBeVisible();
  });
  it('omits sensitive fields and does not infer missing subscription expiry', () => {
    render(
      <EmployeeAssetDetailDialog
        target={{
          kind: 'software',
          asset: {
            allocationId: 1,
            assetId: 'license',
            assetTag: 'SW-001',
            modelName: 'Creative Cloud',
            brandName: 'Adobe',
            categoryName: 'Design',
            imageUrl: null,
            status: 'active',
            allocatedDate: '2026-11-01',
            licenseType: 'Subscription',
            pillar: 'Software',
            technicalDetails: {
              license_key: 'ABCD-EFGH-IJKL',
              admin_password: 'secret',
            },
            expiryDate: null,
          },
        }}
        open
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.queryByText('ABCD-EFGH-IJKL')).not.toBeInTheDocument();
    expect(screen.queryByText('Licence key')).not.toBeInTheDocument();
    expect(screen.queryByText('secret')).not.toBeInTheDocument();
    expect(screen.getByText('Not recorded')).toBeVisible();
    expect(screen.queryByText('No expiry')).not.toBeInTheDocument();
  });
});
