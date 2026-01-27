
import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCollectionStatus } from "../../lib/api";
import { Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { useState } from "react";
import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobStatusWidgetProps {
    collectionId: string;
}

export const JobStatusWidget: React.FC<JobStatusWidgetProps> = ({ collectionId }) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);

    // Poll status while mounted
    const { data: status } = useQuery({
        queryKey: ["status", collectionId],
        queryFn: () => getCollectionStatus(collectionId),
        refetchInterval: 1000,
    });

    // If status completes, we can trigger a refresh of docs
    useEffect(() => {
        if (status?.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ["documents", collectionId] });
            queryClient.invalidateQueries({ queryKey: ["collections"] });
        }
    }, [status, collectionId, queryClient]);

    if (!status || status.status === 'idle') return null;
    if (status.status === 'completed') return null;

    const isError = status.status === 'error';
    const progress = status.progress || 0;
    const currentFile = status.details?.current_file || "File";

    return (
        <div className={cn(
            "mb-4 rounded-lg border text-sm animate-in fade-in slide-in-from-top-2 overflow-hidden transition-all duration-300",
            isError ? "bg-red-500/10 border-red-500/20" : "bg-primary/5 border-primary/20"
        )}>
            <div className="p-3">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="font-semibold flex items-center gap-2">
                            {isError ? (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            ) : (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            )}
                            {isError ? "Processing Failed" : "Processing..."}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5 max-w-[180px] truncate font-mono">
                            {currentFile}
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 truncate uppercase tracking-widest opacity-70">
                            {status.step || "Initializing..."}
                        </span>
                    </div>
                    <span className="font-mono text-xs opacity-70">{progress}%</span>
                </div>

                {!isError && (
                    <Progress value={progress} className="h-1.5 bg-background/50 mb-2" />
                )}

                {/* Toggle Terminal */}
                <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Terminal className="w-3 h-3" /> Live Logs
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-transparent"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* EXPANDABLE TERMINAL */}
            {isExpanded && (
                <div className="bg-black/90 p-3 pt-2 text-[10px] font-mono text-green-400/80 border-t border-white/10 shadow-inner max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="flex flex-col gap-1">
                        {status.details?.logs?.map((log: string, i: number) => (
                            <div key={i} className="break-all">
                                <span className="text-blue-500 mr-1">{">"}</span>
                                {log}
                            </div>
                        ))}
                        {status.details?.logs?.length === 0 && <span className="opacity-50 italic">Waiting for logs...</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
