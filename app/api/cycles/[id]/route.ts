import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cycle = await prisma.cycle.findUnique({
      where: { id: params.id },
      include: { _count: { select: { goals: true } } },
    });

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    if (cycle.isActive) {
      return NextResponse.json(
        { error: "Cannot delete the active cycle" },
        { status: 400 }
      );
    }

    if (cycle._count.goals > 0) {
      return NextResponse.json(
        { error: "Cannot delete a cycle that has goals linked to it" },
        { status: 400 }
      );
    }

    await prisma.cycle.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete cycle" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Date order validation: goalSetOpen < q1Open < q2Open < q3Open < q4Open
    const goalSetOpen = new Date(body.goalSetOpen);
    const q1Open = new Date(body.q1Open);
    const q2Open = new Date(body.q2Open);
    const q3Open = new Date(body.q3Open);
    const q4Open = new Date(body.q4Open);

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

    const updated = await prisma.cycle.update({
      where: { id: params.id },
      data: {
        name: body.name,
        year: body.year,
        goalSetOpen,
        q1Open,
        q2Open,
        q3Open,
        q4Open,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Update cycle error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update cycle" },
      { status: 500 }
    );
  }
}
