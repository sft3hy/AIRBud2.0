import React from "react";
import { Check, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-dashed hover:border-solid border-primary/20 transition-all">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {group.name}
          <Badge variant="secondary" className="text-[10px] font-normal">
            Public
          </Badge>
        </CardTitle>
        <CardDescription>{group.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {group.member_count}{" "}
            {group.member_count === 1 ? "member" : "members"} &bull; Owner:{" "}
            {group.owner_name}
          </span>

          {group.is_member ? (
            <Button
              size="sm"
              variant="secondary"
              disabled
              className="opacity-70"
            >
              <Check className="h-3 w-3 mr-2" /> Joined
            </Button>
          ) : (
            <Button size="sm" onClick={() => onJoin(group.id)}>
              <LogIn className="h-3 w-3 mr-2" /> Join
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
