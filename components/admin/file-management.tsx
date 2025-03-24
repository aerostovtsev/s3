"use client"

import { useState } from "react"
import type { File } from "@/types/admin"
import { formatFileSize } from "@/lib/utils"
import { getFileTypeIcon } from "@/lib/file-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Search, Download, Trash2, RefreshCw } from "lucide-react"

interface FileManagementProps {
  initialFiles: File[]
}

export function FileManagement({ initialFiles }: FileManagementProps) {
  const [files, setFiles] = useState<File[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<File | null>(null)
  const { toast } = useToast()

  const filteredFiles = files.filter(
    (file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.user?.email && file.user.email.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleDownload = async (fileId: string) => {
    window.open(`/api/files/${fileId}/download`, "_blank")
  }

  const handleDeleteFile = async () => {
    if (!fileToDelete) return

    try {
      const response = await fetch(`/api/admin/files/${fileToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete file")
      }

      setFiles(files.filter((file) => file.id !== fileToDelete.id))
      setFileToDelete(null)
      setIsDeleteDialogOpen(false)

      toast({
        title: "File deleted",
        description: "The file has been successfully deleted",
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to delete file",
      })
    }
  }

  const handleRestoreFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}/restore`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to restore file")
      }

      const restoredFile = await response.json()

      setFiles(files.map((file) => (file.id === fileId ? { ...file, isDeleted: false } : file)))

      toast({
        title: "File restored",
        description: "The file has been successfully restored",
      })
    } catch (error) {
      console.error("Error restoring file:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to restore file",
      })
    }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files or users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Modified At</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                  No files found
                </TableCell>
              </TableRow>
            ) : (
              filteredFiles.map((file) => {
                const FileIcon = getFileTypeIcon(file.type)
                return (
                  <TableRow key={file.id} className={file.isDeleted ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        <span>{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{file.user?.email || "Unknown"}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{file.type}</TableCell>
                    <TableCell>{new Date(file.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      {file.isDeleted ? (
                        <span className="text-destructive">Deleted</span>
                      ) : (
                        <span className="text-green-500">Active</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!file.isDeleted && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(file.id)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {file.isDeleted ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRestoreFile(file.id)}
                            title="Restore"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setFileToDelete(file)
                              setIsDeleteDialogOpen(true)
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete File Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the file "{fileToDelete?.name}"? This action can be reversed later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteFile}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

