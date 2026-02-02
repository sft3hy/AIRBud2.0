import React, { useRef } from "react";
import { Upload, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info } from "lucide-react";

import { VisionModel } from "../../../types";
import { getFileIcon } from "./utils";

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

  // Force set to Granite 3.2 on mount if not already
  React.useEffect(() => {
    if (selectedModel !== "Ollama-Granite3.2-Vision") {
      onModelChange("Ollama-Granite3.2-Vision");
    }
  }, [selectedModel, onModelChange]);

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
      {/* Model Display (Static) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" /> Vision Model
        </label>

        <Dialog>
          <DialogTrigger asChild>
            <div className="w-full h-9 bg-card/60 border border-input shadow-sm rounded-md flex items-center justify-between px-3 cursor-pointer hover:bg-accent/50 transition-colors group">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Granite 3.2 Vision (2B)</span>
              </div>
              <Info className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
            </div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Granite Vision 3.2 (2B)
              </DialogTitle>
              <DialogDescription className="pt-2 text-sm leading-relaxed">
                Granite Vision 3.2 2B is a lightweight large language model with computer vision capabilities that target everyday enterprise use cases, trained with a particular focus on visual document understanding.
                <br /><br />
                Handling both image and text inputs, Granite Vision 3.2's performance on essential enterprise benchmarks, such as DocVQA and ChartQA, rivals that of even significantly larger open models.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
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
