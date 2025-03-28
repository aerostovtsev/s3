import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/s3";
import { createFileAndHistory } from "@/lib/file-utils";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("Received complete-multipart request:", {
      fileName: body.fileName,
      uploadId: body.uploadId,
      partsCount: body.parts?.length,
      size: body.size,
      type: body.type,
      key: body.key,
    });

    const { fileName, uploadId, parts, size, type, key } = body;

    if (!fileName || !uploadId || !parts || !size || !type || !key) {
      console.error("Missing required fields:", {
        fileName: !!fileName,
        uploadId: !!uploadId,
        parts: !!parts,
        size: !!size,
        type: !!type,
        key: !!key,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const fileSize = size.toString();

    console.log("Starting completeMultipartUpload...");
    await completeMultipartUpload(key, uploadId, parts);
    console.log("Multipart upload completed successfully");

    console.log("Creating file record in database...");
    const file = await createFileAndHistory({
      fileName,
      size: fileSize,
      type,
      path: key,
      userId: session.user.id,
    });
    console.log("File record created:", file);

    const serializedFile = {
      ...file,
    };

    return NextResponse.json({
      success: true,
      message: "Multipart upload completed successfully",
      file: serializedFile,
    });
  } catch (error) {
    console.error("Error in complete-multipart route:", error);
    return NextResponse.json(
      { error: "Failed to complete multipart upload", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 