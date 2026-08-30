'use client';

import { useMemo, useState } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/data-table';
import {
  FilterBar,
  type AppliedFilter,
  type FilterFieldConfig,
} from '@/components/shared/filter-bar';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs';
import { ActiveRepairsGrid } from './active-repairs-grid';
import { RepairHistoryGrid } from './repair-history-grid';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  PendingReviewTicket,
  ActiveRepairTicket,
  RepairHistoryTicket,
} from '@/types/maintenance';
import { format } from 'date-fns';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

interface MaintenanceTabsProps {
  pendingTickets: PendingReviewTicket[];
  activeRepairTickets: ActiveRepairTicket[];
  repairHistoryTickets: RepairHistoryTicket[];
  isLoading: boolean;
  onRowClick: (row: PendingReviewTicket) => void;
  onActiveRepairRowClick: (ticket: ActiveRepairTicket) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedTicketId?: number | null;
  userRole?: string;
}

export function MaintenanceTabs({
  pendingTickets,
  activeRepairTickets,
  repairHistoryTickets,
  isLoading,
  onRowClick,
  onActiveRepairRowClick,
  searchTerm,
  onSearchChange,
  selectedTicketId,
  userRole,
}: MaintenanceTabsProps) {
  const defaultTab = userRole === 'FinancialAuditor' ? 'history' : 'pending';
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>(
    defaultTab as 'pending' | 'active' | 'history'
  );
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilter[]>([]);

  const filterFieldConfigs: FilterFieldConfig[] = useMemo(() => {
    const fields = [
      { value: 'Asset ID', label: 'Asset ID' },
      { value: 'Asset Name', label: 'Asset Name' },
      { value: 'Dispatched By', label: 'Dispatched By' },
      { value: 'Issue', label: 'Issue' },
    ];

    return fields.map((field) => {
      const values = new Set<string>();

      for (const ticket of pendingTickets) {
        if (field.value === 'Asset ID') {
          values.add(ticket.asset.assetTag);
        } else if (field.value === 'Asset Name') {
          values.add(ticket.asset.name || ticket.model?.name || 'N/A');
        } else if (field.value === 'Dispatched By') {
          values.add(ticket.reportedBy?.name || 'Unknown');
        } else {
          values.add(ticket.reportedIssue);
        }
      }

      const options = [...values]
        .filter((v) => v.trim().length > 0)
        .sort((a, b) => a.localeCompare(b));
      return { ...field, options };
    });
  }, [pendingTickets]);

  const filteredPendingTickets = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const searchedTickets = pendingTickets.filter((ticket) => {
      if (!search) {
        return true;
      }

      return [
        ticket.asset.assetTag,
        ticket.asset.name || ticket.model?.name || 'N/A',
        ticket.reportedBy?.name || 'Unknown',
        ticket.reportedIssue,
      ].some((value) => value.toLowerCase().includes(search));
    });

    if (appliedFilters.length === 0) {
      return searchedTickets;
    }

    return searchedTickets.filter((ticket) => {
      return appliedFilters.every((filter) => {
        const fieldValue =
          filter.field === 'Asset ID'
            ? ticket.asset.assetTag
            : filter.field === 'Asset Name'
              ? ticket.asset.name || ticket.model?.name || 'N/A'
              : filter.field === 'Dispatched By'
                ? ticket.reportedBy?.name || 'Unknown'
                : ticket.reportedIssue;

        const matches = fieldValue === filter.value;
        return filter.operator === 'is' ? matches : !matches;
      });
    });
  }, [appliedFilters, pendingTickets, searchTerm]);

  const applyFilter = (nextFilter: AppliedFilter) => {
    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter(
        (filter) => filter.field !== nextFilter.field
      );
      return [...withoutCurrentField, nextFilter];
    });
  };

  const clearFilter = (field: string) => {
    setAppliedFilters((currentFilters) =>
      currentFilters.filter((filter) => filter.field !== field)
    );
  };

  const clearAllFilters = () => {
    setAppliedFilters([]);
  };

  const pendingReviewColumns: ColumnDef<PendingReviewTicket>[] = [
    {
      accessorKey: 'asset.assetTag',
      header: 'Asset ID',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}
        >
          {row.original.asset.assetTag}
        </span>
      ),
    },
    {
      accessorKey: 'asset.name',
      header: 'Asset Name',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {row.original.asset.name || row.original.model?.name || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'reportedBy.name',
      header: 'Dispatched By',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {row.original.reportedBy?.name || 'Unknown'}
        </span>
      ),
    },
    {
      accessorKey: 'reportedIssue',
      header: 'Issue',
      cell: ({ row }) => (
        <span
          className={`truncate max-w-62.5 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {row.original.reportedIssue}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Reported',
      cell: ({ row }) => (
        <span
          className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}
        >
          {format(new Date(row.original.createdAt), 'MM/dd/yyyy')}
        </span>
      ),
    },
  ];

  const tabConfig = [
    ...(userRole !== 'FinancialAuditor'
      ? [
          {
            id: 'pending',
            label: `Pending Review ${pendingTickets.length > 0 ? `(${pendingTickets.length})` : ''}`,
          },
          {
            id: 'active',
            label: `Active Repairs ${activeRepairTickets.length > 0 ? `(${activeRepairTickets.length})` : ''}`,
          },
        ]
      : []),
    {
      id: 'history',
      label: 'Repair History',
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ModuleNavigationTabs
        tabs={tabConfig}
        defaultTab={activeTab}
        onTabChange={(value) =>
          setActiveTab(value as 'pending' | 'active' | 'history')
        }
        containerClassName="flex h-full flex-col overflow-hidden [&>div.mt-4]:flex [&>div.mt-4]:min-h-0 [&>div.mt-4]:flex-1 [&>div.mt-4]:flex-col [&>div.mt-4]:overflow-hidden"
      >
        <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0 mt-1">
          <FilterBar
            searchQuery={searchTerm}
            onSearchChange={onSearchChange}
            searchPlaceholder={
              activeTab === 'pending'
                ? 'Search by Asset ID, Name, or Issue...'
                : activeTab === 'active'
                  ? 'Search by RMA or Vendor...'
                  : 'Search by Asset ID or Vendor...'
            }
            fields={filterFieldConfigs}
            appliedFilters={appliedFilters}
            onApplyFilter={applyFilter}
            onClearFilter={clearFilter}
            onClearAllFilters={clearAllFilters}
          />

          <div className="flex-1 flex flex-col overflow-hidden min-h-0 rounded-md border border-border bg-background">
            {userRole !== 'FinancialAuditor' && (
              <>
                <TabsContent
                  value="pending"
                  className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex"
                >
                  {isLoading ? (
                    <TableSkeleton
                      rowCount={5}
                      columnWidths={[
                        'w-[15%]',
                        'w-[20%]',
                        'w-[15%]',
                        'w-[30%]',
                        'w-[20%]',
                      ]}
                    />
                  ) : (
                    <DataTable
                      columns={pendingReviewColumns}
                      data={filteredPendingTickets}
                      pageSizeOptions={[10, 20, 30, 50]}
                      initialPageSize={10}
                      onRowClick={(row) => onRowClick(row)}
                      emptyState={{
                        title: 'No pending maintenance tickets found',
                        description:
                          'New maintenance requests will appear here once they are submitted.',
                      }}
                      className="border-0 h-full flex-1"
                      enableRowScroll={true}
                      activeRowCondition={(row: PendingReviewTicket) =>
                        row.id === selectedTicketId
                      }
                      enableRowSelection={false}
                    />
                  )}
                </TabsContent>

                <TabsContent
                  value="active"
                  className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex"
                >
                  <ActiveRepairsGrid
                    tickets={activeRepairTickets}
                    isLoading={isLoading}
                    onRowClick={onActiveRepairRowClick}
                  />
                </TabsContent>
              </>
            )}

            <TabsContent
              value="history"
              className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex"
            >
              <RepairHistoryGrid
                tickets={repairHistoryTickets}
                isLoading={isLoading}
              />
            </TabsContent>
          </div>
        </div>
      </ModuleNavigationTabs>
    </div>
  );
}
