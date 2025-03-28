import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { AdminTabs } from "@/components/admin/admin-tabs"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={session.user} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <AdminTabs />
          <div className="mt-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
} 