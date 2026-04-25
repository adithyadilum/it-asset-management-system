import { getWriteOffsLedger } from "@/actions/financials";
import { WriteOffsLedger } from "@/components/features/financials/write-offs-ledger";

export const metadata = {
  title: "Write-Offs & Salvage | Tiqri Assets",
};

export default async function SalvageLedgerPage() {
  const data = await getWriteOffsLedger();

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto"> 
      <h1 className="text-2xl font-semibold text-slate-900">Write-Offs & Salvage</h1>
      <WriteOffsLedger initialData={data} />
    </div>
  );
}