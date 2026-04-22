'use client';

import * as React from 'react';

import { useSidebar } from '@/components/ui/sidebar';

export function useOpenRegistrationPanel(
  setIsPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
) {
  const { setOpen, setOpenMobile } = useSidebar();

  return React.useCallback(() => {
    setOpen(false);
    setOpenMobile(false);
    setIsPanelOpen(true);
  }, [setIsPanelOpen, setOpen, setOpenMobile]);
}