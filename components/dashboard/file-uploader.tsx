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
  } = useFileUpload({ 
    userId, 
    onUploadComplete: async (files) => {
      try {
        console.log('Upload complete, files:', files);
        await onUploadComplete(files);
      } catch (error) {
        console.error('Error updating file list:', error);
      }
    }
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      console.log('Files dropped:', acceptedFiles);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md cursor-pointer hover:border-primary"
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          {isDragActive ? (
            <p className="text-center">Drop the files here...</p>
          ) : (
            <p className="text-center">
              Drag & drop files here, or click to select files
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: 50GB
          </p>
        </div>

        <UploadProgress
          files={uploadingFiles}
          isUploading={isUploading}
          onRemoveFile={removeFile}
          onUpload={uploadFiles}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  );
}
