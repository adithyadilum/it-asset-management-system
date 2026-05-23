"use client";

import { Font, Image, Page, Document, Text, View, StyleSheet } from '@react-pdf/renderer';

import type { ReportPdfData } from '@/types/standard-reports';

Font.register({
  family: 'Noto Sans',
  fonts: [
    { src: '/fonts/NotoSans-Regular.ttf', fontWeight: 'normal' },
    { src: '/fonts/NotoSans-Bold.ttf', fontWeight: 'bold' },
  ],
});

// Design-system color tokens (kept local to the PDF renderer).
const COLORS = {
  navy: '#0b1b56',
  deepText: '#0f172a',
  teal: '#0f766e',
  brandGreen: '#7cc32b',
  mutedBg: '#f3f4f6',
  mutedText: '#475569',
  border: '#cbd5e1',
  tableZebra: '#f9fafb',
};
const styles = StyleSheet.create({
  page: {
    paddingTop: 104,
    paddingHorizontal: 28,
    paddingBottom: 52,
    backgroundColor: '#ffffff',
    fontFamily: 'Noto Sans',
    fontSize: 9,
    color: COLORS.deepText,
  },
  header: {
    position: 'absolute',
    top: 22,
    left: 28,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.navy,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logo: {
    width: 180,
    height: 64,
  },
  headerTitleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.navy,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.deepText,
    marginBottom: 6,
  },
  metadataBlock: {
    fontSize: 8.5,
    color: COLORS.mutedText,
    lineHeight: 1.4,
  },
  execSummary: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.mutedBg,
  },
  execSummaryTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 6,
    color: COLORS.deepText,
  },
  execSummaryText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  summaryGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    minWidth: 120,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 7.5,
    color: '#64748b',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0f172a',
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
  },
  tableHeaderCell: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    color: '#ffffff',
    fontSize: 8.2,
    fontWeight: 700,
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.18)',
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
  },
  tableRowZebra: {
    backgroundColor: COLORS.tableZebra,
  },
  tableCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#e2e8f0',
    fontSize: 8,
    color: '#334155',
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 28,
    right: 28,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8,
    color: COLORS.mutedText,
  },
  // headerBar removed per design — keep styles minimal
});

function getStatusColor(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'available':
      return '#166534';
    case 'assigned':
      return '#334155';
    case 'new':
      return '#1d4ed8';
    case 'in_repair':
      return '#7e22ce';
    case 'lost':
      return '#b45309';
    case 'defective':
      return '#b91c1c';
    case 'retired':
      return '#57534e';
    case 'disposed':
      return '#475569';
    case 'active':
      return '#4d7c0f';
    case 'inactive':
      return '#475569';
    default:
      return '#334155';
  }
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : '-';
  }

  return String(value);
}

export function ReportPdfDocument({ data }: { data: ReportPdfData }) {
  const orientation = data.headers.length > 7 ? 'landscape' : 'portrait';
  const colWidth = `${Math.max(100 / Math.max(data.headers.length, 1), 8)}%`;

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <View fixed style={styles.header}>
          <View style={styles.headerBrand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt text props */}
            <Image src="/tiqri-logo.png" style={styles.logo} />
            <View style={styles.headerTitleBlock}>
              <Text style={styles.subTitle}>{data.title}</Text>
              <Text style={styles.metadataBlock}>
                Generated: {new Date(data.generatedAt).toLocaleString()}
              </Text>
              <Text style={styles.metadataBlock}>
                By: {data.generatedBy} | Source: {data.dataSource}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.execSummary}>
          <Text style={styles.execSummaryTitle}>Executive Summary</Text>
          <Text style={styles.execSummaryText}>{data.filtersApplied}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryLabel}>Total Records</Text>
              <Text style={styles.summaryValue}>{data.summary.totalRecords}</Text>
            </View>
            {Object.entries(data.summary)
              .filter(([key]) => key !== 'totalRecords')
              .map(([key, value]) => (
                <View key={key} style={styles.summaryChip}>
                  <Text style={styles.summaryLabel}>{key.replace(/([A-Z])/g, ' $1').trim()}</Text>
                  <Text style={styles.summaryValue}>{formatValue(value)}</Text>
                </View>
              ))}
          </View>
        </View>

        <View style={styles.table}>
          <View fixed style={styles.tableHeader}>
            {data.headers.map((header) => (
              <Text key={header} style={[styles.tableHeaderCell, { width: colWidth }]}>
                {header}
              </Text>
            ))}
          </View>

          {data.rows.map((row, index) => (
            <View
              key={row.id ?? `${index}`}
              wrap={false}
              style={index % 2 !== 0 ? [styles.tableRow, styles.tableRowZebra] : styles.tableRow}
            >
              {data.headers.map((header) => {
                const rawValue = row[header];
                const value = formatValue(rawValue);
                const isStatusColumn = header.toLowerCase() === 'status';
                const statusColor = isStatusColumn ? getStatusColor(value) : '#334155';

                return (
                  <Text
                    key={`${row.id}-${header}`}
                    style={[
                      styles.tableCell,
                      { width: colWidth, color: statusColor, borderRightWidth: header === data.headers[data.headers.length - 1] ? 0 : 0.5 },
                    ]}
                  >
                    {value}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>

        <View fixed style={styles.footer}>
          <Text>Confidential — Internal TIQRI Use Only</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}