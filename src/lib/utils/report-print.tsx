"use client";

import { tiqriToast } from '@/components/shared/sonner';
import { ReportPdfDocument } from '@/components/features/standard-reports/report-pdf-document';
import type { ReportPdfData } from '@/types/standard-reports';

export async function generateAndOpenReportPdf(
  data: ReportPdfData,
  options?: { preview?: boolean; download?: boolean; filename?: string }
): Promise<void> {
  const { pdf } = await import('@react-pdf/renderer');
  const blob = await pdf(<ReportPdfDocument data={data} />).toBlob();
  const blobUrl = URL.createObjectURL(blob);

  // Build a sensible filename: <slugified-title>_<YYYYMMDD_HHMMSS>.pdf
  function slugify(input = '') {
    return input
      .toString()
      .normalize('NFKD')
      .replace(/[\u0300-\u036F]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 120);
  }

  const ts = (() => {
    try {
      const d = new Date(data.generatedAt);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${yy}${mm}${dd}_${hh}${mi}${ss}`;
    } catch {
      return String(Date.now());
    }
  })();

  const defaultName = `${slugify(data.title || 'report')}_${ts}.pdf`;
  const filename = options?.filename ?? defaultName;

  // Trigger download if requested (default true)
  const shouldDownload = options?.download ?? true;
  if (shouldDownload) {
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      // Some browsers require the link to be in the document
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke after a short delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    } catch {
      // fallback: show toast that download failed
      tiqriToast.error('Unable to start download for the PDF.');
      URL.revokeObjectURL(blobUrl);
      return;
    }
  }

  // Optionally open a preview in a new tab (default true)
  const shouldPreview = options?.preview ?? true;
  if (shouldPreview) {
    const viewWindow = window.open(blobUrl, '_blank');

    if (!viewWindow) {
      tiqriToast.error('Popup blocker prevented opening the PDF preview.');
      return;
    }

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
}