import { getDepreciationLedger } from "@/actions/financials";
import { DepreciationLedger } from "@/components/features/financials/depreciation-ledger";

export const metadata = {
  title: "Depreciation Ledger | Tiqri Assets",
};

export default async function DepreciationLedgerPage() {
  // 1. Pass the initial pagination parameters
  const response = await getDepreciationLedger({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1 className="text-2xl font-semibold text-slate-900">Depreciation Ledger</h1>
      {/* 2. Pass ONLY the array slice to initialData */}
      <DepreciationLedger initialData={response.data} />
    </div>
  );
}