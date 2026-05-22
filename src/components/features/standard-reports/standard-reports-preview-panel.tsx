'use client';

import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ChevronRight, Download, Filter } from 'lucide-react';
import Papa from 'papaparse';
import { pdf, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TYPOGRAPHY_CLASSNAMES } from '@/components/shared/typography';
import { DataTable } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import type { ReportPreviewRow } from '@/types/standard-reports';

import type { PaginationState, OnChangeFn } from '@tanstack/react-table';

interface StandardReportsPreviewPanelProps {
  showDataGrid: boolean;
  previewData: ReportPreviewRow[];
  isLoading: boolean;
  errorMessage?: string | null;
  selectedFields: string[];
  source: string;
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
  pagination,
  setPagination,
  pageCount,
}: StandardReportsPreviewPanelProps) {
  const columns = useMemo<ColumnDef<ReportPreviewRow>[]>(() => {
    // If we have specific fields from a template, use them
    if (selectedFields && selectedFields.length > 0) {
      return selectedFields.map((field) => ({
        accessorKey: field,
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
        { accessorKey: 'Asset ID', header: 'Asset ID' },
        {
          accessorKey: 'Asset Name',
          header: 'Asset Name',
          cell: ({ row }) => toCellText(row.original['Asset Name']),
        },
        { accessorKey: 'Category', header: 'Category' },
        {
          accessorKey: 'Assigned To',
          header: 'Assigned to',
          cell: ({ row }) => toCellText(row.original['Assigned To']),
        },
        {
          accessorKey: 'Status',
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
        { accessorKey: 'Record ID', header: 'Record ID' },
        { accessorKey: 'Type', header: 'Type' },
        { accessorKey: 'Name', header: 'Name' },
        { accessorKey: 'Description', header: 'Description' },
        {
          accessorKey: 'Status',
          header: 'Status',
          cell: ({ row }) => (
            <StatusBadge value={row.original['Status'] as string} showIcon />
          ),
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
          if ('accessorKey' in column && typeof column.accessorKey === 'string') {
            return column.accessorKey;
          }
          return '';
        })
        .filter((header): header is string => header.length > 0),
    [columns]
  );

  const generateCsv = () => {
    const rows = previewData.map((r) => {
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

  const styles = StyleSheet.create({
    page: { padding: 12, fontSize: 10 },
    headerRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 6 },
    row: { flexDirection: 'row', borderBottomWidth: 0.3, paddingVertical: 4 },
    cell: { flex: 1, paddingRight: 6 },
    title: { fontSize: 12, marginBottom: 8 },
  });

  const ReportPdfDocument = ({ title, headers, data }: { title: string; headers: string[]; data: ReportPreviewRow[] }) => (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerRow}>
          {headers.map((h, i) => (
            // approximate equal widths
            <Text key={String(i)} style={[styles.cell, { flex: 1 }]}>
              {h}
            </Text>
          ))}
        </View>
        {data.map((row, ri) => (
          <View style={styles.row} key={String(ri)}>
            {headers.map((h, ci) => (
              <Text key={String(ci)} style={[styles.cell, { flex: 1 }]}>
                {String(row[h] ?? '-')}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );

  const generatePdf = async () => {
    try {
      const blob = await pdf(<ReportPdfDocument title="Report Preview" headers={headers} data={previewData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-preview-${new Date().toISOString()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF', err);
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
              onClick={generateCsv}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!showDataGrid || rowCount === 0}
              onClick={generatePdf}
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
    </div>
  );
}
