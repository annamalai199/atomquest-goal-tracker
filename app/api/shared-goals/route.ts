import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { title, description, thrustAreaId, uom, target, weightage, employeeIds } =
      await request.json();

    if (!employeeIds?.length) {
      return NextResponse.json(
        { error: "No employees selected" },
        { status: 400 }
      );
    }

    // Get active cycle
    const cycle = await prisma.cycle.findFirst({
      where: { isActive: true },
    });

    if (!cycle) {
      return NextResponse.json(
        { error: "No active cycle" },
        { status: 400 }
      );
    }

    const unlockedEmployees: any[] = [];
    const goals: any[] = [];

    // Process each employee
    for (const employeeId of employeeIds) {
      // Get employee's current goals
      const existingGoals = await prisma.goal.findMany({
        where: {
          employeeId,
          cycleId: cycle.id,
        },
        select: {
          id: true,
          weightage: true,
          status: true,
          lockedAt: true,
        },
      });

      const currentTotal = existingGoals.reduce((sum, g) => sum + g.weightage, 0);
      const hasLockedGoals = existingGoals.some((g) => g.lockedAt !== null);
      const needsUnlock = currentTotal + parseFloat(weightage) > 100 && hasLockedGoals;

      // If employee needs unlock, unlock ALL their goals
      if (needsUnlock) {
        await prisma.goal.updateMany({
          where: {
            employeeId,
            cycleId: cycle.id,
            lockedAt: { not: null },
          },
          data: {
            lockedAt: null, // Unlock so employee can edit
          },
        });

        // Get employee details for notification
        const employee = await prisma.user.findUnique({
          where: { id: employeeId },
          select: { name: true, email: true, department: true },
        });

        if (employee) {
          unlockedEmployees.push({
            id: employeeId,
            name: employee.name,
            email: employee.email,
            department: employee.department,
            previousTotal: currentTotal,
            newTotal: currentTotal + parseFloat(weightage),
          });

          // Create audit log for unlock
          await createAuditLog({
            userId: session.user.id,
            action: "GOAL_UNLOCKED",
            newValue: JSON.stringify({
              reason: `Shared goal "${title}" pushed with ${weightage}% weightage. Employee must rebalance.`,
              employeeName: employee.name,
              sharedGoalTitle: title,
            }),
          });

          // Send email notification
          const emailData = {
            to: employee.email,
            subject: "Goals Unlocked - Shared Goal Assigned",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #f59e0b;">🔓 Goals Unlocked - Action Required</h2>
                <p>Hi ${employee.name},</p>
                <p>Admin <strong>${session.user.name}</strong> has assigned you a shared goal that requires rebalancing:</p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0;">
                  <strong>Shared Goal:</strong> ${title}<br>
                  <strong>Weightage:</strong> ${weightage}%<br>
                  <strong>Your Current Total:</strong> ${currentTotal}%<br>
                  <strong>New Total:</strong> ${currentTotal + parseFloat(weightage)}%
                </div>
                <p><strong>Action Required:</strong></p>
                <p>Your existing goals have been unlocked. You must reduce your own goals to make room for this shared goal. The shared goal weightage (${weightage}%) is fixed and cannot be changed.</p>
                <p>
                  <a href="${process.env.NEXTAUTH_URL}/dashboard/employee/goals" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Rebalance Goals
                  </a>
                </p>
              </div>
            `,
          };
          
          // Send email async (fire and forget)
          fetch(`${process.env.NEXTAUTH_URL}/api/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailData),
          }).catch(console.error);
        }
      }

      // Create shared goal with admin's weightage (UNLOCKED - employee CAN adjust weightage)
      // But Title and Target are READ-ONLY (enforced in frontend)
      // managerId = null if pushed by ADMIN (auto-approve on submit)
      // managerId = session.user.id if pushed by MANAGER (needs manager approval)
      const goal = await prisma.goal.create({
        data: {
          title,
          description,
          thrustAreaId,
          uom,
          target: parseFloat(target),
          weightage: parseFloat(weightage), // Admin's suggested weightage
          employeeId,
          cycleId: cycle.id,
          isShared: true,
          status: "DRAFT", // DRAFT - employee must submit after adjusting
          lockedAt: null, // UNLOCKED - employee can adjust weightage
          managerId: session.user.role === "ADMIN" ? null : session.user.id, // null = admin pushed (auto-approve)
        },
      });

      goals.push(goal);
    }

    // Create audit log for shared goal push
    await createAuditLog({
      userId: session.user.id,
      action: "SHARED_GOAL_PUSHED",
      newValue: JSON.stringify({
        title,
        weightage: parseFloat(weightage),
        recipientCount: goals.length,
        unlockedCount: unlockedEmployees.length,
      }),
    });

    return NextResponse.json({
      goals,
      count: goals.length,
      unlockedEmployees, // List of employees whose goals were unlocked
      message:
        unlockedEmployees.length > 0
          ? `Shared goal pushed to ${goals.length} employee(s). ${unlockedEmployees.length} employee(s) had their goals unlocked for rebalancing.`
          : `Shared goal pushed to ${goals.length} employee(s) successfully.`,
    });
  } catch (error: any) {
    console.error("Create shared goal error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create shared goals" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get unique shared goals with recipient count
    const sharedGoals = await prisma.goal.findMany({
      where: { isShared: true },
      include: {
        thrustArea: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by title and created date to get unique shared goal pushes
    const historyMap = new Map();
    
    sharedGoals.forEach((goal) => {
      const key = `${goal.title}-${goal.createdAt.toISOString().split('T')[0]}`;
      if (!historyMap.has(key)) {
        historyMap.set(key, {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          thrustArea: goal.thrustArea,
          target: goal.target,
          weightage: goal.weightage,
          uom: goal.uom,
          createdAt: goal.createdAt,
          recipientCount: 1,
        });
      } else {
        const existing = historyMap.get(key);
        existing.recipientCount += 1;
      }
    });

    const history = Array.from(historyMap.values());

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error("Get shared goals error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shared goals" },
      { status: 500 }
    );
  }
}
