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
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "all"

    const where: Prisma.UploadHistoryWhereInput = {
      status: status === "all" ? undefined : status.toUpperCase(),
      OR: search
        ? [
            { file: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
            { user: { email: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ]
        : undefined,
    }

    const history = await prisma.uploadHistory.findMany({
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
        file: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ history })
  } catch (error) {
    console.error("Error fetching upload history:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
} 