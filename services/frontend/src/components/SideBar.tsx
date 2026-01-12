import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, LayoutGrid, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSessions, checkBackendHealth, uploadAndProcessDocument, createSession, getSessionStatus } from '../lib/api';
import { VisionModel } from '../types';
import { cn } from '@/lib/utils';
import { logger } from '../lib/logger';
import { ChartBrowser } from './ChartBrowser';

// UI Components
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SidebarProps {
    currentSessionId: string | null;
    onSessionChange: (id: string | null) => void;
    className?: string;
}

const VISION_MODELS: { value: VisionModel; label: string; desc: string }[] = [
    { value: "Moondream2", label: "Moondream2 (1.6B)", desc: "Fast - Recommended (Local)" },
    { value: "Qwen3-VL-2B", label: "Qwen3-VL (2B)", desc: "Balanced - High Accuracy" },
    { value: "InternVL3.5-1B", label: "InternVL 3.5 (1B)", desc: "Precise - Doc Optimized" },
    { value: "Ollama-Gemma3", label: "Gemma 3 (4B)", desc: "Strong Reasoning - Requires Ollama" },
    { value: "Ollama-Granite3.2-Vision", label: "Granite 3.2 (2B)", desc: "Enterprise Vision" },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentSessionId, onSessionChange, className }) => {
    const queryClient = useQueryClient();
    const [selectedModel, setSelectedModel] = useState<VisionModel>("Moondream2");
    const [isUploading, setIsUploading] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // Health Check
    const { data: isBackendOnline } = useQuery({
        queryKey: ['health'],
        queryFn: checkBackendHealth,
        refetchInterval: 10000,
    });

    // Load Sessions
    const { data: sessions = [] } = useQuery({
        queryKey: ['sessions'],
        queryFn: getSessions,
        enabled: !!isBackendOnline,
    });

    // Poll Job Status
    const { data: jobStatus } = useQuery({
        queryKey: ['status', activeJobId],
        queryFn: () => getSessionStatus(activeJobId!),
        enabled: !!activeJobId,
        refetchInterval: 1000,
    });

    // Handle Job Completion
    useEffect(() => {
        if (!jobStatus) return;

        if (jobStatus.status === 'completed') {
            logger.info("Job completed", { sessionId: activeJobId });
            setActiveJobId(null);
            setIsUploading(false);

            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['documents', currentSessionId] });
            queryClient.invalidateQueries({ queryKey: ['charts', currentSessionId] });
        } else if (jobStatus.status === 'error') {
            logger.error("Job failed", { sessionId: activeJobId });
            setIsUploading(false);
            // Don't clear activeJobId immediately so user sees the error state
        }
    }, [jobStatus, queryClient, currentSessionId, activeJobId]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const files = Array.from(event.target.files);

        setIsUploading(true);
        logger.info("Starting upload", { count: files.length, model: selectedModel });

        try {
            // 1. Create Session
            const newSessionId = await createSession(files.map(f => f.name));
            onSessionChange(newSessionId);
            setActiveJobId(newSessionId);

            // 2. Process Files
            for (const file of files) {
                await uploadAndProcessDocument(newSessionId, file, selectedModel);
            }

            // Clear input
            event.target.value = "";

        } catch (error) {
            logger.error("Upload process failed", error);
            setIsUploading(false);
            setActiveJobId(null);
        }
    };

    return (
        <div className={cn("flex flex-col h-full w-full bg-muted/10 border-r", className)}>
            <div className="p-4 border-b bg-background flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    🧠 Smart RAG
                    <div
                        className={cn("h-2 w-2 rounded-full", isBackendOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse')}
                        title={isBackendOnline ? "Backend Online" : "Backend Offline"}
                    />
                </h2>
            </div>

            <Tabs defaultValue="files" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-2 shrink-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="files" className="flex gap-2"><FileText className="w-4 h-4" /> Files</TabsTrigger>
                        <TabsTrigger value="charts" className="flex gap-2"><LayoutGrid className="w-4 h-4" /> Charts</TabsTrigger>
                    </TabsList>
                </div>

                {/* --- FILES TAB --- */}
                <TabsContent value="files" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex">
                    <ScrollArea className="flex-1 px-4 py-2">
                        <div className="space-y-6 pb-6">

                            {/* JOB STATUS CARD */}
                            {activeJobId && jobStatus && (
                                <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        {jobStatus.status === 'completed' ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        ) : jobStatus.status === 'error' ? (
                                            <AlertCircle className="h-4 w-4 text-red-600" />
                                        ) : (
                                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                        )}
                                        <span className="font-semibold text-sm">
                                            {jobStatus.status === 'completed' ? 'Success' : jobStatus.status === 'error' ? 'Error' : 'Processing...'}
                                        </span>
                                    </div>
                                    <Progress value={jobStatus.progress} className="h-2 mb-2" />
                                    <p className="text-xs text-muted-foreground font-mono truncate" title={jobStatus.step}>
                                        {jobStatus.step}
                                    </p>
                                </Card>
                            )}

                            {/* UPLOAD AREA */}
                            {!currentSessionId && !activeJobId && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Vision Model</label>
                                        <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as VisionModel)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {VISION_MODELS.map((m) => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        <div className="flex flex-col items-start">
                                                            <span className="font-medium">{m.label}</span>
                                                            <span className="text-xs text-muted-foreground">{m.desc}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Card className="p-6 border-dashed border-2 flex flex-col items-center gap-2 text-center hover:bg-muted/50 transition-colors relative cursor-pointer group">
                                        <input
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.pptx"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={handleFileUpload}
                                            disabled={isUploading || !isBackendOnline}
                                        />
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold">Click to Upload Documents</div>
                                            <div className="text-xs text-muted-foreground">PDF, DOCX, PPTX</div>
                                        </div>
                                    </Card>
                                </div>
                            )}

                            <Separator />

                            {/* SESSION HISTORY */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</h3>
                                <Select
                                    value={currentSessionId || "new"}
                                    onValueChange={(val) => onSessionChange(val === "new" ? null : val)}
                                    disabled={!!activeJobId}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-primary font-medium">✨ Start New Session</SelectItem>
                                        {sessions.map((sess) => (
                                            <SelectItem key={sess.id} value={String(sess.id)}>
                                                {sess.name.length > 25 ? sess.name.substring(0, 25) + "..." : sess.name} ({sess.docs})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>

                {/* --- CHARTS TAB --- */}
                <TabsContent value="charts" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex overflow-hidden">
                    <div className="flex-1 px-4 py-2 min-h-0">
                        <ChartBrowser sessionId={currentSessionId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};