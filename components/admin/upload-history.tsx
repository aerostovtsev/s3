"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import type { UploadHistory as UploadHistoryType } from "@/types/admin"
import { formatFileSize, formatDate } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface UploadHistoryProps {
  initialHistory: UploadHistoryType[]
}

export function UploadHistory({ initialHistory }: UploadHistoryProps) {
  const [history, setHistory] = useState<UploadHistoryType[]>(initialHistory)
  const [isLoading, setIsLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [hasMore, setHasMore] = useState(true)
  const itemsPerPage = 24
  const lastFetchParamsRef = useRef<string>("")
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const isMounted = useRef(false)

  const fetchHistory = async (offset: number = 0, search: string = searchQuery, status: string = statusFilter) => {
    try {
      if (isLoading || (!isMounted.current && offset === 0)) return;

      if (!search && status === "all" && offset === 0) {
        return
      }

      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
        status,
      })

      const paramsString = params.toString()
      if (paramsString === lastFetchParamsRef.current) {
        return
      }

      setIsLoading(true)
      setShowSkeleton(true)
      lastFetchParamsRef.current = paramsString

      const response = await fetch(`/api/admin/upload-history?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch upload history")
      }
      
      if (offset === 0) {
        setHistory(data.history || [])
      } else {
        setHistory(prev => [...prev, ...(data.history || [])])
      }
      
      setHasMore((data.history || []).length === itemsPerPage)
    } catch (error) {
      console.error("Error fetching upload history:", error)
      if (offset === 0) {
        setHistory([])
      }
      setHasMore(false)
    } finally {
      setTimeout(() => {
        setShowSkeleton(false)
        setIsLoading(false)
      }, 500)
    }
  }

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0]
    if (target.isIntersecting && hasMore && !isLoading && history.length > 0 && isMounted.current) {
      fetchHistory(history.length)
    }
  }, [hasMore, isLoading, history.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true
      return
    }

    const option = {
      root: null,
      rootMargin: "200px",
      threshold: 0
    }

    const observer = new IntersectionObserver(handleObserver, option)
    const currentElement = loadMoreRef.current

    if (currentElement) observer.observe(currentElement)

    return () => {
      if (currentElement) observer.unobserve(currentElement)
    }
  }, [handleObserver])

  useEffect(() => {
    if (!isMounted.current) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery || statusFilter !== "all") {
      searchTimeoutRef.current = setTimeout(() => {
        fetchHistory(0, searchQuery, statusFilter)
      }, 300)
    } else {
      setHistory(initialHistory)
      setHasMore(initialHistory.length === itemsPerPage)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, statusFilter, initialHistory])

  const handleSearchChange = (value: string) => {
    if (!isMounted.current) return
    setSearchQuery(value)
  }

  const handleStatusChange = (value: string) => {
    if (!isMounted.current) return
    setStatusFilter(value)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Найти файлы или пользователей..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="min-h-[300px]">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Пользователь</TableHead>
                <TableHead className="font-medium">Файл</TableHead>
                <TableHead className="font-medium">Размер</TableHead>
                <TableHead className="font-medium">Статус</TableHead>
                <TableHead className="font-medium">Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    No upload history found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {history.map((entry) => (
                    <TableRow 
                      key={entry.id}
                      className="hover:bg-muted/50"
                    >
                      <TableCell className="font-medium">{entry.user?.email || "Unknown"}</TableCell>
                      <TableCell>{entry.file?.name || "Unknown"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatFileSize(entry.size)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                          entry.status === "SUCCESS" 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                          {entry.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
        <div ref={loadMoreRef} className="h-4" />
      </div>
    </div>
  )
}

