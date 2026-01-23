import React from "react";
import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { stringToColor } from "./utils";

interface GraphLegendProps {
  legendData: {
    files: string[];
    hasMultiSource: boolean;
  };
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ legendData }) => {
  return (
    <Card className="absolute top-4 left-4 z-10 p-3 bg-background/80/90 dark:bg-background/80/80 backdrop-blur-md border shadow-lg max-w-[250px] max-h-[40%] overflow-y-auto">
      <div className="font-semibold mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <FileText className="h-3 w-3" /> Sources
      </div>

      <div className="space-y-1.5">
        {/* Multi-source Indicator */}
        {legendData.hasMultiSource && (
          <div className="flex items-center gap-2 text-xs pb-2 mb-2 border-b border-border/50">
            <div
              className="w-3 h-3 rounded-full shrink-0 border-2 border-slate-300 shadow-sm"
              style={{
                background:
                  "linear-gradient(to bottom right, #f8fafc, #cbd5e1)",
              }}
            />
            <span className="truncate font-medium" title="Multiple Sources">
              Shared / Multiple
            </span>
          </div>
        )}

        {/* Individual Files */}
        {legendData.files.map((docName) => (
          <div key={docName} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full shrink-0 border border-white/20 shadow-sm"
              style={{ backgroundColor: stringToColor(docName) }}
            />
            <span className="truncate" title={docName}>
              {docName}
            </span>
          </div>
        ))}

        {legendData.files.length === 0 && !legendData.hasMultiSource && (
          <span className="text-xs text-muted-foreground italic">
            No nodes yet.
          </span>
        )}
      </div>
    </Card>
  );
};
