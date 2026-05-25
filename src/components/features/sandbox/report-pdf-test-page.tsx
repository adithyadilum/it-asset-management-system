"use client";

import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { GenerateReportPdfModal } from '@/components/features/standard-reports/generate-report-pdf-modal';
import { generateAndOpenReportPdf } from '@/lib/utils/report-print';
import type { ReportPdfData } from '@/types/standard-reports';

type SandboxPdfDataset = {
  label: string;
  data: ReportPdfData;
};

function buildSixColumnMockData(): ReportPdfData {
  const rows = Array.from({ length: 40 }, (_, index) => {
    const statuses = ['Available', 'Assigned', 'In Repair', 'Lost', 'Active', 'Inactive', 'Retired', 'Disposed'];
    return {
      id: `asset-${index + 1}`,
      'Asset ID': `AST-${String(index + 1).padStart(4, '0')}`,
      'Asset Name': `Latitude ${index % 2 === 0 ? '5420' : '7430'} ${index + 1}`,
      Category: index % 3 === 0 ? 'Laptop' : index % 3 === 1 ? 'Monitor' : 'Peripheral',
      Location: index % 2 === 0 ? 'Colombo HQ' : 'Kandy Branch',
      Status: statuses[index % statuses.length],
      'Assigned To': index % 4 === 0 ? 'Mark Silva' : index % 4 === 1 ? 'Nimali Perera' : '-',
    };
  });

  return {
    title: 'IT Asset Inventory — Q2 2026',
    generatedBy: 'Adithya Dilum',
    generatedAt: new Date().toISOString(),
    filtersApplied: 'Type: Hardware | Location: Colombo HQ | Status: All',
    dataSource: 'Assets',
    summary: { totalRecords: rows.length, activeAssets: 24, totalValue: 'LKR 12,450,000' },
    headers: ['Asset ID', 'Asset Name', 'Category', 'Location', 'Status', 'Assigned To'],
    rows,
  };
}

function buildTenColumnMockData(): ReportPdfData {
  const rows = Array.from({ length: 32 }, (_, index) => {
    const statuses = ['Available', 'Assigned', 'New', 'In Repair', 'Lost', 'Defective', 'Retired', 'Disposed', 'Active', 'Inactive'];
    return {
      id: `asset-wide-${index + 1}`,
      'Asset ID': `AST-${String(index + 100).padStart(4, '0')}`,
      'Asset Name': `ThinkPad T14 Gen ${index % 3 === 0 ? '2' : '3'}`,
      Category: 'Laptop',
      Brand: 'Lenovo',
      Model: `T14-${index + 1}`,
      Location: index % 2 === 0 ? 'Colombo HQ' : 'Jaffna Office',
      Status: statuses[index % statuses.length],
      'Purchase Date': `2025-${String((index % 9) + 1).padStart(2, '0')}-15`,
      'Purchase Cost': `LKR ${Number(280000 + index * 3500).toLocaleString('en-US')}`,
    };
  });

  return {
    title: 'IT Asset Inventory — Wide Layout Test',
    generatedBy: 'Adithya Dilum',
    generatedAt: new Date().toISOString(),
    filtersApplied: 'Type: Hardware | Location: All | Status: All',
    dataSource: 'Assets',
    summary: { totalRecords: rows.length, activeAssets: 18, totalValue: 'LKR 9,840,000' },
    headers: [
      'Asset ID',
      'Asset Name',
      'Category',
      'Brand',
      'Model',
      'Location',
      'Status',
      'Purchase Date',
      'Purchase Cost',
      'Assigned To',
    ],
    rows: rows.map((row, index) => ({
      ...row,
      'Assigned To': index % 3 === 0 ? 'Mark Silva' : index % 3 === 1 ? 'Nimali Perera' : 'Suresh Fernando',
    })),
  };
}

const MOCK_REPORT_DATA = buildSixColumnMockData();
const WIDE_REPORT_DATA = buildTenColumnMockData();

export function ReportPdfTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDataset, setActiveDataset] = useState<SandboxPdfDataset>({
    label: '6 columns',
    data: MOCK_REPORT_DATA,
  });

  const activePreviewCount = useMemo(() => activeDataset.data.rows.length, [activeDataset.data.rows.length]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4">
        <CardTitle className="text-base font-medium text-card-foreground">PDF Report Sandbox</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Generate mock report PDFs without waiting for live filtering and export wiring.
        </CardDescription>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            setActiveDataset({ label: '6 columns', data: MOCK_REPORT_DATA });
            setModalOpen(true);
          }}
        >
          Generate PDF (6 columns)
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setActiveDataset({ label: '10 columns', data: WIDE_REPORT_DATA });
            setModalOpen(true);
          }}
        >
          Generate PDF (10 columns)
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => void generateAndOpenReportPdf(activeDataset.data)}
        >
          Direct PDF (skip modal)
        </Button>
      </div>

      <div className="mt-4 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Current dataset</p>
        <p>{activeDataset.label} | {activePreviewCount} rows | {activeDataset.data.headers.length > 7 ? 'Landscape' : 'Portrait'} orientation</p>
      </div>

      <GenerateReportPdfModal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        previewData={activeDataset.data.rows}
        headers={activeDataset.data.headers}
        filterState={{
          source: activeDataset.data.dataSource,
          assetType: '',
          category: '',
          location: '',
          status: '',
          masterDataType: '',
          dateFrom: '',
          dateTo: '',
        }}
        source={activeDataset.data.dataSource}
        generatedBy={activeDataset.data.generatedBy}
        templateName={activeDataset.data.title}
      />
    </div>
  );
}