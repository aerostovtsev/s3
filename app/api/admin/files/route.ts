import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const offset = parseInt(searchParams.get("offset") || "0")
    const limit = parseInt(searchParams.get("limit") || "24")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    const where: Prisma.FileWhereInput = {
      OR: search ? [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { type: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ] : undefined,
    }

    const files = await prisma.file.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      files: files.map((file) => ({
        ...file,
        size: Number(file.size),
      })),
    })
  } catch (error) {
    console.error("Error fetching files:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 