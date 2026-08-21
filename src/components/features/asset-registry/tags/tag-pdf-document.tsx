import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from '@react-pdf/renderer';

// Define standard styles for the PDF
const styles = StyleSheet.create({
  pageA4: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  pageThermal: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 0,
    margin: 0,
  },
  tagContainerA4: {
    width: '33.33%', // 3 columns
    height: '10%', // 10 rows
    padding: 5,
  },
  tagContent: {
    flex: 1,
    flexDirection: 'row',
    border: '1pt solid #e2e8f0',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagContentThermal: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    border: '1pt solid #e2e8f0',
    borderRadius: 4,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    flex: 1,
    // react-pdf's Yoga layout defaults flexShrink to 0, so without these a long
    // model name grew this column past its share of the row and pushed the QR
    // code to the right -- clean off a 144x72pt thermal label. minWidth lets
    // the column shrink below its content's intrinsic width.
    flexShrink: 1,
    minWidth: 0,
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 1,
  },
  brandLogo: {
    width: 36,
    height: 18,
    objectFit: 'contain',
  },
  brandLogoThermal: {
    width: 28,
    height: 14,
    objectFit: 'contain',
  },
  assetInfo: {
    flexDirection: 'column',
  },
  assetId: {
    fontFamily: 'Courier',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 1,
  },
  assetIdThermal: {
    fontFamily: 'Courier',
    fontSize: 9,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 1,
  },
  assetModel: {
    fontSize: 7,
    color: '#475569',
    maxWidth: 70,
    // Keeps a long model name on one line and ellipsises the rest. Without it
    // the text wraps and, on a fixed-height thermal label, pushes the asset ID
    // out of the printable area.
    maxLines: 1,
    textOverflow: 'ellipsis',
  },
  assetModelThermal: {
    fontSize: 5,
    color: '#475569',
    maxWidth: 55,
    maxLines: 1,
    textOverflow: 'ellipsis',
  },
  qrCode: {
    width: 48,
    height: 48,
    // The QR is the one thing on the tag that must not be resized or clipped:
    // scanning depends on it.
    flexShrink: 0,
  },
  qrCodeThermal: {
    width: 40,
    height: 40,
    flexShrink: 0,
  },
});

export interface TagPdfDocumentProps {
  assetIds: string[];
  format: 'a4' | 'thermal';
  originUrl?: string;
  // Optional pre-generated QR base64 data URLs for each asset ID to support offline/secure generation
  qrDataUrls?: Record<string, string>;
  // Mapping of assetId to modelName for dynamic printing
  modelNames?: Record<string, string>;
}

// Sub-component for individual tag
const AssetTag = ({
  assetId,
  modelName = 'Standard Model',
  origin,
  qrDataUrl,
  format,
}: {
  assetId: string;
  modelName?: string;
  origin: string;
  qrDataUrl?: string;
  format: 'a4' | 'thermal';
}) => {
  const targetUrl = `${origin}/assets/${assetId}`;
  // Fallback URL if local generation fails, though local is preferred for security/privacy
  const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;
  const isThermal = format === 'thermal';

  return (
    <View
      wrap={false}
      style={isThermal ? styles.tagContentThermal : styles.tagContent}
    >
      <View style={styles.leftColumn}>
        <View style={styles.brandSection}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image
            style={isThermal ? styles.brandLogoThermal : styles.brandLogo}
            src="/tiqri-logo.png"
          />
        </View>
        <View style={styles.assetInfo}>
          <Text style={isThermal ? styles.assetIdThermal : styles.assetId}>
            {assetId}
          </Text>
          <Text
            style={isThermal ? styles.assetModelThermal : styles.assetModel}
          >
            {modelName}
          </Text>
        </View>
      </View>
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image
        style={isThermal ? styles.qrCodeThermal : styles.qrCode}
        src={qrDataUrl || fallbackQrUrl}
      />
    </View>
  );
};

export function TagPdfDocument({
  assetIds,
  format,
  originUrl = 'https://tiqri.com',
  qrDataUrls = {},
  modelNames = {},
}: TagPdfDocumentProps) {
  // Thermal format: 2" x 1" roughly corresponds to 144 x 72 points (72dpi standard)
  const thermalPageSize: [number, number] = [144, 72];

  if (format === 'thermal') {
    return (
      <Document>
        {assetIds.map((assetId) => (
          <Page
            key={assetId}
            size={thermalPageSize}
            style={styles.pageThermal}
            wrap={false}
          >
            <AssetTag
              assetId={assetId}
              modelName={modelNames[assetId]}
              origin={originUrl}
              qrDataUrl={qrDataUrls[assetId]}
              format="thermal"
            />
          </Page>
        ))}
      </Document>
    );
  }

  // A4 format: Chunk assets into pages of 30 (3 columns * 10 rows per page)
  const ITEM_PER_PAGE = 30;
  const pages = [];
  for (let i = 0; i < assetIds.length; i += ITEM_PER_PAGE) {
    pages.push(assetIds.slice(i, i + ITEM_PER_PAGE));
  }

  return (
    <Document>
      {pages.map((pageAssets, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" style={styles.pageA4}>
          {pageAssets.map((assetId) => (
            <View key={assetId} style={styles.tagContainerA4}>
              <AssetTag
                assetId={assetId}
                modelName={modelNames[assetId]}
                origin={originUrl}
                qrDataUrl={qrDataUrls[assetId]}
                format="a4"
              />
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}

export default TagPdfDocument;
