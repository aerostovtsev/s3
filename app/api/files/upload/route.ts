import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadFileToS3 } from "@/lib/s3-client";
import crypto from "crypto";
import { getFileExtension } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = crypto.createHash("md5").update(buffer).digest("hex");
    const extension = getFileExtension(file.name);
    const key = `files/${session.user.id}/${fileHash}.${extension}`;

    await uploadFileToS3(buffer, key, file.type);

    // Create or update file record in database
    const existingFile = await prisma.file.findFirst({
      where: {
        path: key,
        userId: session.user.id,
      },
    });

    if (existingFile) {
      const updatedFile = await prisma.file.update({
        where: {
          id: existingFile.id,
        },
        data: {
          name: file.name,
          size: file.size,
          type: file.type,
          isDeleted: false,
          updatedAt: new Date(),
        },
      });

      // Create upload history
      await prisma.uploadHistory.create({
        data: {
          fileId: updatedFile.id,
          userId: session.user.id,
          size: file.size,
          status: "SUCCESS",
        },
      });

      return NextResponse.json(updatedFile);
    } else {
      const newFile = await prisma.file.create({
        data: {
          name: file.name,
          size: file.size,
          type: file.type,
          path: key,
          userId: session.user.id,
        },
      });

      // Create upload history
      await prisma.uploadHistory.create({
        data: {
          fileId: newFile.id,
          userId: session.user.id,
          size: file.size,
          status: "SUCCESS",
        },
      });

      return NextResponse.json(newFile);
    }
  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Failed to process file upload" },
      { status: 500 }
    );
  }
}
