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
import { Button } from '@/components/ui/button'
import {
  Zap,
  Package,
  UserCheck,
  Wrench,
  FileBarChart,
} from 'lucide-react'
import type { UserRole } from '@/types/auth'
import { AssetPillarSelectionDialog } from '@/components/shared/asset-pillar-selection-dialog'

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
  const isAuditor = userRole === 'FinancialAuditor'
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

      <AssetPillarSelectionDialog
        open={pillarDialogOpen}
        onOpenChange={setPillarDialogOpen}
        onSelect={handlePillarSelect}
      />
    </>
  )
}
