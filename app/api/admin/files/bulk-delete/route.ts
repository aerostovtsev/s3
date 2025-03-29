import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { fileIds } = await request.json()

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return new NextResponse("Invalid request", { status: 400 })
    }

    await prisma.file.updateMany({
      where: {
        id: {
          in: fileIds,
        },
      },
      data: {
        isDeleted: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting files:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 