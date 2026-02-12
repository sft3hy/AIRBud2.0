import { useQuery } from "@tanstack/react-query";
import { UserCircle } from "lucide-react";
import { fetchSystemStatus } from "../../lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const UserStatus = () => {
  // Component fetches its own data, sharing the 'session' cache key
  const { data: systemStatus } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSystemStatus,
    staleTime: 1000 * 60 * 5, // Cache for 5 mins
  });

  if (!systemStatus?.user) return null;

  const user = systemStatus.user;
  const isPOauth = !user.piv_id; // If no PIV ID, assume OAuth

  return (
    <div className="flex items-center gap-2 text-right">
      <div className="flex flex-col leading-tight">
        <span className="truncate text-lg font-medium">
          {isPOauth ? user.email : user.cn}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {user.org}
        </span>
      </div>

      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="cursor-default inline-block">
              <UserCircle className="h-7 w-7 text-muted-foreground hover:text-foreground transition-colors" />
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            className="bg-foreground text-background font-medium"
          >
            <p>{isPOauth ? "Logged in via PKI" : "Logged in via CAC/PIV"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};