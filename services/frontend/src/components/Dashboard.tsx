import { useState } from 'react';
import { MainContent } from '../MainContent';
import { Sidebar } from './SideBar';
import { GroupManager } from './GroupManager'; 
import { SidebarMode } from '../types'; 
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";

export const Dashboard = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('collections');
    
    // --- NEW: Global Job State ---
    // If activeJobId is set, MainContent will show the ProcessingView
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    return (
        <div className="h-screen w-full overflow-hidden bg-background">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={25}
                    minSize={20}
                    maxSize={40}
                    className="bg-muted/10 min-w-[300px]"
                >
                    <Sidebar
                        mode={sidebarMode}
                        setMode={setSidebarMode}
                        currentSessionId={sessionId}
                        onSessionChange={setSessionId}
                        // Pass job props down
                        activeJobId={activeJobId}
                        setActiveJobId={setActiveJobId}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={75}>
                    {sidebarMode === 'groups' ? (
                        <GroupManager />
                    ) : (
                        <MainContent 
                            sessionId={sessionId} 
                            activeJobId={activeJobId} // Pass to MainContent
                        />
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};