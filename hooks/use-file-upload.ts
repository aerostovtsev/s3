import { useState, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import type { File } from "@/types/file"

const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024
const CHUNK_SIZE = 5 * 1024 * 1024
const MAX_CHUNKS = 10000
const MAX_CONCURRENT_UPLOADS = 10 // Максимальное количество одновременных загрузок

// Функция для генерации уникального ID
function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export interface UploadingFile {
  id: string
  file: globalThis.File
  progress: number
  error?: string
  uploadedFile?: File
  chunks?: {
    partNumber: number
    size: number
    uploaded: boolean
    progress: number
  }[]
  uploadId?: string
  key?: string
  isMultipart?: boolean
}

interface UseFileUploadProps {
  userId: string
  onUploadComplete: (files: File[]) => void
}

export function useFileUpload({
  userId,
  onUploadComplete,
}: UseFileUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()
  const [activeUploads, setActiveUploads] = useState<Set<string>>(new Set())
  const [activeXHRs, setActiveXHRs] = useState<Set<XMLHttpRequest>>(new Set())

  const updateFileProgress = useCallback(
    (fileId: string, updates: Partial<UploadingFile>) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
      )
    },
    []
  )

  const updateChunkProgress = useCallback(
    (fileId: string, partNumber: number, progress: number) => {
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
                        uploaded: progress === 100,
                      }
                    : c
                ),
              }
            : f
        )
      )
    },
    []
  )

  const addFiles = useCallback(
    (acceptedFiles: globalThis.File[]) => {
      const newFiles = acceptedFiles.map((file) => ({
        id: generateUniqueId(),
        file,
        progress: 0,
        error: undefined as string | undefined,
      }))

      const oversizedFiles = newFiles.filter(
        (f) => f.file.size > MAX_FILE_SIZE
      )

      if (oversizedFiles.length > 0) {
        toast({
          variant: "destructive",
          title: "Files too large",
          description: `${oversizedFiles.length} file(s) exceed the maximum size of 50GB.`,
        })

        oversizedFiles.forEach((f) => {
          f.error = "File too large (max 50GB)"
        })
      }

      setUploadingFiles((prev) => {
        // Фильтруем новые файлы, исключая дубликаты
        const uniqueNewFiles = newFiles.filter((newFile) => {
          return !prev.some(
            (existingFile) =>
              existingFile.file.name === newFile.file.name &&
              existingFile.file.size === newFile.file.size &&
              !existingFile.uploadedFile &&
              !existingFile.error
          )
        })

        // Сохраняем уже загруженные файлы
        const uploadedFiles = prev.filter((f) => f.uploadedFile)
        // Сохраняем файлы с ошибками
        const errorFiles = prev.filter((f) => f.error)
        // Сохраняем файлы в процессе загрузки
        const uploadingFiles = prev.filter((f) => !f.uploadedFile && !f.error)

        return [
          ...uploadedFiles,
          ...errorFiles,
          ...uploadingFiles,
          ...uniqueNewFiles,
        ]
      })
    },
    [toast]
  )

  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== fileId))
  }, [])

  const uploadFiles = useCallback(async () => {
    if (uploadingFiles.length === 0 || isUploading) return

    const filesToUpload = uploadingFiles.filter(
      (f) => !f.error && !f.uploadedFile
    )
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    const successfullyUploadedFiles: File[] = []

    try {
      // Разбиваем файлы на группы по MAX_CONCURRENT_UPLOADS
      for (let i = 0; i < filesToUpload.length; i += MAX_CONCURRENT_UPLOADS) {
        const batch = filesToUpload.slice(i, i + MAX_CONCURRENT_UPLOADS)

        await Promise.all(
          batch.map(async (uploadingFile) => {
            try {
              const uploadedFile = await uploadMultipartFile(
                uploadingFile,
                userId,
                updateFileProgress,
                updateChunkProgress,
                setActiveXHRs
              )

              // Добавляем успешно загруженный файл в массив
              successfullyUploadedFiles.push(uploadedFile)

              // Обновляем состояние загрузки
              setUploadingFiles((prev) =>
                prev
                  .filter((f) => f.id !== uploadingFile.id)
                  .concat({
                    ...uploadingFile,
                    uploadedFile,
                  })
              )

              return { success: true, file: uploadedFile }
            } catch (error) {
              console.error(error)
              updateFileProgress(uploadingFile.id, { error: "Upload failed" })
              return { success: false }
            }
          })
        )
      }

      // Если есть успешно загруженные файлы, вызываем callback
      if (successfullyUploadedFiles.length > 0) {
        onUploadComplete(successfullyUploadedFiles)
      }
    } finally {
      setIsUploading(false)
    }
  }, [
    uploadingFiles,
    isUploading,
    userId,
    onUploadComplete,
    updateFileProgress,
    updateChunkProgress,
    setActiveXHRs,
  ])

  const resetUploadState = useCallback(() => {
    setUploadingFiles([])
    setIsUploading(false)
  }, [])

  const cancelUpload = useCallback(async () => {
    try {
      // Отменяем все активные XHR-запросы
      activeXHRs.forEach((xhr) => {
        xhr.abort()
      })
      setActiveXHRs(new Set())

      const filesToCancel = uploadingFiles.filter(
        (f) => !f.error && !f.uploadedFile && f.uploadId && f.key
      )

      // Отменяем все multipart-загрузки на сервере
      await Promise.all(
        filesToCancel.map(async (file) => {
          if (file.uploadId && file.key) {
            try {
              const response = await fetch("/api/files/abort-multipart", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  uploadId: file.uploadId,
                  key: file.key,
                }),
              })

              if (!response.ok) {
                console.error("Failed to abort upload:", await response.text())
              }
            } catch (error) {
              console.error("Error aborting upload:", error)
            }
          }
        })
      )

      // Очищаем список файлов
      setUploadingFiles([])
      setIsUploading(false)
    } catch (error) {
      console.error("Error during upload cancellation:", error)
      setUploadingFiles([])
      setIsUploading(false)
    }
  }, [uploadingFiles, activeXHRs])

  return {
    uploadingFiles,
    isUploading,
    addFiles,
    removeFile,
    uploadFiles,
    resetUploadState,
    cancelUpload,
    setUploadingFiles,
  }
}

