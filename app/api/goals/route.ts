import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createGoalSchema, GOAL_RULES } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycleId");

    let where: any = {};

    // Role-based filtering
    if (session.user.role === "EMPLOYEE") {
      where.employeeId = session.user.id;
    } else if (session.user.role === "MANAGER") {
      where.managerId = session.user.id;
    }
    // ADMIN sees all goals

    if (cycleId) {
      where.cycleId = cycleId;
    }

    const goals = await prisma.goal.findMany({
      where,
      include: {
        employee: {
          select: { name: true, email: true, department: true },
        },
        manager: {
          select: { name: true, email: true },
        },
        thrustArea: { select: { id: true, name: true } },
        cycle: { select: { id: true, name: true, year: true, isActive: true } },
        _count: {
          select: { checkIns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ goals });
  } catch (error: any) {
    console.error("Get goals error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createGoalSchema.parse(body);

    // Check max goals limit
    const existingGoalsCount = await prisma.goal.count({
      where: {
        employeeId: session.user.id,
        cycleId: validatedData.cycleId,
      },
    });

    if (existingGoalsCount >= GOAL_RULES.MAX_GOALS) {
      return NextResponse.json(
        { error: `Maximum ${GOAL_RULES.MAX_GOALS} goals allowed per cycle` },
        { status: 400 }
      );
    }

    // Get manager from user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { managerId: true },
    });

    const goal = await prisma.goal.create({
      data: {
        ...validatedData,
        employeeId: session.user.id,
        managerId: user?.managerId || null,
      },
      include: {
        thrustArea: true,
        cycle: true,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error: any) {
    console.error("Create goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create goal" },
      { status: 400 }
    );
  }
}
