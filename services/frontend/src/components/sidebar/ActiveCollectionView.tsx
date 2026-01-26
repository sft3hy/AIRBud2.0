import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Share2, Image, ChevronLeft } from "lucide-react";
import {
  uploadAndProcessDocument,
  deleteDocument,
  getDocumentPreview,
} from "../../lib/api";
import { VisionModel, SessionDocument } from "../../types";
import { ChartBrowser } from "../ChartBrowser";
import { GraphExplorer } from "../GraphExplorer";

// UI Components
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

// Sub Components
import { UploadSection } from "./active-collection/UploadSection";
import { QueueStatus } from "./active-collection/QueueStatus";
import { DocumentList } from "./active-collection/DocumentList";
import { DocumentPreviewModal } from "./active-collection/DocumentPreviewModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  currentDocs,
  activeJobId,
  setActiveJobId,
  isOwner,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State for document preview
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Fetch document preview content
  const { data: previewContent } = useQuery({
    queryKey: ["documentPreview", previewDocId],
    queryFn: () => getDocumentPreview(parseInt(previewDocId!)),
    enabled: !!previewDocId,
  });

  // On mount, check if there's a preview_doc param
  useEffect(() => {
    const docId = searchParams.get("preview_doc");
    if (docId) {
      setPreviewDocId(docId);
    }
  }, [searchParams]);

  const handlePreview = (id: number) => {
    const docId = id.toString();
    setPreviewDocId(docId);
    setSearchParams((prev) => {
      prev.set("preview_doc", docId);
      return prev;
    });
  };

  const closePreview = () => {
    setPreviewDocId(null);
    setSearchParams((prev) => {
      prev.delete("preview_doc");
      return prev;
    });
  };

  const [selectedModel, setSelectedModel] = useState<VisionModel>(
    "Ollama-Granite3.2-Vision",
  );

  // Staging & Queue
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [queueDisplay, setQueueDisplay] = useState<File[]>([]);

  // Refs for stability
  const queueRef = useRef<File[]>([]);
  const isProcessingRef = useRef(false);

  // --- Queue Processor ---
  const processNextInQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    if (queueRef.current.length === 0) return;

    // Double check: If active job exists, let the polling handler manage the flow
    if (activeJobId) return;

    isProcessingRef.current = true;
    const currentFile = queueRef.current[0];

    if (!currentFile) {
      isProcessingRef.current = false;
      return;
    }

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

  // --- PERSISTENCE LOGIC START ---
  // 1. Save active collection ID whenever it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem("lastActiveCollectionId", currentSessionId);
    }
  }, [currentSessionId]);

  // 2. Tab State with Persistence
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`activeTab_${currentSessionId}`);
    return saved || "docs";
  });

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    localStorage.setItem(`activeTab_${currentSessionId}`, val);
  };

  // Switch tab automatically based on URL params (Persistence on Reload)
  useEffect(() => {
    const hasChart = searchParams.get("fullscreen_chart");
    const hasGraph = searchParams.get("fullscreen_graph") === "true";
    const hasDoc = searchParams.get("preview_doc");

    if (hasChart) {
      setActiveTab("charts");
    } else if (hasGraph) {
      setActiveTab("graph");
    } else if (hasDoc) {
      setActiveTab("docs");
    }
  }, [searchParams]);
  // --- PERSISTENCE LOGIC END ---

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
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 w-full"
      >
        {/* Navigation Tabs with Compact Header */}
        <div className="flex items-center px-2 py-1 border-b shrink-0 gap-2">
          {/* Back Button */}
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate("/collections")}
                  className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-primary text-background font-medium"
              >
                <p>Back to Collections</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>


          <TabsList className="grid flex-1 grid-cols-3 h-10 bg-background/50 p-0.5">
            <TabsTrigger
              value="docs"
              className="text-[13px] data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-1.5"
            >
              <FileText className="h-4 w-4" /> Files
            </TabsTrigger>
            <TabsTrigger
              value="charts"
              className="text-[13px] data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-600 gap-1.5"
            >
              <Image className="h-4 w-4" /> Images
            </TabsTrigger>
            <TabsTrigger
              value="graph"
              className="text-[13px] data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Graph
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- FILES TAB --- */}
        <TabsContent
          value="docs"
          className="flex-1 flex flex-col min-h-0 mt-0 w-full relative"
        >
          <ScrollArea className="flex-1 w-full">
            <div className="space-y-3 pt-2 border-t bg-gradient-to-t from-background/40 via-background/20 to-transparent px-2 pb-2">
              <QueueStatus
                queueLength={queueDisplay.length}
                activeJobId={activeJobId}
                currentFileName={queueDisplay[0]?.name}
              />

              <UploadSection
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                isQueueActive={isQueueActive}
                stagedFiles={stagedFiles}
                setStagedFiles={setStagedFiles}
                onStartProcessing={handleStartProcessing}
              />
            </div>

            <DocumentList
              documents={currentDocs}
              onPreview={handlePreview}
              onDelete={handleDeleteDoc}
              isOwner={isOwner}
              hasStagedFiles={stagedFiles.length > 0}
            />
          </ScrollArea>
        </TabsContent>

        {/* --- OTHER TABS --- */}
        <TabsContent
          value="charts"
          className="flex-1 mt-0 overflow-hidden w-full h-full data-[state=inactive]:hidden"
        >
          <div className="h-full w-full">
            <ChartBrowser collectionId={currentSessionId} />
          </div>
        </TabsContent>

        <TabsContent
          value="graph"
          className="flex-1 mt-0 overflow-hidden bg-transparent w-full h-full data-[state=inactive]:hidden"
        >
          <div className="h-full w-full">
            <GraphExplorer
              collectionId={currentSessionId}
              documents={currentDocs}
            />
          </div>
        </TabsContent>
      </Tabs>

      <DocumentPreviewModal
        content={previewContent || null}
        onClose={closePreview}
      />
    </div>
  );
};
