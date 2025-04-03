"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Upload } from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { UploadProgress } from "./upload-progress";
import type { File } from "@/types/file";
import { toast } from "sonner";

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
  userId: string;
}

export function FileUploader({
  isOpen,
  onClose,
  onUploadComplete,
  userId,
}: FileUploaderProps) {
  const {
    uploadingFiles,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    resetUploadState,
    cancelUpload,
  } = useFileUpload({
    userId,
    onUploadComplete: async (files) => {
      try {
        console.log("Upload complete, files:", files);
        if (files && files.length > 0) {
          await onUploadComplete(files);
        }
      } catch (error) {
        console.error("Error updating file list:", error);
      }
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const zeroSizeFiles = acceptedFiles.filter((file) => file.size === 0);
      if (zeroSizeFiles.length > 0) {
        toast.error("Невозможно загрузить файлы размером 0 байт");
        return;
      }
      console.log("Files dropped:", acceptedFiles);
      addFiles(acceptedFiles);
    },
    multiple: true,
  });

  const handleClose = useCallback(() => {
    resetUploadState();
    onClose();
  }, [onClose, resetUploadState]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Загрузка файлов</DialogTitle>
        </DialogHeader>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-muted"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-center">Перетащите файлы сюда...</p>
          ) : (
            <p className="text-center">
              Перетащите файлы сюда, или нажмите, чтобы выбрать файлы
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Максимальный размер файла: 50GB
          </p>
        </div>
        <UploadProgress
          files={uploadingFiles}
          isUploading={isUploading}
          onRemoveFile={removeFile}
          onUpload={uploadFiles}
          onClose={handleClose}
          onCancel={cancelUpload}
        />
      </DialogContent>
    </Dialog>
  );
}
