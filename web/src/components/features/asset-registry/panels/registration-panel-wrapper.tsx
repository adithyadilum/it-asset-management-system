"use client";

import { useEffect, useState } from "react";
import { getRegistrationOptionsAction } from "@/actions/asset-registry-panels";
import { RegistrationForm } from "@/components/features/asset-registry/panels/registration-form";
import { tiqriToast } from "@/components/shared/sonner";
import { type RegistrationPillarInput } from "@/lib/validations/asset-registration";

export interface RegistrationPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  pillar: string;
}

interface RegistrationOptions {
  categories: { value: string; label: string; pillar: string; customSchema: { modelSpecs: { fieldName: string; inputType: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Boolean'; required: boolean }[]; assetTracking: { fieldName: string; inputType: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'Boolean'; required: boolean }[] } }[];
  brands: { value: string; label: string }[];
  models: { value: string; label: string; brandId: string; categoryId: string; imageUrl: string | null }[];
  vendors: { value: string; label: string }[];
  owners: { value: string; label: string }[];
}

export function RegistrationPanelWrapper({ isOpen, onClose, pillar }: RegistrationPanelWrapperProps) {
  const [data, setData] = useState<RegistrationOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [prevPillar, setPrevPillar] = useState<string | null>(null);

  if (isOpen && pillar !== prevPillar) {
    setPrevPillar(pillar);
    setIsLoading(true);
  }

  useEffect(() => {
    if (isOpen && pillar) {
      let isMounted = true;
      // setIsLoading(true) moved to render phase check

      getRegistrationOptionsAction(pillar)
        .then((res) => {
          if (isMounted) {
            if (res.success && res.data) {
              setData(res.data as RegistrationOptions);
            } else {
              tiqriToast.error("Failed to load registration options");
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, pillar]);

  if (!isOpen) return null;

  const props = {
    isOpen,
    onClose: (open: boolean) => { if (!open) onClose(); },
    isLoading: isLoading || !data,
    initialPillar: pillar as RegistrationPillarInput,
    categoryOptions: data?.categories ?? [],
    brandOptions: data?.brands ?? [],
    modelOptions: data?.models ?? [],
    ownerOptions: data?.owners ?? [],
    vendorOptions: data?.vendors ?? [],
  };

  return <RegistrationForm {...props} />;
}
