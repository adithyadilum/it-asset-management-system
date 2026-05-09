import { redirect } from "next/navigation";

export default function RootPage() {
  // Automatically bounce users from the root URL to your default app page
  redirect("/dashboard");
}