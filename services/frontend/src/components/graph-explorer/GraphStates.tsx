import React from "react";
import { Network, Loader2 } from "lucide-react";

export const NoCollectionState: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
    <div className="text-center text-muted-foreground">
      <Network className="h-16 w-16 mx-auto mb-4 opacity-30" />
      <p className="text-lg font-medium">No Collection Selected</p>
    </div>
  </div>
);

export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
    <Loader2 className="animate-spin h-8 w-8 text-primary" />
  </div>
);

export const EmptyDataState: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
    <Network className="h-32 w-16 mb-4 opacity-20" />
    <p className="text-base font-medium">No Knowledge Graph Data</p>
    <p className="text-xs mt-2">Upload a document to generate nodes.</p>
  </div>
);
