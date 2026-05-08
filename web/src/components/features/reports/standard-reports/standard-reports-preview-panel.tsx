'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ChevronRight, Download, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ReportPreviewRow } from './standard-reports-types';

interface StandardReportsPreviewPanelProps {
  showDataGrid: boolean;
  previewData: ReportPreviewRow[];
  isLoading: boolean;
  errorMessage?: string | null;
}

function toCellText(value: string | null | undefined) {
  if (!value || value.trim().length === 0) {
    return '-';
  }
  return value;
}

export function StandardReportsPreviewPanel({
  showDataGrid,
  previewData,
  isLoading,
  errorMessage,
}: StandardReportsPreviewPanelProps) {
  const columns = useMemo<ColumnDef<ReportPreviewRow>[]>(
    () => [
      { accessorKey: 'assetTag', header: 'Asset ID' },
      {
        accessorKey: 'name',
        header: 'Asset Name',
        cell: ({ row }) => toCellText(row.original.name),
      },
      { accessorKey: 'category', header: 'Category' },
      {
        accessorKey: 'assignedTo',
        header: 'Assigned to',
        cell: ({ row }) => toCellText(row.original.assignedTo),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge value={row.original.status} showIcon />
        ),
      },
    ],
    []
  );

  const rowCount = previewData.length;

  return (
    <div className="flex min-h-0 flex-col rounded-xl gap-6 bg-background">
      <CardHeader className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className={TYPOGRAPHY_CLASSNAMES.textLgSemiBold}>
              Report Preview (Showing first {rowCount} rows)
            </h3>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              className="bg-success text-success-foreground hover:bg-success/80"
              size="sm"
              disabled={!showDataGrid || rowCount === 0}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!showDataGrid || rowCount === 0}
            >
              Generate PDF
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <div className="flex-1 p-6 pt-0 flex flex-col min-h-0">
        {errorMessage ? (
          <Card className="border-border bg-card flex h-full min-h-0 flex-col rounded-xl shadow-sm overflow-hidden">
            <CardContent className="flex h-full flex-1 items-center justify-center p-4">
              <div className="flex max-w-lg flex-col items-center gap-4 text-center text-destructive">
                <AlertTriangle className="size-12 text-destructive" strokeWidth={1} />
                <div className="space-y-1.5">
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmMedium}>
                    Error loading report
                  </p>
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                    {errorMessage}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card className="border-border bg-card flex h-full min-h-0 flex-col rounded-xl shadow-sm overflow-hidden">
            <CardContent className="flex h-full flex-1 items-center justify-center p-4">
              <TableSkeleton
                columnWidths={['w-[15%]', 'w-[25%]', 'w-[20%]', 'w-[20%]', 'w-[20%]']}
                rowCount={8}
                showCheckbox={false}
              />
            </CardContent>
          </Card>
        ) : showDataGrid ? (
          <DataTable
            columns={columns}
            data={previewData}
            initialPageSize={16}
            pageSizeOptions={[16, 24, 32, 48]}
            enableRowSelection={false}
            emptyState={{
              title: 'No matching assets',
              description:
                'No assets match the selected filters. Try adjusting your filter criteria.',
            }}
          />
        ) : (
          <Card className="border-border bg-card flex h-full min-h-0 flex-col rounded-xl shadow-sm overflow-hidden">
            <CardContent className="flex h-full flex-1 items-center justify-center p-4">
              <div className="flex max-w-lg flex-col items-center gap-4 text-center text-muted-foreground">
                <Filter className="size-12 text-foreground" strokeWidth={1} />
                <div className="space-y-1.5">
                  <p className={TYPOGRAPHY_CLASSNAMES.textSmRegular}>
                    Select your filters and click Preview Data to see results here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
