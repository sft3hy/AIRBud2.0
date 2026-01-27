import React from "react";
import { Globe, Lock, Copy, Pencil, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface MyGroupCardProps {
  group: any;
  currentUserId: string | undefined;
  onCopyInvite: (token: string) => void;
  onEdit: (group: any) => void;
  onDelete: (id: number) => void;
  onLeave: (id: number) => void;
}

export const MyGroupCard: React.FC<MyGroupCardProps> = ({
  group,
  currentUserId,
  onCopyInvite,
  onEdit,
  onDelete,
  onLeave,
}) => {
  // Ensure type-safe comparison (API returns number, prop is string)
  const isOwner = String(group.owner_id) === currentUserId;

  return (
    <Card className="bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          {group.name}
          {group.is_public ? (
            <Globe className="h-3 w-3 text-blue-500" />
          ) : (
            <Lock className="h-3 w-3 text-amber-500" />
          )}
        </CardTitle>
        <Badge variant="outline" className="text-xs bg-background/50">
          {group.member_count} {group.member_count === 1 ? "member" : "members"}
        </Badge>
      </CardHeader>
      <CardContent>
        <CardDescription className="mb-4 line-clamp-2 min-h-[40px] text-muted-foreground/90">
          {group.description || "No description provided."}
        </CardDescription>
        <div className="text-xs text-muted-foreground mb-4">
          Owner:{" "}
          <span className="font-medium text-foreground">
            {group.owner_name}
          </span>
        </div>
        <div className="flex justify-between items-center border-t border-border/50 pt-4">
          <Button
            variant="outline"
            size="sm"
            className="bg-background/50"
            onClick={() => onCopyInvite(group.invite_token)}
          >
            <Copy className="h-3 w-3 mr-2" /> Invite Link
          </Button>

          <div className="flex gap-2">
            {isOwner ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-primary"
                  onClick={() => onEdit(group)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Permanently delete <b>{group.name}</b> and all its
                        collections?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => onDelete(group.id)}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:bg-orange-100 hover:text-orange-700"
                  >
                    <LogOut className="h-4 w-4 mr-1" /> Leave
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to <b>{group.name}</b>'s collections.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={() => onLeave(group.id)}
                    >
                      Leave
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
