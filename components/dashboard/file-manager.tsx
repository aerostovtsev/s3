"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { FileCard } from "@/components/dashboard/file-card"
import { FileTable } from "@/components/dashboard/file-table"
import { FileUploader } from "@/components/dashboard/file-uploader"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { ViewType, File } from "@/types/file"
import {
  Search,
  Grid,
  List,
  Upload,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FileManagerProps {
  initialFiles: File[]
  userId: string
}

type SortType = "name" | "date" | "size"

export function FileManager({ initialFiles, userId }: FileManagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [files, setFiles] = useState<File[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  )
  const [viewType, setViewType] = useState<ViewType>(
    (searchParams.get("view") as ViewType) || "grid"
  )
  const [sortType, setSortType] = useState<SortType>(
    (searchParams.get("sort") as SortType) || "date"
  )
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    (searchParams.get("direction") as "asc" | "desc") || "desc"
  )
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isViewTypeLoading, setIsViewTypeLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const itemsPerPage = 20
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isMounted = useRef(false)

  const fetchFiles = async (
    page: number = currentPage,
    search: string = searchQuery
  ) => {
    try {
      if (isLoading) return

      const offset = (page - 1) * itemsPerPage
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
        sort: sortType,
        direction: sortDirection,
      })

      const paramsString = params.toString()
      if (paramsString === lastFetchParamsRef.current) {
        return
      }

      setIsLoading(true)
      lastFetchParamsRef.current = paramsString

      const response = await fetch(`/api/files?${params}`)

      if (response.status === 401) {
        router.push("/login")
        return
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("X-RateLimit-Reset") || "60"
        const remaining = response.headers.get("X-RateLimit-Remaining") || "0"
        const retryAfterSeconds = parseInt(retryAfter)

        toast.error(
          `Превышен лимит запросов. Пожалуйста, подождите ${retryAfterSeconds} секунд. Осталось запросов: ${remaining}`
        )

        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Ошибка при загрузке файлов: ${response.status}`
            )
      }

      const data = await response.json()

      setFiles(data.files)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
      setHasMore(data.files.length === itemsPerPage)
    } catch (error) {
      console.error("Error fetching files:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить файлы. Пожалуйста, обновите страницу."
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      // Получаем начальные параметры из URL
      const page = parseInt(searchParams.get("page") || "1")
      const sort = (searchParams.get("sort") as SortType) || "date"
      const direction =
        (searchParams.get("direction") as "asc" | "desc") || "desc"

      setCurrentPage(page)
      setSortType(sort)
      setSortDirection(direction)

      if (initialFiles.length === 0) {
        fetchFiles(page)
      }
    }
  }, [])

  // Обновляем файлы при изменении страницы или параметров сортировки
  useEffect(() => {
    if (isMounted.current) {
      // Избегаем дублирования запросов при прямом вызове fetchFiles
      // из обработчиков handleSortChange и handlePageChange
      const isExplicitUpdate =
        searchParams.get("page") === currentPage.toString() &&
        searchParams.get("sort") === sortType &&
        searchParams.get("direction") === sortDirection

      if (!isExplicitUpdate) {
        fetchFiles(currentPage, searchQuery)
      }
    }
      }, [currentPage, sortType, sortDirection])

  const handleSearchChange = (value: string) => {
    if (!isMounted.current) return
    setSearchQuery(value)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (isMounted.current) {
        setCurrentPage(1)
        fetchFiles(1, value)
      }
    }, 1000)
  }


  const handleViewChange = (value: string) => {
    setIsViewTypeLoading(true)
    setViewType(value as ViewType)
    const params = new URLSearchParams(searchParams)
    params.set("view", value)
    router.push(`${pathname}?${params.toString()}`)
    setIsViewTypeLoading(false)
  }

  const handleSortChange = async (value: string) => {
    const [newSortType, newDirection] = value.split("-")

    // Сбрасываем состояние перед сменой сортировки
    setFiles([])
    setIsLoading(true)

    // Обновляем стейт
    setSortType(newSortType as SortType)
    setSortDirection(newDirection as "asc" | "desc")

    // Всегда возвращаемся на первую страницу при смене сортировки
    setCurrentPage(1)

    // Сбрасываем кэш параметров запроса
    lastFetchParamsRef.current = ""

    try {
      // Выполняем запрос напрямую
      const offset = 0 // Первая страница
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        sort: newSortType,
        direction: newDirection,
      })

      const response = await fetch(`/api/files?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.message || `Ошибка при загрузке файлов: ${response.status}`
        )
      }

      const data = await response.json()

      // Обновляем список файлов и данные пагинации
      setFiles(data.files)
      setTotalPages(Math.ceil(data.total / itemsPerPage))
      setHasMore(data.files.length === itemsPerPage)

      // Убеждаемся, что пагинация отображается корректно
      if (data.total > itemsPerPage) {
        console.log(
          `Total pages calculated: ${Math.ceil(data.total / itemsPerPage)}`
        )
      }

      // Обновляем URL после успешного получения данных
      const urlParams = new URLSearchParams(searchParams)
      urlParams.set("sort", newSortType)
      urlParams.set("direction", newDirection)
      urlParams.set("page", "1")
      router.push(`${pathname}?${urlParams.toString()}`)
    } catch (error) {
      console.error("Error fetching files with new sort:", error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить файлы. Пожалуйста, обновите страницу."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)

    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)

    fetchFiles(newPage, searchQuery)
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

      setFiles((prev) => prev.filter((file) => file.id !== fileId))
      toast.success("Файл успешно удален")
    } catch (error) {
      console.error("Error deleting file:", error)
      toast.error("Ошибка при удалении файла")
    }
  }

  const handleFileUpload = (newFiles: File[]) => {
    // Обновляем список файлов только если были успешные загрузки
    if (newFiles && newFiles.length > 0) {
      setFiles(newFiles)
    }
  }

  // Убедимся, что пагинация отображается, даже если totalPages = 1
  const showPagination = () => {
    return files.length > 0
  }

  const handleSearchReset = () => {
    setSearchQuery("")
    setCurrentPage(1)
    fetchFiles(1, "")
  }

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
          {searchQuery && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={handleSearchReset}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={`${sortType}-${sortDirection}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Дата (новые сначала)</SelectItem>
              <SelectItem value="date-asc">Дата (старые сначала)</SelectItem>
              <SelectItem value="name-asc">Имя (А-Я)</SelectItem>
              <SelectItem value="name-desc">Имя (Я-А)</SelectItem>
              <SelectItem value="size-desc">Размер (по убыванию)</SelectItem>
              <SelectItem value="size-asc">Размер (по возрастанию)</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              handleViewChange(viewType === "grid" ? "list" : "grid")
            }
          >
            {viewType === "grid" ? (
              <List className="h-4 w-4" />
            ) : (
              <Grid className="h-4 w-4" />
            )}
          </Button>
          <Button onClick={() => setIsUploading(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Загрузить
          </Button>
        </div>
      </div>

      <div className="min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            Loading...
          </div>
        ) : (
          !isViewTypeLoading &&
          (files.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              No files found
            </div>
          ) : viewType === "grid" ? (
            <div
              className={cn(
                "grid gap-4",
                "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              )}
            >
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onDelete={handleFileDelete}
                  isLoading={isLoading}
                  className="file-card"
                />
              ))}
            </div>
          ) : (
            <div className="file-table">
              <FileTable
                files={files}
                onDelete={handleFileDelete}
                isLoading={false}
              />
            </div>
          ))
        )}

        {showPagination() && (
          <div className="flex items-center justify-end mt-4">
            <div className="flex items-center gap-2">
              <div className="flex w-fit items-center justify-center text-sm font-medium mr-2">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button
                variant="outline"
                className="hidden size-8 p-0 lg:flex"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || isLoading}
              >
                <span className="sr-only">Перейти на первую страницу</span>
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isLoading}
              >
                <span className="sr-only">Перейти на предыдущую страницу</span>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isLoading}
              >
                <span className="sr-only">Перейти на следующую страницу</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || isLoading}
              >
                <span className="sr-only">Перейти на последнюю страницу</span>
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <FileUploader
        isOpen={isUploading}
        onClose={() => {
          setIsUploading(false)
        }}
        onUploadComplete={async (newFiles) => {
          if (newFiles && newFiles.length > 0) {
            try {
              // Очищаем кэш для получения новых данных
              lastFetchParamsRef.current = ""
              // Сбрасываем состояние пагинации
              setCurrentPage(1)
              // Устанавливаем флаг наличия дополнительных файлов
              setHasMore(true)

              // Делаем запрос на получение файлов с сервера
              await fetchFiles(1, searchQuery)

              // НЕ закрываем модальное окно автоматически после успешной загрузки
              // пользователь сам закроет его при необходимости
            } catch (error) {
              console.error("Error fetching files after upload:", error)
            }
          }
          // Не меняем состояние isUploading, чтобы модальное окно оставалось открытым
        }}
        userId={userId}
      />
    </div>
  )
}
