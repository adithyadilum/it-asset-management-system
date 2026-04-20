'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSidebar as useShadcnSidebar } from '@/components/ui/sidebar';

interface SidebarContextType {
  collapseSidebar: () => void;
  expandSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const { toggleSidebar, state } = useShadcnSidebar();

  const collapseSidebar = () => {
    if (state === 'expanded') {
      toggleSidebar();
    }
  };

  const expandSidebar = () => {
    if (state === 'collapsed') {
      toggleSidebar();
    }
  };

  return (
    <SidebarContext.Provider value={{ collapseSidebar, expandSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}