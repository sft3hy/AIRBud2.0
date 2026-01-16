import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronsLeft, ChevronsRight, FolderOpen, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarMode } from "../../types";
import doggieSrc from "@/assets/doggie.svg";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  systemStatus: any;
  mode: SidebarMode;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
  isCollapsed,
  toggleSidebar,
  systemStatus,
  mode,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={cn(
        "border-b bg-background flex shrink-0 transition-all",
        isCollapsed ? "p-2 justify-center flex-col gap-2" : "p-4 flex-col gap-4"
      )}
    >
      <div
        className={cn(
          "flex items-center",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <h2 className="text-lg font-bold flex items-center gap-2 truncate">
            <img src={doggieSrc} alt="AIRBud 2.0" className="h-5 w-5" />
            <span>AIRBud 2.0</span>
            <div
              className={cn(
                "h-2.5 w-2.5 rounded-full shrink-0",
                systemStatus?.online
                  ? "bg-green-500"
                  : "bg-red-500 animate-pulse"
              )}
            />
          </h2>
        )}

        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn(
                  "h-8 w-8 text-muted-foreground",
                  isCollapsed && "h-10 w-10"
                )}
              >
                {isCollapsed ? (
                  <ChevronsRight className="h-5 w-5" />
                ) : (
                  <ChevronsLeft className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="bg-foreground text-background font-medium"
            >
              {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Main Mode Toggle (Navigate on Click) */}
      {!isCollapsed && (
        <div className="grid grid-cols-2 bg-muted p-1 rounded-lg">
          <button
            onClick={() => navigate("/collections")}
            className={cn(
              "text-sm font-medium py-1.5 rounded-md transition-all",
              mode === "collections"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Collections
          </button>
          <button
            onClick={() => navigate("/groups")}
            className={cn(
              "text-sm font-medium py-1.5 rounded-md transition-all",
              mode === "groups"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Groups
          </button>
        </div>
      )}

      {/* Collapsed Mode Icons */}
      {isCollapsed && (
        <div className="flex flex-col gap-2 items-center mt-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "collections" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => navigate("/collections")}
                >
                  <FolderOpen className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Collections</TooltipContent>
            </Tooltip>

            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant={mode === "groups" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => navigate("/groups")}
                >
                  <Users className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Groups</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
};
