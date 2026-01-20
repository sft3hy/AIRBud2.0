import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  Upload,
  Loader2,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  Film,
  Cpu,
  Layers,
  BarChart3,
  Paperclip,
} from "lucide-react";
import { uploadAndProcessDocument, deleteDocument } from "../../lib/api";
import { VisionModel, SessionDocument } from "../../types";
import { ChartBrowser } from "../ChartBrowser";
import { GraphExplorer } from "../GraphExplorer";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const VISION_MODELS: { value: VisionModel; label: string; desc: string }[] = [
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
];

// Helper for file icons
const getFileIcon = (filename: string) => {
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

interface ActiveCollectionViewProps {
  currentSessionId: string;
  activeCollectionName: string | undefined;
  currentDocs: SessionDocument[];
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  isOwner: boolean;
}

export const ActiveCollectionView: React.FC<ActiveCollectionViewProps> = ({
  currentSessionId,
  activeCollectionName,
  currentDocs,
  activeJobId,
  setActiveJobId,
  isOwner,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local State
  const [selectedModel, setSelectedModel] = useState<VisionModel>(
    "Ollama-Granite3.2-Vision",
  );

  // Staging & Queue
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [queueDisplay, setQueueDisplay] = useState<File[]>([]);

  // Refs for stability
  const queueRef = useRef<File[]>([]);
  const isProcessingRef = useRef(false);

  // --- Handlers ---

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStagedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveStagedFile = (fileToRemove: File) => {
    setStagedFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  // --- Queue Processor ---
  const processNextInQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (queueRef.current.length === 0) return;

    // Double check: If active job exists, let the polling handler manage the flow
    if (activeJobId) return;

    isProcessingRef.current = true;
    const currentFile = queueRef.current[0];

    try {
      // 1. Optimistic Status Update
      queryClient.setQueryData(["status", currentSessionId], {
        status: "queued",
        stage: "parsing",
        step: `Initializing upload for ${currentFile.name}...`,
        progress: 0,
      });

      // 2. Upload API Call
      const response = await uploadAndProcessDocument(
        currentSessionId,
        currentFile,
        selectedModel,
      );

      if (response.status === "already_queued") {
        console.warn("Backend reported busy. Re-syncing with active job...");
        setActiveJobId(currentSessionId);
      } else {
        // Success: Trigger global polling
        setActiveJobId(currentSessionId);
        // Pop from queue
        queueRef.current = queueRef.current.slice(1);
        setQueueDisplay([...queueRef.current]);
      }
    } catch (e) {
      console.error("Upload failed", e);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: `Could not process ${currentFile.name}.`,
      });
      // Remove failed item to prevent blocking
      queueRef.current = queueRef.current.slice(1);
      setQueueDisplay([...queueRef.current]);
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    currentSessionId,
    selectedModel,
    setActiveJobId,
    activeJobId,
    toast,
    queryClient,
  ]);

  // Watch for job completion to trigger next item
  useEffect(() => {
    if (!activeJobId && queueRef.current.length > 0) {
      processNextInQueue();
    }
  }, [activeJobId, processNextInQueue]);

  const handleStartProcessing = () => {
    queueRef.current = [...queueRef.current, ...stagedFiles];
    setQueueDisplay([...queueRef.current]);
    setStagedFiles([]);

    if (!activeJobId && !isProcessingRef.current) {
      processNextInQueue();
    }
  };

  const handleDeleteDoc = async (id: number) => {
    await deleteDocument(id);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const isQueueActive = queueDisplay.length > 0 || !!activeJobId;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Background Decorator */}
      {/* <div className="absolute right-0 w-64 h-64 bg-primary/5 blur-3xl pointer-events-none" /> */}

      {/* Header */}
      <div className="px-6 py-4 border-b bg-background/80 backdrop-blur-md flex items-center gap-3 shrink-0 z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors rounded-full"
          onClick={() => navigate("/collections")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Current Collection
          </span>
          <div className="font-bold text-sm truncate flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-primary" />
            {activeCollectionName}
          </div>
        </div>
      </div>

      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0 w-full">
        {/* Navigation Tabs */}
        <div className="px-4 py-2 bg-muted/20 border-b shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-9 bg-background/50 p-1">
            <TabsTrigger
              value="docs"
              className="text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2"
            >
              <FileText className="h-3.5 w-3.5" /> Files
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 gap-2"
            >
              <BarChart3 className="h-3.5 w-3.5" /> Charts
            </TabsTrigger>
            <TabsTrigger
              value="graph"
              className="text-xs data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 gap-2"
            >
              <Cpu className="h-3.5 w-3.5" /> Graph
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- FILES TAB --- */}
        <TabsContent
          value="docs"
          className="p-6 flex-1 flex flex-col min-h-0 mt-0 w-full relative"
        >
          <ScrollArea className="flex-1 w-full">
            <div className="px-4 py-4 space-y-2 mb-6">
              {currentDocs.map((doc, index) => (
                <div
                  key={doc.id}
                  className="group grid grid-cols-[1fr_auto] items-center gap-3 w-full p-3 bg-card hover:bg-muted/30 border rounded-lg text-xs transition-all duration-200 hover:shadow-sm hover:border-primary/20"
                >
                  {/* Left side: Number, Icon, Filename, Model info */}
                  <div className="flex flex-col min-w-0 overflow-hidden">
                    <span className="flex items-center gap-2 min-w-0">
                      <div className="text-muted-foreground font-mono select-none flex-shrink-0">
                        {index + 1}.
                      </div>
                      <div className="p-2 bg-muted rounded-md group-hover:bg-background transition-colors flex-shrink-0">
                        {getFileIcon(doc.original_filename)}
                      </div>

                      {/* Filename with tooltip */}
                      <div className="min-w-0 overflow-hidden flex-1">
                        <TooltipProvider>
                          <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                              <span className="truncate font-semibold text-foreground cursor-default block">
                                {doc.original_filename}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-[300px] z-50 break-all"
                            >
                              {doc.original_filename}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </span>

                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase flex-shrink-0">
                        Model:
                      </span>
                      <span className="text-[10px] font-mono text-primary/80 truncate">
                        {doc.vision_model_used.split("-")[1] || "Default"}
                      </span>
                    </div>
                  </div>

                  {/* Right side: Trash Can - always visible, always on the right */}
                  {isOwner ? (
                    <div className="flex-shrink-0">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <TooltipProvider>
                            <Tooltip delayDuration={200}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-bold hover:text-red-500 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 border-gray-800">
                                <p className="text-red-400 font-bold">
                                  Delete file
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </AlertDialogTrigger>

                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirm Deletion
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete{" "}
                              <span className="font-semibold text-foreground">
                                {doc.original_filename}
                              </span>
                              ? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete File
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : (
                    <div className="w-7" /> // Spacer to maintain consistent layout
                  )}
                </div>
              ))}

              {currentDocs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/50 border-2 border-dashed border-muted/50 rounded-xl bg-muted/5">
                  <Paperclip className="h-8 w-8 mb-2" />
                  <p className="text-xs">No files uploaded</p>
                </div>
              )}
            </div>

            {/* Upload & Controls Area */}
            <div className="space-y-4 pt-4 border-t bg-gradient-to-t from-background via-background to-transparent px-4 pb-6">
              {/* Queue Status Monitor */}
              {isQueueActive && (
                <div className="relative overflow-hidden rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800 p-3 shadow-inner">
                  {/* Scanline Effect */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]" />

                  <div className="relative z-20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] text-blue-400 font-mono uppercase tracking-wider">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        System Processing
                      </span>
                      <span>Queue: {queueDisplay.length}</span>
                    </div>

                    <div className="font-mono text-xs text-slate-300 truncate">
                      {queueDisplay.length > 0
                        ? `> Uploading: ${queueDisplay[0].name}`
                        : "> Ingesting data chunks..."}
                    </div>

                    {/* Fake progress bar */}
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite] w-full origin-left" />
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Controls */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Cpu className="h-3 w-3" /> Select Vision Model
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={(v) => setSelectedModel(v as VisionModel)}
                    disabled={isQueueActive}
                  >
                    <SelectTrigger className="h-8 text-xs w-full bg-card border-input shadow-sm">
                      <SelectValue placeholder="Select a Vision Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">
                          Vision Model
                        </SelectLabel>
                        {VISION_MODELS.map((m) => (
                          <SelectItem
                            key={m.value}
                            value={m.value}
                            className="text-xs"
                          >
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

                <div
                  className={`
                    group relative w-full rounded-xl border-2 border-dashed transition-all duration-300
                    ${
                      isQueueActive
                        ? "opacity-60 cursor-not-allowed border-muted bg-muted/10"
                        : "cursor-pointer border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5"
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
                      className={`p-2 rounded-full bg-background border shadow-sm transition-transform duration-300 ${!isQueueActive && "group-hover:scale-110"}`}
                    >
                      <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-foreground block">
                        Click to Upload
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        PDF, Word, Excel, Video, Text
                      </span>
                    </div>
                  </div>
                </div>

                {stagedFiles.length > 0 && (
                  <div className="animate-in slide-in-from-bottom-2 fade-in space-y-3 pt-2">
                    <Separator />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                        <span>Staging ({stagedFiles.length})</span>
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
                          className="flex items-center justify-between text-xs px-3 py-2 bg-card rounded-md border shadow-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {getFileIcon(f.name)}
                            <span
                              className="truncate min-w-0 font-medium"
                              title={f.name}
                            >
                              {f.name}
                            </span>
                          </div>
                          <X
                            className="h-3 w-3 cursor-pointer flex-shrink-0 ml-2 text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => handleRemoveStagedFile(f)}
                          />
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-9 text-xs font-semibold shadow-md bg-primary hover:bg-primary/90"
                      onClick={handleStartProcessing}
                      disabled={isQueueActive}
                    >
                      {isQueueActive ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin mr-2" />
                          Processing Queue...
                        </>
                      ) : (
                        `Start Ingestion (${stagedFiles.length})`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* --- OTHER TABS --- */}
        <TabsContent
          value="charts"
          className="flex-1 mt-0 overflow-hidden w-full h-full data-[state=inactive]:hidden"
        >
          <div className="h-full w-full bg-muted/10">
            <ChartBrowser collectionId={currentSessionId} />
          </div>
        </TabsContent>

        <TabsContent
          value="graph"
          className="flex-1 mt-0 overflow-hidden bg-background w-full h-full data-[state=inactive]:hidden"
        >
          <div className="h-full w-full">
            <GraphExplorer
              collectionId={currentSessionId}
              documents={currentDocs}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
