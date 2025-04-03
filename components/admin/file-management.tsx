"use client";

import { useState, useEffect, useRef } from "react";
import type { File } from "@/types/admin";
import { formatFileSize, formatDate, cn } from "@/lib/utils";
import { getFileTypeIcon } from "@/lib/file-icons";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Download,
  Trash2,
  RefreshCw,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X,
} from "lucide-react";

interface FileManagementProps {
  initialFiles: File[];
}

export function FileManagement({ initialFiles }: FileManagementProps) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(
    Math.ceil(initialFiles.length / itemsPerPage) || 1
  );
  const [fileToDelete, setFileToDelete] = useState<File | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const lastFetchParamsRef = useRef<string>("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  const fetchFiles = async (
    page: number = currentPage,
    search: string = searchQuery
  ) => {
    try {
      if (isLoading) return;

      const offset = (page - 1) * itemsPerPage;
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: itemsPerPage.toString(),
        search,
      });

      const paramsString = params.toString();
      if (paramsString === lastFetchParamsRef.current) {
        return;
      }

      setIsLoading(true);
      lastFetchParamsRef.current = paramsString;

      const response = await fetch(`/api/admin/files?${params}`);
      if (!response.ok) throw new Error("Failed to fetch files");

      const data = await response.json();

      console.log("Files data:", {
        files: data.files.length,
        total: data.total,
        pages: Math.ceil((data.total || 0) / itemsPerPage),
      });

      setFiles(data.files);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error("Error fetching files:", error);
      toast.error("Не удалось получить файлы, попробуйте обновить страницу");
      setFiles([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      // При первом рендере делаем запрос на сервер для получения актуальных данных
      fetchFiles(1, "");
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        setCurrentPage(1);
        fetchFiles(1, searchQuery);
      }, 500);
    } else {
      // Для пустого поиска тоже делаем запрос
      setCurrentPage(1);
      fetchFiles(1, "");
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]); // Убрали initialFiles, чтобы не вызывать лишние запросы

  useEffect(() => {
    if (isMounted.current) {
      fetchFiles(currentPage, searchQuery);
    }
  }, [currentPage]);

  const handleSearchChange = (value: string) => {
    if (!isMounted.current) return;
    setSearchQuery(value);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  const handleSearchReset = () => {
    setSearchQuery("");
    setCurrentPage(1);
    fetchFiles(1, "");
  };

  // Убедимся, что пагинация отображается, даже если totalPages = 1
  const showPagination = () => {
    return files.length > 0;
  };

  const handleDownload = async (fileId: string) => {
    try {
      const file = files.find((f) => f.id === fileId);
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
      window.open(data.url, "_blank");

      toast.success("Скачивание файла началось");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Не удалось скачать файл, попробуйте повторить позже");
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
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      // Сначала обновляем локально для мгновенной реакции UI
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, isDeleted: true } : file
        )
      );

      setIsDeleteDialogOpen(false);
      setFileToDelete(null);

      // Затем запрашиваем обновленные данные с сервера
      fetchFiles(currentPage, searchQuery);
      toast.success("Файл удален");
    } catch (error) {
      console.error("Error deleting file:", error);
      toast.error("Не удалось удалить файл, попробуйте повторить позже");
    }
  };

  const handleRestoreFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "restore" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to restore file");
      }

      // Сначала обновляем локально для мгновенной реакции UI
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, isDeleted: false } : file
        )
      );

      // Затем запрашиваем обновленные данные с сервера
      fetchFiles(currentPage, searchQuery);
      toast.success("Файл восстановлен");
    } catch (error: unknown) {
      console.error("Error restoring file:", error);
      toast.error("Не удалось восстановить файл, попробуйте повторить позже");
    }
  };

  if (isLoading && files.length === 0) {
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
          {searchQuery && (
            <X
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
              onClick={handleSearchReset}
            />
          )}
        </div>
      </div>

      <div className="min-h-[300px]">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-medium">Файл</TableHead>
                <TableHead className="font-medium">Пользователь</TableHead>
                <TableHead className="font-medium">Размер</TableHead>
                <TableHead className="font-medium">Тип</TableHead>
                <TableHead className="font-medium">Дата создания</TableHead>
                <TableHead className="font-medium">Дата обновления</TableHead>
                <TableHead className="font-medium">Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No files found
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {files.map((file) => {
                    const FileIcon = getFileTypeIcon(file.type);
                    return (
                      <TableRow
                        key={file.id}
                        className={cn(file.isDeleted && "opacity-60")}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">
                              {file.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{file.user?.email || "Unknown"}</TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{file.type}</TableCell>
                        <TableCell>{formatDate(file.createdAt)}</TableCell>
                        <TableCell>{formatDate(file.updatedAt)}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
                              file.isDeleted
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            )}
                          >
                            {file.isDeleted ? "DELETED" : "ACTIVE"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!file.isDeleted && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownload(file.id)}
                                title="Download"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            )}
                            {file.isDeleted ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestoreFile(file.id)}
                                title="Restore"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setFileToDelete(file);
                                  setIsDeleteDialogOpen(true);
                                }}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDeleteFile(fileToDelete?.id || "")}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
