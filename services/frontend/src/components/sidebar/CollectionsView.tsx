import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FolderPlus,
  Search,
  X,
  Users,
  FolderLock,
  Pencil,
  Trash2,
  ChevronRight,
  Folder,
  User,
} from "lucide-react";
import {
  createCollection,
  renameCollection,
  deleteCollection,
} from "../../lib/api";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SelectGroup } from "@radix-ui/react-select";

interface CollectionsViewProps {
  collections: any[];
  userGroups: any[];
  currentUserId: string | undefined;
  currentSessionId: string | null;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections,
  userGroups,
  currentUserId,
  currentSessionId,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local State
  const [searchQuery, setSearchQuery] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(
    undefined,
  );

  // Rename State
  const [renameCid, setRenameCid] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");

  // --- Logic: Grouping & Filtering ---

  // 1. Filter Logic (Global Search)
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.group_name && c.group_name.toLowerCase().includes(query)),
    );
  }, [collections, searchQuery]);

  // 2. Grouping Logic (For Browse Mode)
  const { personalCollections, groupedCollections } = useMemo(() => {
    const personal: any[] = [];
    const groups: Record<
      string,
      { id: number; name: string; collections: any[] }
    > = {};

    collections.forEach((c) => {
      if (!c.group_id) {
        personal.push(c);
      } else {
        if (!groups[c.group_id]) {
          groups[c.group_id] = {
            id: c.group_id,
            name: c.group_name || "Unknown Group",
            collections: [],
          };
        }
        groups[c.group_id].collections.push(c);
      }
    });

    return {
      personalCollections: personal,
      groupedCollections: Object.values(groups),
    };
  }, [collections]);

  // --- Handlers ---

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    const id = await createCollection(
      newCollectionName,
      selectedGroupId === "personal" ? undefined : parseInt(selectedGroupId),
    );
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    navigate(`/collections/${id}`);
    setNewCollectionName("");
  };

  const handleRenameCollection = async () => {
    if (!renameCid || !renameName.trim()) return;
    await renameCollection(renameCid, renameName);
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    setRenameCid(null);
  };

  const handleDeleteCollection = async (cid: number) => {
    await deleteCollection(cid);
    if (String(cid) === currentSessionId) navigate("/collections");
    queryClient.invalidateQueries({ queryKey: ["collections"] });
  };

  // --- Render Helper: Collection Card ---
  const renderCollectionCard = (c: any) => {
    const isOwner = currentUserId === c.owner_id;
    return (
      <div
        key={c.id}
        className={cn(
          "flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-all group",
          String(c.id) === currentSessionId
            ? "bg-primary/10 text-primary font-medium"
            : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
        )}
        onClick={() => navigate(`/collections/${c.id}`)}
      >
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <div className="shrink-0">
            {c.group_id ? (
              <Folder className="h-4 w-4" />
            ) : (
              <FolderLock className="h-4 w-4" />
            )}
          </div>
          <span className="truncate text-sm">{c.name}</span>
          <span className="text-[10px] bg-muted px-1.5 rounded-full shrink-0">
            {c.docs}
          </span>
        </div>

        <div
          className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          {isOwner && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
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
                    className="h-6 w-6 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {c.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteCollection(c.id)}
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
      </div>
    );
  };

  return (
    <>
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
                  <SelectValue placeholder="Select personal or a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Collection Group</SelectLabel>

                    <SelectItem value="personal">Personal (Private)</SelectItem>
                    {userGroups.map((g: any) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        Group: {g.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
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

        {/* Search Bar */}
        <div className="relative mb-4">
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

        {/* CONTENT AREA */}
        {searchQuery ? (
          /* SEARCH MODE: Flat List */
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2">
              Search Results
            </h3>
            {filteredCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground italic p-2">
                No matching collections.
              </p>
            ) : (
              filteredCollections.map(renderCollectionCard)
            )}
          </div>
        ) : (
          /* BROWSE MODE: Grouped View */
          <div className="space-y-6">
            {/* 1. Personal Collections */}
            <div>
              <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-3 w-3" /> Personal
              </h3>
              {personalCollections.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2 italic">
                  No private collections.
                </p>
              ) : (
                personalCollections.map(renderCollectionCard)
              )}
            </div>

            {/* 2. Shared Groups Accordion */}
            {groupedCollections.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-3 w-3" /> Shared Groups
                </h3>

                <Accordion type="multiple" className="w-full space-y-1">
                  {groupedCollections.map((group) => (
                    <AccordionItem
                      key={group.id}
                      value={`group-${group.id}`}
                      className="border rounded-lg bg-card/50 px-2"
                    >
                      <AccordionTrigger className="hover:no-underline py-2 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[140px] text-left">
                            {group.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({group.collections.length})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pt-1">
                        <div className="pl-2 border-l-2 border-muted ml-1 space-y-1">
                          {group.collections.map(renderCollectionCard)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Rename Dialog */}
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
    </>
  );
};
