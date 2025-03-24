import {
  FileText,
  Image,
  FileArchive,
  FileAudio,
  FileVideo,
  FileCode,
  FileIcon as FilePdf,
  FileSpreadsheet,
  FileIcon,
} from "lucide-react"

type FileIconComponent = typeof FileIcon

export function getFileTypeIcon(fileType: string): FileIconComponent {
  const type = fileType.toLowerCase()

  // Images
  if (type.includes("image") || [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].some((ext) => type.endsWith(ext))) {
    return Image
  }

  // Documents
  if (
    type.includes("document") ||
    type.includes("text/plain") ||
    [".doc", ".docx", ".txt", ".rtf"].some((ext) => type.endsWith(ext))
  ) {
    return FileText
  }

  // PDFs
  if (type.includes("pdf")) {
    return FilePdf
  }

  // Archives
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("tar") ||
    type.includes("7z") ||
    type.includes("gz")
  ) {
    return FileArchive
  }

  // Audio
  if (type.includes("audio") || [".mp3", ".wav", ".ogg", ".flac"].some((ext) => type.endsWith(ext))) {
    return FileAudio
  }

  // Video
  if (type.includes("video") || [".mp4", ".avi", ".mov", ".webm"].some((ext) => type.endsWith(ext))) {
    return FileVideo
  }

  // Code
  if (
    [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".html",
      ".css",
      ".json",
      ".xml",
      ".py",
      ".java",
      ".php",
      ".c",
      ".cpp",
      ".go",
      ".rb",
    ].some((ext) => type.endsWith(ext))
  ) {
    return FileCode
  }

  // Spreadsheets
  if ([".xls", ".xlsx", ".csv"].some((ext) => type.endsWith(ext))) {
    return FileSpreadsheet
  }

  // Default
  return FileIcon
}

