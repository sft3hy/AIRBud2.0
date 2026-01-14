import { useState } from 'react';
import { MainContent } from '../MainContent';
import { Sidebar } from './SideBar';
import { GroupManager } from './GroupManager';
import { SidebarMode } from '../types'; // <--- UPDATED IMPORT
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";

export const Dashboard = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sidebarMode, setSidebarMode] = useState<SidebarMode>('collections');

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
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={75}>
                    {sidebarMode === 'groups' ? (
                        <GroupManager />
                    ) : (
                        <MainContent sessionId={sessionId} />
                    )}
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};