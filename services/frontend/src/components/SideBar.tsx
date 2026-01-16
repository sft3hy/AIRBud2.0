import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import {
  Loader2,
  Upload,
  FolderPlus,
  ArrowLeft,
  FolderOpen,
  Users,
  Trash2,
  Globe,
  Lock,
  Pencil,
  X,
  ChevronsLeft,
  ChevronsRight,
  Search,
  FolderLock,
} from "lucide-react";
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
  createGroup,
  renameCollection,
  renameGroup,
  deleteGroup,
} from "../lib/api";
import { VisionModel, SidebarMode } from "../types";
import { cn } from "@/lib/utils";
import { ChartBrowser } from "./ChartBrowser";
import { GraphExplorer } from "./GraphExplorer";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
// import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  mode: SidebarMode;
  currentSessionId: string | null;
  // Removing setMode/onSessionChange props as we use navigation now
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  className?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const VISION_MODELS: { value: VisionModel; label: string; desc: string }[] = [
  {
    value: "Ollama-Granite3.2-Vision",
    label: "Granite 3.2 (2B)",
    desc: "Enterprise Vision",
  },
  {
    value: "Moondream2",
    label: "Moondream2 (1.6B)",
    desc: "Fast - Recommended (Local)",
  },
  {
    value: "Qwen3-VL-2B",
    label: "Qwen3-VL (2B)",
    desc: "Balanced - High Accuracy",
  },
  {
    value: "InternVL3.5-1B",
    label: "InternVL 3.5 (1B)",
    desc: "Precise - Doc Optimized",
  },
  {
    value: "Ollama-Gemma3",
    label: "Gemma 3 (4B)",
    desc: "Strong Reasoning - Requires Ollama",
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  currentSessionId,
  activeJobId,
  setActiveJobId,
  className,
  isCollapsed,
  toggleSidebar,
}) => {
  const navigate = useNavigate(); // Hook for navigation
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Local State ---
  const [selectedModel, setSelectedModel] = useState<VisionModel>(
    "Ollama-Granite3.2-Vision"
  );
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Rename/Forms State
  const [renameCid, setRenameCid] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameGid, setRenameGid] = useState<number | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("personal");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupPublic, setNewGroupPublic] = useState(false);

  // --- Data Fetching ---
  const { data: systemStatus } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSystemStatus,
  });
  const currentUserId = systemStatus?.user?.id;
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    enabled: !!systemStatus?.online,
  });
  const { data: userGroups = [] } = useQuery({
    queryKey: ["my_groups"],
    queryFn: getMyGroups,
    enabled: !!systemStatus?.online,
  });
  const { data: currentDocs = [] } = useQuery({
    queryKey: ["documents", currentSessionId],
    queryFn: () => fetchCollectionDocuments(currentSessionId!),
    enabled: !!currentSessionId,
  });
  const { data: jobStatus } = useQuery({
    queryKey: ["status", activeJobId],
    queryFn: () => getCollectionStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: 1000,
  });

  // --- Logic ---
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.group_name && c.group_name.toLowerCase().includes(query))
    );
  }, [collections, searchQuery]);

  // --- Handlers (Updated for Navigation) ---

  const handleRenameCollection = async () => {
    if (!renameCid || !renameName.trim()) return;
    await renameCollection(renameCid, renameName);
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    setRenameCid(null);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    const id = await createCollection(
      newCollectionName,
      selectedGroupId === "personal" ? undefined : parseInt(selectedGroupId)
    );
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    navigate(`/collections/${id}`); // Navigate to new collection
    setNewCollectionName("");
  };

  const handleDeleteCollection = async (cid: number) => {
    await deleteCollection(cid);
    if (String(cid) === currentSessionId) navigate("/collections"); // Go back to list
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  const handleCreateGroup = async () => {
    await createGroup(newGroupName, newGroupDesc, newGroupPublic);
    queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    setNewGroupName("");
  };
  const handleRenameGroup = async () => {
    if (!renameGid) return;
    await renameGroup(renameGid, renameGroupName);
    queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    setRenameGid(null);
  };
  const handleDeleteGroup = async (gid: number) => {
    await deleteGroup(gid);
    queryClient.invalidateQueries({ queryKey: ["my_groups"] });
  };
  const handleFileSelect = (e: any) => {
    if (e.target.files) setStagedFiles(Array.from(e.target.files));
  };
  const handleAddFiles = async () => {
    setIsUploading(true);
    for (const f of stagedFiles)
      await uploadAndProcessDocument(currentSessionId!, f, selectedModel);
    setActiveJobId(currentSessionId);
    setIsUploading(false);
    setStagedFiles([]);
  };
  const handleDeleteDoc = async (id: number) => {
    await deleteDocument(id);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  useEffect(() => {
    if (jobStatus?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setActiveJobId(null);
    }
  }, [jobStatus]);

  const activeCollectionName = collections.find(
    (c) => String(c.id) === currentSessionId
  )?.name;

  // --- RENDER ---
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-muted/10 border-r transition-all duration-300",
        className
      )}
    >
      {/* 1. HEADER (Title + Toggle) */}
      <div
        className={cn(
          "border-b bg-background flex shrink-0 transition-all",
          isCollapsed
            ? "p-2 justify-center flex-col gap-2"
            : "p-4 flex-col gap-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "justify-between"
          )}
        >
          {!isCollapsed && (
            <h2 className="text-lg font-bold flex items-center gap-2 truncate">
              🧠 AIRBud 2.0
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  systemStatus?.online
                    ? "bg-green-500"
                    : "bg-red-500 animate-pulse"
                )}
              />
            </h2>
          )}

          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className={cn(
                    "h-8 w-8 text-muted-foreground",
                    isCollapsed && "h-10 w-10"
                  )}
                >
                  {isCollapsed ? (
                    <ChevronsRight className="h-5 w-5" />
                  ) : (
                    <ChevronsLeft className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-foreground text-background font-medium"
              >
                {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Main Mode Toggle (Navigate on Click) */}
        {!isCollapsed && (
          <div className="grid grid-cols-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => navigate("/collections")}
              className={cn(
                "text-sm font-medium py-1.5 rounded-md transition-all",
                mode === "collections"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Collections
            </button>
            <button
              onClick={() => navigate("/groups")}
              className={cn(
                "text-sm font-medium py-1.5 rounded-md transition-all",
                mode === "groups"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Groups
            </button>
          </div>
        )}

        {/* Collapsed Mode Icons */}
        {isCollapsed && (
          <div className="flex flex-col gap-2 items-center mt-2">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === "collections" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => navigate("/collections")}
                  >
                    <FolderOpen className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Collections</TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === "groups" ? "secondary" : "ghost"}
                    size="icon"
                    onClick={() => navigate("/groups")}
                  >
                    <Users className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Groups</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* 2. CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isCollapsed ? (
          <div className="flex flex-col items-center p-4 gap-4 opacity-50 h-full">
            <div className="w-px h-full bg-border" />
          </div>
        ) : (
          <>
            {/* === MODE: COLLECTIONS === */}
            {mode === "collections" && (
              <>
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
                          <Select
                            value={selectedGroupId}
                            onValueChange={setSelectedGroupId}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="personal">
                                Personal (Private)
                              </SelectItem>
                              {userGroups.map((g: any) => (
                                <SelectItem key={g.id} value={String(g.id)}>
                                  Group: {g.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          size="sm"
                          onClick={handleCreateCollection}
                          disabled={!newCollectionName.trim()}
                          className="w-full h-8"
                        >
                          Create
                        </Button>
                      </div>
                    </Card>

                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                        Available Collections
                      </h3>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          className="h-8 pl-9 pr-8 text-sm"
                          placeholder="Search collections..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                            onClick={() => setSearchQuery("")}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        {filteredCollections.length === 0 ? (
                          <p className="text-sm text-muted-foreground italic">
                            {searchQuery
                              ? "No collections match your search."
                              : "No collections found."}
                          </p>
                        ) : (
                          filteredCollections.map((c) => {
                            const isOwner = currentUserId === c.owner_id;
                            return (
                              <Card
                                key={c.id}
                                className="p-3 hover:bg-white dark:hover:bg-muted/20 cursor-pointer flex justify-between items-center transition-all group border-transparent hover:border-border shadow-none hover:shadow-sm bg-transparent"
                                onClick={() => navigate(`/collections/${c.id}`)}
                              >
                                <div className="flex items-center gap-3 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                                      c.group_id
                                        ? "bg-purple-100 text-purple-600"
                                        : "bg-blue-100 text-blue-600"
                                    )}
                                  >
                                    {c.group_id ? (
                                      <Users className="h-4 w-4" />
                                    ) : (
                                      <FolderLock />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">
                                      {c.name}
                                    </div>
                                    <div className="text-[0.8rem] text-muted-foreground truncate">
                                      {c.docs} {c.docs === 1 ? "doc" : "docs"}
                                      {c.group_name && (
                                        <span> • Group: {c.group_name}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {isOwner && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenameCid(c.id);
                                          setRenameName(c.name);
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>
                                              Delete {c.name}?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                              Action cannot be undone.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>
                                              Cancel
                                            </AlertDialogCancel>
                                            <AlertDialogAction
                                              onClick={() =>
                                                handleDeleteCollection(c.id)
                                              }
                                              className="bg-destructive"
                                            >
                                              Delete
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    </>
                                  )}
                                </div>
                              </Card>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  /* Active Collection View */
                  <div className="flex flex-col h-full bg-background">
                    <div className="p-3 border-b flex items-center gap-2 bg-muted/20">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate("/collections")}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="font-semibold text-sm truncate flex-1">
                        {activeCollectionName}
                      </div>
                    </div>

                    <Tabs
                      defaultValue="docs"
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <div className="px-4 py-2 bg-muted/20 border-b">
                        <TabsList className="grid w-full grid-cols-3 h-8">
                          <TabsTrigger value="docs" className="text-xs">
                            Docs
                          </TabsTrigger>
                          <TabsTrigger value="charts" className="text-xs">
                            Charts
                          </TabsTrigger>
                          <TabsTrigger value="graph" className="text-xs">
                            Graph
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent
                        value="docs"
                        className="flex-1 flex flex-col min-h-0 mt-0"
                      >
                        <ScrollArea className="flex-1 px-4 py-4">
                          <div className="space-y-2 mb-6">
                            {currentDocs.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 bg-card border rounded-md text-xs group"
                              >
                                <span className="truncate flex-1 pr-2">
                                  {doc.original_filename}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-5"
                                  >
                                    {doc.vision_model_used}
                                  </Badge>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete Document?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Remove <b>{doc.original_filename}</b>?
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() =>
                                            handleDeleteDoc(doc.id)
                                          }
                                          className="bg-destructive"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))}
                            {currentDocs.length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-4">
                                No documents.
                              </p>
                            )}
                          </div>

                          {(!activeJobId ||
                            activeJobId === currentSessionId) && (
                            <div className="space-y-3 pt-4 border-t">
                              <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase text-muted-foreground">
                                  Upload
                                </label>
                                <Select
                                  value={selectedModel}
                                  onValueChange={(v) =>
                                    setSelectedModel(v as VisionModel)
                                  }
                                >
                                  <SelectTrigger className="h-6 text-[0.8rem] w-[10rem]">
                                    <SelectValue placeholder="Select a Vision Model" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectLabel>Vision Model</SelectLabel>
                                      {VISION_MODELS.map((m) => (
                                        <SelectItem
                                          key={m.value}
                                          value={m.value}
                                        >
                                          {m.label}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Card className="p-3 border-dashed border-2 flex flex-col items-center gap-1 text-center hover:bg-muted/50 cursor-pointer relative">
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  multiple
                                  accept=".pdf,.docx,.pptx,.txt,.mp4" // <--- UPDATED
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={handleFileSelect}
                                  disabled={isUploading}
                                />
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  Select Files
                                </span>
                              </Card>
                              {stagedFiles.length > 0 && (
                                <div className="space-y-2">
                                  {stagedFiles.map((f, i) => (
                                    <div
                                      key={i}
                                      className="flex justify-between text-xs px-1"
                                    >
                                      <span className="truncate">{f.name}</span>
                                      <X
                                        className="h-3 w-3 cursor-pointer"
                                        onClick={() =>
                                          setStagedFiles((p) =>
                                            p.filter((x) => x !== f)
                                          )
                                        }
                                      />
                                    </div>
                                  ))}
                                  <Button
                                    size="sm"
                                    className="w-full h-7 text-xs"
                                    onClick={handleAddFiles}
                                    disabled={isUploading}
                                  >
                                    {isUploading ? (
                                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                    ) : (
                                      "Process"
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </ScrollArea>
                      </TabsContent>
                      <TabsContent
                        value="charts"
                        className="flex-1 mt-0 overflow-hidden"
                      >
                        <div className="h-full p-2">
                          <ChartBrowser collectionId={currentSessionId} />
                        </div>
                      </TabsContent>
                      <TabsContent
                        value="graph"
                        className="flex-1 mt-0 overflow-hidden bg-white"
                      >
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
            {mode === "groups" && (
              <ScrollArea className="flex-1 px-4 py-4">
                <Card className="p-4 bg-background border-dashed mb-6">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Create Group
                  </h3>
                  <div className="space-y-3">
                    <Input
                      className="h-8 text-sm"
                      placeholder="Group Name..."
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <Input
                      className="h-8 text-sm"
                      placeholder="Description (Optional)"
                      value={newGroupDesc}
                      onChange={(e) => setNewGroupDesc(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Public?
                      </span>
                      <Switch
                        checked={newGroupPublic}
                        onCheckedChange={setNewGroupPublic}
                        className="scale-75 origin-right"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleCreateGroup}
                      disabled={!newGroupName.trim()}
                      className="w-full h-8"
                    >
                      Create
                    </Button>
                  </div>
                </Card>

                <div className="space-y-2">
                  {/* <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-2">My Groups</h3>
                                {userGroups.map((g: any) => {
                                    const isOwner = currentUserId === g.owner_id;
                                    return (
                                        <div key={g.id} className="p-2 border rounded-md bg-card flex items-center gap-2 group hover:bg-muted/20 transition-colors">
                                            {g.is_public ? <Globe className="h-3 w-3 text-blue-500 shrink-0" /> : <Lock className="h-3 w-3 text-amber-500 shrink-0" />}
                                            <div className="text-sm font-medium truncate flex-1">{g.name}</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isOwner && (
                                                    <>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenameGid(g.id); setRenameGroupName(g.name); }}><Pencil className="h-3 w-3" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-600"><Trash2 className="h-3 w-3" /></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>Delete Group?</AlertDialogTitle><AlertDialogDescription>Delete <b>{g.name}</b>?</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteGroup(g.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })} */}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>

      {/* Rename Dialogs */}
      <Dialog
        open={!!renameCid}
        onOpenChange={(open) => !open && setRenameCid(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameCid(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameCollection}
              disabled={!renameName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!renameGid}
        onOpenChange={(open) => !open && setRenameGid(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameGroupName}
              onChange={(e) => setRenameGroupName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameGid(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRenameGroup}
              disabled={!renameGroupName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
