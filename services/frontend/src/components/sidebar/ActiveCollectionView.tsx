import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Share2, Image, ChevronLeft } from "lucide-react";
import {
  deleteDocument,
  getDocumentPreview,
} from "../../lib/api";
import { VisionModel, SessionDocument } from "../../types";
import { ChartBrowser } from "../ChartBrowser";
import { GraphExplorer } from "../GraphExplorer";

// UI Components
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Sub Components
import { UploadSection } from "./active-collection/UploadSection";
import { DocumentList } from "./active-collection/DocumentList";
import { DocumentPreviewModal } from "./active-collection/DocumentPreviewModal";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Context
import { useQueue } from "../../context/QueueContext";

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
  isOwner,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // --- QUEUE CONTEXT INTEGRATION ---
  const { addToQueue, isProcessing } = useQueue();
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // --- PERSISTENCE LOGIC START ---
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem("lastActiveCollectionId", currentSessionId);
    }
  }, [currentSessionId]);

  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem(`activeTab_${currentSessionId}`);
    return saved || "docs";
  });

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    localStorage.setItem(`activeTab_${currentSessionId}`, val);
  };

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
    if (stagedFiles.length === 0) return;
    addToQueue(stagedFiles, currentSessionId, selectedModel);
    setStagedFiles([]);
  };

  const handleDeleteDoc = async (id: number) => {
    await deleteDocument(id);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const isQueueActive = isProcessing || !!activeJobId;

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden relative">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 w-full"
      >
        <div className="flex items-center px-2 py-1 border-b shrink-0 gap-2">
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
