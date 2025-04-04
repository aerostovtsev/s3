"use client"

import { useState } from "react"
import type { File } from "@/types/file"
import { formatFileSize, formatDate } from "@/lib/utils"
import { getFileTypeIcon } from "@/lib/file-icons"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, MoreVertical, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface FileTableProps {
  files?: File[]
  onDelete?: (fileId: string) => void
  isLoading?: boolean
}

export function FileTable({ files = [], onDelete, isLoading }: FileTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDownload = async (fileId: string) => {
    try {
      console.log("Starting download for file:", fileId)
      const response = await fetch(`/api/files/download/${fileId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link")
      }
      console.log("Received download URL:", data.url)
      window.open(data.url, "_blank")
    } catch (error) {
      console.error("Error downloading file:", error)
      toast.error("Не удалось скачать файл")
    }
  }

  const confirmDelete = () => {
    if (!deletingId || !onDelete) return
    onDelete(deletingId)
    setDeletingId(null)
  }

  const fileToDelete = deletingId
    ? files.find((f) => f.id === deletingId)
    : null

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Дата создания</TableHead>
              <TableHead>Размер</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center h-24 text-muted-foreground"
                >
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
                        <span>{file.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(file.createdAt)}</TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell>{file.type}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleDownload(file.id)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            <span>Скачать</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingId(file.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Удалить</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить файл</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить файл: "
              <span className="max-w-[280px] inline-block align-bottom truncate">
                {fileToDelete?.name}
              </span>
              "? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Отменить
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
