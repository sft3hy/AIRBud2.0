import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Upload, LayoutGrid, FileText, CheckCircle2, AlertCircle, X, Play, Cpu, Eye, Trash2, FolderPlus, ArrowLeft, FolderOpen } from 'lucide-react';
import {
    getCollections,
    fetchSystemStatus,
    uploadAndProcessDocument,
    createCollection,
    deleteCollection, // New Import
    getCollectionStatus,
    fetchCollectionDocuments,
    deleteDocument
} from '../lib/api';
import { VisionModel } from '../types';
import { cn } from '@/lib/utils';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { ChartBrowser } from './ChartBrowser';

import { GraphExplorer } from './GraphExplorer'; // Import 
import { Network } from 'lucide-react'; // Import Icon

// UI Components
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
    const [newCollectionName, setNewCollectionName] = useState("");
    const [viewMode, setViewMode] = useState<'list' | 'active'>('list');

    // System Status
    const { data: systemStatus } = useQuery({
        queryKey: ['system_status'],
        queryFn: fetchSystemStatus,
        refetchInterval: 30000,
    });

    // Load Collections
    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: getCollections,
        enabled: !!systemStatus?.online,
    });

    // Load Current Docs
    const { data: currentDocs = [] } = useQuery({
        queryKey: ['documents', currentSessionId],
        queryFn: () => fetchCollectionDocuments(currentSessionId!),
        enabled: !!currentSessionId,
    });

    // Poll Job Status
    const { data: jobStatus } = useQuery({
        queryKey: ['status', activeJobId],
        queryFn: () => getCollectionStatus(activeJobId!),
        enabled: !!activeJobId,
        refetchInterval: 1000,
    });

    useEffect(() => {
        if (currentSessionId) setViewMode('active');
        else setViewMode('list');
    }, [currentSessionId]);

    // Handle Job Completion
    useEffect(() => {
        if (!jobStatus) return;

        if (jobStatus.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['documents', currentSessionId] });
            queryClient.invalidateQueries({ queryKey: ['charts', currentSessionId] });

            setActiveJobId(null);
            setIsUploading(false);
            setStagedFiles([]);

        } else if (jobStatus.status === 'error') {
            setIsUploading(false);
        }
    }, [jobStatus, queryClient, currentSessionId, activeJobId]);

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        const id = await createCollection(newCollectionName);
        await queryClient.refetchQueries({ queryKey: ['collections'] });
        onSessionChange(id);
        setNewCollectionName("");
    };

    // --- NEW: Delete Collection Handler ---
    const handleDeleteCollection = async (e: React.MouseEvent, cid: number) => {
        e.stopPropagation(); // Stop click from selecting the card

        if (window.confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
            try {
                await deleteCollection(cid);

                // If we deleted the active one, clear selection
                if (String(cid) === currentSessionId) {
                    onSessionChange(null);
                }
                // Refresh list
                await queryClient.invalidateQueries({ queryKey: ['collections'] });
            } catch (err) {
                console.error("Failed to delete collection:", err);
                alert("Failed to delete collection. Check console for details.");
            }
        }
    };
    // -------------------------------------

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

    const handleAddFiles = async () => {
        if (!currentSessionId || stagedFiles.length === 0) return;
        setIsUploading(true);
        setActiveJobId(currentSessionId);

        try {
            for (const file of stagedFiles) {
                await uploadAndProcessDocument(currentSessionId, file, selectedModel);
            }
        } catch (error) {
            logger.error("Upload failed", error);
            setIsUploading(false);
            setActiveJobId(null);
        }
    };

    const handleDeleteDoc = async (docId: number) => {
        if (window.confirm("Remove this document from the collection?")) {
            try {
                await deleteDocument(docId);
                await queryClient.invalidateQueries({ queryKey: ['documents', currentSessionId] });
            } catch (err) {
                console.error("Failed to delete document:", err);
            }
        }
    };

    const activeCollectionName = collections.find(c => String(c.id) === currentSessionId)?.name;

    return (
        <div className={cn("flex flex-col h-full w-full bg-muted/10 border-r", className)}>
            <div className="p-4 border-b bg-background flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    🧠 Smart RAG
                    <div
                        className={cn("h-2.5 w-2.5 rounded-full", systemStatus?.online ? 'bg-green-500' : 'bg-red-500 animate-pulse')}
                        title={systemStatus?.online ? "Backend Online" : "Backend Offline"}
                    />
                </h2>
            </div>

            <Tabs defaultValue="files" className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-2 shrink-0">
                    <TabsList className="grid w-full grid-cols-3"> {/* Changed to 3 columns */}
                        <TabsTrigger value="files" className="flex gap-2"><FileText className="w-4 h-4" /> Collections</TabsTrigger>
                        <TabsTrigger value="charts" className="flex gap-2"><LayoutGrid className="w-4 h-4" /> Charts</TabsTrigger>
                        <TabsTrigger value="graph" className="flex gap-2"><Network className="w-4 h-4" /> Graph</TabsTrigger>
                    </TabsList>
                </div>

                {/* --- FILES TAB --- */}
                <TabsContent value="files" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex">
                    <ScrollArea className="flex-1 px-4 py-2">

                        {/* VIEW 1: SELECT / CREATE COLLECTION */}
                        {viewMode === 'list' && (
                            <div className="space-y-6">
                                <Card className="p-4 bg-background border-dashed">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                        <FolderPlus className="h-4 w-4" /> New Collection
                                    </h3>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Project Name..."
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                        />
                                        <Button onClick={handleCreateCollection} disabled={!newCollectionName.trim()}>
                                            Create
                                        </Button>
                                    </div>
                                </Card>

                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Collections</h3>
                                    {collections.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No collections as of right now.</p>
                                    ) : (
                                        collections.map(c => (
                                            <Card
                                                key={c.id}
                                                className="p-3 hover:bg-muted/50 cursor-pointer flex justify-between items-center transition-colors group"
                                                onClick={() => onSessionChange(String(c.id))}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                        <FolderOpen className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">{c.name}</div>
                                                        <div className="text-xs text-muted-foreground">{c.docs} documents</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                                                        <Play className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        onClick={(e) => handleDeleteCollection(e, c.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* VIEW 2: INSIDE COLLECTION */}
                        {viewMode === 'active' && currentSessionId && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => onSessionChange(null)}>
                                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                                    </Button>
                                    <h3 className="font-bold truncate text-sm flex-1">Collection: {activeCollectionName}</h3>
                                </div>

                                {/* Doc List */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">Documents ({currentDocs.length})</h4>
                                    {currentDocs.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-2 bg-card border rounded-md text-sm">
                                            <span className="truncate flex-1 pr-2" title={doc.original_filename}>{doc.original_filename}</span>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] h-5">{doc.vision_model_used}</Badge>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteDoc(doc.id)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Separator />

                                {/* Add New Files */}
                                {(!activeJobId || activeJobId === currentSessionId) && (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium flex items-center gap-2">
                                                Add Documents
                                                <Badge variant="outline" className="text-[10px]">Vision Model: {selectedModel}</Badge>
                                            </label>

                                            {/* Minimal Model Selector */}
                                            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as VisionModel)}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {VISION_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <Card className="p-4 border-dashed border-2 flex flex-col items-center gap-2 text-center hover:bg-muted/50 transition-colors relative cursor-pointer">
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept=".pdf,.docx,.pptx"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={handleFileSelect}
                                                disabled={isUploading}
                                            />
                                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                                <Upload className="h-4 w-4" /> Click to Upload
                                            </div>
                                        </Card>

                                        {stagedFiles.length > 0 && (
                                            <div className="space-y-2">
                                                {stagedFiles.map((f, idx) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs pl-2">
                                                        <span className="truncate">{f.name}</span>
                                                        <X className="h-3 w-3 cursor-pointer" onClick={() => setStagedFiles(p => p.filter(x => x !== f))} />
                                                    </div>
                                                ))}
                                                <Button className="w-full h-8 text-xs" onClick={handleAddFiles} disabled={isUploading}>
                                                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Start Processing"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Job Status */}
                                {activeJobId === currentSessionId && jobStatus && (
                                    <Card className="p-3 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200">
                                        <div className="flex items-center gap-2 text-xs font-semibold mb-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Processing...
                                        </div>
                                        <Progress value={jobStatus.progress} className="h-1" />
                                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{jobStatus.step}</p>
                                    </Card>
                                )}
                            </div>
                        )}

                    </ScrollArea>

                    {/* SYSTEM INFO FOOTER */}
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
                        </div>
                    </div>

                </TabsContent>

                <TabsContent value="charts" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex overflow-hidden">
                    <div className="flex-1 px-4 py-2 min-h-0">
                        <ChartBrowser collectionId={currentSessionId} />
                    </div>
                </TabsContent>

                <TabsContent value="graph" className="flex-1 flex flex-col min-h-0 data-[state=active]:flex overflow-hidden">
                    <div className="flex-1 min-h-0 bg-white">
                        <GraphExplorer collectionId={currentSessionId} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};