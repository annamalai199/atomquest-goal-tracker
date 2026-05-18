import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  // Redirect to role-specific dashboard
  const role = session.user.role;

  if (role === "EMPLOYEE") {
    redirect("/dashboard/employee");
  } else if (role === "MANAGER") {
    redirect("/dashboard/manager");
  } else if (role === "ADMIN") {
    redirect("/dashboard/admin");
  }

  // Fallback
  redirect("/dashboard/employee");
}
