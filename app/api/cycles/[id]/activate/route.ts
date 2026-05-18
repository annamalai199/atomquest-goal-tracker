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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can activate cycles" },
        { status: 403 }
      );
    }

    // Deactivate all cycles
    await prisma.cycle.updateMany({
      data: { isActive: false },
    });

    // Activate this cycle
    const cycle = await prisma.cycle.update({
      where: { id: params.id },
      data: { isActive: true },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.CYCLE_ACTIVATED,
      newValue: cycle,
    });

    return NextResponse.json({
      cycle,
      message: "Cycle activated successfully",
    });
  } catch (error: any) {
    console.error("Activate cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to activate cycle" },
      { status: 500 }
    );
  }
}
