import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fileId = params.id

    // Restore file
    const restoredFile = await prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        isDeleted: false,
      },
    })

    return NextResponse.json(restoredFile)
  } catch (error) {
    console.error("Error restoring file:", error)
    return NextResponse.json({ error: "Failed to restore file" }, { status: 500 })
  }
}

