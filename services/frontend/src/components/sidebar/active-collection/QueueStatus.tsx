import React from "react";
import { Loader2 } from "lucide-react";

interface QueueStatusProps {
  queueLength: number;
  activeJobId: string | null;
  currentFileName?: string;
}

export const QueueStatus: React.FC<QueueStatusProps> = ({
  queueLength,
  activeJobId,
  currentFileName,
}) => {
  if (queueLength === 0 && !activeJobId) return null;

  return (
    <div className="relative overflow-hidden rounded-lg bg-slate-950 dark:bg-slate-900 border border-slate-800 p-3 shadow-inner mb-4">
      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 pointer-events-none bg-[length:100%_2px,3px_100%]" />

      <div className="relative z-20 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] text-blue-400 font-mono uppercase tracking-wider">
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            System Processing
          </span>
          <span className="flex-shrink-0">Queue: {queueLength}</span>
        </div>

        <div className="font-mono text-xs text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap">
          {queueLength > 0
            ? `> Uploading: ${currentFileName || "file"}`
            : "> Ingesting data ..."}
        </div>

        {/* Fake progress bar */}
        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-blue-500 animate-[loading_1.5s_ease-in-out_infinite] w-full origin-left" />
        </div>
      </div>
    </div>
  );
};