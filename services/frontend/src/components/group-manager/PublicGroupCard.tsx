import React from "react";
import { Check, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicGroupCardProps {
  group: any;
  onJoin: (id: number) => void;
}

export const PublicGroupCard: React.FC<PublicGroupCardProps> = ({
  group,
  onJoin,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Card
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group relative overflow-hidden border-white/5 bg-white/5 backdrop-blur-md transition-all duration-300 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer flex flex-col h-full ${isExpanded ? 'ring-2 ring-blue-500/20' : ''}`}
    >

      {/* Visual Accent */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20" />

      <CardHeader className="pb-3 shrink-0">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <Badge variant="outline" className="border-blue-500/20 text-blue-400 bg-blue-500/5 text-[10px] uppercase tracking-wider mb-2">
              Public Group
            </Badge>
            <CardTitle className={`text-xl font-bold leading-tight text-foreground transition-colors ${!isExpanded && 'line-clamp-1'}`}>
              {group.name}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <p className={`text-sm text-muted-foreground/80 mb-6 transition-all ${isExpanded ? '' : 'line-clamp-2 min-h-[40px]'}`}>
          {group.description || "No description provided."}
        </p>

        <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto shrink-0 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
              {group.owner_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium truncate max-w-[100px]">{group.owner_name}</span>
              <span className="text-[10px] text-muted-foreground">{group.member_count} Members</span>
            </div>
          </div>

          <div onClick={(e) => e.stopPropagation()}>
            {group.is_member ? (
              <Button
                size="sm"
                variant="secondary"
                disabled
                className="bg-white/5 text-muted-foreground h-8 pointer-events-none"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" /> Joined
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onJoin(group.id); }}
                className="h-8 bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-500/20"
              >
                <LogIn className="h-3.5 w-3.5 mr-1.5" /> Join Group
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
