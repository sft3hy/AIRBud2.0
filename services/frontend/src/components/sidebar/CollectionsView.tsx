import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Users, User } from "lucide-react";
import {
  createCollection,
  renameCollection,
  deleteCollection,
} from "../../lib/api";

// UI Components
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Sub Components
import { CollectionCard } from "./collections/CollectionCard";
import { CreateCollectionForm } from "./collections/CreateCollectionForm";
import { CollectionSearch } from "./collections/CollectionSearch";
import { RenameCollectionDialog } from "./collections/RenameCollectionDialog";

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
      selectedGroupId === "personal" ? undefined : parseInt(selectedGroupId!),
    );
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    navigate(`/collections/${id}`);
    setNewCollectionName("");
  };

  const handleRenameInit = (id: number, currentName: string) => {
    setRenameCid(id);
    setRenameName(currentName);
  };

  const handleRenameSave = async () => {
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

  const handleSelectCollection = (id: number) => {
    navigate(`/collections/${id}`);
  };

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <CreateCollectionForm
          name={newCollectionName}
          setName={setNewCollectionName}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          userGroups={userGroups}
          onCreate={handleCreateCollection}
        />

        <CollectionSearch value={searchQuery} onChange={setSearchQuery} />

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
              filteredCollections.map((c) => (
                <CollectionCard
                  key={c.id}
                  collection={c}
                  currentSessionId={currentSessionId}
                  currentUserId={currentUserId}
                  onSelect={handleSelectCollection}
                  onRenameInit={handleRenameInit}
                  onDelete={handleDeleteCollection}
                />
              ))
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
                personalCollections.map((c) => (
                  <CollectionCard
                    key={c.id}
                    collection={c}
                    currentSessionId={currentSessionId}
                    currentUserId={currentUserId}
                    onSelect={handleSelectCollection}
                    onRenameInit={handleRenameInit}
                    onDelete={handleDeleteCollection}
                  />
                ))
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
                          <span className="truncate text-left">
                            {group.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({group.collections.length})
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-2 pt-1">
                        <div className="pl-2 border-l-2 border-muted ml-1 space-y-1">
                          {group.collections.map((c) => (
                            <CollectionCard
                              key={c.id}
                              collection={c}
                              currentSessionId={currentSessionId}
                              currentUserId={currentUserId}
                              onSelect={handleSelectCollection}
                              onRenameInit={handleRenameInit}
                              onDelete={handleDeleteCollection}
                            />
                          ))}
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

      <RenameCollectionDialog
        isOpen={!!renameCid}
        onClose={() => setRenameCid(null)}
        renameName={renameName}
        setRenameName={setRenameName}
        onSave={handleRenameSave}
      />
    </>
  );
};
