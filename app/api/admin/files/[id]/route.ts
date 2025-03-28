import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: fileId } = await context.params
    const { action } = await request.json()

    if (!action || !["restore", "delete"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      )
    }

    // Проверяем существование файла
    const file = await prisma.file.findUnique({
      where: {
        id: fileId,
      },
    })

    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    if (action === "restore") {
      // Восстанавливаем файл
      await prisma.file.update({
        where: {
          id: fileId,
        },
        data: {
          isDeleted: false,
        },
      })
    } else {
      // Логически удаляем файл
      await prisma.file.update({
        where: {
          id: fileId,
        },
        data: {
          isDeleted: true,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating file:", error)
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    )
  }
} 