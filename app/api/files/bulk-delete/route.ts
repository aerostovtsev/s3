import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { fileIds, isDeleted } = await request.json()

    if (!Array.isArray(fileIds) || fileIds.length === 0 || typeof isDeleted !== "boolean") {
      return new NextResponse("Invalid request", { status: 400 })
    }

    // Verify that all files belong to the user
    const files = await prisma.file.findMany({
      where: {
        id: {
          in: fileIds,
        },
        userId: session.user.id,
      },
    })

    if (files.length !== fileIds.length) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Soft delete files
    await prisma.file.updateMany({
      where: {
        id: {
          in: fileIds,
        },
      },
      data: {
        isDeleted,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting files:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 