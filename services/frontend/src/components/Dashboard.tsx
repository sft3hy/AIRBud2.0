import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom"; // Import Router hooks
import { MainContent } from "../MainContent";
import { Sidebar } from "./SideBar";
import { GroupManager } from "./GroupManager";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  ImperativePanelHandle,
} from "@/components/ui/resizable";
import { ClassificationBanner } from "./ClassificationBanner"; // <--- Import

export const Dashboard = () => {
  // --- ROUTER STATE ---
  const location = useLocation();
  const params = useParams();

  // Determine mode based on URL start
  const isGroupMode = location.pathname.startsWith("/groups");

  // Determine ID based on URL param (if active)
  const sessionId = params.id || null;

  // --- JOB STATE (Still local/global) ---
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  // --- LAYOUT LOGIC ---
  const sidebarRef = useRef<ImperativePanelHandle>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    const panel = sidebarRef.current;
    if (panel) {
      if (isCollapsed) {
        panel.resize(25);
        setIsCollapsed(false);
      } else {
        panel.resize(4);
        setIsCollapsed(true);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* 2. TOP BANNER: Frozen at the top, spans full width */}
      <div className="flex-none z-50">
        <ClassificationBanner />
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden relative">
        <div className="h-full w-full overflow-hidden bg-background">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel
              ref={sidebarRef}
              defaultSize={25}
              minSize={6}
              maxSize={40}
              collapsedSize={6} // Define the size when collapsed
              className="bg-muted/10"
              onResize={(size) => {
                const collapsed = size < 10;
                if (collapsed !== isCollapsed) setIsCollapsed(collapsed);
              }}
            >
              <Sidebar
                // Pass derived state instead of raw state setters
                mode={isGroupMode ? "groups" : "collections"}
                currentSessionId={sessionId}
                // Pass job props
                activeJobId={activeJobId}
                setActiveJobId={setActiveJobId}
                // Pass layout props
                isCollapsed={isCollapsed}
                toggleSidebar={toggleSidebar}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={75}>
              {isGroupMode ? (
                <GroupManager />
              ) : (
                <MainContent sessionId={sessionId} activeJobId={activeJobId} />
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      {/* 4. BOTTOM BANNER: Frozen at the bottom (if you want it here too) */}
      <div className="flex-none z-50">
        <ClassificationBanner />
      </div>
    </div>
  );
};
