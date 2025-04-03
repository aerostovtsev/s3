import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeMultipartUpload } from "@/lib/s3";
import { createFileAndHistory } from "@/lib/file-utils";

export async function POST(request: Request) {
  let fileName = "unknown";
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, parts, size, type, key } = body;
    fileName = body.fileName || "unknown";

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

    console.log("Starting finalization of upload:", {
      fileName,
      uploadId,
      partsCount: parts.length,
      size,
      type,
      key,
    });
    const fileSize = size.toString();
    await completeMultipartUpload(key, uploadId, parts);

    console.log("Creating file record in database:", {
      fileName,
      size: fileSize,
      type,
      path: key,
      userId: session.user.id,
    });
    const file = await createFileAndHistory({
      fileName,
      size: fileSize,
      type,
      path: key,
      userId: session.user.id,
    });

    console.log("File upload completed successfully:", {
      fileId: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      path: file.path,
    });
    return NextResponse.json({
      success: true,
      message: "Multipart upload completed successfully",
      file,
    });
  } catch (error: any) {
    console.error("Error in complete-multipart route:", {
      fileName,
      error,
    });
    return NextResponse.json(
      { error: error.message || "Failed to complete upload" },
      { status: error.message?.includes("Session expired") ? 401 : 500 }
    );
  }
}
