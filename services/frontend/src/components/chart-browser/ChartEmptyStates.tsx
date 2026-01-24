import React from "react";
import { BarChart, ImageIcon } from "lucide-react";

export const NoCollectionState = () => (
  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/5 border-l">
    <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
      <BarChart className="h-8 w-8 opacity-40" />
    </div>
    <span className="text-sm font-medium">
      Select a collection to inspect visuals.
    </span>
  </div>
);

export const NoChartsState = () => (
  <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/5 border-l">
    <div className="h-16 w-16 bg-muted/20 rounded-full flex items-center justify-center mb-4">
      <ImageIcon className="h-8 w-8 opacity-40" />
    </div>
    <span className="text-sm font-medium">No charts or figures detected.</span>
  </div>
);
