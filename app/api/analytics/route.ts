import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeDepartment } from "@/lib/utils";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    });

    // Parallel queries for speed
    const [goals, users, thrustAreas] = await Promise.all([
      prisma.goal.findMany({
        where: { cycleId: cycle?.id },
        include: {
          employee: {
            select: { department: true },
          },
          manager: {
            select: { id: true, name: true },
          },
          thrustArea: {
            select: { name: true },
          },
          checkIns: true,
        },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, role: true, department: true, managerId: true },
      }),
      prisma.thrustArea.findMany({
        include: {
          _count: {
            select: { goals: true },
          },
        },
      }),
    ]);

    // Extract unique departments and quarters - normalize departments
    const departments = [
      ...new Set(
        goals
          .map((g) => normalizeDepartment(g.employee.department))
          .filter(Boolean)
      ),
    ].sort() as string[];
    const quarters = ["Q1", "Q2", "Q3", "Q4"];

    // 1. QoQ Trend by department - format for LineChart
    const qoqTrend = quarters.map((quarter) => {
      const dataPoint: any = { quarter };
      
      departments.forEach((dept) => {
        const deptGoals = goals.filter(
          (g) => normalizeDepartment(g.employee.department) === dept
        );
        const qCheckins = deptGoals.flatMap((g) =>
          g.checkIns.filter((c) => c.quarter === quarter)
        );
        const avg = qCheckins.length
          ? qCheckins.reduce((s, c) => s + (c.progressScore || 0), 0) / qCheckins.length
          : 0;
        dataPoint[dept] = Math.round(avg);
      });

      return dataPoint;
    });

    // 2. Goal distribution by thrust area - format for PieChart
    const goalDistribution = thrustAreas.map((ta) => ({
      name: ta.name,
      value: ta._count.goals,
    }));

    // 3. Manager effectiveness - format for BarChart
    const managers = users.filter((u) => u.role === "MANAGER");
    const managerEffectiveness = managers.map((m) => {
      const teamGoals = goals.filter((g) => g.manager?.id === m.id);
      const totalCheckins = teamGoals.length * 4;
      const doneCheckins = teamGoals.flatMap((g) => g.checkIns).length;
      return {
        manager: m.name,
        completionRate: totalCheckins ? Math.round((doneCheckins / totalCheckins) * 100) : 0,
      };
    });

    // 4. Department heatmap
    const heatmap = departments.map((dept) => {
      const deptGoals = goals.filter(
        (g) => normalizeDepartment(g.employee.department) === dept
      );
      const data: any = { department: dept };

      quarters.forEach((q) => {
        const qCheckins = deptGoals.flatMap((g) =>
          g.checkIns.filter((c) => c.quarter === q)
        );
        const total = deptGoals.length;
        data[q.toLowerCase()] = total
          ? Math.round(
              (qCheckins.filter((c) => c.progressStatus !== "NOT_STARTED").length /
                total) *
                100
            )
          : 0;
      });

      // Calculate average
      data.avg = Math.round((data.q1 + data.q2 + data.q3 + data.q4) / 4);

      return data;
    });

    // KPI calculations
    const totalGoals = goals.length;
    const activeEmployees = users.filter((u) => u.role === "EMPLOYEE").length;
    const allCheckins = goals.flatMap((g) => g.checkIns);
    const avgCompletion = allCheckins.length
      ? Math.round(
          allCheckins.reduce((s, c) => s + (c.progressScore || 0), 0) / allCheckins.length
        )
      : 0;
    const totalPossibleCheckins = goals.length * 4;
    const checkinRate = totalPossibleCheckins
      ? Math.round((allCheckins.length / totalPossibleCheckins) * 100)
      : 0;

    return NextResponse.json({
      totalGoals,
      activeEmployees,
      avgCompletion,
      checkinRate,
      departments,
      qoqTrend,
      goalDistribution,
      managerEffectiveness,
      heatmap,
    });
  } catch (error: any) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
