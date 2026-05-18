import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { normalizeDepartment } from "@/lib/utils";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { managerId, role, department, name } = body;

    // Validate manager exists if managerId provided
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });
      if (!manager || manager.role !== "MANAGER") {
        return NextResponse.json(
          { error: "Invalid manager" },
          { status: 400 }
        );
      }
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { 
        managerId, 
        role, 
        department: normalizeDepartment(department), 
        name 
      },
      include: {
        manager: {
          select: { id: true, name: true },
        },
      },
    });

    // Audit log if manager changed
    if (managerId && managerId !== oldUser?.managerId) {
      await createAuditLog({
        userId: session.user.id,
        action: "MANAGER_ASSIGNED",
        oldValue: JSON.stringify({ managerId: oldUser?.managerId }),
        newValue: JSON.stringify({ managerId }),
      });
    }

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
