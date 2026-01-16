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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("personal");

  // Rename State
  const [renameCid, setRenameCid] = useState<number | null>(null);
  const [renameName, setRenameName] = useState("");

  // Logic
  const filteredCollections = useMemo(() => {
    if (!searchQuery.trim()) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.group_name && c.group_name.toLowerCase().includes(query))
    );
  }, [collections, searchQuery]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    const id = await createCollection(
      newCollectionName,
      selectedGroupId === "personal" ? undefined : parseInt(selectedGroupId)
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal (Private)</SelectItem>
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
                  </Card>
                );
              })
            )}
          </div>
        </div>
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
