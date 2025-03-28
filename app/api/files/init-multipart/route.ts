import { NextResponse } from "next/server";
import { initMultipartUpload } from "@/lib/s3";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log('Received init-multipart request:', body);

    const { fileName, contentType } = body;

    if (!fileName || !contentType) {
      console.error("Missing required fields:", { fileName, contentType });
      return NextResponse.json(
        { error: "Missing required fields", details: { fileName, contentType } },
        { status: 400 }
      );
    }

    console.log("Initializing multipart upload for:", {
      fileName,
      contentType,
      userId: session.user.id,
    });

    const { uploadId, key } = await initMultipartUpload(fileName, contentType, session.user.id);

    if (!uploadId || !key) {
      console.error("Failed to get uploadId or key from S3");
      return NextResponse.json(
        { error: "Failed to initialize upload", details: "No uploadId or key received from S3" },
        { status: 500 }
      );
    }

    console.log("Successfully initialized multipart upload:", { uploadId, key });

    return NextResponse.json({ uploadId, key });
  } catch (error) {
    console.error("Error initializing multipart upload:", error);
    return NextResponse.json(
      { 
        error: "Failed to initialize multipart upload", 
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 