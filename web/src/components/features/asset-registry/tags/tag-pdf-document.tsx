import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

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
        padding: 5,
    },
    tagContainerA4: {
        width: '33.33%', // 3 columns
        height: '10%',   // 10 rows
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
    leftColumn: {
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        flex: 1,
    },
    brandSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    brandLogo: {
        width: 40,
        height: 22,
        objectFit: 'contain',
    },
    brandText: {
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
        color: '#0f172a',
    },
    assetInfo: {
        flexDirection: 'column',
    },
    assetId: {
        fontFamily: 'Courier',
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    assetModel: {
        fontSize: 8,
        color: '#475569',
        marginTop: 2,
    },
    qrCode: {
        width: 50,
        height: 50,
    }
});

export interface TagPdfDocumentProps {
    assetIds: string[];
    format: 'a4' | 'thermal';
    originUrl?: string;
    // Optional pre-generated QR base64 data URLs for each asset ID to support offline/secure generation
    qrDataUrls?: Record<string, string>;
}

// Sub-component for individual tag
const AssetTag = ({ assetId, origin, qrDataUrl }: { assetId: string, origin: string, qrDataUrl?: string }) => {
    const targetUrl = `${origin}/assets/${assetId}`;
    const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(targetUrl)}`;

    return (
        <View style={styles.tagContent}>
            <View style={styles.leftColumn}>
                <View style={styles.brandSection}>
                    <Text style={styles.brandText}>TIQRI</Text>
                </View>
                <View style={styles.assetInfo}>
                    <Text style={styles.assetId}>{assetId}</Text>
                    <Text style={styles.assetModel}>Standard Model</Text>
                </View>
            </View>
            <Image
                style={styles.qrCode}
                src={qrDataUrl || fallbackQrUrl}
            />
        </View>
    );
};

export function TagPdfDocument({ assetIds, format, originUrl = 'https://tiqri.com', qrDataUrls = {} }: TagPdfDocumentProps) {
    // Thermal format: 2" x 1" roughly corresponds to 144 x 72 points
    // We'll use 288 x 144 points (4" x 2") for better PDF resolution scaling if needed, 
    // or standard 144x72. Let's use 144x72 for 2x1 inches.
    const thermalPageSize: [number, number] = [144, 72];

    if (format === 'thermal') {
        return (
            <Document>
                {assetIds.map((assetId) => (
                    <Page key={assetId} size={thermalPageSize} style={styles.pageThermal}>
                        <AssetTag assetId={assetId} origin={originUrl} qrDataUrl={qrDataUrls[assetId]} />
                    </Page>
                ))}
            </Document>
        );
    }

    // A4 format: Chunk into arrays of 30 (3 cols * 10 rows)
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
                            <AssetTag assetId={assetId} origin={originUrl} qrDataUrl={qrDataUrls[assetId]} />
                        </View>
                    ))}
                </Page>
            ))}
        </Document>
    );
}

export default TagPdfDocument;