"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { FileCard } from "@/components/dashboard/file-card"
import { FileTable } from "@/components/dashboard/file-table"
import { FileUploader } from "@/components/dashboard/file-uploader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ViewType, SortOption, File } from "@/types/file"
import { Search, Grid, List, Upload, ArrowUp, ArrowDown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from "@/components/ui/table"

interface FileManagerProps {
  initialFiles: File[]
  userId: string
}

export function FileManager({ initialFiles, userId }: FileManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [files, setFiles] = useState<File[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [viewType, setViewType] = useState<ViewType>(searchParams.get("view") as ViewType || "grid")
  const [isLoading, setIsLoading] = useState(false)
  const [isViewTypeLoading, setIsViewTypeLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const itemsPerPage = 24
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isMounted = useRef(false)
  const [totalFiles, setTotalFiles] = useState(0)
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null)

  const fetchFiles = async (offset: number = 0, search: string = searchQuery) => {
    try {
      if (isLoading) return

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

      const response = await fetch(`/api/files?${params}`)
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
  }, [hasMore, isLoading, files.length, searchQuery])

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
      if (initialFiles.length === 0) {
        fetchFiles(0)
      }
    }
  }, [searchQuery])

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

  const handleViewChange = (value: string) => {
    setIsViewTypeLoading(true)
    setViewType(value as ViewType)
    const params = new URLSearchParams(searchParams)
    params.set("view", value)
    router.push(`${pathname}?${params.toString()}`)
    setIsViewTypeLoading(false)
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isDeleted: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete file")
      }

      setFiles(prev => prev.filter(file => file.id !== fileId))

      toast({
        title: "Success",
        description: "File deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting file:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file",
      })
    }
  }

  const handleBulkDelete = async () => {
    try {
      const response = await fetch("/api/files/bulk-delete", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileIds: Array.from(selectedFiles),
          isDeleted: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete files")
      }

      setFiles(files.filter(f => !selectedFiles.has(f.id)))
      setSelectedFiles(new Set())
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

  const handleFileUpload = (newFiles: File[]) => {
    setFiles(prev => [...newFiles, ...prev])
  }

  const handleCardClick = (fileId: string, index: number, event: React.MouseEvent) => {
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Выделение диапазона файлов
      const start = Math.min(lastSelectedIndex, index)
      const end = Math.max(lastSelectedIndex, index)
      const newSelected = new Set(selectedFiles)
      
      for (let i = start; i <= end; i++) {
        newSelected.add(files[i].id)
      }
      
      setSelectedFiles(newSelected)
    } else if (event.ctrlKey || event.metaKey) {
      // Добавление/удаление одного файла
      const newSelected = new Set(selectedFiles)
      if (newSelected.has(fileId)) {
        newSelected.delete(fileId)
      } else {
        newSelected.add(fileId)
      }
      setSelectedFiles(newSelected)
    } else {
      // Одиночный выбор
      setSelectedFiles(new Set([fileId]))
    }
    setLastSelectedIndex(index)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.file-card') && !target.closest('button')) {
        setSelectedFiles(new Set())
        setLastSelectedIndex(null)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Найти файлы..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleViewChange(viewType === "grid" ? "list" : "grid")}
          >
            {viewType === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
          <Button onClick={() => setIsUploading(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
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
        {isLoading && files.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Loading...
          </div>
        ) : !isViewTypeLoading && (
          viewType === "grid" ? (
            <div className={cn(
              "grid gap-4",
              "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
              {isLoading ? (
                Array.from({ length: itemsPerPage }).map((_, index) => (
                  <FileCard key={index} isLoading />
                ))
              ) : files.map((file, index) => (
                <div key={file.id} className="file-card">
                  <FileCard
                    file={file}
                    onDelete={handleFileDelete}
                    isSelected={selectedFiles.has(file.id)}
                    onClick={(e) => handleCardClick(file.id, index, e)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="file-table">
              <FileTable 
                files={files} 
                onDelete={handleFileDelete}
                onBulkDelete={handleBulkDelete}
                selectedFiles={selectedFiles}
                onSelectionChange={setSelectedFiles}
                isLoading={false} 
              />
            </div>
          )
        )}
        {hasMore && !isLoading && (
          <div ref={loadMoreRef} className="h-4" />
        )}
      </div>

      <FileUploader
        isOpen={isUploading}
        onClose={() => {
          setIsUploading(false)
          setFiles([])
          setHasMore(true)
          lastFetchParamsRef.current = ""
          fetchFiles(0, searchQuery)
        }}
        onUploadComplete={handleFileUpload}
        userId={userId}
      />
    </div>
  )
}

