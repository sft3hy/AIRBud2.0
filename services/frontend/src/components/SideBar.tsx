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
  // Removing setMode/onSessionChange props as we use navigation now
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
  const { data: jobStatus } = useQuery({
    queryKey: ["status", activeJobId],
    queryFn: () => getCollectionStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (jobStatus?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setActiveJobId(null);
    }
  }, [jobStatus]);

  const activeCollectionName = collections.find(
    (c) => String(c.id) === currentSessionId
  )?.name;

  const activeCollection = collections.find(
    (c) => String(c.id) === currentSessionId
  );

  const isCollectionOwner = activeCollection?.owner_id === currentUserId;

  // --- RENDER ---
  return (
    <div
      className={cn(
        "flex flex-col h-full w-full bg-muted/10 border-r transition-all duration-300",
        className
      )}
    >
      {/* 1. HEADER (Title + Toggle) */}
      <SidebarHeader
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        systemStatus={systemStatus}
        mode={mode}
      />

      {/* 2. CONTENT AREA */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {isCollapsed ? (
          <div></div>
        ) : (
          <>
            {/* === MODE: COLLECTIONS === */}
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
                  /* Active Collection View */
                  <ActiveCollectionView
                    currentSessionId={currentSessionId}
                    activeCollectionName={activeCollectionName}
                    currentDocs={currentDocs}
                    activeJobId={activeJobId}
                    setActiveJobId={setActiveJobId}
                    isOwner={isCollectionOwner} // <--- PASS THIS PROP
                  />
                )}
              </>
            )}

            {/* === MODE: GROUPS === */}
            {mode === "groups" && <GroupsView userGroups={userGroups} />}
          </>
        )}
      </div>
    </div>
  );
};
