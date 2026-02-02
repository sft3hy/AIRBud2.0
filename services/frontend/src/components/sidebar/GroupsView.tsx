import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { createGroup, updateGroup } from "../../lib/api";

// UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface GroupsViewProps {
  // Though original code didn't use the list significantly, preserving prop for future/completeness
  userGroups: any[];
}

export const GroupsView: React.FC<GroupsViewProps> = ({ userGroups: _userGroups }) => {
  const queryClient = useQueryClient();

  // Create Group State
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupPublic, setNewGroupPublic] = useState(false);

  // Edit Group State
  const [editGid, setEditGid] = useState<number | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupDesc, setEditGroupDesc] = useState("");

  const handleCreateGroup = async () => {
    await createGroup(newGroupName, newGroupDesc, newGroupPublic);
    await queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    await queryClient.invalidateQueries({ queryKey: ["public_groups"] });
    setNewGroupName("");
    setNewGroupDesc("");
  };

  const handleUpdateGroup = async () => {
    if (!editGid) return;
    await updateGroup(editGid, editGroupName, editGroupDesc);
    await queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    await queryClient.invalidateQueries({ queryKey: ["public_groups"] });
    setEditGid(null);
  };

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <Card className="group relative overflow-hidden border-dashed border-2 mb-6 transition-all duration-300 hover:border-solid hover:border-primary/20 hover:shadow-lg bg-card/50">
          <div className="relative p-5">
            <div className="flex flex-col items-center justify-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold tracking-wide text-foreground">
                  Create Group
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Collaborate with your team
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                className="h-9 text-sm bg-background/50 focus:bg-background transition-colors"
                placeholder="Group Name..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Input
                className="h-9 text-sm bg-background/50 focus:bg-background transition-colors"
                placeholder="Description (Optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-muted-foreground font-medium">
                  Make it Public?
                </span>
                <Switch
                  checked={newGroupPublic}
                  onCheckedChange={setNewGroupPublic}
                  className="scale-90"
                />
              </div>
              <Button
                size="sm"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="w-full h-9 font-medium shadow-sm transition-all duration-200"
              >
                Create
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {/* Group listing implementation was empty in original file */}
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog
        open={!!editGid}
        onOpenChange={(open) => !open && setEditGid(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={editGroupName}
              onChange={(e) => setEditGroupName(e.target.value)}
              placeholder="Group Name"
            />
            <Input
              value={editGroupDesc}
              onChange={(e) => setEditGroupDesc(e.target.value)}
              placeholder="Description"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGid(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateGroup}
              disabled={!editGroupName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
