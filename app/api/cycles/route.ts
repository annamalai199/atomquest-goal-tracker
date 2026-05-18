import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCycleSchema } from "@/lib/validations";
import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

export async function GET() {
  try {
    const cycles = await prisma.cycle.findMany({
      orderBy: { year: "desc" },
      include: {
        _count: {
          select: { goals: true },
        },
      },
    });

    const activeCycle = cycles.find((c) => c.isActive);

    return NextResponse.json({ cycles, activeCycle });
  } catch (error: any) {
    console.error("Get cycles error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch cycles" },
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

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can create cycles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createCycleSchema.parse(body);

    // Check for duplicate cycle year
    const existingCycle = await prisma.cycle.findFirst({
      where: { year: validatedData.year },
    });

    if (existingCycle) {
      return NextResponse.json(
        {
          error: `A cycle for FY ${validatedData.year}-${
            validatedData.year + 1
          } already exists. Please edit the existing cycle instead.`,
        },
        { status: 400 }
      );
    }

    // Validate date order: goalSetOpen < q1Open < q2Open < q3Open < q4Open
    const goalSetOpen = new Date(validatedData.goalSetOpen);
    const q1Open = new Date(validatedData.q1Open);
    const q2Open = new Date(validatedData.q2Open);
    const q3Open = new Date(validatedData.q3Open);
    const q4Open = new Date(validatedData.q4Open);

    if (q1Open <= goalSetOpen) {
      return NextResponse.json(
        { error: "Q1 Open date must be after Goal Set Open date" },
        { status: 400 }
      );
    }

    if (q2Open <= q1Open) {
      return NextResponse.json(
        { error: "Q2 Open date must be after Q1 Open date" },
        { status: 400 }
      );
    }

    if (q3Open <= q2Open) {
      return NextResponse.json(
        { error: "Q3 Open date must be after Q2 Open date" },
        { status: 400 }
      );
    }

    if (q4Open <= q3Open) {
      return NextResponse.json(
        { error: "Q4 Open date must be after Q3 Open date" },
        { status: 400 }
      );
    }

    const cycle = await prisma.cycle.create({
      data: {
        name: validatedData.name,
        year: validatedData.year,
        goalSetOpen,
        q1Open,
        q2Open,
        q3Open,
        q4Open,
        isActive: false,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AUDIT_ACTIONS.CYCLE_CREATED,
      newValue: cycle,
    });

    return NextResponse.json({ cycle }, { status: 201 });
  } catch (error: any) {
    console.error("Create cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create cycle" },
      { status: 400 }
    );
  }
}
