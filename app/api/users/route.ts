import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerUser } from "@/lib/auth";
import { createUserSchema } from "@/lib/validations";
import { normalizeDepartment } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const department = searchParams.get("department");

    let where: any = {};

    // Role-based filtering
    if (session.user.role === "MANAGER") {
      // Managers see their team members
      where.managerId = session.user.id;
    } else if (session.user.role === "EMPLOYEE") {
      // Employees only see themselves
      where.id = session.user.id;
    }
    // ADMIN sees all

    if (role) where.role = role;
    if (department) where.department = department;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
        manager: {
          select: {
            name: true,
            email: true,
          },
        },
        createdAt: true,
        _count: {
          select: {
            goals: true,
            employees: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
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
        { error: "Only admins can create users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = createUserSchema.parse(body);

    const user = await registerUser(
      validatedData.name,
      validatedData.email,
      validatedData.password,
      validatedData.role,
      normalizeDepartment(validatedData.department),
      validatedData.managerId
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
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
        { error: "Only admins can update users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, ...updateData } = body;

    // Normalize department if present
    if (updateData.department) {
      updateData.department = normalizeDepartment(updateData.department);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        managerId: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 400 }
    );
  }
}
