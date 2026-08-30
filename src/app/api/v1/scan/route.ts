import { withRateLimit } from '@/lib/api/with-rate-limit';
import { NextResponse } from 'next/server';
import { getAssetDetailsById } from '@/lib/data/asset-details-repo';
import { redactAssetDetailsForRole } from '@/lib/data/redact-asset-details';
import { withAuth } from '@/lib/api/with-auth';
import { canViewAssetRegistry } from '@/lib/auth/roles';

function trimTrailingSlashes(value: string) {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(0, end);
}

// Scanning returns the full asset record, so it requires registry access —
// authentication alone would expose every asset to Employee principals.
export const POST = withRateLimit(
  'scan',
  withAuth(canViewAssetRegistry, async (req, { user }) => {
    let assetTag: string | null = null;
    try {
      const body = await req.json();
      let rawTag = body.assetTag;
      if (typeof rawTag === 'string') {
        // If the QR code contains a full URL (e.g. https://.../assets/LAP-001)
        if (rawTag.includes('/assets/')) {
          rawTag = rawTag.split('/assets/').pop()?.split('?')[0] || rawTag;
        }
        // Clean up any trailing slashes or spaces
        assetTag = trimTrailingSlashes(rawTag.trim());
      }
    } catch {
      // ignore
    }

    if (!assetTag) {
      return NextResponse.json(
        { error: 'Asset tag is required' },
        { status: 400 }
      );
    }

    const assetDetails = await getAssetDetailsById(assetTag);

    if (!assetDetails) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Asset Scanned Successfully',
      data: redactAssetDetailsForRole(assetDetails, user.role),
    });
  })
);
