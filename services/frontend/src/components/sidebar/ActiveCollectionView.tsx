import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload, Loader2, X, FileText } from "lucide-react";
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
    desc: "Fast - Recommended (Local)",
  },
  {
    value: "Ollama-Gemma3",
    label: "Gemma 3 (4B)",
    desc: "Strong Reasoning - Requires Ollama",
  },
];

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
        // --- CRITICAL FIX ---
        // Backend says busy. This means we are desynced.
        // We set activeJobId to resume polling. The Sidebar will poll, eventually see "completed",
        // clear activeJobId, and that triggers useEffect -> processNextInQueue again.
        console.warn("Backend reported busy. Re-syncing with active job...");
        setActiveJobId(currentSessionId);

        // Do NOT pop from queue. We will retry this file once the current job clears.
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
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2 bg-muted/20 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate("/collections")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-sm truncate flex-1 min-w-0">
          {activeCollectionName}
        </div>
      </div>

      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0 w-full">
        <div className="px-4 py-2 bg-muted/20 border-b shrink-0">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="docs" className="text-xs">
              Files
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs">
              Charts
            </TabsTrigger>
            <TabsTrigger value="graph" className="text-xs">
              Graph
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="docs"
          className="flex-1 flex flex-col min-h-0 mt-0 w-full"
        >
          <ScrollArea className="flex-1 w-full">
            <div className="px-4 py-4 space-y-2 mb-6">
              {currentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 bg-card border rounded-md text-xs group w-full max-w-full"
                >
                  <div className="flex-1 w-0 mr-3">
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span className="truncate block font-medium cursor-default">
                            {doc.original_filename}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-[300px] break-all z-50"
                        >
                          {doc.original_filename}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 px-1.5 max-w-[80px] truncate block text-center"
                    >
                      {doc.vision_model_used
                        .replace("Ollama-", "")
                        .replace("-Vision", "")}
                    </Badge>

                    {isOwner && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Document?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <b>{doc.original_filename}</b>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="bg-destructive"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))}
              {currentDocs.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No files.
                </p>
              )}
            </div>

            {/* Upload Area */}
            <div className="space-y-3 pt-4 border-t px-4 pb-4">
              {isQueueActive && (
                <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs flex flex-col gap-1 border border-blue-100 dark:border-blue-800 animate-in slide-in-from-bottom-2 fade-in">
                  <div className="flex items-center gap-2 font-semibold">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing Queue
                  </div>
                  <div className="pl-5 opacity-90">
                    {queueDisplay.length > 0
                      ? `Uploading: ${queueDisplay[0].name}`
                      : "Working..."}
                  </div>
                  {queueDisplay.length > 1 && (
                    <div className="pl-5 opacity-75">
                      + {queueDisplay.length - 1} more waiting
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">
                  Upload
                </label>
                <Select
                  value={selectedModel}
                  onValueChange={(v) => setSelectedModel(v as VisionModel)}
                  disabled={isQueueActive}
                >
                  <SelectTrigger className="h-6 text-[0.8rem] w-full">
                    <SelectValue placeholder="Select a Vision Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Vision Model</SelectLabel>
                      {VISION_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <Card
                className={`p-3 border-dashed border-2 flex flex-col items-center gap-1 text-center relative w-full transition-colors ${isQueueActive ? "opacity-50 cursor-not-allowed bg-muted/20" : "hover:bg-muted/50 cursor-pointer"}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt,.mp4,.xlsx"
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  onChange={handleFileSelect}
                  disabled={isQueueActive}
                />
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Drag or select files
                </span>
              </Card>

              {stagedFiles.length > 0 && (
                <div className="space-y-2">
                  {stagedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs px-2 py-1 bg-muted/30 rounded border"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate min-w-0" title={f.name}>
                          {f.name}
                        </span>
                      </div>
                      <X
                        className="h-3 w-3 cursor-pointer flex-shrink-0 ml-2 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleRemoveStagedFile(f)}
                      />
                    </div>
                  ))}
                  <Button
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={handleStartProcessing}
                    disabled={isQueueActive}
                  >
                    {isQueueActive ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                        Queue Active
                      </>
                    ) : (
                      `Process ${stagedFiles.length} File${stagedFiles.length > 1 ? "s" : ""}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="charts"
          className="flex-1 mt-0 overflow-hidden w-full"
        >
          <div className="h-full p-2 w-full">
            <ChartBrowser collectionId={currentSessionId} />
          </div>
        </TabsContent>
        <TabsContent
          value="graph"
          className="flex-1 mt-0 overflow-hidden bg-white w-full"
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
