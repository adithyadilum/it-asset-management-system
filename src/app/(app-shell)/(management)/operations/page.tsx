import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/actions/auth";

export default async function OperationsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === 'FinanceAuditor') {
    redirect("/operations/maintenance");
  }
  
  redirect("/operations/assignments");
}
