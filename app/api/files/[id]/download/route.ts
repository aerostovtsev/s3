import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generatePresignedUrl } from "@/lib/s3-client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fileId = params.id
    const file = await prisma.file.findUnique({
      where: {
        id: fileId,
        isDeleted: false,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check if user has permission to download the file
    if (file.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate presigned URL
    const presignedUrl = await generatePresignedUrl(file.path)

    // Record download in history
    await prisma.downloadHistory.create({
      data: {
        fileId: file.id,
        userId: session.user.id,
      },
    })

    // Return redirect to presigned URL
    return NextResponse.redirect(presignedUrl)
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 })
  }
}

