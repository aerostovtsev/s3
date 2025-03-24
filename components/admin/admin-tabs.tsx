"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagement } from "@/components/admin/user-management"
import { FileManagement } from "@/components/admin/file-management"
import { UploadHistory } from "@/components/admin/upload-history"
import type { User, File, UploadHistory as UploadHistoryType } from "@/types/admin"

interface AdminTabsProps {
  users: User[]
  files: File[]
  uploadHistory: UploadHistoryType[]
}

export function AdminTabs({ users, files, uploadHistory }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState("users")

  return (
    <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="files">Files</TabsTrigger>
        <TabsTrigger value="history">Upload History</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <UserManagement initialUsers={users} />
      </TabsContent>

      <TabsContent value="files" className="space-y-4">
        <FileManagement initialFiles={files} />
      </TabsContent>

      <TabsContent value="history" className="space-y-4">
        <UploadHistory initialHistory={uploadHistory} />
      </TabsContent>
    </Tabs>
  )
}

