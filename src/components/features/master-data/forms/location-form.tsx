'use client';

import { useState, useMemo, useEffect } from 'react';
import type { MasterDataLocationRow } from '../master-data-management-client';
import type { LocationType } from '@/types/master-data';
import { LOCATION_TYPE_OPTIONS } from '@/types/master-data';
import { SearchableDropdown } from '@/components/ui/searchable-dropdown';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { ActiveStatusToggle } from '../active-status-toggle';
import {
  type BaseMasterDataFormProps,
  FormTextField,
  RecordIdPreview,
  READ_ONLY_INPUT_CLASSNAME,
} from './shared';

interface LocationFormProps extends BaseMasterDataFormProps {
  initialData?: MasterDataLocationRow;
  locations: MasterDataLocationRow[];
}

export function LocationForm({
  initialData,
  isDetailMode,
  fieldError,
  onDirtyStateChange,
  locations,
}: LocationFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<LocationType | ''>(
    (initialData?.type as LocationType) || ''
  );
  const [parentId, setParentId] = useState(
    initialData?.parentId ? String(initialData.parentId) : 'none'
  );
  const [isActive, setIsActive] = useState(
    initialData ? initialData.isActive : true
  );

  useEffect(() => {
    if (!initialData) return;
    const dirty =
      name !== initialData.name ||
      type !== initialData.type ||
      parentId !==
        (initialData.parentId ? String(initialData.parentId) : 'none') ||
      isActive !== initialData.isActive;
    onDirtyStateChange?.(dirty);
  }, [name, type, parentId, isActive, initialData, onDirtyStateChange]);

  const isEdit = !!initialData;

  const locationParentOptions = useMemo(() => {
    const filtered = isEdit
      ? locations.filter((location) => location.id !== initialData.id)
      : locations;
    return filtered.sort((left, right) => left.name.localeCompare(right.name));
  }, [locations, isEdit, initialData]);

  const parentLocationLabel = useMemo(() => {
    if (parentId === 'none' || parentId === '') {
      return 'None (Building)';
    }
    const numericParentId = Number(parentId);
    const location = locations.find((item) => item.id === numericParentId);
    return location?.name ?? 'Unknown';
  }, [parentId, locations]);

  return (
    <>
      <input type="hidden" name="type" value={type} />
      <input
        type="hidden"
        name="parentId"
        value={parentId === 'none' ? '' : parentId}
      />
      <input type="hidden" name="isActive" value={String(isActive)} />

      {isEdit && initialData && (
        <RecordIdPreview
          entity="locations"
          record={initialData as unknown as Record<string, unknown>}
          numericRecordId={initialData.id}
        />
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormTextField
          fieldKey="name"
          label="Location Name"
          value={name}
          onChange={setName}
          isDetailMode={isDetailMode}
          fieldError={fieldError}
          options={{ required: true, placeholder: 'Colombo HQ' }}
        />

        <div className="space-y-2">
          <label
            className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
          >
            Type <span className="text-red-500">*</span>
          </label>
          {isDetailMode ? (
            <input
              className={READ_ONLY_INPUT_CLASSNAME + ' w-full rounded-md px-3'}
              value={type}
              readOnly
            />
          ) : (
            <SearchableDropdown
              options={LOCATION_TYPE_OPTIONS}
              placeholder="Select a location type"
              value={type}
              onSelect={(value) => setType(value as LocationType)}
            />
          )}
          {fieldError('type') && (
            <p
              className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}
            >
              {fieldError('type')}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
        >
          Parent Location
        </label>
        {isDetailMode ? (
          <input
            className={READ_ONLY_INPUT_CLASSNAME + ' w-full rounded-md px-3'}
            value={parentLocationLabel}
            readOnly
          />
        ) : (
          <SearchableDropdown
            options={[
              { value: 'none', label: 'None (Building)' },
              ...locationParentOptions.map((location) => ({
                value: String(location.id),
                label: location.name,
              })),
            ]}
            placeholder="Select a location"
            value={parentId}
            onSelect={setParentId}
          />
        )}
        <p
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          Select None to create a Building.
        </p>
        {fieldError('parentId') && (
          <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
            {fieldError('parentId')}
          </p>
        )}
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
