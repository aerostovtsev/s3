import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(size: string): string {
  const bytes = parseInt(size);
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes === 0) return "0 Bytes";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = (bytes / Math.pow(1024, i)).toFixed(2);

  return `${formattedSize} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  const ext = filename.split(".").pop();
  return ext && ext !== filename ? ext : "";
}

export function formatDate(date: string | Date | undefined): string {
  if (!date) {
    return "-";
  }

  const parsedDate = typeof date === "string" ? new Date(date) : date;

  if (!(parsedDate instanceof Date) || isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
