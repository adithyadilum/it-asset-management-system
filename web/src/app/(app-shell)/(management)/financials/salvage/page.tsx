import { getWriteOffsLedger } from "@/actions/financials";
import { WriteOffsLedger } from "@/components/features/financials/write-offs-ledger";

export const metadata = {
  title: "Write-Offs & Salvage | Tiqri Assets",
};

export default async function SalvageLedgerPage() {
  // 1. Pass the initial pagination parameters
  const response = await getWriteOffsLedger({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto"> 
      <h1 className="text-2xl font-semibold text-slate-900">Write-Offs & Salvage</h1>
      {/* 2. Pass ONLY the array slice to initialData */}
      <WriteOffsLedger initialData={response.data} />
    </div>
  );
}