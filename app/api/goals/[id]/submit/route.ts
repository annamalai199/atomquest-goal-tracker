import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GOAL_RULES } from "@/lib/validations";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        manager: true,
        cycle: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check ownership
    if (goal.employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already submitted
    if (goal.status !== "DRAFT" && goal.status !== "RETURNED") {
      return NextResponse.json(
        { error: "Goal is already submitted" },
        { status: 400 }
      );
    }

    // Validate total weightage = 100%
    const allGoals = await prisma.goal.findMany({
      where: {
        employeeId: session.user.id,
        cycleId: goal.cycleId,
        id: { not: params.id },
      },
    });

    const totalWeightage = allGoals.reduce((sum, g) => sum + g.weightage, 0) + goal.weightage;

    if (Math.round(totalWeightage * 100) / 100 !== 100) {
      return NextResponse.json(
        { 
          error: `Total weightage must equal ${GOAL_RULES.TOTAL_WEIGHTAGE}%. Current: ${totalWeightage}%`,
          totalWeightage 
        },
        { status: 400 }
      );
    }

    // AUTO-APPROVE LOGIC: Admin-pushed shared goals
    // If shared goal has NO manager (managerId = null) → admin pushed → auto-approve
    // If shared goal HAS manager → manager pushed → normal approval flow
    const isAdminPushedSharedGoal = goal.isShared && goal.managerId === null;

    if (isAdminPushedSharedGoal) {
      // Auto-approve immediately
      const updatedGoal = await prisma.goal.update({
        where: { id: params.id },
        data: { 
          status: "APPROVED",
          lockedAt: new Date(), // Lock immediately
        },
        include: {
          employee: true,
          cycle: true,
          thrustArea: true,
        },
      });

      // Create audit log
      await createAuditLog({
        goalId: params.id,
        userId: session.user.id,
        action: AUDIT_ACTIONS.GOAL_APPROVED,
        oldValue: { status: goal.status },
        newValue: { 
          status: "APPROVED",
          note: "Auto-approved — Admin pushed shared goal"
        },
      });

      return NextResponse.json({ 
        goal: updatedGoal,
        autoApproved: true,
        message: "Shared goal auto-approved by system" 
      });
    }

    // Normal flow: Submit for manager approval
    const updatedGoal = await prisma.goal.update({
      where: { id: params.id },
      data: { status: "SUBMITTED" },
    });

    // Create audit log
    await createAuditLog({
      goalId: params.id,
      userId: session.user.id,
      action: AUDIT_ACTIONS.GOAL_SUBMITTED,
      newValue: { status: "SUBMITTED" },
    });

    return NextResponse.json({ 
      goal: updatedGoal,
      message: "Goal submitted successfully" 
    });
  } catch (error: any) {
    console.error("Submit goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit goal" },
      { status: 500 }
    );
  }
}
