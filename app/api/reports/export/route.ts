import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDepartment } from "@/lib/utils";
import * as XLSX from "xlsx";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return new Response("Forbidden", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get("department");
    const quarter = searchParams.get("quarter");

    // Normalize department filter if provided
    const normalizedDept = department ? normalizeDepartment(department) : null;

    // Fetch all goals with checkins
    const goals = await prisma.goal.findMany({
      where: {
        ...(normalizedDept ? { employee: { department: normalizedDept } } : {}),
        status: { in: ["APPROVED", "LOCKED"] },
      },
      include: {
        employee: {
          select: { name: true, department: true },
        },
        manager: {
          select: { name: true },
        },
        thrustArea: {
          select: { name: true },
        },
        checkIns: true,
      },
    });

    // Build rows
    const rows = goals.map((goal) => ({
      Employee: goal.employee.name,
      Department: goal.employee.department || "-",
      Manager: goal.manager?.name || "-",
      "Goal Title": goal.title,
      "Thrust Area": goal.thrustArea.name,
      UoM: goal.uom,
      Target: goal.target,
      "Weightage %": goal.weightage,
      "Q1 Score": goal.checkIns.find((c) => c.quarter === "Q1")?.progressScore ?? "-",
      "Q2 Score": goal.checkIns.find((c) => c.quarter === "Q2")?.progressScore ?? "-",
      "Q3 Score": goal.checkIns.find((c) => c.quarter === "Q3")?.progressScore ?? "-",
      "Q4 Score": goal.checkIns.find((c) => c.quarter === "Q4")?.progressScore ?? "-",
      Status: goal.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Achievement Report");

    // Auto column widths
    const maxWidths = Object.keys(rows[0] || {}).map((k) => ({
      wch: Math.max(k.length + 2, 15),
    }));
    ws["!cols"] = maxWidths;

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const date = new Date().toISOString().split("T")[0];

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="AtomQuest_Report_${date}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Export error:", error);
    return new Response("Failed to export report", { status: 500 });
  }
}
