import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGroups,
  getPublicGroups,
  deleteGroup,
  joinPublicGroup,
  updateGroup,
  fetchSystemStatus,
  leaveGroup,
} from "../lib/api";
import { Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "./ui/scroll-area";

// Sub-components
import { GroupManagerHeader } from "./group-manager/GroupManagerHeader";
import { GroupSearchBar } from "./group-manager/GroupSearchBar";
import { MyGroupCard } from "./group-manager/MyGroupCard";
import { PublicGroupCard } from "./group-manager/PublicGroupCard";
import { EditGroupDialog } from "./group-manager/EditGroupDialog";
import { InviteHandler } from "./group-manager/InviteHandler";

export { InviteHandler }; // Re-export for router use

export const GroupManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Search State
  const [myGroupsSearchQuery, setMyGroupsSearchQuery] = useState("");
  const [publicSearchQuery, setPublicSearchQuery] = useState("");

  // Edit State
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Queries
  const { data: systemStatus } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSystemStatus,
  });
  const { data: myGroups = [] } = useQuery({
    queryKey: ["my_groups"],
    queryFn: getMyGroups,
  });
  const { data: publicGroups = [] } = useQuery({
    queryKey: ["public_groups"],
    queryFn: getPublicGroups,
  });

  const currentUserId = systemStatus?.user?.id;

  // Filters
  const filteredMyGroups = myGroups.filter((group: any) => {
    const query = myGroupsSearchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.owner_name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  });

  const filteredPublicGroups = publicGroups.filter((group: any) => {
    const query = publicSearchQuery.toLowerCase();
    return (
      group.name.toLowerCase().includes(query) ||
      group.owner_name.toLowerCase().includes(query) ||
      group.description?.toLowerCase().includes(query)
    );
  });

  // Mutations
  const handleUpdate = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await updateGroup(editId, editName, editDesc);
      await queryClient.invalidateQueries({ queryKey: ["my_groups"] });
      await queryClient.invalidateQueries({ queryKey: ["public_groups"] });
      setEditId(null);
      toast({ title: "Updated", description: "Group details updated." });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update group.",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
      queryClient.invalidateQueries({ queryKey: ["public_groups"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({
        title: "Group Deleted",
        description: "The group has been removed.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only the owner can delete this group.",
      });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: leaveGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
      queryClient.invalidateQueries({ queryKey: ["public_groups"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({ title: "Left Group", description: "You have left the group." });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not leave group.",
      });
    },
  });

  const joinMutation = useMutation({
    mutationFn: joinPublicGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_groups"] });
      queryClient.invalidateQueries({ queryKey: ["public_groups"] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({ title: "Joined Group", description: "You are now a member." });
    },
  });

  const copyInvite = (token: string) => {
    const link = `${window.location.origin}/groups/join/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link Copied", description: "Invite link ready to share." });
  };

  const openEditModal = (group: any) => {
    setEditId(group.id);
    setEditName(group.name);
    setEditDesc(group.description || "");
  };

  return (
    <div className="h-full flex flex-col bg-transparent">
      <GroupManagerHeader />

      <div className="flex-1 overflow-hidden p-8 bg-transparent animate-in fade-in duration-500">
        <Tabs defaultValue="my_groups" className="h-full flex flex-col">
          <TabsList className="w-[400px] shrink-0 mx-auto mb-6 bg-background/50 backdrop-blur-sm border">
            <TabsTrigger value="my_groups">
              My Groups ({myGroups.length})
            </TabsTrigger>
            <TabsTrigger value="explore">Explore Public</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 pr-4">
            {/* MY GROUPS TAB */}
            <TabsContent value="my_groups" className="mt-0 space-y-4">
              <GroupSearchBar
                value={myGroupsSearchQuery}
                onChange={setMyGroupsSearchQuery}
                placeholder="Search your groups..."
              />

              {filteredMyGroups.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground bg-muted/5">
                  {myGroupsSearchQuery
                    ? "No groups match your search."
                    : "No groups yet. Create one in the sidebar!"}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredMyGroups.map((group: any) => (
                  <MyGroupCard
                    key={group.id}
                    group={group}
                    currentUserId={
                      currentUserId ? String(currentUserId) : undefined
                    }
                    onCopyInvite={copyInvite}
                    onEdit={openEditModal}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onLeave={(id) => leaveMutation.mutate(id)}
                  />
                ))}
              </div>
            </TabsContent>

            {/* PUBLIC GROUPS TAB */}
            <TabsContent value="explore" className="mt-0">
              <GroupSearchBar
                value={publicSearchQuery}
                onChange={setPublicSearchQuery}
                placeholder="Search by group name or owner..."
              />

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredPublicGroups.map((group: any) => (
                  <PublicGroupCard
                    key={group.id}
                    group={group}
                    onJoin={(id) => joinMutation.mutate(id)}
                  />
                ))}
                {filteredPublicGroups.length === 0 && (
                  <div className="col-span-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="h-10 w-10 mb-2 opacity-20" />
                    <p>
                      {publicSearchQuery
                        ? "No groups match your search."
                        : "No public groups found."}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <EditGroupDialog
        isOpen={!!editId}
        onClose={() => setEditId(null)}
        name={editName}
        setName={setEditName}
        description={editDesc}
        setDescription={setEditDesc}
        onSave={handleUpdate}
      />
    </div>
  );
};
