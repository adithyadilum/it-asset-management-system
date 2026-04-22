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
  categories: { value: string; label: string }[];
  brands: { value: string; label: string }[];
  models: { value: string; label: string; brandId: string; categoryId: string }[];
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
              setData(res.data);
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

  if (isLoading || !data) {
    return (
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-200 flex-col bg-white shadow-2xl">
        <div className="flex flex-1 items-center justify-center text-slate-500">
          Loading options...
        </div>
      </div>
    );
  }

  const props = {
    isOpen,
    onClose: (open: boolean) => { if (!open) onClose(); },
    initialPillar: pillar as RegistrationPillarInput,
    categoryOptions: data.categories,
    brandOptions: data.brands,
    modelOptions: data.models,
    ownerOptions: data.owners,
    vendorOptions: data.vendors,
  };

  return <RegistrationForm {...props} />;
}
