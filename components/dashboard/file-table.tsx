"use client"

import { useState, useEffect } from "react"
import type { File } from "@/types/file"
import { formatFileSize, formatDate, cn } from "@/lib/utils"
import { getFileTypeIcon } from "@/lib/file-icons"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, MoreVertical, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface FileTableProps {
  files?: File[]
  onDelete?: (fileId: string) => void
  onBulkDelete?: () => void
  selectedFiles: Set<string>
  onSelectionChange: (files: Set<string>) => void
  isLoading?: boolean
}

export function FileTable({ 
  files = [], 
  onDelete, 
  onBulkDelete,
  selectedFiles,
  onSelectionChange,
  isLoading 
}: FileTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('tr') && !target.closest('button')) {
        onSelectionChange(new Set())
        setLastSelectedIndex(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [onSelectionChange])

  const handleRowClick = (fileId: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Выделение диапазона файлов
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelected = new Set(selectedFiles)
      
      for (let i = start; i <= end; i++) {
        newSelected.add(files[i].id)
      }
      
      onSelectionChange(newSelected)
    } else if (event.ctrlKey || event.metaKey) {
      // Добавление/удаление одного файла
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId)
      } else {
        newSelected.add(fileId)
      }
      onSelectionChange(newSelected)
    } else {
      // Одиночный выбор
      onSelectionChange(new Set([fileId]))
    }
    setLastSelectedIndex(index)
  }

  const handleBulkDelete = () => {
    if (!onBulkDelete || selectedFiles.size === 0) return
    onBulkDelete()
  }

  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/download/${fileId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

      window.open(data.url, '_blank');
      
      toast({
        title: "Success",
        description: "Download started",
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file. Please try again.",
      });
    }
  }

  const confirmDelete = () => {
    if (!deletingId || !onDelete) return
    onDelete(deletingId)
    setDeletingId(null)
  }

  const fileToDelete = deletingId ? files.find((f) => f.id === deletingId) : null

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead>
                <div className="h-4 w-32 bg-muted rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-24 bg-muted rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-16 bg-muted rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-20 bg-muted rounded" />
              </TableHead>
              <TableHead>
                <div className="h-4 w-8 bg-muted rounded" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full bg-muted" />
                    <div className="h-4 w-32 bg-muted rounded" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="h-4 w-24 bg-muted rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 bg-muted rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-20 bg-muted rounded" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-8 rounded-full bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </div>
      </div>
    )
  }

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
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No files found
                </TableCell>
              </TableRow>
            ) : (
              files.map((file, index) => {
                const FileIcon = getFileTypeIcon(file.type)
                const isSelected = selectedFiles.has(file.id)
                return (
                  <TableRow 
                    key={file.id}
                    className={cn(
                      "cursor-pointer select-none",
                      isSelected && "bg-muted/50 hover:bg-muted/50",
                      !isSelected && "hover:bg-muted/30"
                    )}
                    onClick={(e) => {
                      e.stopPropagation() // Предотвращаем всплытие события
                      handleRowClick(file.id, index, e)
                    }}
                  >
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
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(file.id)
                          }}>
                            <Download className="mr-2 h-4 w-4" />
                            <span>Download</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeletingId(file.id)
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
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

