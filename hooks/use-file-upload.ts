import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import type { File } from "@/types/file";

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024;
const CHUNK_SIZE = 5 * 1024 * 1024; 
const MAX_CHUNKS = 10000;

// Функция для генерации уникального ID
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export interface UploadingFile {
  id: string;
  file: globalThis.File;
  progress: number;
  error?: string;
  uploadedFile?: File;
  chunks?: {
    partNumber: number;
    size: number;
    uploaded: boolean;
    progress: number;
  }[];
  uploadId?: string;
  key?: string;
  isMultipart?: boolean;
}

interface UseFileUploadProps {
  userId: string;
  onUploadComplete: (files: File[]) => void;
}

export function useFileUpload({ userId, onUploadComplete }: UseFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const updateFileProgress = useCallback((fileId: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, ...updates } : f
      )
    );
  }, []);

  const updateChunkProgress = useCallback((fileId: string, partNumber: number, progress: number) => {
    setUploadingFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              chunks: f.chunks?.map((c) =>
                c.partNumber === partNumber 
                  ? { 
                      ...c, 
                      progress,
                      uploaded: progress === 100 
                    } 
                  : c
              ),
            }
          : f
      )
    );
  }, []);

  const addFiles = useCallback(
    (acceptedFiles: globalThis.File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: generateUniqueId(),
        file,
        progress: 0,
        error: undefined as string | undefined,
      }));

      const oversizedFiles = newFiles.filter(
        (f) => f.file.size > MAX_FILE_SIZE
      );

      if (oversizedFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "Files too large",
          description: `${oversizedFiles.length} file(s) exceed the maximum size of 50GB.`,
        });

        oversizedFiles.forEach((f) => {
          f.error = "File too large (max 50GB)";
        });
      }

      setUploadingFiles((prev) => {
        // Сохраняем уже загруженные файлы
        const uploadedFiles = prev.filter(f => f.uploadedFile);
        // Сохраняем файлы с ошибками
        const errorFiles = prev.filter(f => f.error);
        // Сохраняем файлы в процессе загрузки
        const uploadingFiles = prev.filter(f => !f.uploadedFile && !f.error);
        
        return [...uploadedFiles, ...errorFiles, ...uploadingFiles, ...newFiles];
      });
    },
    [toast]
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (uploadingFiles.length === 0 || isUploading) return;

    const filesToUpload = uploadingFiles.filter(
      (f) => !f.error && !f.uploadedFile
    );
    if (filesToUpload.length === 0) return;

    setIsUploading(true);

    try {
      await Promise.all(
        filesToUpload.map(async (uploadingFile) => {
          try {
            const uploadedFile = await uploadMultipartFile(
              uploadingFile,
              userId,
              updateFileProgress,
              updateChunkProgress
            );
            updateFileProgress(uploadingFile.id, { uploadedFile });
          } catch (error) {
            console.error(error);
            updateFileProgress(uploadingFile.id, { error: "Upload failed" });
          }
        })
      );

      const successfulUploads = uploadingFiles
        .filter((f) => f.uploadedFile)
        .map((f) => f.uploadedFile as File);

      if (successfulUploads.length > 0) {
        onUploadComplete(successfulUploads);
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadingFiles, isUploading, userId, onUploadComplete, updateFileProgress]);

  const resetUploadState = useCallback(() => {
    setUploadingFiles([]);
    setIsUploading(false);
  }, []);

  return {
    uploadingFiles,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    resetUploadState,
    setUploadingFiles,
  };
}

async function uploadMultipartFile(
  uploadingFile: UploadingFile,
  userId: string,
  updateFileProgress: (fileId: string, updates: Partial<UploadingFile>) => void,
  updateChunkProgress: (fileId: string, partNumber: number, progress: number) => void
) {
  try {
    console.log('Initializing multipart upload for file:', {
      fileName: uploadingFile.file.name,
      contentType: uploadingFile.file.type,
      userId,
    });

    const initResponse = await fetch("/api/files/init-multipart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: uploadingFile.file.name,
        contentType: uploadingFile.file.type
      }),
    });

    if (!initResponse.ok) {
      const errorData = await initResponse.json();
      console.error('Failed to initialize multipart upload:', errorData);
      throw new Error(errorData.error || "Failed to initialize multipart upload");
    }

    const { uploadId, key } = await initResponse.json();
    
    if (!uploadId || !key) {
      throw new Error("No uploadId or key received from server");
    }

    console.log('Multipart upload initialized:', { uploadId, key });
    
    const chunks = [];
    let offset = 0;
    let partNumber = 1;

    while (offset < uploadingFile.file.size) {
      const chunk = uploadingFile.file.slice(offset, offset + CHUNK_SIZE);
      chunks.push({
        partNumber,
        size: chunk.size,
        uploaded: false,
        progress: 0,
      });
      offset += CHUNK_SIZE;
      partNumber++;
    }

    if (chunks.length > MAX_CHUNKS) {
      throw new Error(`File too large: exceeds maximum number of chunks (${MAX_CHUNKS})`);
    }

    updateFileProgress(uploadingFile.id, { chunks, uploadId, key, isMultipart: true });

    const parts: { ETag: string; PartNumber: number }[] = [];
    
    for (const chunk of chunks) {
      const chunkBlob = uploadingFile.file.slice(
        (chunk.partNumber - 1) * CHUNK_SIZE,
        (chunk.partNumber - 1) * CHUNK_SIZE + chunk.size
      );

      const formData = new FormData();
      formData.append("file", chunkBlob);
      formData.append("uploadId", uploadId);
      formData.append("partNumber", chunk.partNumber.toString());
      formData.append("key", key);

      console.log('Uploading chunk:', {
        partNumber: chunk.partNumber,
        size: chunk.size,
        key,
      });

      const response = await uploadChunk(
        formData,
        (progress) => updateChunkProgress(uploadingFile.id, chunk.partNumber, progress)
      );
      
      parts.push({
        ETag: response.etag,
        PartNumber: chunk.partNumber,
      });
      
      updateChunkProgress(uploadingFile.id, chunk.partNumber, 100);
    }

    console.log('All chunks uploaded, completing multipart upload');

    const completeResponse = await fetch("/api/files/complete-multipart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: uploadingFile.file.name,
        uploadId,
        parts,
        size: uploadingFile.file.size.toString(),
        type: uploadingFile.file.type,
        key,
      }),
    });

    if (!completeResponse.ok) {
      const errorData = await completeResponse.json();
      console.error('Failed to complete multipart upload:', errorData);
      throw new Error(errorData.error || "Failed to complete multipart upload");
    }

    const { file } = await completeResponse.json();
    console.log('Multipart upload completed successfully:', file);
    return file;
  } catch (error) {
    console.error('Error in uploadMultipartFile:', error);
    throw error;
  }
}

async function uploadChunk(
  formData: FormData,
  onProgress: (progress: number) => void
) {
  return new Promise<{ etag: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    });

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("POST", "/api/files/upload-multipart", true);
    xhr.send(formData);
  });
}