import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminClient } from "@/components/admin/admin-client";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  redirect("/admin/users");

  // Fetch initial users
  const users = await prisma.user
    .findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    .then((users) =>
      users.map((user) => ({
        ...user,
        name: user.name || "",
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        role: user.role as "ADMIN" | "USER",
      }))
    );

  return <AdminClient user={session.user} initialUsers={users} />;
}
