import TagPdfDocument from '@/components/features/asset-registry/tags/tag-pdf-document';
import { tiqriToast } from '@/components/shared/sonner';

export interface GenerateTagPdfOptions {
  assetIds: string[];
  format: 'a4' | 'thermal';
  modelNames?: Record<string, string>;
}

/**
 * Generates a tag PDF, opens it in a new tab, and triggers the browser print
 * dialog. Handles blob URL cleanup to prevent memory leaks.
 *
 * QR code data URLs are generated locally via the `qrcode` library so the PDF
 * renderer never reaches out to a third-party API.
 */
export async function generateAndPrintTagPdf({
  assetIds,
  format,
  modelNames = {},
}: GenerateTagPdfOptions): Promise<void> {
  const originUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://assets.tiqri.com';

  const [QRCodeModule, { pdf }] = await Promise.all([
    import('qrcode'),
    import('@react-pdf/renderer'),
  ]);
  const QRCode = QRCodeModule.default;

  // Pre-generate QR data URLs locally to avoid hitting third-party APIs
  // This ensures offline capability and privacy for asset URLs.
  const qrDataUrls: Record<string, string> = {};
  await Promise.all(
    assetIds.map(async (assetId) => {
      const targetUrl = `${originUrl}/assets/${assetId}`;

      qrDataUrls[assetId] = await QRCode.toDataURL(targetUrl, {
        width: 150,
        margin: 0,
        errorCorrectionLevel: 'M', // Medium error correction for robustness
      });
    })
  );

  const blob = await pdf(
    <TagPdfDocument
      assetIds={assetIds}
      format={format}
      originUrl={originUrl}
      qrDataUrls={qrDataUrls}
      modelNames={modelNames}
    />
  ).toBlob();

  const blobUrl = URL.createObjectURL(blob);
  const printWindow = window.open(blobUrl, '_blank');

  if (printWindow) {
    // Revoke the blob URL after the window finishes printing to prevent
    // memory leaks (especially important for bulk prints with 30+ assets).
    printWindow.addEventListener('afterprint', () =>
      URL.revokeObjectURL(blobUrl)
    );

    printWindow.onload = () => {
      printWindow.print(); // Auto-trigger print dialog on load
    };
  } else {
    URL.revokeObjectURL(blobUrl);
    tiqriToast.error(
      'Popup blocker prevented opening the print window.'
    );
  }
}
