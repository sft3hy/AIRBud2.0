import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ImageIcon,
  ScanEye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getCollectionCharts } from "../../lib/api";

// Sub-components
import {
  NoCollectionState,
  NoChartsState,
} from "./ChartEmptyStates";
import { ChartFullscreenModal } from "./ChartFullScreenModal";

interface ChartBrowserProps {
  collectionId: string | null;
}

export const ChartBrowser: React.FC<ChartBrowserProps> = ({ collectionId }) => {
  const [index, setIndex] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedImage = searchParams.get("fullscreen_chart");
  const prevCollectionId = useRef(collectionId);
  const hasSyncedParam = useRef(false);

  const openFullscreen = (url: string) => {
    setSearchParams((prev) => {
      prev.set("fullscreen_chart", url);
      return prev;
    });
  };

  const closeFullscreen = () => {
    setSearchParams((prev) => {
      prev.delete("fullscreen_chart");
      return prev;
    });
  };

  const { data: allCharts = [] } = useQuery({
    queryKey: ["charts", collectionId],
    queryFn: () => getCollectionCharts(collectionId!),
    enabled: !!collectionId,
  });

  // Reset index when collection changes (but not on mount if same ID)
  useEffect(() => {
    if (prevCollectionId.current !== collectionId) {
      setIndex(0);
      closeFullscreen();
      prevCollectionId.current = collectionId;
      hasSyncedParam.current = false;
    }
  }, [collectionId]);

  // Initial Sync: If URL has fullscreen_chart, find its index
  useEffect(() => {
    if (allCharts.length > 0 && selectedImage && !hasSyncedParam.current) {
      const foundIndex = allCharts.findIndex((c: any) => c.url === selectedImage);
      if (foundIndex !== -1) {
        setIndex(foundIndex);
        hasSyncedParam.current = true;
      }
    }
  }, [allCharts, selectedImage]);

  const total = allCharts.length;
  // Safety check for index out of bounds
  const safeIndex = total > 0 ? (index >= total ? 0 : index) : 0;
  const currentChart = total > 0 ? allCharts[safeIndex] : null;

  const handleNext = () => setIndex((prev) => (prev + 1) % total);
  const handlePrev = () => setIndex((prev) => (prev - 1 + total) % total);

  // Sync fullscreen url if index changes while open
  useEffect(() => {
    if (selectedImage && currentChart?.url) {
      // If URL param doesn't match current chart (based on index)
      if (selectedImage !== currentChart.url) {

        // If we haven't synced yet, and the mismatch exists, we might be in the race condition.
        // If the URL param corresponds to a valid chart, we trust the URL (Initial Sync effect handles it)
        const urlMatchExists = allCharts.some((c: any) => c.url === selectedImage);
        if (urlMatchExists && !hasSyncedParam.current) {
          return;
        }

        // If we have synced OR the URL is just wrong, we overwrite it.
        setSearchParams((prev) => {
          prev.set("fullscreen_chart", currentChart.url);
          return prev;
        });
      }
    }
  }, [index, selectedImage, currentChart, allCharts]);

  // Navigation Shortcuts (Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (total === 0) return;
      // Only navigate if NOT fullscreen (or navigate in fullscreen too? usually yes)
      // Assuming navigation works in both, but let's keep it simple.
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total, index]);

  // --- Render Conditionals ---
  if (!collectionId) return <NoCollectionState />;
  if (total === 0) return <NoChartsState />;

  return (
    <>
      <div className="flex flex-col h-full border-l border-border/60">
        {/* Header / Navigation */}
        <div className="flex items-center justify-between p-3 border-b bg-card/50 backdrop-blur-sm shrink-0 gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-0.5">
              Figure {safeIndex + 1}{" "}
              <span className="text-muted-foreground/40 mx-1">/</span> {total}
            </span>
            {/* Moved Metadata to Header */}
            {currentChart && (
              <div className="flex items-center justify-center gap-2 max-w-full">
                <span
                  className="text-[12px] text-foreground/70 truncate"
                  title={currentChart.doc_name}
                >
                  {currentChart.doc_name}
                </span>
                <Badge
                  variant="outline"
                  className="text-[8px] font-mono shrink-0 h-4 px-1"
                >
                  p.{currentChart.page}
                </Badge>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Image Thumbnail Area */}
        <div className="h-[40%] shrink-0 p-2 flex items-center justify-center bg-muted/5 relative overflow-hidden group/container border-b border-border/50">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <Card
            className="relative group w-full h-full max-h-[400px] flex items-center justify-center bg-background/80/50 border-dashed border-2 overflow-hidden cursor-zoom-in transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            onClick={() =>
              currentChart?.url && openFullscreen(currentChart.url)
            }
          >
            {currentChart && currentChart.url ? (
              <>
                <img
                  src={currentChart.url}
                  alt={`Chart ${safeIndex + 1}`}
                  className="max-w-full max-h-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.02]"
                />

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 text-white font-medium bg-black/40 px-4 py-2 rounded-full border border-white/10">
                    <Maximize2 className="h-4 w-4" />
                    <span>Fullscreen</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 opacity-20 mb-3" />
                <span className="text-xs font-mono">IMAGE_DATA_MISSING</span>
              </div>
            )}
          </Card>
        </div>

        {/* Metadata Footer */}
        <ScrollArea className="flex-1 min-h-0 bg-card/30 [&>[data-radix-scroll-area-viewport]>div]:min-h-full">
          <div className="p-5 space-y-4 min-h-full flex flex-col">
            {/* AI Analysis Block */}
            <div className="space-y-2 flex-1 flex flex-col">
              <div className="flex items-center gap-2 shrink-0">
                <ScanEye className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Vision Analysis
                </span>
                {currentChart?.vision_model_used && (
                  <span className="ml-auto text-[10px] font-mono text-primary/70 bg-primary/5 px-2 py-0.5 rounded">
                    {currentChart.vision_model_used}
                  </span>
                )}
              </div>

              <div className="relative group flex-1 flex flex-col">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500" />
                <div className="relative flex-1 text-sm text-muted-foreground leading-relaxed bg-background/80/80 p-4 rounded-md border shadow-sm font-sans">
                  {currentChart?.description || (
                    <span className="italic opacity-50">
                      No analysis generated for this figure.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* --- Fullscreen Modal via Portal --- */}
      <ChartFullscreenModal
        isOpen={!!selectedImage}
        imageUrl={selectedImage || undefined}
        description={currentChart?.description}
        onClose={closeFullscreen}
      />
    </>
  );
};
