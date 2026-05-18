import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { target, weightage, comment } = body;

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        cycle: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check if manager owns this goal
    if (session.user.role === "MANAGER" && goal.managerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (goal.status !== "SUBMITTED") {
      return NextResponse.json(
        { error: "Only submitted goals can be approved" },
        { status: 400 }
      );
    }

    const oldGoal = { ...goal };

    // Update goal with optional edits
    const updateData: any = {
      status: "APPROVED",
      lockedAt: new Date(),
    };

    if (target !== undefined) updateData.target = target;
    if (weightage !== undefined) updateData.weightage = weightage;

    const updatedGoal = await prisma.goal.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    await createAuditLog({
      goalId: params.id,
      userId: session.user.id,
      action: AUDIT_ACTIONS.GOAL_APPROVED,
      oldValue: oldGoal,
      newValue: updatedGoal,
    });

    return NextResponse.json({
      goal: updatedGoal,
      message: "Goal approved successfully",
    });
  } catch (error: any) {
    console.error("Approve goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to approve goal" },
      { status: 500 }
    );
  }
}
