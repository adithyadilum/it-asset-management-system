'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { Lock } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { SlidePanel } from '@/components/shared/slide-panel';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { tiqriToast } from '@/components/shared/sonner';
import { editAssetDetailsAction } from '@/actions/assets';
import { cn } from '@/lib/utils';

import type { AssetDetailsData } from '@/lib/data/asset-details-repo';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DropdownOption = { value: string; label: string };

export interface AssetEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  data: AssetDetailsData;
  /** Pre-fetched dropdown options for Location and Owner */
  locationOptions: DropdownOption[];
  ownerOptions: DropdownOption[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONDITION_OPTIONS = ['New', 'Excellent', 'Fair', 'Poor', 'Damaged'] as const;

function LockedField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-muted-foreground flex items-center gap-1.5')}>
        <Lock className="h-3 w-3 shrink-0" />
        {label}
      </Label>
      <div className="flex h-9 items-center rounded-md border border-border/50 bg-muted/40 px-3 text-sm text-muted-foreground">
        {value || '—'}
      </div>
    </div>
  );
}

function EditableField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={cn(TYPOGRAPHY_CLASSNAMES.textSmMedium, 'text-foreground')}>
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetEditForm({
  isOpen,
  onClose,
  onSaved,
  data,
  locationOptions,
  ownerOptions,
}: AssetEditFormProps) {
  const [isPending, startTransition] = useTransition();

  const pillar = data.model.category.pillar;
  const isSoftware = pillar === 'Software';
  const isFurniture = pillar === 'Office Furniture';
  const isElectronics = pillar === 'Office Electronics';
  const showLocation = isFurniture || isElectronics;
  const showCondition = !isSoftware;

  // ---- Form State ----
  const [name, setName] = useState(data.asset.name ?? '');
  const [condition, setCondition] = useState<string>(data.asset.condition ?? '');
  const [locationId, setLocationId] = useState<string>(
    data.location ? String(data.location.id) : ''
  );
  const [ownerId, setOwnerId] = useState<string>(
    data.owner ? String(data.owner.id) : ''
  );
  const [warrantyExpiry, setWarrantyExpiry] = useState<string>(
    data.purchase?.warrantyExpiry ?? ''
  );
  const [instanceAttributes, setInstanceAttributes] = useState<Record<string, string>>(() => {
    const attrs = {
      ...(data.model.technicalDetails as Record<string, string | number | undefined> | null),
      ...(data.asset.instanceAttributes as Record<string, string | number | undefined> | null),
    };
    const result: Record<string, string> = {};
    for (const [key, val] of Object.entries(attrs)) {
      if (val !== undefined && val !== null) {
        result[key] = String(val);
      }
    }
    return result;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compute which attributes come from instanceAttributes (editable)
  const editableAttrKeys = useMemo(() => {
    const instanceKeys = new Set(
      Object.keys(data.asset.instanceAttributes ?? {})
    );
    return instanceKeys;
  }, [data.asset.instanceAttributes]);

  // ---- Handlers ----

  function handleAttrChange(key: string, value: string) {
    setInstanceAttributes((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setErrors({});

    // Client-side validations
    const newErrors: Record<string, string> = {};
    if (name.trim().length === 0) {
      newErrors.name = 'Asset name is required.';
    }
    if (name.trim().length > 255) {
      newErrors.name = 'Asset name must be 255 characters or less.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build the update payload — only include changed fields
    const payload: Record<string, unknown> = {};

    if (name.trim() !== (data.asset.name ?? '')) {
      payload.name = name.trim();
    }

    if (showCondition && condition !== (data.asset.condition ?? '')) {
      payload.condition = condition || null;
    }

    if (showLocation) {
      const currentLocationId = data.location ? String(data.location.id) : '';
      if (locationId !== currentLocationId) {
        payload.locationId = locationId ? Number(locationId) : null;
      }
    }

    const currentOwnerId = data.owner ? String(data.owner.id) : '';
    if (!isSoftware && ownerId !== currentOwnerId) {
      payload.ownerId = ownerId ? Number(ownerId) : null;
    }

    // Warranty expiry
    const currentWarranty = data.purchase?.warrantyExpiry ?? '';
    if (warrantyExpiry !== currentWarranty) {
      payload.warrantyExpiry = warrantyExpiry || null;
    }

    // Instance attributes — only send the instance-level keys, not model-level technicalDetails
    if (editableAttrKeys.size > 0) {
      const originalAttrs = data.asset.instanceAttributes as Record<string, unknown> | null;
      const updatedAttrs: Record<string, unknown> = {};
      let hasAttrChanges = false;

      for (const key of editableAttrKeys) {
        const newVal = instanceAttributes[key] ?? '';
        const oldVal = String((originalAttrs as Record<string, unknown>)?.[key] ?? '');
        updatedAttrs[key] = newVal;
        if (newVal !== oldVal) hasAttrChanges = true;
      }

      if (hasAttrChanges) {
        payload.instanceAttributes = updatedAttrs;
      }
    }

    if (Object.keys(payload).length === 0) {
      tiqriToast.info('No changes detected.');
      onClose();
      return;
    }

    startTransition(async () => {
      try {
        const result = await editAssetDetailsAction(data.asset.id, payload);
        if (result.success) {
          tiqriToast.success(result.message || 'Asset updated successfully.');
          onSaved();
        } else {
          tiqriToast.error(result.message || 'Failed to update asset.');
          if (result.errors) {
            const flatErrors: Record<string, string> = {};
            for (const [key, msgs] of Object.entries(result.errors)) {
              if (msgs?.[0]) flatErrors[key] = msgs[0];
            }
            setErrors(flatErrors);
          }
        }
      } catch {
        tiqriToast.error('An unexpected error occurred.');
      }
    });
  }

  // ---- Locked Fields ----

  const lockedFields = useMemo(() => {
    const fields: { label: string; value: string }[] = [
      { label: 'Asset ID', value: data.asset.assetTag },
      { label: 'Category', value: data.model.category.name },
      { label: 'Brand', value: data.model.brand.name },
      { label: 'Model', value: data.model.name },
    ];

    if (!isSoftware && data.asset.serialNumber) {
      fields.push({ label: 'Serial Number', value: data.asset.serialNumber });
    }

    return fields;
  }, [data, isSoftware]);

  // ---- Spec Entries (model-level technicalDetails — read-only) ----

  const modelSpecEntries = useMemo(() => {
    const techDetails = data.model.technicalDetails as Record<string, string | number | undefined> | null;
    if (!techDetails) return [];
    return Object.entries(techDetails).filter(
      ([key, val]) => val !== undefined && val !== null && val !== '' && !editableAttrKeys.has(key)
    );
  }, [data.model.technicalDetails, editableAttrKeys]);

  // ---- Instance Attribute Entries (editable) ----

  const editableAttrEntries = useMemo(() => {
    return Array.from(editableAttrKeys).map((key) => ({
      key,
      value: instanceAttributes[key] ?? '',
    }));
  }, [editableAttrKeys, instanceAttributes]);

  // ---- Actions (Save/Cancel) ----

  const actions = useMemo(
    () => [
      {
        id: 'cancel-edit',
        label: 'Cancel',
        variant: 'outline' as const,
        onClick: onClose,
        disabled: isPending,
      },
      {
        id: 'save-edit',
        label: isPending ? 'Saving...' : 'Save Changes',
        variant: 'default' as const,
        onClick: handleSave,
        disabled: isPending,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPending, onClose]
  );

  // ---- Render ----

  const title = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate">Edit Asset</span>
      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {data.asset.assetTag}
      </span>
    </div>
  );

  const content = (
    <div className="flex flex-col gap-6 pb-6">
      {/* ---- Section: Locked System Fields ---- */}
      <section>
        <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-muted-foreground')}>
          System &amp; Identification
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {lockedFields.map((field) => (
            <LockedField key={field.label} label={field.label} value={field.value} />
          ))}
        </div>
      </section>

      {/* ---- Section: Editable Fields ---- */}
      <section>
        <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-foreground')}>
          Editable Details
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Asset Name */}
          <div className="md:col-span-2">
            <EditableField label="Asset Name" htmlFor="edit-name" error={errors.name}>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter asset name"
                maxLength={255}
                aria-invalid={Boolean(errors.name)}
              />
            </EditableField>
          </div>

          {/* Condition */}
          {showCondition && (
            <EditableField label="Condition" error={errors.condition}>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </EditableField>
          )}

          {/* Location */}
          {showLocation && (
            <EditableField label="Location" error={errors.locationId}>
              <SearchableDropdown
                options={locationOptions}
                placeholder="Select location"
                emptyMessage="No locations found."
                onSelect={setLocationId}
                value={locationId}
              />
            </EditableField>
          )}

          {/* Owner */}
          {!isSoftware && (
            <EditableField label="Owner" error={errors.ownerId}>
              <SearchableDropdown
                options={ownerOptions}
                placeholder="Select owner"
                emptyMessage="No owners found."
                onSelect={setOwnerId}
                value={ownerId}
              />
            </EditableField>
          )}

          {/* Warranty Expiry */}
          <EditableField label="Warranty Expiry" htmlFor="edit-warranty" error={errors.warrantyExpiry}>
            <Input
              id="edit-warranty"
              type="date"
              value={warrantyExpiry}
              onChange={(e) => setWarrantyExpiry(e.target.value)}
            />
          </EditableField>
        </div>
      </section>

      {/* ---- Section: Locked Model Specs (read-only technicalDetails) ---- */}
      {modelSpecEntries.length > 0 && (
        <section>
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-muted-foreground')}>
            Model Specifications (Read-Only)
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {modelSpecEntries.map(([key, value]) => (
              <LockedField
                key={key}
                label={key.replace(/_/g, ' ')}
                value={String(value)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---- Section: Instance Attributes (editable JSONB) ---- */}
      {editableAttrEntries.length > 0 && (
        <section>
          <h3 className={cn(TYPOGRAPHY_CLASSNAMES.textSmSemiBold, 'mb-4 text-foreground')}>
            {isFurniture ? 'Physical Details' : 'Instance Attributes'}
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {editableAttrEntries.map(({ key, value }) => (
              <EditableField
                key={key}
                label={key.replace(/_/g, ' ')}
                htmlFor={`edit-attr-${key}`}
              >
                <Input
                  id={`edit-attr-${key}`}
                  value={value}
                  onChange={(e) => handleAttrChange(key, e.target.value)}
                />
              </EditableField>
            ))}
          </div>
        </section>
      )}
    </div>
  );

  return (
    <SlidePanel
      isOpen={isOpen}
      onClose={() => onClose()}
      title={title}
      description="Update the editable fields below. Locked fields cannot be modified."
      content={content}
      actions={actions}
      showCloseButton={true}
    />
  );
}
