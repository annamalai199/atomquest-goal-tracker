import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCheckInSchema } from "@/lib/validations";
import { computeProgressScore } from "@/lib/progress";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checkIn = await prisma.checkIn.findUnique({
      where: { id: params.id },
      include: {
        goal: true,
      },
    });

    if (!checkIn) {
      return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateCheckInSchema.parse(body);

    // Recompute progress score if actualAchieved changed
    let progressScore = checkIn.progressScore;
    if (validatedData.actualAchieved !== undefined) {
      progressScore = computeProgressScore(
        checkIn.goal.uom as any,
        checkIn.goal.target,
        validatedData.actualAchieved
      );
    }

    const updateData: any = { ...validatedData };
    if (progressScore !== null) {
      updateData.progressScore = progressScore;
    }

    // Set completedAt when marking as COMPLETED
    if (validatedData.progressStatus === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (validatedData.progressStatus === "NOT_STARTED" || validatedData.progressStatus === "ON_TRACK") {
      updateData.completedAt = null; // Reset if un-completing
    }

    // If manager is adding comment
    if (validatedData.managerComment && session.user.role === "MANAGER") {
      updateData.commentedAt = new Date();
    }

    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: params.id },
      data: updateData,
    });

    // Create audit log
    const action = validatedData.managerComment
      ? AUDIT_ACTIONS.CHECKIN_COMMENTED
      : AUDIT_ACTIONS.CHECKIN_UPDATED;

    await createAuditLog({
      goalId: checkIn.goalId,
      userId: session.user.id,
      action,
      oldValue: checkIn,
      newValue: updatedCheckIn,
    });

    return NextResponse.json({ checkIn: updatedCheckIn });
  } catch (error: any) {
    console.error("Update check-in error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update check-in" },
      { status: 400 }
    );
  }
}
