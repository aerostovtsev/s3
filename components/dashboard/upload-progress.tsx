import { Progress } from "@/components/ui/progress"
import { AlertCircle, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { UploadingFile } from "@/hooks/use-file-upload"
import { formatFileSize } from "@/lib/utils"

interface UploadProgressProps {
  files: UploadingFile[]
  isUploading: boolean
  onRemoveFile: (fileId: string) => void
  onUpload: () => void
  onClose: () => void
  onCancel: () => void
}

export function UploadProgress({
  files,
  isUploading,
  onRemoveFile,
  onUpload,
  onClose,
  onCancel,
}: UploadProgressProps) {
  if (files.length === 0) return null

  const hasErrors = files.some((f) => f.error)
  const allUploaded =
    files.length > 0 && files.every((f) => f.error || f.uploadedFile)

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">Files ({files.length})</div>
      <div className="max-h-60 overflow-y-auto space-y-3">
        {files.map((file) => (
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
                    onClick={() => onRemoveFile(file.id)}
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
                <span>{formatFileSize(file.file.size.toString())}</span>
                {file.error ? (
                  <span className="text-destructive">{file.error}</span>
                ) : file.uploadedFile ? (
                  <span className="text-green-500">Загружено</span>
                ) : file.chunks ? (
                  <span>
                    {Math.round(
                      (file.chunks.filter((c) => c.uploaded).length /
                        file.chunks.length) *
                        100
                    )}
                    %
                  </span>
                ) : (
                  <span>{file.progress}%</span>
                )}
              </div>
              {!file.error && !file.uploadedFile && (
                <Progress
                  value={
                    file.chunks
                      ? Math.round(
                          (file.chunks.filter((c) => c.uploaded).length /
                            file.chunks.length) *
                            100
                        )
                      : file.progress
                  }
                  className="h-1 mt-1"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Файлы не были загружены. Пожалуйста, проверьте ошибки и попробуйте
            снова.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={allUploaded ? onClose : onCancel}>
          {allUploaded ? "Закрыть" : "Отменить"}
        </Button>
        {!allUploaded && (
          <Button
            onClick={onUpload}
            disabled={
              isUploading || files.every((f) => f.error || f.uploadedFile)
            }
          >
            {isUploading ? "Загружается..." : "Загрузить"}
          </Button>
        )}
      </div>
    </div>
  )
}
