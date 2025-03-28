"use client"

import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { FileManager } from "@/components/dashboard/file-manager"
import type { File } from "@/types/file"

interface DashboardClientProps {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  initialFiles: File[]
}

export function DashboardClient({ user, initialFiles }: DashboardClientProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={user} />
      <main className="flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          <FileManager initialFiles={initialFiles} userId={user.id} />
        </div>
      </main>
    </div>
  )
} 