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
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: fileId } = await context.params
    const { isDeleted } = await request.json()

    // Проверяем, принадлежит ли файл пользователю
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      )
    }

    // Обновляем статус файла
    await prisma.file.update({
      where: {
        id: fileId,
      },
      data: {
        isDeleted,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating file:", error)
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: fileId } = await context.params

    // Проверяем, принадлежит ли файл пользователю
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        userId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 }
      )
    }

    // Удаляем файл из базы данных
    await prisma.file.delete({
      where: {
        id: fileId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    )
  }
} 