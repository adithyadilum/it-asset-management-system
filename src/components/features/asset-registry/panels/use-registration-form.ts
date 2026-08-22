'use client';

import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useActionState,
} from 'react';
import { registerAsset } from '@/actions/assets';
import { tiqriToast } from '@/components/shared/sonner';
import {
  initialRegisterAssetActionState,
  type RegistrationPillarInput,
} from '@/lib/validations/asset-registration';
import { parseCurrencyAmount, formatCurrencySymbol } from '@/lib/currency';
import { isInvoiceAttachmentFile } from '@/lib/file-types';
import { getPillarFormConfig } from '@/components/features/asset-registry/panels/pillar-form-config';
import type {
  CategoryRegistrationOption,
  ModelRegistrationOption,
  RegistrationOption,
} from './form-field-primitives';

export function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseInputDate(inputValue: string) {
  if (!inputValue) return undefined;
  const [year, month, day] = inputValue.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

export function formatPurchaseDateLabel(inputValue: string) {
  const date = parseInputDate(inputValue);
  if (!date) return 'Select purchase date';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function resolveStartingPillar(
  initialPillar?: RegistrationPillarInput
): RegistrationPillarInput {
  return initialPillar ?? 'Hardware';
}

interface UseRegistrationFormProps {
  initialPillar?: RegistrationPillarInput;
  categoryOptions?: CategoryRegistrationOption[];
  brandOptions?: RegistrationOption[];
  modelOptions?: ModelRegistrationOption[];
  CURRENCY_OPTIONS: RegistrationOption[];
  onClose: (open: boolean, didSucceed?: boolean) => void;
  onRegistrationSuccess?: (assetId: string, modelName: string) => void;
}

export function useRegistrationForm({
  initialPillar,
  categoryOptions = [],
  brandOptions = [],
  modelOptions = [],
  CURRENCY_OPTIONS,
  onClose,
  onRegistrationSuccess,
}: UseRegistrationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, isPending] = useActionState(
    registerAsset,
    initialRegisterAssetActionState
  );

  const [pillar, setPillar] = useState<RegistrationPillarInput>(() =>
    resolveStartingPillar(initialPillar)
  );
  const [serialNumber, setSerialNumber] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [currencyCode, setCurrencyCode] = useState(
    CURRENCY_OPTIONS[0]?.value ?? ''
  );
  const [warrantyMonths, setWarrantyMonths] = useState('');
  // Defaults to 5 years, the value the server used to apply invisibly. Now it
  // is on screen and editable before the asset is created.
  const [expectedLifespanYears, setExpectedLifespanYears] = useState('5');
  const [purchaseDate, setPurchaseDate] = useState(getTodayDateValue);
  const [basePrice, setBasePrice] = useState('');
  const [costPerSeat, setCostPerSeat] = useState('');
  const [shippingCost, setShippingCost] = useState('');
  const [tax, setTax] = useState('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [showInvoiceUploader, setShowInvoiceUploader] = useState(false);
  const [isInvoiceDragOver, setIsInvoiceDragOver] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<
    Record<string, string>
  >({});

  const [licenseType, setLicenseType] = useState('');
  const [billingCycle, setBillingCycle] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [licenseStartDate, setLicenseStartDate] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [condition, setCondition] = useState('');
  const [locationId, setLocationId] = useState('');

  const lastToastKeyRef = useRef<string>('');

  const isFreeSoftwareLicense = licenseType === 'Open Source / Free';

  const handleBasePriceChange = useCallback(
    (val: string) => {
      if (isFreeSoftwareLicense) {
        setBasePrice('0.00');
        setCostPerSeat('0.00');
        return;
      }

      setBasePrice(val);
      const parsedBase = parseCurrencyAmount(val);
      const seats = parseInt(totalSeats, 10);
      if (seats > 0) {
        setCostPerSeat((parsedBase / seats).toFixed(2));
      } else {
        setCostPerSeat('');
      }
    },
    [isFreeSoftwareLicense, totalSeats]
  );

  const handleCostPerSeatChange = useCallback(
    (val: string) => {
      if (isFreeSoftwareLicense) {
        setCostPerSeat('0.00');
        setBasePrice('0.00');
        return;
      }

      setCostPerSeat(val);
      const parsedCost = parseCurrencyAmount(val);
      const seats = parseInt(totalSeats, 10);
      if (seats > 0) {
        setBasePrice((parsedCost * seats).toFixed(2));
      }
    },
    [isFreeSoftwareLicense, totalSeats]
  );

  const handleTotalSeatsChange = useCallback(
    (val: string) => {
      setTotalSeats(val);
      if (isFreeSoftwareLicense) {
        setCostPerSeat('0.00');
        return;
      }

      const seats = parseInt(val, 10);
      const parsedBase = parseCurrencyAmount(basePrice);
      if (seats > 0 && parsedBase > 0) {
        setCostPerSeat((parsedBase / seats).toFixed(2));
      } else {
        setCostPerSeat('');
      }
    },
    [basePrice, isFreeSoftwareLicense]
  );

  const handleLicenseTypeChange = useCallback((value: string) => {
    setLicenseType(value);

    if (value !== 'Subscription') {
      setBillingCycle('');
      setLicenseExpiryDate('');
    }

    if (value === 'Open Source / Free') {
      setBasePrice('0.00');
      setTax('0.00');
      setCostPerSeat('0.00');
    }
  }, []);

  const MAX_INVOICE_FILE_SIZE = Math.floor(4.5 * 1024 * 1024); // 4.5 MB — matches server limit in storage.ts

  const handleInvoiceSelection = useCallback((files: FileList | null) => {
    const selectedFile = files?.[0] ?? null;

    if (selectedFile && !isInvoiceAttachmentFile(selectedFile)) {
      tiqriToast.error(
        'Upload a supported document or image file for invoice attachment.'
      );
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
      setInvoiceFileName('');
      setIsInvoiceDragOver(false);
      return;
    }

    if (selectedFile && selectedFile.size > MAX_INVOICE_FILE_SIZE) {
      tiqriToast.error(
        `File "${selectedFile.name}" is too large. Invoice attachments must be under 4.5 MB.`
      );
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
      setInvoiceFileName('');
      setIsInvoiceDragOver(false);
      return;
    }

    setInvoiceFileName(selectedFile?.name ?? '');
    setShowInvoiceUploader(true);
    setIsInvoiceDragOver(false);
  }, []);

  const handleInvoiceDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsInvoiceDragOver(false);
      handleInvoiceSelection(event.dataTransfer.files);
    },
    [handleInvoiceSelection]
  );

  const [prevInitialPillar, setPrevInitialPillar] = useState(initialPillar);
  if (initialPillar !== prevInitialPillar) {
    setPrevInitialPillar(initialPillar);
    setPillar(resolveStartingPillar(initialPillar));
  }

  const filteredModelOptions = useMemo(() => {
    if (categoryId.length === 0) return [];

    return modelOptions
      .filter((option) => {
        const matchesCategory = option.categoryId === categoryId;
        const matchesBrand = brandId.length === 0 || option.brandId === brandId;
        return matchesCategory && matchesBrand;
      })
      .map(({ value, label }) => ({ value, label }));
  }, [brandId, categoryId, modelOptions]);

  const filteredBrandOptions = useMemo(() => {
    if (categoryId.length === 0) return [];

    const validBrandIds = new Set(
      modelOptions
        .filter((option) => option.categoryId === categoryId)
        .map((option) => option.brandId)
    );

    return brandOptions.filter((option) => validBrandIds.has(option.value));
  }, [categoryId, modelOptions, brandOptions]);

  const [prevFilteredModelOptions, setPrevFilteredModelOptions] =
    useState(filteredModelOptions);
  if (filteredModelOptions !== prevFilteredModelOptions) {
    setPrevFilteredModelOptions(filteredModelOptions);
    if (modelId.length > 0) {
      const stillValidModel = filteredModelOptions.some(
        (option) => option.value === modelId
      );
      if (!stillValidModel) {
        setModelId('');
      }
    }
  }

  const [prevFilteredBrandOptions, setPrevFilteredBrandOptions] =
    useState(filteredBrandOptions);
  if (filteredBrandOptions !== prevFilteredBrandOptions) {
    setPrevFilteredBrandOptions(filteredBrandOptions);
    if (brandId.length > 0) {
      const stillValidBrand = filteredBrandOptions.some(
        (option) => option.value === brandId
      );
      if (!stillValidBrand) {
        setBrandId('');
      }
    }
  }

  const selectedCategory = useMemo(
    () => categoryOptions.find((option) => option.value === categoryId) ?? null,
    [categoryId, categoryOptions]
  );

  const selectedModel = useMemo(
    () => modelOptions.find((option) => option.value === modelId) ?? null,
    [modelId, modelOptions]
  );

  const assetTrackingFields = useMemo(
    () => selectedCategory?.customSchema?.assetTracking ?? [],
    [selectedCategory]
  );

  const instanceAttributesPayload = useMemo(() => {
    const payload: Record<string, string | boolean> = {};

    for (const field of assetTrackingFields) {
      const value = customFieldValues[field.fieldName] ?? '';

      if (field.inputType === 'Boolean') {
        payload[field.fieldName] = value === 'true';
        continue;
      }

      if (value.trim().length > 0) {
        payload[field.fieldName] = value.trim();
      }
    }

    return payload;
  }, [assetTrackingFields, customFieldValues]);

  const config = getPillarFormConfig(pillar);
  const isPillarLocked = Boolean(initialPillar);

  const formError = state.errors?.form?.[0];
  const modelEmptyMessage =
    categoryId.length === 0
      ? 'Please select a category first.'
      : brandId.length > 0
        ? config.modelFilteredEmptyMessage
        : config.modelEmptyMessage;
  const brandEmptyMessage =
    categoryId.length === 0
      ? 'Please select a category first.'
      : 'No brands found.';

  const selectedModelLabel =
    modelOptions.find((option) => option.value === modelId)?.label ?? '';
  const selectedBrandLabel =
    brandOptions.find((option) => option.value === brandId)?.label ?? '';
  const derivedAssetName =
    selectedBrandLabel && selectedModelLabel
      ? `${selectedBrandLabel.trim()} - ${selectedModelLabel.trim()}`
      : 'New Asset';

  const purchaseDateLabel = formatPurchaseDateLabel(purchaseDate);
  const purchaseDateValue = parseInputDate(purchaseDate);

  const licenseStartDateLabel = licenseStartDate
    ? formatPurchaseDateLabel(licenseStartDate)
    : 'Select start date';
  const licenseStartDateValue = parseInputDate(licenseStartDate);

  const licenseExpiryDateLabel = licenseExpiryDate
    ? formatPurchaseDateLabel(licenseExpiryDate)
    : 'Select expiry date';
  const licenseExpiryDateValue = parseInputDate(licenseExpiryDate);

  const [prevConfigCondition, setPrevConfigCondition] = useState(
    config.defaultCondition
  );
  if (config.defaultCondition !== prevConfigCondition) {
    setPrevConfigCondition(config.defaultCondition);
    if (config.defaultCondition && condition === '') {
      setCondition(config.defaultCondition);
    }
  }

  const currencySymbol = formatCurrencySymbol(currencyCode);
  const totalCost = useMemo(
    () =>
      parseCurrencyAmount(basePrice) +
      parseCurrencyAmount(shippingCost) +
      parseCurrencyAmount(tax),
    [basePrice, shippingCost, tax]
  );

  useEffect(() => {
    const resolvedMessage = state.message || formError;

    if (!resolvedMessage) {
      return;
    }

    const toastKey = `${state.success ? 'success' : 'error'}:${resolvedMessage}`;

    if (lastToastKeyRef.current === toastKey) {
      return;
    }

    if (state.success) {
      tiqriToast.success(resolvedMessage);

      if (state.assetId && config.showSuccessTagDialog) {
        onRegistrationSuccess?.(state.assetId, selectedModelLabel);
      }
      onClose(false, true);
    } else {
      tiqriToast.error(resolvedMessage);
    }

    lastToastKeyRef.current = toastKey;
  }, [
    formError,
    state.message,
    state.success,
    state.assetId,
    config.showSuccessTagDialog,
    onRegistrationSuccess,
    selectedModelLabel,
    onClose,
  ]);

  return {
    formRef,
    invoiceInputRef,
    state,
    formAction,
    isPending,
    pillar,
    setPillar,
    serialNumber,
    setSerialNumber,
    categoryId,
    setCategoryId,
    brandId,
    setBrandId,
    modelId,
    setModelId,
    ownerId,
    setOwnerId,
    vendorId,
    setVendorId,
    currencyCode,
    setCurrencyCode,
    warrantyMonths,
    expectedLifespanYears,
    setExpectedLifespanYears,
    setWarrantyMonths,
    purchaseDate,
    setPurchaseDate,
    basePrice,
    setBasePrice: handleBasePriceChange,
    costPerSeat,
    setCostPerSeat: handleCostPerSeatChange,
    shippingCost,
    setShippingCost,
    tax,
    setTax,
    invoiceFileName,
    showInvoiceUploader,
    setShowInvoiceUploader,
    isInvoiceDragOver,
    setIsInvoiceDragOver,
    customFieldValues,
    setCustomFieldValues,
    licenseType,
    setLicenseType: handleLicenseTypeChange,
    billingCycle,
    setBillingCycle,
    totalSeats,
    setTotalSeats: handleTotalSeatsChange,
    licenseStartDate,
    setLicenseStartDate,
    licenseExpiryDate,
    setLicenseExpiryDate,
    condition,
    setCondition,
    locationId,
    setLocationId,
    handleInvoiceSelection,
    handleInvoiceDrop,
    filteredModelOptions,
    filteredBrandOptions,
    selectedModel,
    selectedModelLabel,
    assetTrackingFields,
    instanceAttributesPayload,
    config,
    isPillarLocked,
    modelEmptyMessage,
    brandEmptyMessage,
    derivedAssetName,
    purchaseDateLabel,
    purchaseDateValue,
    licenseStartDateLabel,
    licenseStartDateValue,
    licenseExpiryDateLabel,
    licenseExpiryDateValue,
    isFreeSoftwareLicense,
    currencySymbol,
    totalCost,
  };
}
