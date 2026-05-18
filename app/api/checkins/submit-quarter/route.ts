import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only employees can submit check-ins
    if (session.user.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Only employees can submit check-ins" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { quarter, cycleId } = body;

    if (!quarter || !cycleId) {
      return NextResponse.json(
        { error: "Quarter and cycleId are required" },
        { status: 400 }
      );
    }

    // Get active cycle for window enforcement
    const cycle = await prisma.cycle.findUnique({
      where: { id: cycleId },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // WINDOW ENFORCEMENT: Check if the submitted quarter window is currently open
    const now = new Date();
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

    // Enforce: submitted quarter must match currently open window
    if (currentOpenQuarter !== quarter) {
      const quarterOpenDate = quarter === "Q1" ? q1Open :
                              quarter === "Q2" ? q2Open :
                              quarter === "Q3" ? q3Open : q4Open;
      
      return NextResponse.json(
        { 
          error: `Submit window for ${quarter} is not open. ${
            currentOpenQuarter 
              ? `Currently open: ${currentOpenQuarter}` 
              : `${quarter} opens on ${quarterOpenDate.toLocaleDateString()}`
          }` 
        },
        { status: 400 }
      );
    }

    // Get all approved goals for this employee in this cycle
    const goals = await prisma.goal.findMany({
      where: {
        employeeId: session.user.id,
        cycleId,
        status: { in: ["APPROVED", "LOCKED"] },
      },
    });

    if (goals.length === 0) {
      return NextResponse.json(
        { error: "No approved goals found for this cycle" },
        { status: 404 }
      );
    }

    // Check if all goals have check-ins for this quarter
    const checkIns = await prisma.checkIn.findMany({
      where: {
        goalId: { in: goals.map((g) => g.id) },
        quarter,
      },
    });

    if (checkIns.length === 0) {
      return NextResponse.json(
        { error: "No check-ins found for this quarter" },
        { status: 404 }
      );
    }

    if (checkIns.length < goals.length) {
      return NextResponse.json(
        {
          error: `Only ${checkIns.length} of ${goals.length} check-ins saved. Please save all check-ins before submitting.`,
        },
        { status: 400 }
      );
    }

    // Update all check-ins to mark them as submitted
    await prisma.checkIn.updateMany({
      where: {
        goalId: { in: goals.map((g) => g.id) },
        quarter,
      },
      data: {
        submittedAt: new Date(),
      },
    });

    // Create audit log for submission
    await createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.CHECKIN_SUBMITTED,
      details: {
        quarter,
        cycleId,
        goalCount: goals.length,
        checkInCount: checkIns.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${checkIns.length} check-ins for ${quarter}`,
      checkIns: checkIns.length,
    });
  } catch (error: any) {
    console.error("Submit check-ins error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit check-ins" },
      { status: 500 }
    );
  }
}
