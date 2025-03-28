import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const fileId = params.id

    // Проверяем, принадлежит ли файл пользователю и удален ли он
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
        isDeleted: true,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Восстанавливаем файл
    await prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        isDeleted: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FILE_RESTORE]", error)
    return NextResponse.json(
      { error: "Failed to restore file" },
      { status: 500 }
    )
  }
} 