import React from "react";
import { RefreshCw, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GraphToolbarProps {
  onRefresh: () => void;
  isRefetching: boolean;
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

export const GraphToolbar: React.FC<GraphToolbarProps> = ({
  onRefresh,
  isRefetching,
  isFullScreen,
  onToggleFullScreen,
}) => {
  return (
    <div className="absolute top-4 right-4 z-50 flex gap-2">
      {isFullScreen ? (
        <div className="pt-2 text-xs font-mono tracking-widest pointer-events-none select-none">
          ESC TO CLOSE
        </div>
      ) : (
        <></>
      )}

      <Button
        variant="secondary"
        size="icon"
        onClick={onRefresh}
        className="bg-background/80/80 backdrop-blur-md border shadow-sm hover:bg-accent text-foreground"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
        />
      </Button>

      <Button
        variant={isFullScreen ? "destructive" : "secondary"}
        size="icon"
        onClick={onToggleFullScreen}
        className={
          isFullScreen
            ? "shadow-sm"
            : "bg-background/80/80 backdrop-blur-md border shadow-sm hover:bg-accent text-foreground"
        }
      >
        {isFullScreen ? (
          <X className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4 z-1000" />
        )}
      </Button>
    </div>
  );
};
