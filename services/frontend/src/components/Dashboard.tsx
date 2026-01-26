import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { MainContent } from "../MainContent";
import { Sidebar } from "./SideBar";
import { GroupManager } from "./GroupManager";

import { ClassificationBanner } from "./ClassificationBanner";

export const Dashboard = () => {
  // --- ROUTER STATE ---
  const location = useLocation();
  const params = useParams();

  // Determine mode based on URL start
  const isGroupMode = location.pathname.startsWith("/groups");

  // Determine ID based on URL param (if active)
  const sessionId = params.id || null;

  // --- JOB STATE ---
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // --- LAYOUT LOGIC ---
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isCollapsed) setSidebarWidth(60);
    setIsResizing(true);
  };

  const stopResizing = () => {
    setIsResizing(false);
    if (isCollapsed) setSidebarWidth(250); // Reset to usable width to prevent glitch on toggle
  };

  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX;
      if (newWidth > 60 && newWidth < 800) {
        setSidebarWidth(newWidth);
        // Auto-expand if dragging out from collapsed state
        if (isCollapsed && newWidth > 100) {
          setIsCollapsed(false);
        }
      }
    }
  };

  // Add global event listeners for drag
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, isCollapsed]); // Added isCollapsed dependency for the resize logic

  // Auto-shrink logic: check whenever sidebarWidth changes
  useEffect(() => {
    if (!isCollapsed && sidebarWidth < 100) {
      setIsCollapsed(true);
      // We don't reset sidebarWidth here immediately if resizing, 
      // because the user might drag it back out. 
      // We handle the reset in stopResizing.
      if (!isResizing) setSidebarWidth(250);
    }
  }, [sidebarWidth, isCollapsed, isResizing]);

  const currentWidth = isCollapsed ? 60 : sidebarWidth;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-transparent text-foreground relative">
      {/* 1. TOP BANNER */}
      <div className="flex-none z-50 relative shadow-md">
        <ClassificationBanner />
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 min-h-0 relative z-0 w-full h-full flex">
        {/* 
           SIDEBAR (Fixed Left)
        */}
        <div
          className="flex-none h-full z-40 relative flex"
          style={{
            width: currentWidth,
            transition: isResizing ? "none" : "width 300ms ease-out",
          }}
        >
          <div className="flex-1 h-full bg-background/60 backdrop-blur-xl border-r border-border/50 overflow-hidden relative group/sidebar">
            {/* Cool Background Effect */}
            <div className="absolute inset-0 pointer-events-none z-0 bg-[radial-gradient(circle_at_top_left,rgba(100,100,255,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(100,100,255,0.15),transparent_50%)]" />

            <Sidebar
              mode={isGroupMode ? "groups" : "collections"}
              currentSessionId={sessionId}
              activeJobId={activeJobId}
              setActiveJobId={setActiveJobId}
              isCollapsed={isCollapsed}
              toggleSidebar={() => setIsCollapsed(!isCollapsed)}
            />
          </div>

          {/* Drag Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50"
            onMouseDown={startResizing}
          />
        </div>

        {/* 
           MAIN CONTENT (Pushed Right)
           - Flex-1 takes remaining space.
        */}
        <div className="flex-1 h-full overflow-hidden flex flex-col min-w-0">
          {isGroupMode ? (
            <GroupManager />
          ) : (
            <MainContent sessionId={sessionId} activeJobId={activeJobId} />
          )}
        </div>
      </div>

      {/* 3. BOTTOM BANNER */}
      <div className="flex-none z-50 relative shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
        <ClassificationBanner />
      </div>
    </div>
  );
};
