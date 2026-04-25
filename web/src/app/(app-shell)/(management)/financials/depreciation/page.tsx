import { getDepreciationLedger } from "@/actions/financials";
import { DepreciationLedger } from "@/components/features/financials/depreciation-ledger";

export const metadata = {
  title: "Depreciation Ledger | Tiqri Assets",
};

export default async function DepreciationLedgerPage() {
  const data = await getDepreciationLedger();

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1 className="text-2xl font-semibold text-slate-900">Depreciation Ledger</h1>
      <DepreciationLedger initialData={data} />
    </div>
  );
}