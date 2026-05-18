import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createThrustAreaSchema } from "@/lib/validations";

export async function GET() {
  try {
    const thrustAreas = await prisma.thrustArea.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { goals: true },
        },
      },
    });

    return NextResponse.json({ thrustAreas });
  } catch (error: any) {
    console.error("Get thrust areas error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch thrust areas" },
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
        { error: "Only admins can create thrust areas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createThrustAreaSchema.parse(body);

    const thrustArea = await prisma.thrustArea.create({
      data: validatedData,
    });

    return NextResponse.json({ thrustArea }, { status: 201 });
  } catch (error: any) {
    console.error("Create thrust area error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create thrust area" },
      { status: 400 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update thrust areas" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, name } = body;

    const thrustArea = await prisma.thrustArea.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json({ thrustArea });
  } catch (error: any) {
    console.error("Update thrust area error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update thrust area" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete thrust areas" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Check if any goals use this thrust area
    const goalsCount = await prisma.goal.count({
      where: { thrustAreaId: id },
    });

    if (goalsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete thrust area with existing goals" },
        { status: 400 }
      );
    }

    await prisma.thrustArea.delete({
      where: { id },
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
