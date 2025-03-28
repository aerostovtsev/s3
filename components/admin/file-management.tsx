"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { File } from "@/types/admin"
import { formatFileSize, formatDate, cn } from "@/lib/utils"
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
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [fileToDelete, setFileToDelete] = useState<File | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)
  const { toast } = useToast()
  const itemsPerPage = 24
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isMounted = useRef(false)

  const fetchFiles = async (offset: number = 0, search: string = searchQuery) => {
    try {
      if (isLoading) return;

      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
      })

      const paramsString = params.toString()
      if (paramsString === lastFetchParamsRef.current) {
        return
      }

      setIsLoading(true)
      lastFetchParamsRef.current = paramsString

      const response = await fetch(`/api/admin/files?${params}`)
      if (!response.ok) throw new Error("Failed to fetch files")
      
      const data = await response.json()
      
      if (offset === 0) {
        setFiles(data.files)
      } else {
        await new Promise(resolve => setTimeout(resolve, 100))
        setFiles(prev => [...prev, ...data.files])
      }
      
      setHasMore(data.files.length === itemsPerPage)
    } catch (error) {
      console.error("Error fetching files:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch files. Please refresh the page.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && hasMore && !isLoading && files.length > 0) {
      fetchFiles(files.length)
    }
  }, [hasMore, isLoading, files.length, searchQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "20px",
      threshold: 0.1,
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current)
      }
    }
  }, [handleObserver])

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      if (!initialFiles.length) {
        fetchFiles()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (value: string) => {
    if (!isMounted.current) return
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setFiles([])
        setHasMore(true)
        lastFetchParamsRef.current = ""
        fetchFiles(0, value)
      }
    }, 500)
  }

  const handleDownload = async (fileId: string) => {
    try {
      const file = files.find(f => f.id === fileId);
      if (!file) {
        throw new Error("File not found");
      }

      console.log("Starting download for file:", fileId);
      const response = await fetch(`/api/files/download/${fileId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

      console.log("Received download URL:", data.url);
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
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "delete" }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete file")
      }

      setIsDeleteDialogOpen(false)
      setFileToDelete(null)

      setFiles(prev => prev.map(file => 
        file.id === fileId ? { ...file, isDeleted: true } : file
      ))

      toast({
        title: "Успешно",
        description: "Файл удален",
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить файл",
        variant: "destructive",
      })
    }
  }

  const handleRestoreFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "restore" }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to restore file")
      }

      if (searchQuery) {
        fetchFiles(0, searchQuery)
      } else {
        setFiles(prev => prev.map(file => 
          file.id === fileId ? { ...file, isDeleted: false } : file
        ))
      }

      toast({
        title: "File restored",
        description: "The file has been successfully restored",
      })
    } catch (error: unknown) {
      console.error("Error restoring file:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restore file",
      })
    }
  }

  const handleRowClick = (fileId: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelected = new Set(selectedFiles)
      
      for (let i = start; i <= end; i++) {
        newSelected.add(files[i].id)
      }
      
      setSelectedFiles(newSelected)
    } else if (event.ctrlKey || event.metaKey) {
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId)
      } else {
        newSelected.add(fileId)
      }
      setSelectedFiles(newSelected)
    } else {
      setSelectedFiles(new Set([fileId]))
    }
    setLastSelectedIndex(index)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return

    try {
      const response = await fetch("/api/admin/files/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete files")
      }

      setFiles(files.filter(f => !selectedFiles.has(f.id)))
      setSelectedFiles(new Set())
      setLastSelectedIndex(null)
      toast({
        title: "Success",
        description: "Selected files have been deleted.",
      })
    } catch (error) {
      console.error("Error deleting files:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete files. Please try again.",
      })
    }
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Проверяем, что клик был вне таблицы и вне кнопок управления
      const target = event.target as HTMLElement
      const isClickInsideTable = target.closest('.file-table')
      const isClickInsideControls = target.closest('.file-controls')
      
      if (!isClickInsideTable && !isClickInsideControls) {
        setSelectedFiles(new Set())
        setLastSelectedIndex(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Найти файлы или пользователей..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 file-controls">
          {selectedFiles.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
            >
              Delete Selected ({selectedFiles.size})
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-[300px]">
        <div className="rounded-md border file-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Файл</TableHead>
                <TableHead>Владелец</TableHead>
                <TableHead>Размер</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Дата создания</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No files found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {files.map((file, index) => {
                    const FileIcon = getFileTypeIcon(file.type)
                    const isSelected = selectedFiles.has(file.id)
                    return (
                      <TableRow 
                        key={file.id} 
                        className={cn(
                          "cursor-pointer select-none",
                          file.isDeleted && "opacity-60",
                          isSelected && "bg-muted/50 hover:bg-muted/50",
                          !isSelected && "hover:bg-muted/30"
                        )}
                        onClick={(e) => handleRowClick(file.id, index, e)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.user?.email || "Unknown"}</TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{file.type}</TableCell>
                        <TableCell>{formatDate(file.createdAt)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            file.isDeleted 
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}>
                            {file.isDeleted ? "DELETED" : "ACTIVE"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!file.isDeleted && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDownload(file.id)
                                }} 
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            {file.isDeleted ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRestoreFile(file.id)
                                }}
                                title="Restore"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFileToDelete(file)
                                  setIsDeleteDialogOpen(true)
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        <div ref={loadMoreRef} className="h-4" />
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the file "{fileToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDeleteFile(fileToDelete?.id || "")}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

