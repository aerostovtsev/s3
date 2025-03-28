import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await prisma.file.count({
      where: {
        userId: session.user.id,
        isDeleted: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error getting file count:", error);
    return NextResponse.json(
      { error: "Failed to get file count" },
      { status: 500 }
    );
  }
} 