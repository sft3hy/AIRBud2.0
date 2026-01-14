import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { 
    Loader2, Upload, LayoutGrid, FileText, X, FolderPlus, ArrowLeft, 
    FolderOpen, UserCircle, Users, Network, Trash2, Globe, Lock 
} from 'lucide-react';
import {
    getCollections,
    fetchSystemStatus,
    uploadAndProcessDocument,
    createCollection,
    deleteCollection,
    getCollectionStatus,
    fetchCollectionDocuments,
    deleteDocument,
    getMyGroups,
    createGroup // Import this
} from '../lib/api';
import { VisionModel } from '../types';
import { cn } from '@/lib/utils';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { ChartBrowser } from './ChartBrowser';
import { GraphExplorer } from './GraphExplorer'; 
import { SidebarMode } from '../types'; // <--- UPDATED IMPORT

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
import { Switch } from '@/components/ui/switch';
import { useToast } from "@/components/ui/use-toast";
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

interface SidebarProps {
    mode: SidebarMode;
    setMode: (m: SidebarMode) => void;
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

export const Sidebar: React.FC<SidebarProps> = ({ 
    mode, setMode, currentSessionId, onSessionChange, className 
}) => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    // --- Local State ---
    const [selectedModel, setSelectedModel] = useState<VisionModel>("Moondream2");
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    
    // Creation Forms
    const [newCollectionName, setNewCollectionName] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState<string>("personal");
    
    // Group Creation State
    const [newGroupName, setNewGroupName] = useState("");
    const [newGroupDesc, setNewGroupDesc] = useState("");
    const [newGroupPublic, setNewGroupPublic] = useState(false);

