"use client";

import { useState, useEffect, useRef } from "react";
import type { UploadHistory as UploadHistoryType } from "@/types/admin";
import { formatFileSize, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Search,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadHistoryProps {
  initialHistory: UploadHistoryType[];
}

export function UploadHistory({ initialHistory }: UploadHistoryProps) {
  const [history, setHistory] = useState<UploadHistoryType[]>(initialHistory);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const lastFetchParamsRef = useRef<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  const fetchHistory = async (
    page: number = currentPage,
    search: string = searchQuery,
    status: string = statusFilter
  ) => {
    try {
      if (isLoading) return;

      const offset = (page - 1) * itemsPerPage;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
        status,
      });

      const paramsString = params.toString();
      if (paramsString === lastFetchParamsRef.current) {
        return;
      }

      setIsLoading(true);
      lastFetchParamsRef.current = paramsString;

      const response = await fetch(`/api/admin/upload-history?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch upload history");
      }

      console.log("Upload history data:", {
        history: data.history.length,
        total: data.total,
        pages: Math.ceil((data.total || 0) / itemsPerPage),
      });

      setHistory(data.history || []);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error("Error fetching upload history:", error);
      setHistory([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      // При первом рендере делаем запрос на сервер для получения актуальных данных
      fetchHistory(1, "", "all");
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery || statusFilter !== "all") {
      searchTimeoutRef.current = setTimeout(() => {
        setCurrentPage(1);
        fetchHistory(1, searchQuery, statusFilter);
      }, 300);
    } else {
      // Для пустого поиска и всех статусов тоже делаем запрос
      setCurrentPage(1);
      fetchHistory(1, "", "all");
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, statusFilter]); // Убрали initialHistory, чтобы не вызывать лишние запросы

  useEffect(() => {
    if (isMounted.current) {
      fetchHistory(currentPage, searchQuery, statusFilter);
    }
  }, [currentPage]);

  const handleSearchChange = (value: string) => {
    if (!isMounted.current) return;
    setSearchQuery(value);
  };

  const handleStatusChange = (value: string) => {
    if (!isMounted.current) return;
    setStatusFilter(value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handleSearchReset = () => {
    setSearchQuery("");
    setCurrentPage(1);
    fetchHistory(1, "", statusFilter);
  };

  // Убедимся, что пагинация отображается, даже если totalPages = 1
  const showPagination = () => {
    return history.length > 0;
  };

  if (isLoading && history.length === 0) {
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
          {searchQuery && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={handleSearchReset}
            />
          )}
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
                <TableHead className="font-medium">Файл</TableHead>
                <TableHead className="font-medium">Пользователь</TableHead>
                <TableHead className="font-medium">Размер</TableHead>
                <TableHead className="font-medium">Дата</TableHead>
                <TableHead className="font-medium">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && !isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No upload history found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {history.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/50">
                      <TableCell>{entry.file?.name || "Unknown"}</TableCell>
                      <TableCell className="font-medium">
                        {entry.user?.email || "Unknown"}
                      </TableCell>
                      <TableCell>{formatFileSize(entry.size)}</TableCell>
                      <TableCell>{formatDate(entry.createdAt)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                            entry.status === "SUCCESS"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          )}
                        >
                          {entry.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </div>
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
    </div>
  );
}
