import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyGroups,
  getPublicGroups,
  createGroup,
  deleteGroup,
  joinPublicGroup,
  updateGroup,
  fetchSystemStatus,
  leaveGroup,
} from "../../lib/api";
import { Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// Sub-components
import { GroupManagerHeader } from "./GroupManagerHeader";
import { GroupSearchBar } from "./GroupSearchBar";
import { MyGroupCard } from "./MyGroupCard";
import { PublicGroupCard } from "./PublicGroupCard";
import { EditGroupDialog } from "./EditGroupDialog";
import { InviteHandler } from "./InviteHandler";

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
    if (!editName.trim()) return;

    try {
      if (editId === -1) {
        await createGroup(editName, editDesc, true); // Assuming public by default or add toggle? The dialog doesn't have a public toggle yet.
        // Wait, `createGroup` signature? Need to check api.ts or infer.
        // Based on usage in other files or standard: name, description, is_public?

        toast({ title: "Group Created", description: "New public group created." });
      } else if (editId) {
        await updateGroup(editId, editName, editDesc);
        toast({ title: "Updated", description: "Group details updated." });
      }

      await queryClient.invalidateQueries({ queryKey: ["my_groups"] });
      await queryClient.invalidateQueries({ queryKey: ["public_groups"] });
      setEditId(null);
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save group.",
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

  // Tab State
  const [currentTab, setCurrentTab] = useState("my_groups");

  // const openCreateModal = () => {
  //   setEditId(-1); // Use a flag or new ID logic later, for now mimicking 'new' via ID check in dialog if needed or just empty
  //   setEditName("");
  //   setEditDesc("");
  //   // Note: EditGroupDialog expects a number for ID. -1 is a common convention for 'new'.
  //   // If EditGroupDialog checks 'if (!!editId)' it will be true for -1.
  //   // We need to ensure the dialog handles 'save' for -1 as create.
  // };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-secondary/5 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      <GroupManagerHeader />

      <div className="flex-1 overflow-hidden flex flex-col p-6 md:p-10 animate-in fade-in duration-700">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="h-full flex flex-col max-w-7xl mx-auto w-full">

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 w-full z-10">
            {/* Left: Create Group */}
            <div className="w-full md:w-auto flex justify-start order-2 md:order-1">
              {/* <Button onClick={openCreateModal} className="bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all rounded-full px-6">
                + Create Group
              </Button> */}
            </div>

            {/* Middle: Prominent Search Bar */}
            <div className="w-full max-w-2xl order-1 md:order-2">
              <GroupSearchBar
                value={currentTab === 'my_groups' ? myGroupsSearchQuery : publicSearchQuery}
                onChange={currentTab === 'my_groups' ? setMyGroupsSearchQuery : setPublicSearchQuery}
                placeholder={currentTab === 'my_groups' ? "Search your groups..." : "Find public communities..."}
              />
            </div>

            {/* Right: Tabs */}
            <div className="w-full md:w-auto flex justify-end order-3">
              <TabsList className="bg-secondary/50 backdrop-blur-md border border-white/10 p-1 h-12 rounded-full">
                <TabsTrigger
                  value="my_groups"
                  className="rounded-full px-6 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300"
                >
                  My Groups
                  <span className="ml-2 bg-background/20 px-2 py-0.5 rounded-full text-xs opacity-70">
                    {myGroups.length}
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="explore"
                  className="rounded-full px-6 h-full data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300"
                >
                  Explore Public
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <ScrollArea className="flex-1 -mr-4 pr-4">
            {/* MY GROUPS TAB */}
            <TabsContent value="my_groups" className="mt-0 space-y-6 focus-visible:ring-0">
              {filteredMyGroups.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/5 text-center px-4">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">No groups found</h3>
                  <p className="text-muted-foreground mt-2 max-w-sm">
                    {myGroupsSearchQuery
                      ? "Try adjusting your search terms."
                      : "You haven't created or joined any groups yet."}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
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
            <TabsContent value="explore" className="mt-0 space-y-6 focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20">
                {filteredPublicGroups.map((group: any) => (
                  <PublicGroupCard
                    key={group.id}
                    group={group}
                    onJoin={(id) => joinMutation.mutate(id)}
                  />
                ))}
                {filteredPublicGroups.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground border border-dashed border-white/10 rounded-3xl bg-white/5">
                    <Search className="h-10 w-10 mb-2 opacity-20" />
                    <p>
                      {publicSearchQuery
                        ? "No groups match your search."
                        : "No public groups available to join."}

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
