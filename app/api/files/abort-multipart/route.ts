import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { abortMultipartUpload } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId, key } = body;

    if (!uploadId || !key) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await abortMultipartUpload(key, uploadId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error aborting multipart upload:", error);
    return NextResponse.json(
      { error: "Failed to abort upload" },
      { status: 500 }
    );
  }
}
