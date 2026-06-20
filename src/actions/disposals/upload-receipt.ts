'use server';

import { getAuthenticatedUser } from '@/actions/auth';
import { requireAccess, canManageAssets } from '@/lib/auth/roles';
import { uploadFileToStorage } from '@/lib/storage';
import { logLatency, startLatencyTimer } from '@/lib/latency';

export async function uploadDisposalReceipt(formData: FormData) {
  const actionTimer = startLatencyTimer();
  const user = await getAuthenticatedUser();

  if (!user) return { success: false, message: 'UNAUTHENTICATED' };
  try {
    requireAccess(user, canManageAssets);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Forbidden',
    };
  }

  try {
    const file = formData.get('file') as File | null;
    if (!file) throw new Error('No file provided in the payload.');

    const storageTimer = startLatencyTimer();
    const uploadedUrl = await uploadFileToStorage(file, 'disposals');

    logLatency({
      scope: 'STORAGE',
      label: 'disposals.uploadReceipt',
      startTime: storageTimer,
    });

    return {
      success: true,
      url: uploadedUrl,
      fileUrl: uploadedUrl,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Upload failed.',
    };
  } finally {
    logLatency({
      scope: 'ACTION',
      label: 'disposals.uploadReceipt',
      startTime: actionTimer,
    });
  }
}
