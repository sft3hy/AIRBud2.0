import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2, Upload, Loader2, X } from "lucide-react";
import { uploadAndProcessDocument, deleteDocument } from "../../lib/api";
import { VisionModel } from "../../types";
import { ChartBrowser } from "../ChartBrowser";
import { GraphExplorer } from "../GraphExplorer";

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
    value: "Ollama-Gemma3",
    label: "Gemma 3 (4B)",
    desc: "Strong Reasoning - Requires Ollama",
  },
];

interface ActiveCollectionViewProps {
  currentSessionId: string;
  activeCollectionName: string | undefined;
  currentDocs: any[];
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
}

export const ActiveCollectionView: React.FC<ActiveCollectionViewProps> = ({
  currentSessionId,
  activeCollectionName,
  currentDocs,
  activeJobId,
  setActiveJobId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local State
  const [selectedModel, setSelectedModel] = useState<VisionModel>(
    "Ollama-Granite3.2-Vision"
  );
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Handlers
  const handleFileSelect = (e: any) => {
    if (e.target.files) setStagedFiles(Array.from(e.target.files));
  };

  const handleAddFiles = async () => {
    setIsUploading(true);
    for (const f of stagedFiles)
      await uploadAndProcessDocument(currentSessionId, f, selectedModel);
    setActiveJobId(currentSessionId);
    setIsUploading(false);
    setStagedFiles([]);
  };

  const handleDeleteDoc = async (id: number) => {
    await deleteDocument(id);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
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

      <Tabs defaultValue="docs" className="flex-1 flex flex-col min-h-0">
        <div className="px-4 py-2 bg-muted/20 border-b">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="docs" className="text-xs">
              Files
            </TabsTrigger>
            <TabsTrigger value="charts" className="text-xs">
              Charts
            </TabsTrigger>
            <TabsTrigger value="graph" className="text-xs">
              Graph
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="docs" className="flex-1 flex flex-col min-h-0 mt-0">
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
                    <Badge variant="outline" className="text-[10px] h-5">
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
                          <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove <b>{doc.original_filename}</b>?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDoc(doc.id)}
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
                  No files.
                </p>
              )}
            </div>

            {(!activeJobId || activeJobId === currentSessionId) && (
              <div className="space-y-3 pt-4 border-t">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-muted-foreground">
                    Upload
                  </label>
                  <Select
                    value={selectedModel}
                    onValueChange={(v) => setSelectedModel(v as VisionModel)}
                  >
                    <SelectTrigger className="h-6 text-[0.8rem] w-[10rem]">
                      <SelectValue placeholder="Select a Vision Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Vision Model</SelectLabel>
                        {VISION_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
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
                    accept=".pdf,.docx,.pptx,.txt,.mp4"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                    disabled={isUploading}
                  />
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Select Files (.pdf, .docx, .mp4, .pptx, .txt)
                  </span>
                </Card>
                {stagedFiles.length > 0 && (
                  <div className="space-y-2">
                    {stagedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs px-1 min-w-0"
                      >
                        <span
                          className="truncate flex-1 min-w-0"
                          title={f.name}
                        >
                          {f.name}
                        </span>
                        <X
                          className="h-3 w-3 cursor-pointer flex-shrink-0 ml-2"
                          onClick={() =>
                            setStagedFiles((p) => p.filter((x) => x !== f))
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
        <TabsContent value="charts" className="flex-1 mt-0 overflow-hidden">
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
  );
};
