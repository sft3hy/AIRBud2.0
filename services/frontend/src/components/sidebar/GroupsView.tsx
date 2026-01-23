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

export const GroupsView: React.FC<GroupsViewProps> = ({ userGroups }) => {
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
    queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    setNewGroupName("");
    setNewGroupDesc("");
  };

  const handleUpdateGroup = async () => {
    if (!editGid) return;
    await updateGroup(editGid, editGroupName, editGroupDesc);
    queryClient.invalidateQueries({ queryKey: ["my_groups"] });
    setEditGid(null);
  };

  return (
    <>
      <ScrollArea className="flex-1 px-4 py-4">
        <Card className="p-4 bg-background/80 border-dashed mb-6">
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
              <span className="text-xs text-muted-foreground">Public?</span>
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
