'use client';

import {
  useCallback,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';

import { createMasterDataRecord } from '@/actions/master-data';
import {
  INITIAL_CREATE_MASTER_DATA_STATE,
  MASTER_DATA_RECORD_ENTITIES,
} from '@/lib/master-data/shared';
import type {
  MasterDataRecordEntity,
  UpdateMasterDataState,
} from '@/types/master-data';
import { FormPanel } from '@/components/shared/slide-panels/form-panel';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { tiqriToast } from '@/components/shared/sonner';

import type {
  MasterDataBrandRow,
  MasterDataCategoryRow,
  MasterDataDepartmentRow,
  MasterDataDeviceModelRow,
  MasterDataLocationRow,
  MasterDataOwnerRow,
  MasterDataVendorRow,
  MasterDataCustomStatusRow,
} from './master-data-management-client';

import { LocationForm } from './forms/location-form';
import { CategoryForm } from './forms/category-form';
import { BrandForm } from './forms/brand-form';
import { DeviceModelForm } from './forms/device-model-form';
import { VendorForm } from './forms/vendor-form';
import { OwnerForm } from './forms/owner-form';
import { DepartmentForm } from './forms/department-form';
import { StatusForm } from './forms/status-form';
import type { MasterDataFormRef } from './forms/shared';

interface MasterDataCreatePanelProps {
  isOpen: boolean;
  onCloseUrl: string;
  entity?: string;
  categories: MasterDataCategoryRow[];
  locations: MasterDataLocationRow[];
  brands: MasterDataBrandRow[];
  deviceModels: MasterDataDeviceModelRow[];
  vendors: MasterDataVendorRow[];
  owners: MasterDataOwnerRow[];
  departments: MasterDataDepartmentRow[];
  customStatuses: MasterDataCustomStatusRow[];
  disableTransition?: boolean;
}

const PANEL_META: Record<
  MasterDataRecordEntity,
  {
    title: string;
    description: string;
    submitLabel: string;
    submittingLabel: string;
  }
> = {
  locations: {
    title: 'Add New Location',
    description: 'Register a new operational location for asset assignment.',
    submitLabel: 'Save Location',
    submittingLabel: 'Saving Location...',
  },
  'asset-categories': {
    title: 'Add New Category',
    description: 'Create a category and define its custom JSON schema fields.',
    submitLabel: 'Save Category',
    submittingLabel: 'Saving Category...',
  },
  brands: {
    title: 'Add New Brand',
    description: 'Register a manufacturer for model mapping and procurement.',
    submitLabel: 'Save Brand',
    submittingLabel: 'Saving Brand...',
  },
  'device-models': {
    title: 'Add New Model',
    description:
      'Create a model using specifications inherited from the selected category.',
    submitLabel: 'Save Model',
    submittingLabel: 'Saving Model...',
  },
  vendors: {
    title: 'Add New Vendor',
    description: 'Add an approved vendor for purchases and maintenance.',
    submitLabel: 'Save Vendor',
    submittingLabel: 'Saving Vendor...',
  },
  owners: {
    title: 'Add New Owner',
    description:
      'Register a legal company owner for assets (for example, TIQRI LK).',
    submitLabel: 'Save Owner',
    submittingLabel: 'Saving Owner...',
  },
  departments: {
    title: 'Add New Department',
    description:
      'Register a department for user assignment and ownership mapping.',
    submitLabel: 'Save Department',
    submittingLabel: 'Saving Department...',
  },
  statuses: {
    title: 'Add New Status',
    description: 'Create a custom status for assets (e.g., In Transit).',
    submitLabel: 'Save Status',
    submittingLabel: 'Saving Status...',
  },
};

function isRecordEntity(
  value: string | undefined
): value is MasterDataRecordEntity {
  return MASTER_DATA_RECORD_ENTITIES.includes(value as MasterDataRecordEntity);
}

export function MasterDataCreatePanel({
  isOpen,
  onCloseUrl,
  entity,
  categories,
  locations,
  brands,
  disableTransition = false,
}: MasterDataCreatePanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<UpdateMasterDataState>(
    INITIAL_CREATE_MASTER_DATA_STATE
  );
  const formRef = useRef<MasterDataFormRef>(null);

  const normalizedEntity = isRecordEntity(entity) ? entity : null;
  const panelMeta = normalizedEntity ? PANEL_META[normalizedEntity] : null;

  const getFieldError = useCallback(
    (fieldName: string) => state.errors?.[fieldName]?.[0],
    [state.errors]
  );

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        setState(INITIAL_CREATE_MASTER_DATA_STATE);
        router.push(onCloseUrl, { scroll: false });
      }
    },
    [onCloseUrl, router]
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!normalizedEntity) {
        tiqriToast.error('Invalid master data entity selected.');
        setState({
          success: false,
          message: 'Invalid master data entity selected.',
        });
        return;
      }

      const formData = new FormData(event.currentTarget);

      if (formRef.current?.augmentFormData) {
        formRef.current.augmentFormData(formData);
      }

      startTransition(async () => {
        const result = await createMasterDataRecord(
          INITIAL_CREATE_MASTER_DATA_STATE,
          formData
        );

        setState(result);

        if (result.success) {
          tiqriToast.success(result.message);
          router.refresh();
          handleClose(false);
          return;
        }

        tiqriToast.error(result.message);
      });
    },
    [handleClose, normalizedEntity, router]
  );

  const formBody = (() => {
    if (!normalizedEntity) {
      return (
        <div
          className={`rounded-md bg-muted p-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          Select a valid tab before opening the Add New panel.
        </div>
      );
    }

    switch (normalizedEntity) {
      case 'locations':
        return (
          <LocationForm
            key={normalizedEntity}
            locations={locations}
            fieldError={getFieldError}
          />
        );
      case 'asset-categories':
        return (
          <CategoryForm key={normalizedEntity} fieldError={getFieldError} />
        );
      case 'brands':
        return <BrandForm key={normalizedEntity} fieldError={getFieldError} />;
      case 'device-models':
        return (
          <DeviceModelForm
            key={normalizedEntity}
            ref={formRef}
            brands={brands}
            categories={categories}
            fieldError={getFieldError}
          />
        );
      case 'vendors':
        return <VendorForm key={normalizedEntity} fieldError={getFieldError} />;
      case 'owners':
        return <OwnerForm key={normalizedEntity} fieldError={getFieldError} />;
      case 'departments':
        return (
          <DepartmentForm key={normalizedEntity} fieldError={getFieldError} />
        );
      case 'statuses':
        return <StatusForm key={normalizedEntity} fieldError={getFieldError} />;
    }
  })();

  return (
    <FormPanel
      isOpen={isOpen}
      onClose={handleClose}
      title={panelMeta?.title ?? 'Add New'}
      description={panelMeta?.description}
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      submitLabel={panelMeta?.submitLabel ?? 'Save'}
      submittingLabel={panelMeta?.submittingLabel ?? 'Saving...'}
      disableTransition={disableTransition}
    >
      <input type="hidden" name="entity" value={normalizedEntity ?? ''} />

      {formBody}

      {state.message && !state.success && (
        <p className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-red-600`}>
          {state.message}
        </p>
      )}
    </FormPanel>
  );
}
