import React, { useRef } from "react";
import { Upload, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { VisionModel } from "../../../types";
import { getFileIcon } from "./utils";

export const VISION_MODELS: {
  value: VisionModel;
  label: string;
  desc: string;
}[] = [
    {
      value: "Ollama-Granite3.2-Vision",
      label: "Granite 3.2 (2B)",
      desc: "Enterprise Vision",
    },
    {
      value: "Moondream2",
      label: "Moondream2 (1.6B)",
      desc: "Fast",
    },
    {
      value: "Ollama-Gemma3",
      label: "Gemma 3 (4B)",
      desc: "Strong Reasoning",
    },
    {
      value: "Ollama-Ministral-3-3B",
      label: "Ministral 3B",
      desc: "Lightweight & Efficient",
    },
  ];

interface UploadSectionProps {
  selectedModel: VisionModel;
  onModelChange: (model: VisionModel) => void;
  isQueueActive: boolean;
  stagedFiles: File[];
  setStagedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onStartProcessing: () => void;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  selectedModel,
  onModelChange,
  isQueueActive,
  stagedFiles,
  setStagedFiles,
  onStartProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStagedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveStagedFile = (fileToRemove: File) => {
    setStagedFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  return (
    <div className="space-y-3">
      {/* Model Selection */}
      <div className="space-y-1.5 [&_select]:border-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" /> Select Vision Model
        </label>
        <Select
          value={selectedModel}
          onValueChange={(v) => onModelChange(v as VisionModel)}
          disabled={isQueueActive}
        >
          <SelectTrigger className="h-8 text-xs w-full bg-card/60 border-input shadow-sm">
            <SelectValue placeholder="Select a Vision Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-xs text-muted-foreground">
                Vision Model
              </SelectLabel>
              {VISION_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  <span className="font-medium">{m.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {m.desc}
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`
          group relative w-full rounded-xl border-2 border-dashed transition-colors duration-200
          ${isQueueActive
            ? "opacity-60 cursor-not-allowed border-muted bg-muted/10"
            : "cursor-pointer border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 "
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.txt,.mp4,.xlsx"
          className="absolute inset-0 opacity-0 z-20 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleFileSelect}
          disabled={isQueueActive}
        />
        <div className="p-4 flex flex-col items-center gap-2 text-center">
          <div
            className={`p-2 rounded-full bg-background/60 border shadow-sm transition-transform duration-300 ${!isQueueActive && "group-hover:scale-110"}`}
          >
            <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-foreground block">
              Upload or Drag and Drop
            </span>
            <span className="text-[10px] text-muted-foreground block">
              PDF, Word, Excel, Video, Text
            </span>
          </div>
        </div>
      </div>

      {/* Staged Files List */}
      {stagedFiles.length > 0 && (
        <div className="animate-in slide-in-from-bottom-2 fade-in space-y-3 pt-2">
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Selected ({stagedFiles.length})</span>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-[10px] text-red-500"
                onClick={() => setStagedFiles([])}
              >
                Clear All
              </Button>
            </div>
            {stagedFiles.map((f, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_auto] items-center text-xs px-3 py-2 bg-card/60 rounded-md border shadow-sm gap-2 w-full"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex-shrink-0">{getFileIcon(f.name)}</div>
                  <span className="truncate font-medium block" title={f.name}>
                    {f.name}
                  </span>
                </div>
                <X
                  className="h-3 w-3 cursor-pointer flex-shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => handleRemoveStagedFile(f)}
                />
              </div>
            ))}
          </div>
          <Button
            size="sm"
            className="w-full h-9 text-xs font-semibold shadow-md bg-primary hover:bg-primary/90"
            onClick={onStartProcessing}
            disabled={isQueueActive}
          >
            {isQueueActive ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Processing Queue...
              </>
            ) : (
              `Upload and Process`
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
