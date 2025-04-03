import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface CreateFileParams {
  fileName: string;
  size: string;
  type: string;
  path: string;
  userId: string;
}

export async function createFileAndHistory({
  fileName,
  size,
  type,
  path,
  userId,
}: CreateFileParams) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(
        "Session expired or user not found. Please log in again."
      );
    }

    // Create file in database
    const file = await prisma.file.create({
      data: {
        name: fileName,
        size,
        type,
        path,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    // Create upload history record
    await prisma.uploadHistory.create({
      data: {
        size,
        status: "SUCCESS",
        file: {
          connect: {
            id: file.id,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return file;
  } catch (error) {
    console.error("Error creating file:", error);
    throw error;
  }
}
