import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FileManagement } from "@/components/admin/file-management";
import { prisma } from "@/lib/db";

export default async function AdminFilesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch all files
  const files = await prisma.file
    .findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })
    .then((files) =>
      files.map((file) => ({
        ...file,
        size: file.size.toString(),
        createdAt: file.createdAt.toISOString(),
        updatedAt: file.updatedAt.toISOString(),
        user: {
          ...file.user,
          name: file.user.name || "",
        },
      }))
    );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Управление файлами</h1>
      <FileManagement initialFiles={files} />
    </div>
  );
}
