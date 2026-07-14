'use client';

import {
  Font,
  Image,
  Page,
  Document,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';

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
    paddingTop: 82,
    paddingHorizontal: 28,
    paddingBottom: 46,
    backgroundColor: '#ffffff',
    fontFamily: 'Noto Sans',
    fontSize: 9,
    color: COLORS.deepText,
  },
  header: {
    position: 'absolute',
    top: 20,
    left: 28,
    right: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 89,
    height: 50,
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.navy,
    marginBottom: 2,
  },
  metadataBlock: {
    fontSize: 8,
    color: COLORS.mutedText,
    lineHeight: 1.4,
  },
  cover: {
    marginTop: 14,
    gap: 14,
  },
  coverHeading: {
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.deepText,
  },
  coverSubheading: {
    fontSize: 9,
    color: COLORS.mutedText,
    marginTop: 2,
  },
  infoGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoCard: {
    minWidth: 140,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 7.5,
    color: COLORS.mutedText,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.navy,
  },
  coverPanel: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.mutedBg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  coverPanelTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLORS.deepText,
    marginBottom: 6,
  },
  coverPanelText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.45,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  filterCard: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4f0',
    backgroundColor: '#ffffff',
    minHeight: 40,
  },
  filterLabel: {
    color: COLORS.mutedText,
    fontSize: 7.5,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  filterValue: {
    color: COLORS.navy,
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1.3,
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
    bottom: 14,
    left: 28,
    right: 28,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8,
    color: COLORS.mutedText,
  },
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
  const coverColumnWidth = orientation === 'landscape' ? '31%' : '48%';
  const generatedAtLabel = new Date(data.generatedAt).toLocaleString();
  const summaryItems = [
    { label: 'Generated By', value: data.generatedBy },
    { label: 'Primary Data Source', value: data.dataSource },
    { label: 'No. of Records', value: data.summary.totalRecords },
    { label: 'Filtered Items', value: data.rows.length },
  ];

  return (
    <Document>
      <Page size="A4" orientation={orientation} style={styles.page}>
        <View fixed style={styles.header}>
          <View style={styles.headerBrand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt text props */}
            <Image src="/tiqri-logo.png" style={styles.logo} />
            <View style={styles.headerTitleBlock}>
              <Text style={styles.title}>{data.title}</Text>
              <Text style={styles.metadataBlock}>{generatedAtLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cover}>
          <View>
            <Text style={styles.coverHeading}>{data.title}</Text>
            <Text style={styles.coverSubheading}>
              Report overview and generation details
            </Text>
          </View>

          <View style={styles.infoGrid}>
            {summaryItems.map((item) => (
              <View key={item.label} style={styles.infoCard}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{formatValue(item.value)}</Text>
              </View>
            ))}
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>Pages in Report</Text>
              <Text
                style={styles.infoValue}
                render={({ totalPages }) => String(totalPages)}
              />
            </View>
          </View>

          <View style={styles.coverPanel}>
            <Text style={styles.coverPanelTitle}>Report Description</Text>
            <Text style={styles.coverPanelText}>
              {data.description?.trim().length
                ? data.description
                : 'No report description provided.'}
            </Text>
          </View>

          <View style={styles.coverPanel}>
            <Text style={styles.coverPanelTitle}>Applied Filters</Text>
            <View style={styles.filterGrid}>
              {(data.filterDetails?.length
                ? data.filterDetails
                : [{ label: 'Filters', value: data.filtersApplied }]
              ).map((item) => (
                <View
                  key={item.label}
                  style={[styles.filterCard, { width: coverColumnWidth }]}
                >
                  <Text style={styles.filterLabel}>{item.label}</Text>
                  <Text style={styles.filterValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View fixed style={styles.footer}>
          <Text>Confidential - Internal TIQRI Use Only</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>

      <Page size="A4" orientation={orientation} style={styles.page}>
        <View fixed style={styles.header}>
          <View style={styles.headerBrand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image does not support alt text props */}
            <Image src="/tiqri-logo.png" style={styles.logo} />
            <View style={styles.headerTitleBlock}>
              <Text style={styles.title}>{data.title}</Text>
              <Text style={styles.metadataBlock}>{generatedAtLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View fixed style={styles.tableHeader}>
            {data.headers.map((header) => (
              <Text
                key={header}
                style={[styles.tableHeaderCell, { width: colWidth }]}
              >
                {header}
              </Text>
            ))}
          </View>

          {data.rows.map((row, index) => (
            <View
              key={row.id ?? `${index}`}
              wrap={false}
              style={
                index % 2 !== 0
                  ? [styles.tableRow, styles.tableRowZebra]
                  : styles.tableRow
              }
            >
              {data.headers.map((header) => {
                const rawValue = row[header];
                const value = formatValue(rawValue);
                const isStatusColumn = header.toLowerCase() === 'status';
                const statusColor = isStatusColumn
                  ? getStatusColor(value)
                  : '#334155';

                return (
                  <Text
                    key={`${row.id}-${header}`}
                    style={[
                      styles.tableCell,
                      {
                        width: colWidth,
                        color: statusColor,
                        borderRightWidth:
                          header === data.headers[data.headers.length - 1]
                            ? 0
                            : 0.5,
                      },
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
          <Text>Confidential - Internal TIQRI Use Only</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
