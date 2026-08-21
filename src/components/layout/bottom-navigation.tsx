'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, Bell } from 'lucide-react';

import { cn } from '@/lib/utils';

export function BottomNavigation() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Home', href: '/mobile', icon: Home },
    { name: 'My Assets', href: '/mobile/my-assets', icon: Package },
    {
      name: 'Notifications',
      href: '/mobile/notifications',
      icon: Bell,
      hasNotif: true,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground pb-[env(safe-area-inset-bottom)] md:hidden rounded-t-[20px]">
      <nav className="flex h-[76px] items-center justify-around px-4">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1.5 w-full h-full transition-colors relative',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <tab.icon
                  className={cn('h-[26px] w-[26px]')}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {tab.hasNotif && (
                  <div className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-background">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600" />
                  </div>
                )}
              </div>
              <span className="text-[11px] font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