    // --- Data Fetching ---
    const { data: systemStatus } = useQuery({
        queryKey: ['session'], // Was ['system_status']
        queryFn: fetchSystemStatus,
        // No refetchInterval needed here, App.tsx handles the global polling.
        // But we can keep it if we want independent updates.
        // It's safer to let App.tsx drive the session state.
    });

    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: getCollections,
        enabled: !!systemStatus?.online,
    });

    const { data: userGroups = [] } = useQuery({
        queryKey: ['my_groups'],
        queryFn: getMyGroups,
        enabled: !!systemStatus?.online
    });

    const { data: currentDocs = [] } = useQuery({
        queryKey: ['documents', currentSessionId],
        queryFn: () => fetchCollectionDocuments(currentSessionId!),
        enabled: !!currentSessionId,
    });

    const { data: jobStatus } = useQuery({
        queryKey: ['status', activeJobId],
        queryFn: () => getCollectionStatus(activeJobId!),
        enabled: !!activeJobId,
        refetchInterval: 1000,
    });

    // --- Effects ---
    useEffect(() => {
        if (!jobStatus) return;
        if (jobStatus.status === 'completed') {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            queryClient.invalidateQueries({ queryKey: ['documents', currentSessionId] });
            queryClient.invalidateQueries({ queryKey: ['charts', currentSessionId] });
            if (activeJobId) toast({ title: "Processing Complete", description: "Documents indexed." });
            setActiveJobId(null);
            setIsUploading(false);
            setStagedFiles([]);
        } else if (jobStatus.status === 'error') {
            setIsUploading(false);
            toast({ variant: "destructive", title: "Failed", description: jobStatus.step });
        }
    }, [jobStatus, queryClient, currentSessionId, activeJobId]);

    // --- Handlers ---

    const handleCreateCollection = async () => {
        if (!newCollectionName.trim()) return;
        const groupId = selectedGroupId === "personal" ? undefined : parseInt(selectedGroupId);
        try {
            const id = await createCollection(newCollectionName, groupId);
            await queryClient.refetchQueries({ queryKey: ['collections'] });
            onSessionChange(id);
            setNewCollectionName("");
            toast({ title: "Collection Created" });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to create." });
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        try {
            await createGroup(newGroupName, newGroupDesc, newGroupPublic);
            await queryClient.refetchQueries({ queryKey: ['my_groups'] });
            await queryClient.refetchQueries({ queryKey: ['public_groups'] });
            setNewGroupName("");
            setNewGroupDesc("");
            toast({ title: "Group Created" });
        } catch (e) {
            toast({ variant: "destructive", title: "Error", description: "Failed to create group." });
        }
    };

    const handleDeleteCollection = async (cid: number) => {
        try {
            await deleteCollection(cid);
            if (String(cid) === currentSessionId) onSessionChange(null);
            await queryClient.invalidateQueries({ queryKey: ['collections'] });
            toast({ title: "Collection Deleted" });
        } catch (err) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const newFiles = Array.from(event.target.files);
            setStagedFiles(prev => {
                const combined = [...prev, ...newFiles];
                return combined.filter((file, index, self) => index === self.findIndex((f) => f.name === file.name));
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
            setIsUploading(false);
            setActiveJobId(null);
            toast({ variant: "destructive", title: "Upload Failed" });
        }
    };

    const activeCollectionName = collections.find(c => String(c.id) === currentSessionId)?.name;

    return (
        <div className={cn("flex flex-col h-full w-full bg-muted/10 border-r", className)}>
            
            {/* 1. Header & Toggle */}
            <div className="p-4 border-b bg-background flex flex-col gap-4 shrink-0">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        🧠 Smart RAG
                        <div className={cn("h-2.5 w-2.5 rounded-full", systemStatus?.online ? 'bg-green-500' : 'bg-red-500 animate-pulse')} />
                    </h2>
                </div>
                
                {/* Main Mode Toggle */}
                <div className="grid grid-cols-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setMode('collections')}
                        className={cn("text-sm font-medium py-1.5 rounded-md transition-all", mode === 'collections' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Collections
                    </button>
                    <button
                        onClick={() => { setMode('groups'); onSessionChange(null); }}
                        className={cn("text-sm font-medium py-1.5 rounded-md transition-all", mode === 'groups' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                        Groups
                    </button>
                </div>
            </div>

            {/* 2. Content Area */}
            <div className="flex-1 min-h-0 flex flex-col">
                
                {/* === MODE: COLLECTIONS === */}
                {mode === 'collections' && (
                    <>
                        {/* A. COLLECTION LIST (When none selected) */}
                        {!currentSessionId ? (
                            <ScrollArea className="flex-1 px-4 py-4">
                                {/* Create New */}
                                <Card className="p-4 bg-background border-dashed mb-6">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                        <FolderPlus className="h-4 w-4" /> New Collection
                                    </h3>
                                    <div className="space-y-3">
                                        <Input
                                            className="h-8 text-sm"
                                            placeholder="Collection Name..."
                                            value={newCollectionName}
                                            onChange={(e) => setNewCollectionName(e.target.value)}
                                        />
                                        {userGroups.length > 0 && (
                                            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="personal">Personal (Private)</SelectItem>
                                                    {userGroups.map((g: any) => (
                                                        <SelectItem key={g.id} value={String(g.id)}>Group: {g.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <Button size="sm" onClick={handleCreateCollection} disabled={!newCollectionName.trim()} className="w-full h-8">
                                            Create
                                        </Button>
                                    </div>
                                </Card>

                                {/* List */}
                                <div className="space-y-2">
                                    <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">Available Collections</h3>
                                    {collections.length === 0 ? (
                                        <p className="text-sm text-muted-foreground italic">No collections found.</p>
                                    ) : (
                                        collections.map(c => (
                                            <Card
                                                key={c.id}
                                                className="p-3 hover:bg-white dark:hover:bg-muted/20 cursor-pointer flex justify-between items-center transition-all group border-transparent hover:border-border shadow-none hover:shadow-sm bg-transparent"
                                                onClick={() => onSessionChange(String(c.id))}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                                        c.group_id ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
                                                    )}>
                                                        {c.group_id ? <Users className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">{c.name}</div>
                                                        <div className="text-[10px] text-muted-foreground truncate">
                                                            {c.docs} docs {c.group_name && <span>• {c.group_name}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                                                                <AlertDialogDescription>Action cannot be undone.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteCollection(c.id)} className="bg-destructive">Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        ) : (
                            /* B. ACTIVE COLLECTION VIEW (Drill Down) */
                            <div className="flex flex-col h-full bg-background">
                                <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onSessionChange(null)}>
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="font-semibold text-sm truncate flex-1">{activeCollectionName}</div>
                                </div>

                                <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0">
                                    <div className="px-4 py-2 bg-muted/20 border-b">
                                        <TabsList className="grid w-full grid-cols-3 h-8">
                                            <TabsTrigger value="docs" className="text-xs">Docs</TabsTrigger>
                                            <TabsTrigger value="charts" className="text-xs">Charts</TabsTrigger>
                                            <TabsTrigger value="graph" className="text-xs">Graph</TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* 1. DOCS TAB */}
                                    <TabsContent value="docs" className="flex-1 flex flex-col min-h-0 mt-0">
                                        <ScrollArea className="flex-1 px-4 py-4">
                                            {/* File List */}
                                            <div className="space-y-2 mb-6">
                                                {currentDocs.map(doc => (
                                                    <div key={doc.id} className="flex items-center justify-between p-2 bg-card border rounded-md text-xs group">
                                                        <span className="truncate flex-1 pr-2">{doc.original_filename}</span>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => deleteDocument(doc.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                {currentDocs.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No documents.</p>}
                                            </div>

                                            {/* Uploader */}
                                            {(!activeJobId || activeJobId === currentSessionId) && (
                                                <div className="space-y-3 pt-4 border-t">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-xs font-bold uppercase text-muted-foreground">Upload</label>
                                                        <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as VisionModel)}>
                                                            <SelectTrigger className="h-6 text-[10px] w-[110px]"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {VISION_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <Card className="p-3 border-dashed border-2 flex flex-col items-center gap-1 text-center hover:bg-muted/50 cursor-pointer relative">
                                                        <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.pptx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} disabled={isUploading} />
                                                        <Upload className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Select Files</span>
                                                    </Card>

                                                    {stagedFiles.length > 0 && (
                                                        <div className="space-y-2">
                                                            {stagedFiles.map((f, i) => (
                                                                <div key={i} className="flex justify-between text-xs px-1"><span className="truncate">{f.name}</span><X className="h-3 w-3 cursor-pointer" onClick={() => setStagedFiles(p => p.filter(x => x !== f))} /></div>
                                                            ))}
                                                            <Button size="sm" className="w-full h-7 text-xs" onClick={handleAddFiles} disabled={isUploading}>
                                                                {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : "Process"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeJobId === currentSessionId && jobStatus && (
                                                <div className="mt-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-semibold"><Loader2 className="h-3 w-3 animate-spin" /> Processing...</div>
                                                    <Progress value={jobStatus.progress} className="h-1" />
                                                    <p className="text-[10px] text-muted-foreground truncate">{jobStatus.step}</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </TabsContent>

                                    {/* 2. CHARTS TAB */}
                                    <TabsContent value="charts" className="flex-1 mt-0 overflow-hidden">
                                        <div className="h-full p-2">
                                            <ChartBrowser collectionId={currentSessionId} />
                                        </div>
                                    </TabsContent>

                                    {/* 3. GRAPH TAB */}
                                    <TabsContent value="graph" className="flex-1 mt-0 overflow-hidden bg-white">
                                        <div className="h-full w-full">
                                            <GraphExplorer collectionId={currentSessionId} />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        )}
                    </>
                )}

                {/* === MODE: GROUPS === */}
                {mode === 'groups' && (
                    <ScrollArea className="flex-1 px-4 py-4">
                        {/* Group Creation */}
                        <Card className="p-4 bg-background border-dashed mb-6">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Create Group
                            </h3>
                            <div className="space-y-3">
                                <Input className="h-8 text-sm" placeholder="Group Name..." value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                                <Input className="h-8 text-sm" placeholder="Description (Optional)" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} />
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">Public?</span>
                                    <Switch checked={newGroupPublic} onCheckedChange={setNewGroupPublic} className="scale-75 origin-right" />
                                </div>
                                <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="w-full h-8">Create</Button>
                            </div>
                        </Card>

                        {/* Group List Sidebar View */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">My Groups</h3>
                            {userGroups.map((g: any) => (
                                <div key={g.id} className="p-2 border rounded-md bg-card flex items-center gap-2">
                                    {g.is_public ? <Globe className="h-3 w-3 text-blue-500" /> : <Lock className="h-3 w-3 text-amber-500" />}
                                    <div className="text-sm font-medium truncate flex-1">{g.name}</div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20 shrink-0">
                 {systemStatus?.user && (
                    <div className="flex items-center gap-3">
                        <UserCircle className="h-8 w-8 text-primary/80" />
                        <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{systemStatus.user.cn}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{systemStatus.user.org}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};