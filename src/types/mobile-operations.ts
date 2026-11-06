import type { mobileTaskKinds } from '@/lib/validations/mobile-operations';
export type MobileTaskKind = (typeof mobileTaskKinds)[number];
export interface MobileTask {
  id: string;
  kind: MobileTaskKind;
  assetId: string;
  assetTag: string;
  name: string;
  model: string;
  imageUrl: string | null;
  pillar: string;
  assignmentId: number | null;
  custodian: string | null;
  dueDate: string | null;
  status: string;
  detail: string;
}
export interface MobileTasksResult {
  data: MobileTask[];
  counts: Record<MobileTaskKind, number>;
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}
