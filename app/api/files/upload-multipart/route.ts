import { NextResponse } from "next/server";
import { uploadPart } from "@/lib/s3";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const uploadId = formData.get("uploadId") as string;
    const partNumber = parseInt(formData.get("partNumber") as string);
    const key = formData.get("key") as string;

    if (!file || !uploadId || !partNumber || !key) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const etag = await uploadPart(key, uploadId, partNumber, buffer);

    return NextResponse.json({ etag });
  } catch (error) {
    console.error("Error uploading part:", error);
    return NextResponse.json(
      { error: "Failed to upload part" },
      { status: 500 }
    );
  }
} 