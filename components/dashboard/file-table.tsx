"use client"

import { useState } from "react"
import type { File } from "@/types/file"
import { formatFileSize } from "@/lib/utils"
import { getFileTypeIcon } from "@/lib/file-icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, MoreVertical, Pencil, Trash2 } from "lucide-react"

interface FileTableProps {
  files: File[]
  onDelete: (fileId: string) => void
  onRename: (fileId: string, newName: string) => void
}

export function FileTable({ files, onDelete, onRename }: FileTableProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleRename = (fileId: string) => {
    if (newFileName.trim()) {
      onRename(fileId, newFileName)
      setRenamingId(null)
    }
  }

  const startRenaming = (file: File) => {
    setNewFileName(file.name)
    setRenamingId(file.id)
  }

  const handleDownload = async (fileId: string) => {
    window.open(`/api/files/${fileId}/download`, "_blank")
  }

  const confirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId)
      setDeletingId(null)
    }
  }

  const fileToDelete = deletingId ? files.find((f) => f.id === deletingId) : null

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date Modified</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No files found
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => {
                const FileIcon = getFileTypeIcon(file.type)
                return (
                  <TableRow key={file.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                        {renamingId === file.id ? (
                          <Input
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(file.id)
                              if (e.key === "Escape") setRenamingId(null)
                            }}
                            autoFocus
                            className="h-8"
                          />
                        ) : (
                          <span>{file.name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(file.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{file.type}</TableCell>
                    <TableCell>
                      {renamingId === file.id ? (
                        <Button size="sm" onClick={() => handleRename(file.id)}>
                          Save
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => startRenaming(file)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Rename</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingId(file.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{fileToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

