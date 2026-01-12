import { useState } from 'react';
import { MainContent } from '../MainContent';
import { Sidebar } from './SideBar';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from "@/components/ui/resizable";

export const Dashboard = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);

    return (
        <div className="h-screen w-full overflow-hidden bg-background">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel
                    defaultSize={25}
                    minSize={15}
                    maxSize={45}
                    className="bg-muted/10 min-w-[280px]"
                >
                    <Sidebar
                        currentSessionId={sessionId}
                        onSessionChange={setSessionId}
                    />
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={75}>
                    <MainContent sessionId={sessionId} />
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};