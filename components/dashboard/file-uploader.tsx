"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import type { File } from "@/types/file";
import { formatFileSize } from "@/lib/utils";
import { Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (files: File[]) => void;
  userId: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface UploadingFile {
  id: string;
  file: globalThis.File;
  progress: number;
  error?: string;
  uploadedFile?: File;
}

export function FileUploader({
  isOpen,
  onClose,
  onUploadComplete,
  userId,
}: FileUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: globalThis.File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        progress: 0,
      }));

      // Check file size
      const oversizedFiles = newFiles.filter(
        (f) => f.file.size > MAX_FILE_SIZE
      );

      if (oversizedFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "Files too large",
          description: `${oversizedFiles.length} file(s) exceed the maximum size of 100MB.`,
        });

        // Mark oversized files with error
        oversizedFiles.forEach((f) => {
          f.error = "File too large (max 100MB)";
        });
      }

      setUploadingFiles((prev) => [...prev, ...newFiles]);
    },
    [toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const uploadFiles = async () => {
    if (uploadingFiles.length === 0 || isUploading) return;

    const filesToUpload = uploadingFiles.filter(
      (f) => !f.error && !f.uploadedFile
    );
    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    try {
      await Promise.all(
        filesToUpload.map(async (uploadingFile) => {
          const formData = new FormData();
          formData.append("file", uploadingFile.file);
          formData.append("userId", userId);

          try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded * 100) / event.total);
                setUploadingFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadingFile.id ? { ...f, progress } : f
                  )
                );
              }
            });

            const uploadPromise = new Promise<File>((resolve, reject) => {
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  const response = JSON.parse(xhr.responseText);
                  resolve(response);
                } else {
                  reject(new Error(`Upload failed with status ${xhr.status}`));
                }
              };
              xhr.onerror = () =>
                reject(new Error("Network error during upload"));
            });

            xhr.open("POST", "/api/files/upload", true);
            xhr.send(formData);

            const uploadedFile = await uploadPromise;

            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id
                  ? { ...f, progress: 100, uploadedFile }
                  : f
              )
            );
          } catch (error) {
            console.error(error);
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, error: "Upload failed" } : f
              )
            );
          }
        })
      );
    } finally {
      setIsUploading(false);
    }
  };

  const successfulUploads = uploadingFiles
    .filter((f) => f.uploadedFile)
    .map((f) => f.uploadedFile as File);

  const hasErrors = uploadingFiles.some((f) => f.error);
  const allUploaded =
    uploadingFiles.length > 0 &&
    uploadingFiles.every((f) => f.error || f.uploadedFile);

  const handleClose = () => {
    if (successfulUploads.length > 0) {
      onUploadComplete(successfulUploads);
    }
    onClose();
    // Reset state for next time
    setTimeout(() => {
      setUploadingFiles([]);
    }, 300);
  };

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
            Maximum file size: 100MB
          </p>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">
              Files ({uploadingFiles.length})
            </div>
            <div className="max-h-60 overflow-y-auto space-y-3">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <div className="truncate max-w-xs" title={file.file.name}>
                        {file.file.name}
                      </div>
                      {!file.error && !file.uploadedFile && !isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {file.error && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      {file.uploadedFile && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(file.file.size)}</span>
                      {file.error ? (
                        <span className="text-destructive">{file.error}</span>
                      ) : file.uploadedFile ? (
                        <span className="text-green-500">Complete</span>
                      ) : (
                        <span>{file.progress}%</span>
                      )}
                    </div>
                    {!file.error && !file.uploadedFile && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some files could not be uploaded. Please check the errors and
                  try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleClose}>
                {allUploaded ? "Close" : "Cancel"}
              </Button>
              {!allUploaded && (
                <Button
                  onClick={uploadFiles}
                  disabled={
                    isUploading ||
                    uploadingFiles.every((f) => f.error || f.uploadedFile)
                  }
                >
                  {isUploading ? "Uploading..." : "Upload"}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
