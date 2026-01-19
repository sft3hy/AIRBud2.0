import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageIcon, BarChart } from "lucide-react";
import { getCollectionCharts } from "../lib/api";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ChartBrowserProps {
  collectionId: string | null;
}

export const ChartBrowser: React.FC<ChartBrowserProps> = ({ collectionId }) => {
  const [index, setIndex] = useState(0);

  const { data: allCharts = [] } = useQuery({
    queryKey: ["charts", collectionId],
    queryFn: () => getCollectionCharts(collectionId!),
    enabled: !!collectionId,
  });

  // Reset index when collection changes
  useEffect(() => {
    setIndex(0);
  }, [collectionId]);

  const total = allCharts.length;

  // Safety check for index out of bounds
  const safeIndex = total > 0 ? (index >= total ? 0 : index) : 0;
  const currentChart = total > 0 ? allCharts[safeIndex] : null;

  const handleNext = () => setIndex((prev) => (prev + 1) % total);
  const handlePrev = () => setIndex((prev) => (prev - 1 + total) % total);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (total === 0) return;
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [total]);

  if (!collectionId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 gap-2">
        <BarChart className="h-10 w-10 opacity-20" />
        <span className="text-sm">
          Select a collection to view extracted charts.
        </span>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 gap-2">
        <ImageIcon className="h-10 w-10 opacity-20" />
        <span className="text-sm">No charts or figures detected.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background/50">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between p-2 border-b bg-card shadow-sm shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex flex-col items-center">
          <span className="text-sm font-bold tabular-nums">
            Image {safeIndex + 1}{" "}
            <span className="text-muted-foreground font-normal">
              of {total}
            </span>
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 p-4 flex items-center justify-center bg-muted/10 min-h-0 overflow-hidden">
        <Card className="relative group w-full h-full max-h-[350px] flex items-center justify-center bg-transparent border-dashed overflow-hidden">
          {currentChart && currentChart.url ? (
            <a
              href={currentChart.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-center"
            >
              <img
                src={currentChart.url}
                alt={`Chart ${safeIndex + 1}`}
                className="max-w-full max-h-full object-contain shadow-md rounded transition-transform duration-200 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
            </a>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-20 mb-2" />
              <span className="text-xs">Image unavailable</span>
            </div>
          )}
        </Card>
      </div>

      {/* Metadata Footer */}
      <ScrollArea className="h-[35%] shrink-0 border-t bg-card">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs font-normal">
              {currentChart?.doc_name}
            </Badge>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-1 rounded">
              Page {currentChart?.page}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">
                AI Analysis
              </span>
              <span className="text-[10px] text-muted-foreground">
                ({currentChart?.vision_model_used})
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-md border">
              {currentChart?.description || "No description available."}
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
