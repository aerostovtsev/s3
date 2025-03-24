import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FileManager } from "@/components/dashboard/file-manager"
import { prisma } from "@/lib/db"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Fetch user files
  const files = await prisma.file.findMany({
    where: {
      userId: session.user.id,
      isDeleted: false,
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={session.user} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <FileManager initialFiles={files} userId={session.user.id} />
        </div>
      </main>
    </div>
  )
}