// Функция для определения MIME-типа на основе расширения файла
function getMimeType(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase()
  const mimeTypes: { [key: string]: string } = {
    // Графические форматы
    afdesign: "application/afdesign",
    psd: "image/vnd.adobe.photoshop",
    ai: "application/vnd.adobe.illustrator",
    sketch: "application/vnd.sketch",
    fig: "application/vnd.figma",
    xd: "application/vnd.adobe.xd",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",
    tiff: "image/tiff",
    ico: "image/x-icon",

    // Документы
    pdf: "application/pdf",
    doc: "application/word",
    docx: "application/document",
    xls: "application/excel",
    xlsx: "application/sheet",
    ppt: "application/powerpoint",
    pptx: "application/presentation",
    odt: "application/opendocument.text",
    ods: "application/opendocument.spreadsheet",
    odp: "application/opendocument.presentation",
    txt: "text/plain",
    rtf: "application/rtf",
    md: "text/markdown",

    // Архивы
    zip: "application/zip",
    rar: "application/x-rar-compressed",
    "7z": "application/x-7z-compressed",
    tar: "application/x-tar",
    gz: "application/gzip",
    bz2: "application/x-bzip2",
    xz: "application/x-xz",

    // Код и разметка
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    ts: "application/typescript",
    jsx: "text/jsx",
    tsx: "text/tsx",
    py: "text/x-python",
    java: "text/x-java-source",
    php: "application/x-httpd-php",
    c: "text/x-c",
    cpp: "text/x-c++",
    go: "text/x-go",
    rb: "text/x-ruby",
    swift: "text/x-swift",
    kt: "text/x-kotlin",
    rs: "text/x-rust",
    scala: "text/x-scala",
    r: "text/x-r",
    matlab: "text/x-matlab",
    sh: "text/x-sh",
    bash: "text/x-bash",
    sql: "application/sql",

    // Аудио
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    flac: "audio/flac",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wma: "audio/x-ms-wma",

    // Видео
    mp4: "video/mp4",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    webm: "video/webm",
    mkv: "video/x-matroska",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    m4v: "video/x-m4v",

    // 3D модели
    obj: "model/obj",
    fbx: "application/octet-stream",
    "3ds": "application/octet-stream",
    stl: "model/stl",
    gltf: "model/gltf+json",
    glb: "model/gltf-binary",

    // Файлы данных
    db: "application/octet-stream",
    sqlite: "application/octet-stream",
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    jsonl: "application/x-jsonlines",

    // Файлы виртуальных машин
    vmdk: "application/octet-stream",
    vhd: "application/octet-stream",
    iso: "application/x-iso9660-image",

    // Файлы резервных копий
    bak: "application/octet-stream",
    backup: "application/octet-stream",
    old: "application/octet-stream",

    // Файлы логов
    log: "text/plain",

    // Файлы конфигурации
    ini: "text/plain",
    conf: "text/plain",
    config: "text/plain",
    yaml: "text/yaml",
    yml: "text/yaml",
    toml: "application/toml",

    // Файлы шрифтов
    ttf: "font/ttf",
    otf: "font/otf",
    woff: "font/woff",
    woff2: "font/woff2",
    eot: "application/vnd.ms-fontobject",

    // Файлы субтитров
    srt: "application/x-subrip",
    vtt: "text/vtt",
    ass: "text/x-ass",

    // Файлы электронных книг
    epub: "application/epub+zip",
    mobi: "application/x-mobipocket-ebook",
    azw3: "application/vnd.amazon.ebook",

    // Файлы календаря
    ics: "text/calendar",
    vcs: "text/x-vcalendar",

    // Файлы контактов
    vcf: "text/vcard",
    vcard: "text/vcard",
  }

  // Если расширение найдено в списке, возвращаем соответствующий MIME-тип
  if (extension && mimeTypes[extension]) {
    return mimeTypes[extension]
  }

  // Если ничего не подошло, возвращаем общий тип
  return "application/octet-stream"
}

