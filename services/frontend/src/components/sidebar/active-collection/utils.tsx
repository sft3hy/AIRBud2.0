
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Film,
  FileQuestion,
  Presentation,
} from "lucide-react";

export const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();

  // Standard Icon Props
  const props = {
    className: "h-4 w-4 shrink-0",
    strokeWidth: 1.5, // Consistent thin stroke for professional look
  };

  switch (ext) {
    case "pdf":
      return (
        <FileText {...props} className={`${props.className} text-red-400`} />
      );
    case "xlsx":
    case "csv":
      return (
        <FileSpreadsheet
          {...props}
          className={`${props.className} text-emerald-400`}
        />
      );
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return (
        <FileImage {...props} className={`${props.className} text-blue-400`} />
      );
    case "mp4":
    case "mov":
      return (
        <Film {...props} className={`${props.className} text-purple-400`} />
      );
    case "pptx":
    case "ppt":
      return (
        <Presentation
          {...props}
          className={`${props.className} text-orange-400`}
        />
      );
    case "txt":
    case "md":
    case "json":
      return (
        <FileCode {...props} className={`${props.className} text-slate-400`} />
      );
    default:
      return (
        <FileQuestion
          {...props}
          className={`${props.className} text-muted-foreground`}
        />
      );
  }
};
