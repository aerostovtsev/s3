"use client"

import { UserManagement } from "@/components/admin/user-management"
import type { User } from "@/types/admin"

interface AdminClientProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  initialUsers: User[]
}

export function AdminClient({ user, initialUsers }: AdminClientProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Управление пользователями</h1>
      <UserManagement initialUsers={initialUsers} />
    </div>
  )
} 