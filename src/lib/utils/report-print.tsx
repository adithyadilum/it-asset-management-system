"use client";

import { pdf } from '@react-pdf/renderer';

import { tiqriToast } from '@/components/shared/sonner';
import { ReportPdfDocument } from '@/components/features/standard-reports/report-pdf-document';
import type { ReportPdfData } from '@/types/standard-reports';

export async function generateAndOpenReportPdf(data: ReportPdfData): Promise<void> {
  const blob = await pdf(<ReportPdfDocument data={data} />).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');

  if (!printWindow) {
    URL.revokeObjectURL(blobUrl);
    tiqriToast.error('Popup blocker prevented opening the print window.');
    return;
  }

  const cleanup = () => {
    URL.revokeObjectURL(blobUrl);
    printWindow.removeEventListener('afterprint', cleanup);
  };

  printWindow.addEventListener('afterprint', cleanup);
  printWindow.onload = () => {
    printWindow.print();
  };
}