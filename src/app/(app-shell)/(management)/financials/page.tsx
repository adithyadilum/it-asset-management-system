import { redirect } from "next/navigation";

export default function FinancialsRootPage() {
  // Automatically bounce users to the first ledger when they click the parent folder
  redirect("/financials/depreciation");
}