import React from "react";
import { Folder, FolderLock, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

interface CollectionCardProps {
  collection: any;
  currentSessionId: string | null;
  currentUserId: string | undefined;
  onSelect: (id: number) => void;
  onRenameInit: (id: number, name: string) => void;
  onDelete: (id: number) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  currentSessionId,
  currentUserId,
  onSelect,
  onRenameInit,
  onDelete,
}) => {
  // Ensure type-safe comparison
  const isOwner = String(collection.owner_id) === currentUserId;
  const isSelected = String(collection.id) === currentSessionId;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-2 rounded-md mb-1 cursor-pointer transition-all group",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
      )}
      onClick={() => onSelect(collection.id)}
    >
      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
        <div className="shrink-0">
          {collection.group_id ? (
            <Folder className="h-4 w-4" />
          ) : (
            <FolderLock className="h-4 w-4" />
          )}
        </div>
        <span className="truncate text-sm">{collection.name}</span>
        <span className="text-[10px] bg-muted px-1.5 rounded-full shrink-0">
          {collection.docs}
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
                onRenameInit(collection.id, collection.name);
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
                  <AlertDialogTitle>Delete {collection.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(collection.id)}
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
