'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import { DataTable } from '@/components/shared/data-table';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { ModuleNavigationTabs } from '@/components/shared/module-navigation-tabs';
import { ActiveRepairsGrid } from './active-repairs-grid';
import { RepairHistoryGrid } from './repair-history-grid';
import type { ColumnDef } from '@tanstack/react-table';
import type { PendingReviewTicket, ActiveRepairTicket, RepairHistoryTicket } from '@/types/maintenance';
import { format } from 'date-fns';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';

// 🚨 NEW: Expandable Text Cell Component
const ExpandableText = ({ text, defaultWidthClass }: { text: string; defaultWidthClass: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text === 'N/A') {
    return <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>N/A</span>;
  }
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}
      className={`cursor-pointer hover:text-foreground transition-colors ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground ${
        isExpanded ? 'whitespace-nowrap' : `truncate block ${defaultWidthClass}`
      }`}
      title={isExpanded ? "Click to collapse" : "Click to expand"}
    >
      {text}
    </div>
  );
};

type PendingFilterField = 'Asset ID' | 'Asset Name' | 'Dispatched By' | 'Issue';
type PendingFilterOperator = 'is' | 'is not';

type AppliedPendingFilter = {
  field: PendingFilterField;
  operator: PendingFilterOperator;
  value: string;
};

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
}: MaintenanceTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AppliedPendingFilter[]>([]);
  const [draftField, setDraftField] = useState<PendingFilterField>('Asset ID');
  const [draftOperator, setDraftOperator] = useState<PendingFilterOperator>('is');
  const [draftValue, setDraftValue] = useState('');

  const pendingFilterFieldOptions: Array<{ label: PendingFilterField; value: PendingFilterField }> = [
    { label: 'Asset ID', value: 'Asset ID' },
    { label: 'Asset Name', value: 'Asset Name' },
    { label: 'Dispatched By', value: 'Dispatched By' },
    { label: 'Issue', value: 'Issue' },
  ];

  const pendingFilterValueOptions = useMemo(() => {
    const values = new Set<string>();

    for (const ticket of pendingTickets) {
      if (draftField === 'Asset ID') {
        values.add(ticket.asset.assetTag);
      } else if (draftField === 'Asset Name') {
        values.add(ticket.asset.name || ticket.model?.name || 'N/A');
      } else if (draftField === 'Dispatched By') {
        values.add(ticket.reportedBy?.name || 'Unknown');
      } else {
        values.add(ticket.reportedIssue);
      }
    }

    return [...values].filter((value) => value.trim().length > 0).sort((left, right) => left.localeCompare(right));
  }, [draftField, pendingTickets]);

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

  const clearFilters = () => {
    setAppliedFilters([]);
    setDraftField('Asset ID');
    setDraftOperator('is');
    setDraftValue('');
  };

  const applyFilter = () => {
    if (!draftValue) {
      return;
    }

    setAppliedFilters((currentFilters) => {
      const withoutCurrentField = currentFilters.filter((filter) => filter.field !== draftField);
      return [...withoutCurrentField, { field: draftField, operator: draftOperator, value: draftValue }];
    });

    setIsFilterPopoverOpen(false);
  };

  const clearFilter = (field: PendingFilterField) => {
    setAppliedFilters((currentFilters) => currentFilters.filter((filter) => filter.field !== field));
  };

  const pendingReviewColumns: ColumnDef<PendingReviewTicket>[] = [
    {
      accessorKey: 'asset.assetTag',
      header: 'Asset ID',
      cell: ({ row }) => <span className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>{row.original.asset.assetTag}</span>,
    },
    {
      accessorKey: 'asset.name',
      header: 'Asset Name',
      // 🚨 UPDATED: Expandable Asset Name
      cell: ({ row }) => <ExpandableText text={row.original.asset.name || row.original.model?.name || 'N/A'} defaultWidthClass="w-[180px]" />,
    },
    {
      accessorKey: 'reportedBy.name',
      header: 'Dispatched By',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>{row.original.reportedBy?.name || 'Unknown'}</span>
      ),
    },
    {
      accessorKey: 'reportedIssue',
      header: 'Issue',
      // 🚨 UPDATED: Expandable Issue
      cell: ({ row }) => <ExpandableText text={row.original.reportedIssue} defaultWidthClass="w-[250px]" />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Date Reported',
      cell: ({ row }) => (
        <span className={`${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-muted-foreground`}>
          {format(new Date(row.original.createdAt), 'MM/dd/yyyy')}
        </span>
      ),
    },
  ];

  const tabConfig = [
    {
      id: 'pending',
      label: `Pending Review ${pendingTickets.length > 0 ? `(${pendingTickets.length})` : ''}`,
    },
    {
      id: 'active',
      label: `Active Repairs ${activeRepairTickets.length > 0 ? `(${activeRepairTickets.length})` : ''}`,
    },
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
        onTabChange={(value) => setActiveTab(value as 'pending' | 'active' | 'history')}
        containerClassName="flex h-full flex-col overflow-hidden [&>div.mt-4]:flex [&>div.mt-4]:min-h-0 [&>div.mt-4]:flex-1 [&>div.mt-4]:flex-col [&>div.mt-4]:overflow-hidden"
      >
        <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0 mt-1">
          <div className="flex items-center shrink-0">
            <div className="relative w-full max-w-100">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  activeTab === 'pending'
                    ? 'Search by Asset ID, Name, or Issue...'
                    : activeTab === 'active'
                      ? 'Search by RMA or Vendor...'
                      : 'Search by Asset ID or Vendor...'
                }
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className={`pl-9 h-9 bg-background ${TYPOGRAPHY_CLASSNAMES.textSmRegular}`}
              />
            </div>

            <div className="ml-3 flex items-center gap-2">
              <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
                <PopoverAnchor asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-8 rounded-lg border-border bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                    onClick={() => setIsFilterPopoverOpen((currentOpen) => !currentOpen)}
                  >
                    Filters
                    <ChevronDown className="size-4" />
                  </Button>
                </PopoverAnchor>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={10}
                  className="w-61.25 rounded-lg border border-border bg-background p-0 shadow-xl"
                >
                  <div className="border-b border-border px-3 py-2">
                    <div className="flex items-center justify-between">
                      <h3 className={`${TYPOGRAPHY_CLASSNAMES.textSmMedium} text-foreground`}>Filter by</h3>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setIsFilterPopoverOpen(false)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 px-3 py-3">
                    <select
                      value={draftField}
                      onChange={(event) => setDraftField(event.target.value as PendingFilterField)}
                      className={`h-8 w-full rounded-lg border border-border bg-background px-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                    >
                      {pendingFilterFieldOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div className={`space-y-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={draftOperator === 'is'}
                          onChange={() => setDraftOperator('is')}
                        />
                        is
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={draftOperator === 'is not'}
                          onChange={() => setDraftOperator('is not')}
                        />
                        is not
                      </label>
                    </div>

                    <select
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      className={`h-8 w-full rounded-lg border border-border bg-background px-2 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                    >
                      <option value="" disabled>
                        Select value
                      </option>
                      {pendingFilterValueOptions.map((filterValueOption) => (
                        <option key={filterValueOption} value={filterValueOption}>
                          {filterValueOption}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={`h-8 rounded-lg border-border bg-secondary px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-secondary-foreground hover:bg-secondary/80`}
                      onClick={() => setIsFilterPopoverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={`h-8 rounded-lg bg-primary px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-primary-foreground hover:bg-primary/90`}
                      onClick={applyFilter}
                    >
                      Apply Filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {appliedFilters.length > 0 ? (
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                {appliedFilters.map((filter) => (
                  <span
                    key={filter.field}
                    className={`inline-flex h-8 items-center gap-2 rounded-lg bg-muted/50 px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                  >
                    {`${filter.field} ${filter.operator} ${filter.value}`}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => clearFilter(filter.field)}
                    >
                      <X className="size-4" />
                    </button>
                  </span>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 rounded-lg border-border bg-background px-3 ${TYPOGRAPHY_CLASSNAMES.textSmRegular} text-foreground`}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </div>
          ) : null}

          <div className="flex-1 flex flex-col overflow-hidden min-h-0 rounded-md border border-border bg-background">
            <TabsContent value="pending" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              {isLoading ? (
                <TableSkeleton rowCount={5} columnWidths={['w-[15%]', 'w-[20%]', 'w-[15%]', 'w-[30%]', 'w-[20%]']} />
              ) : (
                <DataTable
                  columns={pendingReviewColumns}
                  data={filteredPendingTickets}
                  pageSizeOptions={[10, 20, 30, 50]}
                  initialPageSize={10}
                  onRowClick={(row) => onRowClick(row)}
                  emptyState={{
                    title: 'No pending maintenance tickets found',
                    description: 'New maintenance requests will appear here once they are submitted.',
                  }}
                  className="border-0 flex-1 min-h-0"
                  enableRowScroll={true}
                  activeRowCondition={(row: PendingReviewTicket) => row.id === selectedTicketId}
                  enableRowSelection={false}
                />
              )}
            </TabsContent>

            <TabsContent value="active" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              <ActiveRepairsGrid tickets={activeRepairTickets} isLoading={isLoading} onRowClick={onActiveRepairRowClick} />
            </TabsContent>

            <TabsContent value="history" className="m-0 flex-1 flex-col overflow-hidden data-[state=active]:flex">
              <RepairHistoryGrid tickets={repairHistoryTickets} isLoading={isLoading} />
            </TabsContent>
          </div>
        </div>
      </ModuleNavigationTabs>
    </div>
  );
}