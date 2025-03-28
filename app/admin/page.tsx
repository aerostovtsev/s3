import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminClient } from "@/components/admin/admin-client"
import { prisma } from "@/lib/db"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Fetch initial users
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 24,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  }).then(users => users.map(user => ({
    ...user,
    name: user.name || "",
    createdAt: user.createdAt.toISOString(),
  })))

  return <AdminClient user={session.user} initialUsers={users} />
}

