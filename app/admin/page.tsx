import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AdminTabs } from "@/components/admin/admin-tabs"
import { prisma } from "@/lib/db"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch users
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
  })

  // Fetch all files
  const files = await prisma.file.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  // Fetch upload history
  const uploadHistory = await prisma.uploadHistory.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
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
    take: 100,
  })

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={session.user} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
          <AdminTabs users={users} files={files} uploadHistory={uploadHistory} />
        </div>
      </main>
    </div>
  )
}

