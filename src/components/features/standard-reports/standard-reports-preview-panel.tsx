'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ChevronRight, Download, Filter } from 'lucide-react';
import Papa from 'papaparse';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { StandardModal } from '@/components/ui/standard-modal';
import { getPrimaryIdColumn, type FilterState, type ReportPreviewRow } from '@/types/standard-reports';
import { fetchReportPreview } from '@/actions/standard-reports';
import { GenerateReportPdfModal } from './generate-report-pdf-modal';

import type { PaginationState, OnChangeFn } from '@tanstack/react-table';

interface StandardReportsPreviewPanelProps {
  showDataGrid: boolean;
  previewData: ReportPreviewRow[];
  isLoading: boolean;
  errorMessage?: string | null;
  selectedFields: string[];
  source: string;
  filterState: FilterState;
  generatedBy: string;
  templateName?: string;
  reportDescription?: string;
  pagination: PaginationState;
  setPagination: OnChangeFn<PaginationState>;
  pageCount: number;
}

function toCellText(value: unknown) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim().length === 0)) {
    return '-';
  }
  return String(value);
}

export function StandardReportsPreviewPanel({
  showDataGrid,
  previewData,
  isLoading,
  errorMessage,
  selectedFields,
  source,
  filterState,
  generatedBy,
  templateName,
  reportDescription,
  pagination,
  setPagination,
  pageCount,
}: StandardReportsPreviewPanelProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'preview' | 'all'>('preview');
  const [isExporting, setIsExporting] = useState(false);

  const columns = useMemo<ColumnDef<ReportPreviewRow>[]>(() => {
    // If we have specific fields from a template, use them
    if (selectedFields && selectedFields.length > 0) {
      const primaryIdField = getPrimaryIdColumn(source);
      const primaryIdFields = [
        'Record ID', 'Business Key', 'Asset ID', 'Asset Tag', 'Record Code',
        'Assignment ID', 'Return ID', 'Ticket ID', 'Disposal ID', 'Purchase ID',
        'License ID', 'Log ID'
      ];
      const normalizedFields = Array.from(new Set(
        selectedFields.map(f =>
          primaryIdFields.includes(f) ? primaryIdField : f
        )
      ));

      // Ensure primary ID is the first column if it exists in the selection
      if (normalizedFields.includes(primaryIdField)) {
        normalizedFields.splice(normalizedFields.indexOf(primaryIdField), 1);
        normalizedFields.unshift(primaryIdField);
      }

      return normalizedFields.map((field) => ({
        id: field,
        accessorFn: (row: ReportPreviewRow) => row[field],
        header: field,
        cell: ({ row }) => {
          const value = row.original[field];
          if (field === 'Status') {
            return <StatusBadge value={typeof value === 'string' ? value : undefined} showIcon />;
          }
          return toCellText(value);
        },
      }));
    }

    // Default columns for Asset Registry
    if (source === 'Asset Registry' || source === 'Assets' || !source) {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original['Asset Name']),
        },
        {
          id: 'Category',
          accessorFn: (row) => row['Category'],
          header: 'Category',
        },
        {
          id: 'Assigned To',
          accessorFn: (row) => row['Assigned To'],
          header: 'Assigned to',
          cell: ({ row }) => toCellText(row.original['Assigned To']),
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
          cell: ({ row }) => (
            <StatusBadge value={row.original['Status'] as string} showIcon />
          ),
        },
      ];
    }

    // Default columns for Master Data
    if (source === 'Master Data') {
      return [
        {
          id: 'Record Code',
          accessorFn: (row) => row['Record Code'],
          header: 'Record Code',
        },
        {
          id: 'Type',
          accessorFn: (row) => row['Type'],
          header: 'Type',
        },
        {
          id: 'Name',
          accessorFn: (row) => row['Name'],
          header: 'Name',
        },
        {
          id: 'Description',
          accessorFn: (row) => row['Description'],
          header: 'Description',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
          cell: ({ row }) => (
            <StatusBadge value={row.original['Status'] as string} showIcon />
          ),
        },
      ];
    }

    // Default columns for Active Assignments
    if (source === 'Active Assignments') {
      return [
        {
          id: 'Assignment ID',
          accessorFn: (row) => row['Assignment ID'],
          header: 'Assignment ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Assigned To',
          accessorFn: (row) => row['Assigned To'],
          header: 'Assigned To',
        },
        {
          id: 'State',
          accessorFn: (row) => row['State'],
          header: 'State',
        },
        {
          id: 'Assigned Date',
          accessorFn: (row) => row['Assigned Date'],
          header: 'Assigned Date',
        },
      ];
    }

    // Default columns for Return History
    if (source === 'Return History') {
      return [
        {
          id: 'Return ID',
          accessorFn: (row) => row['Return ID'],
          header: 'Return ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Returned Date',
          accessorFn: (row) => row['Returned Date'],
          header: 'Returned Date',
        },
        {
          id: 'Duration (Days)',
          accessorFn: (row) => row['Duration (Days)'],
          header: 'Duration (Days)',
        },
        {
          id: 'Return Condition',
          accessorFn: (row) => row['Return Condition'],
          header: 'Return Condition',
        },
      ];
    }

    // Default columns for Maintenance Records
    if (source === 'Maintenance Records') {
      return [
        {
          id: 'Ticket ID',
          accessorFn: (row) => row['Ticket ID'],
          header: 'Ticket ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Ticket Type',
          accessorFn: (row) => row['Ticket Type'],
          header: 'Ticket Type',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
        },
        {
          id: 'Actual Cost',
          accessorFn: (row) => row['Actual Cost'],
          header: 'Actual Cost',
        },
      ];
    }

    // Default columns for Disposal Records
    if (source === 'Disposal Records') {
      return [
        {
          id: 'Disposal ID',
          accessorFn: (row) => row['Disposal ID'],
          header: 'Disposal ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Status',
          accessorFn: (row) => row['Status'],
          header: 'Status',
        },
        {
          id: 'Reason',
          accessorFn: (row) => row['Reason'],
          header: 'Reason',
        },
        {
          id: 'Requested At',
          accessorFn: (row) => row['Requested At'],
          header: 'Requested At',
        },
      ];
    }

    // Default columns for Purchase Records
    if (source === 'Purchase Records') {
      return [
        {
          id: 'Purchase ID',
          accessorFn: (row) => row['Purchase ID'],
          header: 'Purchase ID',
        },
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Vendor',
          accessorFn: (row) => row['Vendor'],
          header: 'Vendor',
        },
        {
          id: 'Total Cost',
          accessorFn: (row) => row['Total Cost'],
          header: 'Total Cost',
        },
        {
          id: 'Purchase Date',
          accessorFn: (row) => row['Purchase Date'],
          header: 'Purchase Date',
        },
      ];
    }

    // Default columns for Depreciation Ledger
    if (source === 'Depreciation Ledger') {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
        },
        {
          id: 'Purchase Cost',
          accessorFn: (row) => row['Purchase Cost'],
          header: 'Purchase Cost',
        },
        {
          id: 'Current Book Value',
          accessorFn: (row) => row['Current Book Value'],
          header: 'Current Book Value',
        },
        {
          id: 'Depreciation %',
          accessorFn: (row) => row['Depreciation %'],
          header: 'Depreciation %',
        },
      ];
    }

    // Default columns for TCO Overview
    if (source === 'TCO Overview') {
      return [
        {
          id: 'Asset Tag',
          accessorFn: (row) => row['Asset Tag'],
          header: 'Asset Tag',
        },
        {
          id: 'Asset Name',
          accessorFn: (row) => row['Asset Name'],
          header: 'Asset Name',
        },
        {
          id: 'Purchase Cost',
          accessorFn: (row) => row['Purchase Cost'],
          header: 'Purchase Cost',
        },
        {
          id: 'Total Maintenance Cost',
          accessorFn: (row) => row['Total Maintenance Cost'],
          header: 'Total Maintenance Cost',
        },
        {
          id: 'TCO',
          accessorFn: (row) => row['TCO'],
          header: 'TCO',
        },
      ];
    }

    // Default columns for Software Licenses
    if (source === 'Software Licenses') {
      return [
        {
          id: 'License ID',
          accessorFn: (row) => row['License ID'],
          header: 'License ID',
        },
        {
          id: 'Software Name',
          accessorFn: (row) => row['Software Name'],
          header: 'Software Name',
        },
        {
          id: 'License Type',
          accessorFn: (row) => row['License Type'],
          header: 'License Type',
        },
        {
          id: 'Used Seats',
          accessorFn: (row) => row['Used Seats'],
          header: 'Used Seats',
        },
        {
          id: 'Expiry Date',
          accessorFn: (row) => row['Expiry Date'],
          header: 'Expiry Date',
        },
      ];
    }

    // Default columns for Audit Logs
    if (source === 'Audit Logs') {
      return [
        {
          id: 'Log ID',
          accessorFn: (row) => row['Log ID'],
          header: 'Log ID',
        },
        {
          id: 'Timestamp',
          accessorFn: (row) => row['Timestamp'],
          header: 'Timestamp',
        },
        {
          id: 'User',
          accessorFn: (row) => row['User'],
          header: 'User',
        },
        {
          id: 'Action',
          accessorFn: (row) => row['Action'],
          header: 'Action',
        },
        {
          id: 'Entity Type',
          accessorFn: (row) => row['Entity Type'],
          header: 'Entity Type',
        },
      ];
    }

    return [];
  }, [selectedFields, source]);

  const rowCount = previewData.length;

  // Build headers array matching the table columns order
  const headers = useMemo(
    () =>
      columns
        .map((column) => {
          if (typeof column.header === 'string') {
            return column.header;
          }
          if (column.id) {
            return column.id;
          }
          if ('accessorKey' in column && typeof column.accessorKey === 'string') {
            return column.accessorKey;
          }
          return '';
        })
        .filter((header): header is string => header.length > 0),
    [columns]
  );

  const generateCsv = (dataToExport: ReportPreviewRow[]) => {
    const rows = dataToExport.map((r) => {
      const obj: Record<string, unknown> = {};
      for (const h of headers) {
        obj[h] = r[h as keyof typeof r] ?? '';
      }
      return obj;
    });

    const csv = Papa.unparse({ fields: headers, data: rows });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-preview-${new Date().toISOString()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportClick = () => {
    setExportScope('preview');
    setExportModalOpen(true);
  };

  const handleExportSubmit = async () => {
    setIsExporting(true);
    try {
      let dataToExport = previewData;

      if (exportScope === 'all') {
        const result = await fetchReportPreview({
          ...filterState,
          page: 0,
          pageSize: 100000, // Large number to fetch all records
        });
        dataToExport = result.data;
      }

      generateCsv(dataToExport);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Failed to export data:', err);
      // Optional: add a toast notification here
    } finally {
      setIsExporting(false);
    }
  };

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
              onClick={handleExportClick}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!showDataGrid || rowCount === 0}
              onClick={() => setPdfModalOpen(true)}
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
            paginationState={pagination}
            onPaginationChange={setPagination}
            manualPagination={true}
            pageCount={pageCount}
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

      <StandardModal
        isOpen={exportModalOpen}
        onOpenChange={setExportModalOpen}
        title="Export CSV"
        description="Choose whether to export just the current page or all matching records."
        footer={
          <Button onClick={handleExportSubmit} disabled={isExporting}>
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        }
      >
        <div className="space-y-4 py-4">
          <div className="flex items-start space-x-3">
            <input
              type="radio"
              id="export-preview"
              checked={exportScope === 'preview'}
              onChange={() => setExportScope('preview')}
              className="mt-1 size-4 accent-primary"
            />
            <div>
              <label htmlFor="export-preview" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Current Page (Preview)
              </label>
              <p className="text-sm text-muted-foreground">Export just the {rowCount} rows visible on this page.</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="radio"
              id="export-all"
              checked={exportScope === 'all'}
              onChange={() => setExportScope('all')}
              className="mt-1 size-4 accent-primary"
            />
            <div>
              <label htmlFor="export-all" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                All Records
              </label>
              <p className="text-sm text-muted-foreground">Export all matching records using the current filters.</p>
            </div>
          </div>
        </div>
      </StandardModal>

      <GenerateReportPdfModal
        isOpen={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        previewData={previewData}
        headers={headers}
        filterState={filterState}
        source={source}
        generatedBy={generatedBy}
        templateName={templateName}
        reportDescription={reportDescription}
      />
    </div>
  );
}
