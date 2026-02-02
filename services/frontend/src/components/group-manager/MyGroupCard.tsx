import React from "react";
import { Globe, Lock, Copy, Pencil, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer flex flex-col h-full ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}
    >

      {/* Visual Accent */}
      <div className={`absolute top-0 left-0 w-1 h-full ${group.is_public ? 'bg-blue-500' : 'bg-amber-500'} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <CardHeader className="pb-3 pl-6 shrink-0">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {group.is_public ? (
                <Globe className="h-3.5 w-3.5 text-blue-400" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-amber-400" />
              )}
              <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                {group.is_public ? "Public Group" : "Private Group"}
              </span>
            </div>
            <CardTitle className={`text-xl font-bold leading-tight text-foreground/90 group-hover:text-primary transition-colors ${!isExpanded && 'line-clamp-1'}`}>
              {group.name}
            </CardTitle>
          </div>

          <Badge variant="secondary" className="bg-white/5 hover:bg-white/10 text-xs font-normal border-white/5 shrink-0">
            {group.member_count} Members
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pl-6 flex-1 flex flex-col">
        <p className={`text-sm text-muted-foreground/80 mb-6 transition-all ${isExpanded ? '' : 'line-clamp-2 min-h-[40px]'}`}>
          {group.description || "No description provided for this group."}
        </p>

        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {group.owner_name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              <span className="opacity-50">Owner:</span> {group.owner_name}
            </span>
          </div>

          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-primary/20 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onCopyInvite(group.invite_token); }}
              title="Copy Invite Link"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>

            {isOwner ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10"
                  onClick={(e) => { e.stopPropagation(); onEdit(group); }}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-white/5 hover:bg-red-500/20 hover:text-red-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Permanently delete <b>{group.name}</b> and all its collections? This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={(e) => { e.stopPropagation(); onDelete(group.id); }}
                      >
                        Delete Group
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
                    className="h-8 px-3 rounded-full bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 text-xs font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LogOut className="h-3 w-3 mr-1.5" /> Leave
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to <b>{group.name}</b>'s collections.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-orange-600 hover:bg-orange-700"
                      onClick={(e) => { e.stopPropagation(); onLeave(group.id); }}
                    >
                      Leave Group
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
