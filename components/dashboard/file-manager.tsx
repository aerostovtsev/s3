"use client"

import { useState, useCallback, useEffect } from "react"
import { FileCard } from "@/components/dashboard/file-card"
import { FileUploader } from "@/components/dashboard/file-uploader"
import { FileTable } from "@/components/dashboard/file-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { ViewType, SortOption, File } from "@/types/file"
import { Search, Grid, List, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface FileManagerProps {
  initialFiles: File[]
  userId: string
}

export function FileManager({ initialFiles, userId }: FileManagerProps) {
  const [files, setFiles] = useState<File[]>(initialFiles)
  const [filteredFiles, setFilteredFiles] = useState<File[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOption, setSortOption] = useState<SortOption>("newest")
  const [viewType, setViewType] = useState<ViewType>("grid")
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  // Filter and sort files
  useEffect(() => {
    let result = [...files]

    // Apply search filter
    if (searchQuery) {
      result = result.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }

    // Apply sorting
    switch (sortOption) {
      case "newest":
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        break
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case "size-asc":
        result.sort((a, b) => a.size - b.size)
        break
      case "size-desc":
        result.sort((a, b) => b.size - a.size)
        break
      default:
        break
    }

    setFilteredFiles(result)
  }, [files, searchQuery, sortOption])

  const handleFileUpload = useCallback(
    async (uploadedFiles: File[]) => {
      setFiles((prevFiles) => [...uploadedFiles, ...prevFiles])

      toast({
        title: `${uploadedFiles.length} file(s) uploaded successfully`,
        description: "Your files are now available in your storage.",
      })
    },
    [toast],
  )

  const handleFileDelete = useCallback(
    async (fileId: string) => {
      try {
        await fetch(`/api/files/${fileId}`, {
          method: "DELETE",
        })

        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId))

        toast({
          title: "File deleted",
          description: "The file has been successfully deleted.",
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete the file. Please try again.",
        })
      }
    },
    [toast],
  )

  const handleFileRename = useCallback(
    async (fileId: string, newName: string) => {
      try {
        const response = await fetch(`/api/files/${fileId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newName }),
        })

        if (!response.ok) throw new Error("Failed to rename file")

        const updatedFile = await response.json()

        setFiles((prevFiles) => prevFiles.map((file) => (file.id === fileId ? updatedFile : file)))

        toast({
          title: "File renamed",
          description: "The file has been successfully renamed.",
        })
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to rename the file. Please try again.",
        })
      }
    },
    [toast],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Files</h1>
        <Button onClick={() => setIsUploading(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="size-asc">Size (Small to Large)</SelectItem>
              <SelectItem value="size-desc">Size (Large to Small)</SelectItem>
            </SelectContent>
          </Select>
          <Tabs value={viewType} onValueChange={(value) => setViewType(value as ViewType)} className="h-9">
            <TabsList>
              <TabsTrigger value="grid" className="px-3">
                <Grid className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list" className="px-3">
                <List className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No files found. Upload some files to get started.</p>
        </div>
      ) : (
        <div>
          {viewType === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <FileCard key={file.id} file={file} onDelete={handleFileDelete} onRename={handleFileRename} />
              ))}
            </div>
          ) : (
            <FileTable files={filteredFiles} onDelete={handleFileDelete} onRename={handleFileRename} />
          )}
        </div>
      )}

      <FileUploader
        isOpen={isUploading}
        onClose={() => setIsUploading(false)}
        onUploadComplete={handleFileUpload}
        userId={userId}
      />
    </div>
  )
}

