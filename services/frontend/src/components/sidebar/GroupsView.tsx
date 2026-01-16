import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { createGroup, renameGroup } from "../../lib/api";

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

  // Rename Group State
  const [renameGid, setRenameGid] = useState<number | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");

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

  return (
    <>
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

      {/* Rename Dialog */}
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
    </>
  );
};
