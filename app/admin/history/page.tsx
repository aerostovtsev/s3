import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UploadHistory } from "@/components/admin/upload-history"
import { prisma } from "@/lib/db"

export default async function AdminHistoryPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch initial history with pagination
  const uploadHistory = await prisma.uploadHistory.findMany({
    include: {
      user: {
        select: {
          email: true,
          name: true,
        },
      },
      file: {
        select: {
          name: true,
          size: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 24,
  }).then(history => history.map(item => ({
    ...item,
    size: item.size.toString(),
    createdAt: item.createdAt.toISOString(),
    file: {
      ...item.file,
      size: item.file.size.toString()
    },
    user: {
      ...item.user,
      name: item.user.name || ""
    }
  })))

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">История загрузок</h1>
      <UploadHistory initialHistory={uploadHistory} />
    </div>
  )
} 