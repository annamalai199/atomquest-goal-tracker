import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { z } from "zod";

const returnSchema = z.object({
  comment: z.string().min(10, "Comment must be at least 10 characters"),
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

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { comment } = returnSchema.parse(body);

    const goal = await prisma.goal.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
        manager: true,
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
        { error: "Only submitted goals can be returned" },
        { status: 400 }
      );
    }

    // Update goal status
    const updatedGoal = await prisma.goal.update({
      where: { id: params.id },
      data: {
        status: "RETURNED",
        description: goal.description
          ? `${goal.description}\n\n--- Manager Comment ---\n${comment}`
          : `--- Manager Comment ---\n${comment}`,
      },
    });

    // Create audit log
    await createAuditLog({
      goalId: params.id,
      userId: session.user.id,
      action: AUDIT_ACTIONS.GOAL_RETURNED,
      oldValue: { status: goal.status },
      newValue: { status: "RETURNED", comment },
    });

    return NextResponse.json({
      goal: updatedGoal,
      message: "Goal returned for revision",
    });
  } catch (error: any) {
    console.error("Return goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to return goal" },
      { status: 400 }
    );
  }
}
