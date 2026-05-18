import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await request.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.thrustArea.findFirst({
      where: {
        name,
        id: { not: params.id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Thrust area with this name already exists" },
        { status: 400 }
      );
    }

    const thrustArea = await prisma.thrustArea.update({
      where: { id: params.id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ thrustArea });
  } catch (error: any) {
    console.error("Update thrust area error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update thrust area" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if thrust area is in use
    const goalsCount = await prisma.goal.count({
      where: { thrustAreaId: params.id },
    });

    if (goalsCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete. This thrust area is used by ${goalsCount} goal(s)` },
        { status: 400 }
      );
    }

    await prisma.thrustArea.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Thrust area deleted successfully" });
  } catch (error: any) {
    console.error("Delete thrust area error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete thrust area" },
      { status: 500 }
    );
  }
}
