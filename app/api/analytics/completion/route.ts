import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        manager: { select: { name: true } },
        goals: {
          select: {
            checkIns: { select: { quarter: true } },
          },
        },
      },
    });

    const data = employees.map((emp) => {
      const allCheckIns = emp.goals.flatMap((g) => g.checkIns);
      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        department: emp.department || "N/A",
        managerName: emp.manager?.name || "No Manager",
        q1: allCheckIns.some((c) => c.quarter === "Q1"),
        q2: allCheckIns.some((c) => c.quarter === "Q2"),
        q3: allCheckIns.some((c) => c.quarter === "Q3"),
        q4: allCheckIns.some((c) => c.quarter === "Q4"),
      };
    });

    return NextResponse.json({ employees: data });
  } catch (error: any) {
    console.error("Completion analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch completion data" },
      { status: 500 }
    );
  }
}
