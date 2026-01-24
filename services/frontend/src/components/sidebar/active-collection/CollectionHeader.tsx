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
    <div className="px-3 py-2 border-b bg-background/50 flex items-center gap-2 shrink-0 z-10 h-12">
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-primary/10 hover:text-primary transition-colors rounded-full shrink-0"
              onClick={onBack}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px] z-50 break-all">
            Back to Collections
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="font-semibold text-sm truncate flex items-center gap-2 min-w-0">
        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="truncate">{activeCollectionName}</span>
      </div>
    </div>
  );
};
