'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSidebar as useShadcnSidebar } from '@/components/ui/sidebar';

interface SidebarContextType {
  collapseSidebar: () => void;
  expandSidebar: () => void;
  isCollapsed: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const { toggleSidebar, state } = useShadcnSidebar();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync with Shadcn state
  useEffect(() => {
    setIsCollapsed(state === 'collapsed');
  }, [state]);

  const collapseSidebar = () => {
    if (state === 'expanded') {
      toggleSidebar();
      setIsCollapsed(true);
    }
  };

  const expandSidebar = () => {
    if (state === 'collapsed') {
      toggleSidebar();
      setIsCollapsed(false);
    }
  };

  return (
    <SidebarContext.Provider value={{ collapseSidebar, expandSidebar, isCollapsed }}>
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