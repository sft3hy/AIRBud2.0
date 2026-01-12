import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, LayoutGrid, FileText, CheckCircle2, AlertCircle, X, Play, Cpu, Eye } from 'lucide-react';
import { getSessions, checkBackendHealth, uploadAndProcessDocument, createSession, getSessionStatus } from '../lib/api';
import { config } from '../lib/config'; // Import the sync config
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
import { Badge } from '@/components/ui/badge';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [selectedModel, setSelectedModel] = useState<VisionModel>("Moondream2");
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // Health Check (Kept for Online/Offline indicator)
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

            // Invalidate queries so MainContent refreshes
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            queryClient.invalidateQueries({ queryKey: ['documents', currentSessionId] });
            queryClient.invalidateQueries({ queryKey: ['charts', currentSessionId] });

            setActiveJobId(null);
            setIsUploading(false);
            setStagedFiles([]);

        } else if (jobStatus.status === 'error') {
            logger.error("Job failed", { sessionId: activeJobId });
            setIsUploading(false);
        }
    }, [jobStatus, queryClient, currentSessionId, activeJobId]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const newFiles = Array.from(event.target.files);
            setStagedFiles(prev => {
                const combined = [...prev, ...newFiles];
                return combined.filter((file, index, self) =>
                    index === self.findIndex((f) => f.name === file.name)
                );
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeStagedFile = (fileName: string) => {
        setStagedFiles(prev => prev.filter(f => f.name !== fileName));
    };

    const handleStartProcessing = async () => {
        if (stagedFiles.length === 0) return;

        setIsUploading(true);
        logger.info("Starting batch processing", { count: stagedFiles.length, model: selectedModel });

        try {
            // 1. Create Session
            const sessionName = stagedFiles.map(f => f.name);
            const newSessionId = await createSession(sessionName);

            // 2. Force refetch and Wait
            await queryClient.refetchQueries({ queryKey: ['sessions'] });

            // 3. Select the new session immediately
            onSessionChange(newSessionId);
            setActiveJobId(newSessionId);

            // 4. Process Files
            for (const file of stagedFiles) {
                await uploadAndProcessDocument(newSessionId, file, selectedModel);
            }

        } catch (error) {
            logger.error("Batch process failed", error);
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
                        className={cn("h-2.5 w-2.5 rounded-full", isBackendOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse')}
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

                            {/* SESSION HISTORY */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Session</h3>
                                <Select
                                    value={currentSessionId || "new"}
                                    onValueChange={(val) => onSessionChange(val === "new" ? null : val)}
                                    disabled={!!activeJobId}
                                >
                                    <SelectTrigger className="w-full bg-background border-primary/20">
                                        <SelectValue placeholder="Select Session" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new" className="text-primary font-medium">✨ Start New Session</SelectItem>
                                        <Separator className="my-1" />
                                        {sessions.map((sess) => (
                                            <SelectItem key={sess.id} value={String(sess.id)}>
                                                {sess.name.length > 25 ? sess.name.substring(0, 25) + "..." : sess.name}
                                                <span className="ml-2 text-muted-foreground text-xs">({sess.docs})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            {/* UPLOAD & STAGING AREA */}
                            {!activeJobId && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            Vision Model
                                            <Badge variant="outline" className="text-[10px] h-4 px-1 py-0">For New Uploads</Badge>
                                        </label>
                                        <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as VisionModel)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {VISION_MODELS.map((m) => (
                                                    <SelectItem key={m.value} value={m.value}>
                                                        <div className="flex flex-col items-start py-1">
                                                            <span className="font-medium">{m.label}</span>
                                                            <span className="text-xs text-muted-foreground">{m.desc}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Upload Box */}
                                    <Card className="p-6 border-dashed border-2 flex flex-col items-center gap-2 text-center hover:bg-muted/50 transition-colors relative cursor-pointer group">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept=".pdf,.docx,.pptx"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={handleFileSelect}
                                            disabled={isUploading || !isBackendOnline}
                                        />
                                        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="text-base font-semibold">Click to Select Documents</div>
                                            <div className="text-sm text-muted-foreground">PDF, DOCX, PPTX</div>
                                        </div>
                                    </Card>

                                    {/* Staged Files List */}
                                    {stagedFiles.length > 0 && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Staged ({stagedFiles.length})</h4>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-6 text-xs text-red-500 hover:text-red-600"
                                                    onClick={() => setStagedFiles([])}
                                                >
                                                    Clear All
                                                </Button>
                                            </div>

                                            <div className="space-y-2">
                                                {stagedFiles.map((f, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-card border rounded-md text-sm shadow-sm">
                                                        <span className="truncate max-w-[180px]" title={f.name}>{f.name}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                                            onClick={() => removeStagedFile(f.name)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>

                                            <Button
                                                className="w-full gap-2 text-base py-5"
                                                onClick={handleStartProcessing}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                                                Start Processing
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* JOB STATUS CARD */}
                            {activeJobId && jobStatus && (
                                <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        {jobStatus.status === 'completed' ? (
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        ) : jobStatus.status === 'error' ? (
                                            <AlertCircle className="h-5 w-5 text-red-600" />
                                        ) : (
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                                        )}
                                        <span className="font-semibold text-base">
                                            {jobStatus.status === 'completed' ? 'Success' : jobStatus.status === 'error' ? 'Error' : 'Processing...'}
                                        </span>
                                    </div>
                                    <Progress value={jobStatus.progress} className="h-2 mb-2" />
                                    <p className="text-xs text-muted-foreground font-mono truncate" title={jobStatus.step}>
                                        {jobStatus.step}
                                    </p>
                                </Card>
                            )}

                        </div>
                    </ScrollArea>

                    {/* SYSTEM INFO FOOTER - Instant Loading */}
                    <div className="p-4 border-t bg-muted/20">
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-widest">System Info</h4>

                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    <Cpu className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-muted-foreground">QA Model</p>
                                    <p className="text-sm font-semibold truncate" title={config.qaModelName}>
                                        {config.qaModelName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                    <Eye className="h-4 w-4 text-purple-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-muted-foreground">Vision Model</p>
                                    <p className="text-sm font-semibold truncate" title={selectedModel}>
                                        {selectedModel}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

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