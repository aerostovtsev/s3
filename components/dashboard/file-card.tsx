"use client";

import { useState } from "react";
import type { File } from "@/types/file";
import { formatFileSize, formatDate, cn } from "@/lib/utils";
import { getFileTypeIcon } from "@/lib/file-icons";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface FileCardProps {
  file?: File;
  onDelete?: (fileId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function FileCard({
  file,
  onDelete,
  isLoading,
  className,
}: FileCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDownload = async (fileId: string) => {
    try {
      console.log("Starting download for file:", fileId);
      const response = await fetch(`/api/files/download/${fileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }
      console.log("Received download URL:", data.url);
      window.open(data.url, "_blank");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Не удалось скачать файл");
    }
  };

  const confirmDelete = () => {
    if (!file || !onDelete) return;
    onDelete(file.id);
    setShowDeleteDialog(false);
  };

  if (!file)
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-24 bg-muted/50">
            <div className="text-muted-foreground">No file</div>
          </div>
        </CardContent>
      </Card>
    );

  const FileIcon = getFileTypeIcon(file.type);

  return (
    <>
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-24 bg-muted/50">
            <FileIcon className="h-12 w-10 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-3 space-y-1">
          <div className="flex w-full items-center justify-between">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <span>{formatFileSize(file.size)}</span>
            <span>{formatDate(file.createdAt)}</span>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить файл</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить файл: "
              <span className="max-w-[280px] inline-block align-bottom truncate">
                {file.name}
              </span>
              "? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Отменить
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
