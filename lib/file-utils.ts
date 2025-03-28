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
  // Create file in database
  const file = await prisma.file.create({
    data: {
      name: fileName,
      size,
      type,
      path,
      user: {
        connect: {
          id: userId
        }
      }
    }
  });

  // Create upload history record
  await prisma.uploadHistory.create({
    data: {
      size,
      status: "SUCCESS",
      file: {
        connect: {
          id: file.id
        }
      },
      user: {
        connect: {
          id: userId
        }
      }
    }
  });

  return file;
} 