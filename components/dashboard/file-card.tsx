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
import { toast } from "@/components/ui/use-toast";

interface FileCardProps {
  file?: File;
  onDelete?: (fileId: string) => void;
  isLoading?: boolean;
  isSelected?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

export function FileCard({ 
  file, 
  onDelete, 
  isLoading, 
  isSelected = false,
  onClick 
}: FileCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDownload = async () => {
    if (!file) return;
    try {
      console.log("Starting download for file:", file.id);
      const response = await fetch(`/api/files/download/${file.id}`);
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

  const confirmDelete = () => {
    if (!file || !onDelete) return;
    onDelete(file.id);
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-24 bg-muted/50">
            <div className="h-12 w-12 rounded bg-muted" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-3 space-y-1">
          <div className="flex w-full items-center justify-between">
            <div className="h-4 w-3/4 bg-muted rounded" />
            <div className="h-6 w-6 rounded-full bg-muted" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-2 w-12 bg-muted rounded" />
          </div>
        </CardFooter>
      </Card>
    );
  }

  if (!file) return null;

  const FileIcon = getFileTypeIcon(file.type);

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden cursor-pointer select-none transition-colors",
          isSelected && "bg-muted/50 hover:bg-muted/50",
          !isSelected && "hover:bg-muted/30"
        )}
        onClick={onClick}
      >
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-24 bg-muted/50">
            <FileIcon className="h-12 w-12 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-3 space-y-1">
          <div className="flex w-full items-center justify-between">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleDownload()
                }}>
                  <Download className="mr-2 h-4 w-4" />
                  Скачать
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteDialog(true)
                  }}
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
              Вы уверены, что хотите удалить файл "{file.name}"? Это действие нельзя отменить.
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
