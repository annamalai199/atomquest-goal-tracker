import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateGoalSchema, GOAL_RULES } from "@/lib/validations";

export async function GET(
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
        employee: {
          select: { name: true, email: true, department: true },
        },
        manager: {
          select: { name: true, email: true },
        },
        thrustArea: true,
        cycle: true,
        checkIns: {
          orderBy: { quarter: "asc" },
        },
        auditLogs: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check access
    if (
      session.user.role === "EMPLOYEE" &&
      goal.employeeId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ goal });
  } catch (error: any) {
    console.error("Get goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch goal" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Check if goal is truly locked (lockedAt is set)
    const isLocked = goal.lockedAt !== null;

    if (isLocked) {
      return NextResponse.json(
        { error: "Goal is locked. Contact admin to unlock for rebalancing." },
        { status: 403 }
      );
    }

    // Check ownership
    if (goal.employeeId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // CASE 1: APPROVED but UNLOCKED (lockedAt = null) - Only allow weightage change
    // This happens when admin unlocks goals for rebalancing
    if (goal.status === "APPROVED" && !isLocked) {
      // Check if trying to change anything other than weightage
      const nonWeightageFields = Object.keys(body).filter((k) => k !== "weightage");
      if (nonWeightageFields.length > 0) {
        return NextResponse.json(
          {
            error:
              "Only weightage can be updated for approved goals during rebalancing. Other fields are locked.",
          },
          { status: 403 }
        );
      }

      // Validate weightage
      if (body.weightage < GOAL_RULES.MIN_WEIGHTAGE) {
        return NextResponse.json(
          { error: `Minimum weightage is ${GOAL_RULES.MIN_WEIGHTAGE}% per BRD requirements` },
          { status: 400 }
        );
      }

      // Update only weightage
      const updatedGoal = await prisma.goal.update({
        where: { id: params.id },
        data: { weightage: body.weightage },
        include: {
          thrustArea: true,
          cycle: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          goalId: params.id,
          userId: session.user.id,
          action: "WEIGHTAGE_ADJUSTED",
          oldValue: JSON.stringify({ weightage: goal.weightage }),
          newValue: JSON.stringify({ weightage: updatedGoal.weightage }),
        },
      });

      return NextResponse.json({ goal: updatedGoal });
    }

    // CASE 2: DRAFT or RETURNED - Allow full edit or weightage-only for shared goals
    if (goal.status !== "DRAFT" && goal.status !== "RETURNED") {
      return NextResponse.json(
        { error: "Goal cannot be edited in current status" },
        { status: 400 }
      );
    }

    // BRD COMPLIANCE: For shared goals, only allow weightage changes
    // Title, Description, Thrust Area, UoM, and Target are READ-ONLY
    if (goal.isShared) {
      // Check if employee is trying to change read-only fields
      const readOnlyFieldsChanged =
        (body.title && body.title !== goal.title) ||
        (body.description !== undefined && body.description !== goal.description) ||
        (body.thrustAreaId && body.thrustAreaId !== goal.thrustAreaId) ||
        (body.uom && body.uom !== goal.uom) ||
        (body.target !== undefined && body.target !== goal.target);

      if (readOnlyFieldsChanged) {
        return NextResponse.json(
          {
            error:
              "Shared goals are read-only. You can only adjust the weightage (min 10%). Title and Target are set by admin and cannot be changed.",
          },
          { status: 400 }
        );
      }

      // Only allow weightage update for shared goals
      const validatedData = { weightage: body.weightage };

      // Validate weightage
      if (validatedData.weightage < 10) {
        return NextResponse.json(
          { error: "Minimum weightage is 10% per BRD requirements" },
          { status: 400 }
        );
      }

      const updatedGoal = await prisma.goal.update({
        where: { id: params.id },
        data: validatedData,
        include: {
          thrustArea: true,
          cycle: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          goalId: params.id,
          userId: session.user.id,
          action: "GOAL_UPDATED",
          oldValue: JSON.stringify({ weightage: goal.weightage }),
          newValue: JSON.stringify({ weightage: updatedGoal.weightage }),
        },
      });

      return NextResponse.json({ goal: updatedGoal });
    }

    // For non-shared goals, allow full updates
    const validatedData = updateGoalSchema.parse(body);

    const updatedGoal = await prisma.goal.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        thrustArea: true,
        cycle: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        goalId: params.id,
        userId: session.user.id,
        action: "GOAL_UPDATED",
        oldValue: JSON.stringify(goal),
        newValue: JSON.stringify(updatedGoal),
      },
    });

    return NextResponse.json({ goal: updatedGoal });
  } catch (error: any) {
    console.error("Update goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update goal" },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Only DRAFT goals can be deleted
    if (goal.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft goals can be deleted" },
        { status: 400 }
      );
    }

    // Check ownership
    if (goal.employeeId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.goal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Goal deleted successfully" });
  } catch (error: any) {
    console.error("Delete goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete goal" },
      { status: 500 }
    );
  }
}
