'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Zap,
  Package,
  UserCheck,
  Wrench,
  FileBarChart,
  Monitor,
  Armchair,
  Speaker,
  Code,
} from 'lucide-react'
import type { UserRole } from '@/types/auth'

const PILLAR_OPTIONS = [
  {
    label: 'IT & Digital',
    slug: 'hardware',
    icon: Monitor,
    description: 'Laptops, desktops, servers, and networking equipment',
  },
  {
    label: 'Office Furniture',
    slug: 'furniture',
    icon: Armchair,
    description: 'Desks, chairs, tables, and storage units',
  },
  {
    label: 'Office Electronics',
    slug: 'office-electronics',
    icon: Speaker,
    description: 'Phones, monitors, printers, and A/V equipment',
  },
  {
    label: 'Software',
    slug: 'software',
    icon: Code,
    description: 'Software licenses and subscriptions',
  },
] as const

interface QuickActionsMenuProps {
  userRole: UserRole
}

export function QuickActionsMenu({ userRole }: QuickActionsMenuProps) {
  const router = useRouter()
  const [pillarDialogOpen, setPillarDialogOpen] = useState(false)

  const handlePillarSelect = (slug: string) => {
    setPillarDialogOpen(false)
    router.push(`/assets/${slug}?panel=registration`)
  }

  const isAdmin = userRole === 'GlobalAdmin'
  const isOperator = userRole === 'ITOperator'
  const isAuditor = userRole === 'FinanceAuditor'
  const canRegister = isAdmin || isOperator
  const canAssign = isAdmin || isOperator
  const canMaintenance = isAdmin || isOperator
  const canReport = isAdmin || isAuditor

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Zap className="h-3.5 w-3.5" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {canRegister && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={() => setPillarDialogOpen(true)}
            >
              <Package className="h-4 w-4 text-muted-foreground" />
              Register Asset
            </DropdownMenuItem>
          )}
          {canAssign && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={() => router.push('/operations/assignments')}
            >
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Assign Asset
            </DropdownMenuItem>
          )}
          {canMaintenance && (
            <>
              <DropdownMenuItem
                className="gap-2 cursor-pointer"
                onSelect={() => router.push('/operations/maintenance')}
              >
                <Wrench className="h-4 w-4 text-muted-foreground" />
                Maintenance
              </DropdownMenuItem>
            </>
          )}
          {(canRegister || canAssign || canMaintenance) && canReport && (
            <DropdownMenuSeparator />
          )}
          {canReport && (
            <DropdownMenuItem
              className="gap-2 cursor-pointer"
              onSelect={() => router.push('/reports/standard-reports')}
            >
              <FileBarChart className="h-4 w-4 text-muted-foreground" />
              Generate Report
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Pillar Selection Dialog */}
      <Dialog open={pillarDialogOpen} onOpenChange={setPillarDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Asset Pillar</DialogTitle>
            <DialogDescription>
              Choose the category of asset you want to register.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {PILLAR_OPTIONS.map((pillar) => (
              <button
                key={pillar.slug}
                onClick={() => handlePillarSelect(pillar.slug)}
                className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center transition-all duration-200 hover:border-primary hover:bg-accent hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {pillar.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                    {pillar.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
