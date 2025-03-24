"use client";

import { useState } from "react";
import type { File } from "@/types/file";
import { formatFileSize, formatDate } from "@/lib/utils";
import { getFileTypeIcon } from "@/lib/file-icons";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Download, MoreVertical, Pencil, Trash2 } from "lucide-react";

interface FileCardProps {
  file: File;
  onDelete: (fileId: string) => void;
  onRename: (fileId: string, newName: string) => void;
}

export function FileCard({ file, onDelete, onRename }: FileCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const FileIcon = getFileTypeIcon(file.type);

  const handleRename = () => {
    if (newFileName.trim() && newFileName !== file.name) {
      onRename(file.id, newFileName);
    }
    setIsRenaming(false);
  };

  const handleDownload = async () => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  };

  const confirmDelete = () => {
    onDelete(file.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center h-40 bg-muted">
            <FileIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-start p-4 space-y-2">
          <div className="flex w-full items-center justify-between">
            {isRenaming ? (
              <div className="flex-1 mr-2">
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") setIsRenaming(false);
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex-1 mr-2 truncate" title={file.name}>
                {file.name}
              </div>
            )}
            {isRenaming ? (
              <Button size="sm" onClick={handleRename}>
                Save
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    <span>Rename</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatFileSize(file.size)} • {formatDate(file.updatedAt)}
          </div>
        </CardFooter>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{file.name}"? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
