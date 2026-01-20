import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  BarChart,
  Maximize2,
  X,
  ScanEye,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCollectionCharts } from "../lib/api";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ChartBrowserProps {
  collectionId: string | null;
}

export const ChartBrowser: React.FC<ChartBrowserProps> = ({ collectionId }) => {
  const [index, setIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: allCharts = [] } = useQuery({
    queryKey: ["charts", collectionId],
    queryFn: () => getCollectionCharts(collectionId!),
    enabled: !!collectionId,
  });

  // Reset index when collection changes
  useEffect(() => {
    setIndex(0);
    setIsFullscreen(false);
  }, [collectionId]);

  const total = allCharts.length;
  // Safety check for index out of bounds
  const safeIndex = total > 0 ? (index >= total ? 0 : index) : 0;
  const currentChart = total > 0 ? allCharts[safeIndex] : null;

  const handleNext = () => setIndex((prev) => (prev + 1) % total);
  const handlePrev = () => setIndex((prev) => (prev - 1 + total) % total);

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
        return;
      }

      if (total === 0) return;

      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total, index]); // Added index dependency to ensure fresh closure if needed

  // --- Empty States ---
  if (!collectionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/5 border-l">
        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
          <BarChart className="h-8 w-8 opacity-40" />
        </div>
        <span className="text-sm font-medium">
          Select a collection to inspect visuals.
        </span>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/5 border-l">
        <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
          <ImageIcon className="h-8 w-8 opacity-40" />
        </div>
        <span className="text-sm font-medium">
          No charts or figures detected.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full bg-background border-l border-border/60">
        {/* Header / Navigation */}
        <div className="flex items-center justify-between p-3 border-b bg-card/50 backdrop-blur-sm shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
              Figure {safeIndex + 1}{" "}
              <span className="text-muted-foreground/40 mx-1">/</span> {total}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Image Area */}
        <div className="flex-1 p-6 flex items-center justify-center bg-muted/5 relative overflow-hidden group/container">
          {/* Background Grid Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          <Card
            className="relative group w-full h-full max-h-[400px] flex items-center justify-center bg-background/50 border-dashed border-2 overflow-hidden cursor-zoom-in transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
            onClick={() => setIsFullscreen(true)}
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
        <ScrollArea className="h-[35%] min-h-[200px] shrink-0 border-t bg-card/30">
          <div className="p-5 space-y-4">
            {/* Header Info */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="p-1.5 bg-blue-500/10 rounded-md text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <span
                  className="text-sm font-medium truncate"
                  title={currentChart?.doc_name}
                >
                  {currentChart?.doc_name}
                </span>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-mono shrink-0"
              >
                PG {currentChart?.page}
              </Badge>
            </div>

            <Separator className="bg-border/50" />

            {/* AI Analysis Block */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
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

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500" />
                <div className="relative text-sm text-muted-foreground leading-relaxed bg-background/80 p-4 rounded-md border shadow-sm font-sans">
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

      {/* --- Fullscreen Modal Overlay --- */}
      {isFullscreen && currentChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
          {/* Close Button */}
          <Button
            size="icon"
            onClick={() => setIsFullscreen(false)}
            aria-label="Close Fullscreen"
            className="
              absolute top-6 right-6 z-50
              h-12 w-12 rounded-full
              bg-black/40 backdrop-blur
              text-white
              hover:bg-red-500/80
              transition
            "
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Hints (Optional) */}
          <div className="absolute bottom-8 text-white/40 text-xs font-mono tracking-widest pointer-events-none">
            USE ARROW KEYS TO NAVIGATE • ESC TO CLOSE
          </div>

          {/* Large Image */}
          <div className="relative w-2000 h-2000 p-12 flex items-center justify-center">
            <img
              src={currentChart.url}
              alt="Fullscreen Chart"
              className="object-contain shadow-2xl animate-in zoom-in-110 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
};
