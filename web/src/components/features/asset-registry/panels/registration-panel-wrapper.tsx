"use client";

import { useEffect, useState } from "react";
import { getRegistrationOptionsAction } from "@/actions/asset-registry-panels";
import { RegistrationForm } from "@/components/assets/registration-form";
import { tiqriToast } from "@/components/shared/sonner";

export interface RegistrationPanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  pillar: string;
}

export function RegistrationPanelWrapper({ isOpen, onClose, pillar }: RegistrationPanelWrapperProps) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pillar) {
      let isMounted = true;
      setIsLoading(true);

      getRegistrationOptionsAction(pillar)
        .then((res) => {
          if (isMounted) {
            if (res.success) {
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
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[800px] flex-col bg-white shadow-2xl">
         <div className="flex flex-1 items-center justify-center text-slate-500">
           Loading options...
         </div>
      </div>
    );
  }

  const props = {
    isOpen,
    onClose: (open: boolean) => { if (!open) onClose(); },
    initialPillar: pillar as any,
    categoryOptions: data.categories,
    brandOptions: data.brands,
    modelOptions: data.models,
    ownerOptions: data.owners,
    vendorOptions: data.vendors,
  };

  return <RegistrationForm {...props} />;
}
