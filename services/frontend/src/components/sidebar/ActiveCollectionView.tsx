import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, SplinePointer, Image } from "lucide-react";
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
import { CollectionHeader } from "./active-collection/CollectionHeader";
import { UploadSection } from "./active-collection/UploadSection";
import { QueueStatus } from "./active-collection/QueueStatus";
import { DocumentList } from "./active-collection/DocumentList";
import { DocumentPreviewModal } from "./active-collection/DocumentPreviewModal";

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

  const [previewContent, setPreviewContent] = useState<string | null>(null);
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

  const handlePreviewDoc = async (docId: number) => {
    try {
      const content = await getDocumentPreview(docId);
      setPreviewContent(content);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load document preview.",
      });
    }
  };

  const handleClosePreview = () => setPreviewContent(null);

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
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <CollectionHeader
        activeCollectionName={activeCollectionName}
        onBack={() => navigate("/collections")}
      />

      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0 w-full">
        {/* Navigation Tabs */}
        <div className="px-4 py-2 border-b shrink-0">
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
              <Image className="h-3.5 w-3.5" /> Images
            </TabsTrigger>
            <TabsTrigger
              value="graph"
              className="text-xs data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-600 gap-2"
            >
              <SplinePointer className="h-3.5 w-3.5" /> Graph
            </TabsTrigger>
          </TabsList>
        </div>

        {/* --- FILES TAB --- */}
        <TabsContent
          value="docs"
          className="flex-1 flex flex-col min-h-0 mt-0 w-full relative"
        >
          <ScrollArea className="flex-1 w-full">
            <div className="space-y-4 pt-4 border-t bg-gradient-to-t from-background/40 via-background/20 to-transparent px-4 pb-6">
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
              onPreview={handlePreviewDoc}
              onDelete={handleDeleteDoc}
              isOwner={isOwner}
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
        content={previewContent}
        onClose={handleClosePreview}
      />
    </div>
  );
};
