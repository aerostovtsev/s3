import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const offset = parseInt(searchParams.get("offset") || "0");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "date";
    const direction = searchParams.get("direction") || "desc";

    const where: Prisma.FileWhereInput = {
      userId: session.user.id,
      isDeleted: false,
      OR: search
        ? [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { type: { contains: search, mode: Prisma.QueryMode.insensitive } },
          ]
        : undefined,
    };

    const total = await prisma.file.count({ where });

    let orderBy: Prisma.FileOrderByWithRelationInput = {};

    switch (sort) {
      case "name":
        orderBy = { name: direction as "asc" | "desc" };
        break;
      case "size":
        orderBy = { size: direction as "asc" | "desc" };
        break;
      case "date":
      default:
        orderBy = { updatedAt: direction as "asc" | "desc" };
        break;
    }

    let files = [];

    if (sort === "size") {
      try {
        const orderDirection = direction === "asc" ? "ASC" : "DESC";

        const userId = session.user.id;
        const isDeleted = false;
        const searchLower = search ? search.toLowerCase() : "";
        const searchPattern = search ? `%${searchLower}%` : "";

        let sqlQuery = `
          SELECT * FROM "File"
          WHERE "userId" = $1 AND "isDeleted" = $2
        `;

        const params: any[] = [userId, isDeleted];

        if (search) {
          sqlQuery += ` AND (LOWER("name") LIKE $3 OR LOWER("type") LIKE $3)`;
          params.push(searchPattern);
        }

        sqlQuery += ` ORDER BY CAST("size" AS BIGINT) ${orderDirection} LIMIT $${
          params.length + 1
        } OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        files = await prisma.$queryRawUnsafe<any[]>(sqlQuery, ...params);
      } catch (error) {
        console.error("SQL Query Error:", error);
        files = await prisma.file.findMany({
          where,
          orderBy: { updatedAt: direction as "asc" | "desc" },
          skip: offset,
          take: limit,
        });
      }
    } else {
      files = await prisma.file.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      });
    }

    return NextResponse.json({
      files: files.map((file) => ({
        ...file,
        size: file.size.toString(),
        createdAt:
          file.createdAt instanceof Date
            ? file.createdAt.toISOString()
            : file.createdAt,
        updatedAt:
          file.updatedAt instanceof Date
            ? file.updatedAt.toISOString()
            : file.updatedAt,
      })),
      total,
    });
  } catch (error) {
    console.error("Error fetching files:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
