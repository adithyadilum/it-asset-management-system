import { NextResponse } from 'next/server';
import { getAssetDetailsById } from '@/lib/data/asset-details-repo';
import { getAuthenticatedUserFromRequest } from '@/lib/auth/get-authenticated-user';

function trimTrailingSlashes(value: string) {
  let end = value.length;

  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end -= 1;
  }

  return value.slice(0, end);
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 4. Execute Business Logic ---
  console.log(`Scan initiated by user ${user.id} with role ${user.role}`);

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
    data: assetDetails,
  });
}
