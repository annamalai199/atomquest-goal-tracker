import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckInSchema } from "@/lib/validations";
import { computeProgressScore } from "@/lib/progress";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const quarter = searchParams.get("quarter");
    const goalId = searchParams.get("goalId");

    let where: any = {};

    if (quarter) where.quarter = quarter;
    if (goalId) where.goalId = goalId;

    // Role-based filtering
    if (session.user.role === "EMPLOYEE") {
      where.goal = { employeeId: session.user.id };
    } else if (session.user.role === "MANAGER") {
      // Filter by employee's manager (includes admin-pushed shared goals)
      where.goal = { employee: { managerId: session.user.id } };
    }

    const checkIns = await prisma.checkIn.findMany({
      where,
      include: {
        goal: {
          include: {
            employee: {
              select: { 
                name: true, 
                email: true, 
                department: true,
                managerId: true  // Include managerId in response
              },
            },
            thrustArea: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ checkIns });
  } catch (error: any) {
    console.error("Get check-ins error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch check-ins" },
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

    // FIX 2: Role guard - only employees can submit check-ins
    if (session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Only employees can submit check-ins" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createCheckInSchema.parse(body);

    // Get goal details including cycle for TIMELINE calculations and window enforcement
    const goal = await prisma.goal.findUnique({
      where: { id: validatedData.goalId },
      include: {
        cycle: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check ownership - employees can only edit their own goals
    if (session.user.role === "EMPLOYEE" && goal.employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // WINDOW ENFORCEMENT: Check if the submitted quarter window is currently open
    const now = new Date();
    const cycle = goal.cycle;
    
    if (!cycle) {
      return NextResponse.json({ error: "No active cycle found" }, { status: 400 });
    }

    // Determine which quarter window is currently open
    const q1Open = new Date(cycle.q1Open);
    const q2Open = new Date(cycle.q2Open);
    const q3Open = new Date(cycle.q3Open);
    const q4Open = new Date(cycle.q4Open);

    let currentOpenQuarter: string | null = null;

    if (now >= q4Open) {
      currentOpenQuarter = "Q4";
    } else if (now >= q3Open && now < q4Open) {
      currentOpenQuarter = "Q3";
    } else if (now >= q2Open && now < q3Open) {
      currentOpenQuarter = "Q2";
    } else if (now >= q1Open && now < q2Open) {
      currentOpenQuarter = "Q1";
    }

    console.log("Window check:", {
      now: now.toISOString(),
      q1Open: q1Open.toISOString(),
      q2Open: q2Open.toISOString(),
      currentOpenQuarter,
      submittedQuarter: validatedData.quarter
    });

    // Enforce: submitted quarter must match currently open window
    if (currentOpenQuarter !== validatedData.quarter) {
      const quarterOpenDate = validatedData.quarter === "Q1" ? q1Open :
                              validatedData.quarter === "Q2" ? q2Open :
                              validatedData.quarter === "Q3" ? q3Open : q4Open;
      
      return NextResponse.json(
        { 
          error: `Check-in window for ${validatedData.quarter} is not currently open. ${
            currentOpenQuarter 
              ? `Currently open: ${currentOpenQuarter}` 
              : `${validatedData.quarter} opens on ${quarterOpenDate.toLocaleDateString()}`
          }` 
        },
        { status: 400 }
      );
    }

    // Compute progress score if actualAchieved is provided
    let progressScore = null;
    if (validatedData.actualAchieved !== undefined && validatedData.actualAchieved !== null) {
      progressScore = computeProgressScore(
        goal.uom as any,
        goal.target,
        validatedData.actualAchieved
      );
    }

    // Set completedAt when marking as COMPLETED
    const completedAt = validatedData.progressStatus === "COMPLETED" ? new Date() : null;

    // Upsert check-in
    const checkIn = await prisma.checkIn.upsert({
      where: {
        goalId_quarter: {
          goalId: validatedData.goalId,
          quarter: validatedData.quarter,
        },
      },
      update: {
        plannedTarget: validatedData.plannedTarget,
        actualAchieved: validatedData.actualAchieved,
        progressStatus: validatedData.progressStatus,
        progressScore,
        completedAt,
      },
      create: {
        ...validatedData,
        progressScore,
        completedAt,
      },
    });

    // Sync achievement to linked shared goals
    const savedGoal = await prisma.goal.findUnique({
      where: { id: validatedData.goalId },
      select: { parentGoalId: true, isShared: true },
    });

    if (savedGoal?.parentGoalId) {
      // This employee is a recipient - find other recipients of the same parent goal
      const linkedGoals = await prisma.goal.findMany({
        where: {
          parentGoalId: savedGoal.parentGoalId,
          id: { not: validatedData.goalId },
        },
        select: { id: true },
      });

      // Upsert same actualAchieved to all linked goals
      for (const linked of linkedGoals) {
        await prisma.checkIn.upsert({
          where: {
            goalId_quarter: {
              goalId: linked.id,
              quarter: validatedData.quarter,
            },
          },
          update: { actualAchieved: validatedData.actualAchieved },
          create: {
            goalId: linked.id,
            quarter: validatedData.quarter,
            plannedTarget: validatedData.plannedTarget,
            actualAchieved: validatedData.actualAchieved,
            progressStatus: validatedData.progressStatus,
            progressScore,
          },
        });
      }
    }

    // FIX 8: Create audit log
    await createAuditLog({
      userId: session.user.id,
      goalId: validatedData.goalId,
      action: AUDIT_ACTIONS.CHECKIN_SAVED,
      details: {
        quarter: validatedData.quarter,
        goalId: validatedData.goalId,
        plannedTarget: validatedData.plannedTarget,
        actualAchieved: validatedData.actualAchieved,
        progressStatus: validatedData.progressStatus,
        progressScore,
      },
    });

    return NextResponse.json({ checkIn }, { status: 201 });
  } catch (error: any) {
    console.error("Create check-in error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create check-in" },
      { status: 400 }
    );
  }
}