async function uploadMultipartFile(
  uploadingFile: UploadingFile,
  userId: string,
  updateFileProgress: (fileId: string, updates: Partial<UploadingFile>) => void,
  updateChunkProgress: (
    fileId: string,
    partNumber: number,
    progress: number
  ) => void,
  setActiveXHRs: React.Dispatch<React.SetStateAction<Set<XMLHttpRequest>>>
) {
  try {
    const contentType =
      uploadingFile.file.type || getMimeType(uploadingFile.file.name)

    console.log("Initializing multipart upload for file:", {
      fileName: uploadingFile.file.name,
      contentType,
      userId,
    })

    const initResponse = await fetch("/api/files/init-multipart", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: uploadingFile.file.name,
        contentType,
      }),
    })

    if (!initResponse.ok) {
      const errorData = await initResponse.json()
      console.error("Failed to initialize multipart upload:", errorData)
      throw new Error(
        errorData.error || "Failed to initialize multipart upload"
      )
    }

    const { uploadId, key } = await initResponse.json()

    if (!uploadId || !key) {
      throw new Error("No uploadId or key received from server")
    }

    console.log("Multipart upload initialized:", { uploadId, key })

    const chunks = []
    let offset = 0
    let partNumber = 1

    while (offset < uploadingFile.file.size) {
      const chunk = uploadingFile.file.slice(offset, offset + CHUNK_SIZE)
      chunks.push({
        partNumber,
        size: chunk.size,
        uploaded: false,
        progress: 0,
      })
      offset += CHUNK_SIZE
      partNumber++
    }

    if (chunks.length > MAX_CHUNKS) {
      throw new Error(
        `File too large: exceeds maximum number of chunks (${MAX_CHUNKS})`
      )
    }

    updateFileProgress(uploadingFile.id, {
      chunks,
      uploadId,
      key,
      isMultipart: true,
    })

    const parts: { ETag: string; PartNumber: number }[] = []

    for (const chunk of chunks) {
      const chunkBlob = uploadingFile.file.slice(
        (chunk.partNumber - 1) * CHUNK_SIZE,
        (chunk.partNumber - 1) * CHUNK_SIZE + chunk.size
      )

      const formData = new FormData()
      formData.append("file", chunkBlob)
      formData.append("uploadId", uploadId)
      formData.append("partNumber", chunk.partNumber.toString())
      formData.append("key", key)

      console.log("Uploading chunk:", {
        partNumber: chunk.partNumber,
        size: chunk.size,
        key,
      })

      const response = await uploadChunk(
        formData,
        (progress) =>
          updateChunkProgress(uploadingFile.id, chunk.partNumber, progress),
        setActiveXHRs
      )

      parts.push({
        ETag: response.etag,
        PartNumber: chunk.partNumber,
      })

      updateChunkProgress(uploadingFile.id, chunk.partNumber, 100)
    }

    console.log("All chunks uploaded, completing multipart upload")

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
        type: contentType,
        key,
      }),
    })

    if (!completeResponse.ok) {
      let errorDetails = "No additional details available"
      try {
        const text = await completeResponse.text()
        errorDetails = text
      } catch (e) {
        console.warn("Could not get error details:", e)
      }

      const errorData = await completeResponse.json().catch(() => ({
        error: `HTTP error! status: ${completeResponse.status}`,
        details: errorDetails,
      }))

      console.error("Failed to complete multipart upload:", {
        status: completeResponse.status,
        statusText: completeResponse.statusText,
        error: errorData,
      })

      // Проверяем на ошибку превышения лимита попыток
      if (errorData.error?.includes("Слишком много попыток")) {
        throw new Error(
          "Превышен лимит попыток загрузки. Пожалуйста, подождите несколько минут и попробуйте снова."
        )
      }

      throw new Error(
        errorData.error ||
          errorData.details ||
          `Failed to complete multipart upload (Status: ${completeResponse.status})`
      )
    }

    const completeData = await completeResponse.json()
    const { file } = completeData
    console.log("Multipart upload completed successfully:", file)
    return file
  } catch (error) {
    console.error("Error in uploadMultipartFile:", error)
    throw error
  }
}

async function uploadChunk(
  formData: FormData,
  onProgress: (progress: number) => void,
  setActiveXHRs: React.Dispatch<React.SetStateAction<Set<XMLHttpRequest>>>
) {
  return new Promise<{ etag: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Добавляем XHR в список активных
    setActiveXHRs((prev: Set<XMLHttpRequest>) => new Set(prev).add(xhr))

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded * 100) / event.total)
        onProgress(progress)
      }
    })

    xhr.onload = () => {
      // Удаляем XHR из списка активных
      setActiveXHRs((prev: Set<XMLHttpRequest>) => {
        const newSet = new Set(prev)
        newSet.delete(xhr)
        return newSet
      })

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      // Удаляем XHR из списка активных при ошибке
      setActiveXHRs((prev: Set<XMLHttpRequest>) => {
        const newSet = new Set(prev)
        newSet.delete(xhr)
        return newSet
      })
      reject(new Error("Network error during upload"))
    }

    xhr.open("POST", "/api/files/upload-multipart", true)
    xhr.send(formData)
  })
}
