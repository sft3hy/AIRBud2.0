import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RenameCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  renameName: string;
  setRenameName: (name: string) => void;
  onSave: () => void;
}

export const RenameCollectionDialog: React.FC<RenameCollectionDialogProps> = ({
  isOpen,
  onClose,
  renameName,
  setRenameName,
  onSave,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!renameName.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
