import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuditLogs } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can view audit logs" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    const filters = {
      goalId: searchParams.get("goalId") || undefined,
      userId: searchParams.get("userId") || undefined,
      userSearch: searchParams.get("userSearch") || undefined,
      action: searchParams.get("action") || undefined,
      startDate: searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined,
      endDate: searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 20,
      offset: searchParams.get("offset")
        ? parseInt(searchParams.get("offset")!)
        : 0,
    };

    const { logs, total } = await getAuditLogs(filters);

    return NextResponse.json({ logs, total, filters });
  } catch (error: any) {
    console.error("Get audit logs error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
