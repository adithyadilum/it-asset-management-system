'use client';

import { useState, useEffect } from 'react';
import type { MasterDataVendorRow } from '../master-data-management-client';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { ActiveStatusToggle } from '../active-status-toggle';
import {
  type BaseMasterDataFormProps,
  FormTextField,
  RecordIdPreview,
} from './shared';

interface VendorFormProps extends BaseMasterDataFormProps {
  initialData?: MasterDataVendorRow;
}

export function VendorForm({
  initialData,
  isDetailMode,
  fieldError,
  onDirtyStateChange,
}: VendorFormProps) {
  const isEdit = !!initialData;
  const [companyName, setCompanyName] = useState(
    initialData?.companyName || ''
  );
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [website, setWebsite] = useState(initialData?.website || '');
  const [isActive, setIsActive] = useState(
    initialData ? initialData.isActive : true
  );

  useEffect(() => {
    if (!initialData) return;
    const dirty =
      companyName !== initialData.companyName ||
      email !== (initialData.email || '') ||
      phone !== (initialData.phone || '') ||
      website !== (initialData.website || '') ||
      isActive !== initialData.isActive;
    onDirtyStateChange?.(dirty);
  }, [
    companyName,
    email,
    phone,
    website,
    isActive,
    initialData,
    onDirtyStateChange,
  ]);

  return (
    <>
      <input type="hidden" name="isActive" value={String(isActive)} />

      {isEdit && initialData && (
        <RecordIdPreview
          entity="vendors"
          record={initialData as unknown as Record<string, unknown>}
          numericRecordId={initialData.id}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormTextField
          fieldKey="companyName"
          label="Vendor Name"
          value={companyName}
          onChange={setCompanyName}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ required: true, placeholder: 'e.g., Softlogic' }}
        />
        <FormTextField
          fieldKey="email"
          label="Email"
          value={email}
          onChange={setEmail}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ type: 'email', placeholder: 'contact@vendor.com' }}
        />
        <FormTextField
          fieldKey="phone"
          label="Phone"
          value={phone}
          onChange={setPhone}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ placeholder: '+94 11 234 5678' }}
        />
        <FormTextField
          fieldKey="website"
          label="Website"
          value={website}
          onChange={setWebsite}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ type: 'url', placeholder: 'https://vendor.com' }}
        />
      </div>

      {!isDetailMode && (
        <ActiveStatusToggle isActive={isActive} onChange={setIsActive} />
      )}
      {isDetailMode && (
        <div className="flex items-center space-x-2 pt-4 border-t">
          <span
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
          >
            Status:
          </span>
          <span
            className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      )}
    </>
  );
}
