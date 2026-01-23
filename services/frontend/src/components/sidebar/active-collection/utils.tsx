import React from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Film,
} from "lucide-react";

export const getFileIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const classes = "h-4 w-4 shrink-0";
  switch (ext) {
    case "pdf":
      return <FileText className={`${classes} text-red-500`} />;
    case "xlsx":
    case "csv":
      return <FileSpreadsheet className={`${classes} text-green-500`} />;
    case "png":
    case "jpg":
    case "jpeg":
      return <FileImage className={`${classes} text-blue-500`} />;
    case "mp4":
      return <Film className={`${classes} text-purple-500`} />;
    case "txt":
      return <FileCode className={`${classes} text-slate-500`} />;
    default:
      return <FileText className={`${classes} text-muted-foreground`} />;
  }
};
