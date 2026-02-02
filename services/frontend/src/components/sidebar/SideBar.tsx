import React, { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchSystemStatus,
  getCollections,
  getCollectionStatus,
  fetchCollectionDocuments,
  getMyGroups,
} from "../../lib/api";
import { SidebarMode } from "../../types";
import { cn } from "@/lib/utils";

// Sub-Components
import { SidebarHeader } from "./SidebarHeader";
import { CollectionsView } from "./CollectionsView";
import { GroupsView } from "./GroupsView";
import { ActiveCollectionView } from "./ActiveCollectionView";

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
  const completionHandledRef = useRef<string | null>(null);

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
    // Detect Completion or Error
    if (
      activeJobId &&
      jobStatus &&
      (jobStatus.status === "completed" || jobStatus.status === "error")
    ) {
      // Prevent double-execution for the same Job ID
      if (completionHandledRef.current === activeJobId) return;
      completionHandledRef.current = activeJobId;

      // console.log(`Job ${activeJobId} finished. Refreshing all views...`);

      // --- 1. Force Refresh All Views ---
      // This ensures Documents, Charts, and Graph tabs all get new data immediately
      queryClient.invalidateQueries({ queryKey: ["documents", activeJobId] });
      queryClient.invalidateQueries({ queryKey: ["charts", activeJobId] });
      queryClient.invalidateQueries({ queryKey: ["graph", activeJobId] });
      queryClient.invalidateQueries({ queryKey: ["collections"] });

      // --- 2. Clear Processing State ---
      // Small timeout allows the invalidate queries to fire off before we remove the spinner
      setTimeout(() => {
        setActiveJobId(null);
        completionHandledRef.current = null;
      }, 500);
    }
  }, [jobStatus, activeJobId, queryClient, setActiveJobId]);

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
        "flex flex-col h-full w-full relative overflow-hidden",
        "border-r border-border/60 bg-background/50 backdrop-blur-xl",
        className,
      )}
    >
      {/* Grid Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,hsl(var(--foreground)_/_0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)_/_0.04)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:linear-gradient(to_bottom,transparent,black)]" />

      <div className="flex flex-col h-full w-full relative z-10">
        <SidebarHeader
          isCollapsed={isCollapsed}
          toggleSidebar={toggleSidebar}
          systemStatus={systemStatus}
          mode={mode}
        />

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {" "}
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
                      currentUserId={currentUserId ? String(currentUserId) : undefined}
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
    </div>
  );
};
