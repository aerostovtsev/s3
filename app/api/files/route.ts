import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const offset = parseInt(searchParams.get("offset") || "0")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""

    const where: Prisma.FileWhereInput = {
      userId: session.user.id,
      isDeleted: false,
      OR: search ? [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { type: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ] : undefined,
    }

    const orderBy: Prisma.FileOrderByWithRelationInput = {
      updatedAt: "desc",
    }

    const files = await prisma.file.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    })

    return NextResponse.json({
      files: files.map(file => ({
        ...file,
        size: file.size.toString(),
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error("Error fetching files:", error)
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 