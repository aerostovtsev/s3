import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { prisma } from "@/lib/db"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Загружаем начальные файлы на сервере
  const dbFiles = await prisma.file.findMany({
    where: {
      userId: session.user.id
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 24
  })

  // Преобразуем даты в строки
  const files = dbFiles.map(file => ({
    ...file,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString()
  }))

  return <DashboardClient initialFiles={files} user={session.user} />
}