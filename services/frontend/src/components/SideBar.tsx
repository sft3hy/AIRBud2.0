import React, { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSystemStatus,
  getCollections,
  getCollectionStatus,
  fetchCollectionDocuments,
  getMyGroups,
} from "../lib/api";
import { SidebarMode } from "../types";
import { cn } from "@/lib/utils";

// Sub-Components
import { SidebarHeader } from "./sidebar/SidebarHeader";
import { CollectionsView } from "./sidebar/CollectionsView";
import { GroupsView } from "./sidebar/GroupsView";
import { ActiveCollectionView } from "./sidebar/ActiveCollectionView";

interface SidebarProps {
  mode: SidebarMode;
  currentSessionId: string | null;
  activeJobId: string | null;
  setActiveJobId: (id: string | null) => void;
  className?: string;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  currentSessionId,
  activeJobId,
  setActiveJobId,
  className,
  isCollapsed,
  toggleSidebar,
}) => {
  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: systemStatus } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSystemStatus,
  });
  const currentUserId = systemStatus?.user?.id;
  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    enabled: !!systemStatus?.online,
  });
  const { data: userGroups = [] } = useQuery({
    queryKey: ["my_groups"],
    queryFn: getMyGroups,
    enabled: !!systemStatus?.online,
  });
  const { data: currentDocs = [] } = useQuery({
    queryKey: ["documents", currentSessionId],
    queryFn: () => fetchCollectionDocuments(currentSessionId!),
    enabled: !!currentSessionId,
  });

  // Poll for status if a job is active
  const { data: jobStatus } = useQuery({
    queryKey: ["status", activeJobId],
    queryFn: () => getCollectionStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: 1000,
  });

  useEffect(() => {
    // Only stop polling if explicitly completed or error
    if (jobStatus?.status === "completed" || jobStatus?.status === "error") {
      // Invalidate docs to show new files
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      // Reset active job
      setActiveJobId(null);
    }
  }, [jobStatus, queryClient, setActiveJobId]);

  const activeCollectionName = collections.find(
    (c) => String(c.id) === currentSessionId,
  )?.name;

  const activeCollection = collections.find(
    (c) => String(c.id) === currentSessionId,
  );

  const isCollectionOwner = activeCollection?.owner_id === currentUserId;

  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-muted/10 border-r transition-all duration-300",
        className,
      )}
    >
      <SidebarHeader
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        systemStatus={systemStatus}
        mode={mode}
      />

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isCollapsed ? (
          <div></div>
        ) : (
          <>
            {mode === "collections" && (
              <>
                {!currentSessionId ? (
                  <CollectionsView
                    collections={collections}
                    userGroups={userGroups}
                    currentUserId={currentUserId}
                    currentSessionId={currentSessionId}
                  />
                ) : (
                  <ActiveCollectionView
                    currentSessionId={currentSessionId}
                    activeCollectionName={activeCollectionName}
                    currentDocs={currentDocs}
                    activeJobId={activeJobId}
                    setActiveJobId={setActiveJobId}
                    isOwner={isCollectionOwner}
                  />
                )}
              </>
            )}

            {mode === "groups" && <GroupsView userGroups={userGroups} />}
          </>
        )}
      </div>
    </div>
  );
};
