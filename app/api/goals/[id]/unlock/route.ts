import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { z } from "zod";

const unlockSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can unlock goals" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reason } = unlockSchema.parse(body);

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (!goal.lockedAt) {
      return NextResponse.json(
        { error: "Goal is not locked" },
        { status: 400 }
      );
    }

    // Unlock goal
    const updatedGoal = await prisma.goal.update({
      where: { id: params.id },
      data: {
        lockedAt: null,
        status: "APPROVED", // Keep as approved but unlocked
      },
    });

    // Create audit log
    await createAuditLog({
      goalId: params.id,
      userId: session.user.id,
      action: AUDIT_ACTIONS.GOAL_UNLOCKED,
      oldValue: { lockedAt: goal.lockedAt },
      newValue: { lockedAt: null, reason },
    });

    return NextResponse.json({
      goal: updatedGoal,
      message: "Goal unlocked successfully",
    });
  } catch (error: any) {
    console.error("Unlock goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unlock goal" },
      { status: 400 }
    );
  }
}
