import { File } from "@prisma/client";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableCell } from "@/components/ui/table";
import { toast } from "sonner";

interface FileTableProps {
  file: File;
}

export function FileTable({ file }: FileTableProps) {
  const handleDownload = async (fileId: string) => {
    try {
      const response = await fetch(`/api/files/download/${fileId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get download link");
      }

      window.open(data.url, "_blank");

      toast.success("Скачивание файла началось");
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Не удалось скачать файл, попробуйте повторить позже");
    }
  };

  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0"
          onClick={() => handleDownload(file.id)}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  );
}
