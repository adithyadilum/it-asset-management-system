import { getTCOLedger } from "@/actions/financials";
import { TCOLedger } from "@/components/features/financials/tco-ledger";

export const metadata = {
  title: "Total Cost of Ownership | Tiqri Assets",
};

export default async function TCOLedgerPage() {
  // 1. Pass the initial pagination parameters
  const response = await getTCOLedger({ page: 1, pageSize: 16 });

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1 className="text-2xl font-semibold text-slate-900">Total Cost of Ownership (TCO)</h1>
      {/* 2. Pass ONLY the array slice to initialData */}
      <TCOLedger initialData={response.data} />
    </div>
  );
}