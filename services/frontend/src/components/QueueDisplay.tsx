import React from "react";
import { useQueue } from "../context/QueueContext";
import { Paperclip, Loader2 } from "lucide-react";

// Modification: Accept collectionId to filter the queue
interface QueueDisplayProps {
    collectionId?: string;
}

export const QueueDisplay: React.FC<QueueDisplayProps> = ({ collectionId }) => {
    const { queue } = useQueue();

    // Filter if ID is provided
    const visibleItems = collectionId
        ? queue.filter(item => item.sessionId === collectionId)
        : queue;

    if (visibleItems.length === 0) return null;

    return (
        <div className="mt-4 w-full bg-black/10 rounded-lg p-3 border border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>In Queue ({visibleItems.length})</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                {visibleItems.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 text-[10px] bg-black/20 p-1.5 rounded border border-white/5">
                        <span className="text-muted-foreground font-mono opacity-50">#{i + 1}</span>
                        <Paperclip className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate flex-1 text-foreground/80">{item.filename || item.file?.name || "Unknown File"}</span>
                        <span className="text-[9px] uppercase tracking-wider bg-white/5 py-0.5 px-1 rounded text-muted-foreground">
                            {item.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
