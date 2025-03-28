import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePresignedUrl } from "@/lib/s3";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    console.log("[FILE_DOWNLOAD] Starting download request for file:", id);
    
    const session = await getServerSession(authOptions);
    console.log("[FILE_DOWNLOAD] Session:", session?.user ? "Authenticated" : "Not authenticated");

    if (!session?.user) {
      console.log("[FILE_DOWNLOAD] Unauthorized download attempt");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[FILE_DOWNLOAD] Searching for file in database...");
    const file = await prisma.file.findUnique({
      where: {
        id,
        userId: session.user.id,
        isDeleted: false,
      },
    });

    if (!file) {
      console.log("[FILE_DOWNLOAD] File not found or access denied:", {
        fileId: id,
        userId: session.user.id,
      });
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    console.log("[FILE_DOWNLOAD] File found:", {
      id: file.id,
      name: file.name,
      path: file.path,
      size: file.size,
    });

    console.log("[FILE_DOWNLOAD] Generating presigned URL for file:", file.path);
    const signedUrl = await generatePresignedUrl(file.path);
    console.log("[FILE_DOWNLOAD] Generated URL:", signedUrl);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("[FILE_DOWNLOAD] Error:", error);
    return NextResponse.json(
      { error: "Failed to get download link" },
      { status: 500 }
    );
  }
} 