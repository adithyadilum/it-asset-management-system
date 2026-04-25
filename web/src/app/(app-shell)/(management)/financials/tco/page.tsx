import { getTCOLedger } from "@/actions/financials";
import { TCOLedger } from "@/components/features/financials/tco-ledger";

export const metadata = {
  title: "Total Cost of Ownership | Tiqri Assets",
};

export default async function TCOLedgerPage() {
  const data = await getTCOLedger();

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-y-auto">
      <h1 className="text-2xl font-semibold text-slate-900">Total Cost of Ownership (TCO)</h1>
      <TCOLedger initialData={data} />
    </div>
  );
}