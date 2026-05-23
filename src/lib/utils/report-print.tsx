"use client";

import { pdf } from '@react-pdf/renderer';

import { tiqriToast } from '@/components/shared/sonner';
import { ReportPdfDocument } from '@/components/features/standard-reports/report-pdf-document';
import type { ReportPdfData } from '@/types/standard-reports';

export async function generateAndOpenReportPdf(data: ReportPdfData): Promise<void> {
  const blob = await pdf(<ReportPdfDocument data={data} />).toBlob();
  const blobUrl = URL.createObjectURL(blob);
  const viewWindow = window.open(blobUrl, '_blank');

  if (!viewWindow) {
    URL.revokeObjectURL(blobUrl);
    tiqriToast.error('Popup blocker prevented opening the PDF.');
    return;
  }

  // Do not auto-open the print dialog per user preference.
  // Revoke the blob URL once the user closes the tab/window.
  const poll = setInterval(() => {
    try {
      if (viewWindow.closed) {
        clearInterval(poll);
        URL.revokeObjectURL(blobUrl);
      }
    } catch {
      // ignore cross-origin access errors
    }
  }, 1000);
}