import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const managers = await prisma.user.findMany({
      where: { role: "MANAGER" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ managers });
  } catch (error: any) {
    console.error("Get managers error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch managers" },
      { status: 500 }
    );
  }
}
