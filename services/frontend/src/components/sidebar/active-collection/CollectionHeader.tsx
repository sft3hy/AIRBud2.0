import React from "react";
import { Layers, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CollectionHeaderProps {
  activeCollectionName: string | undefined;
  onBack: () => void;
}

export const CollectionHeader: React.FC<CollectionHeaderProps> = ({
  activeCollectionName,
  onBack,
}) => {
  return (
    <div className="px-6 py-4 border-b bg-background/50 flex items-center gap-3 shrink-0 z-10">
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors rounded-full"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px] z-50 break-all">
            Back to Collections
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
  );
};
