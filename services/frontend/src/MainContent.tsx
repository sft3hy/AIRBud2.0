import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Send, FolderOpen, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { fetchCollectionDocuments, sendQueryStream, getCollectionHistory, getCollections, getCollectionStatus } from './lib/api';import { ChatMessage, SessionHistoryItem } from './types';
import { logger } from './lib/logger';
import { SourceViewer } from './components/SourceViewer';
import { ProcessingView } from './components/ProcessingView'; // Ensure this exists

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Assets
import doggieSrc from './assets/doggie.svg';
import userSrc from './assets/user.svg';

const WelcomeScreen = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-muted/10 rounded-xl m-4">
        <div className="mb-6 h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center">
            <img src={doggieSrc} alt="Smart RAG" className="h-16 w-16" />
        </div>
        <h2 className="text-3xl font-bold mb-4">👋 Welcome to Smart RAG</h2>
        <p className="text-lg text-muted-foreground mb-4 max-w-md">
            Create or select a collection from the sidebar to begin.
        </p>
        <Link to="/how-it-works">
            <Button variant="link" className="text-primary gap-1 text-base">
                How it works <span aria-hidden="true">&rarr;</span>
            </Button>
        </Link>
    </div>
);

// --- FIX: Add activeJobId to props destructuring ---
export const MainContent = ({ sessionId, activeJobId }: { sessionId: string | null, activeJobId: string | null }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [queryStatus, setQueryStatus] = useState("Finding answer...");


    // --- NEW: Poll Job Status if active ---
    const { data: jobStatus } = useQuery({
        queryKey: ['status', activeJobId],
        queryFn: () => getCollectionStatus(activeJobId!),
        enabled: !!activeJobId,
        refetchInterval: 500, 
    });

    const { data: collections = [] } = useQuery({
        queryKey: ['collections'],
        queryFn: getCollections,
        staleTime: 1000 * 60 * 5, 
    });

    const activeCollection = collections.find(c => String(c.id) === sessionId);

    const { data: documents = [] } = useQuery({
        queryKey: ['documents', sessionId],
        queryFn: () => fetchCollectionDocuments(sessionId!),
        enabled: !!sessionId,
    });

    const { data: serverHistory } = useQuery({
        queryKey: ['history', sessionId],
        queryFn: () => getCollectionHistory(sessionId!),
        enabled: !!sessionId,
    });

    useEffect(() => {
        if (serverHistory && Array.isArray(serverHistory)) {
            const formatted: ChatMessage[] = serverHistory.flatMap((item: SessionHistoryItem) => [
                { role: 'user', content: item.question },
                {
                    role: 'assistant',
                    content: item.response,
                    sources: item.sources || item.results || []
                }
            ]);
            setChatHistory(formatted);
        } else if (sessionId && !serverHistory) {
            setChatHistory([]);
        }
    }, [serverHistory, sessionId]);

    const sendMessageMutation = useMutation({
        mutationFn: async (question: string) => {
            if (!sessionId) throw new Error("No Session");
            
            // Reset status
            setQueryStatus("Initiating Search...");
            
            // Use Streaming API
            return await sendQueryStream(sessionId, question, (step) => {
                setQueryStatus(step); // Update UI on every chunk
            });
        },
        onSuccess: (data) => {
            setChatHistory(prev => [
                ...prev,
                { role: 'assistant', content: data.response, sources: data.results }
            ]);
        },
        onError: (error) => {
            logger.error("Query failed", error);
            setChatHistory(prev => [
                ...prev,
                { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : "Unknown error"}` }
            ]);
        }
    });

    useEffect(() => {
        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, [chatHistory, sendMessageMutation.isPending]);

    const handleSend = () => {
        if (!input.trim() || !sessionId) return;
        setChatHistory(prev => [...prev, { role: 'user', content: input }]);
        sendMessageMutation.mutate(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // --- RENDER PROCESSING VIEW ---
    if (activeJobId && jobStatus && jobStatus.status !== 'idle' && jobStatus.status !== 'completed' && jobStatus.status !== 'error') {
        return <ProcessingView status={jobStatus} />;
    }

    if (!sessionId) return <WelcomeScreen />;

    const queryCount = chatHistory.filter(x => x.role === 'user').length;

    return (
        <div className="flex flex-col h-full w-full bg-background">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-card shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <FolderOpen className="h-6 w-6 text-primary"/>
                    <p className="font-semibold text-lg flex items-center">
                        <span>
                            Collection: {activeCollection ? activeCollection.name : "Active Session"}
                        </span>

                        <span className="text-muted-foreground ml-3 text-base">{queryCount} queries
                        </span>
                        </p>

                </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-muted/20">
                <ScrollArea className="h-full px-4 md:px-20 py-4" ref={scrollRef}>
                    <div className="space-y-10 pb-4 max-w-4xl mx-auto min-h-[500px]">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="h-12 w-12 rounded-full bg-card p-1.5 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                        <img src={doggieSrc} alt="Bot" className="h-full w-full object-contain" />
                                    </div>
                                )}
                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-6 py-5 rounded-3xl text-base leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-sm prose-invert'
                                        : 'bg-card border rounded-bl-sm text-card-foreground'
                                        }`}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="" {...props} />,
                                                strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                                a: ({ node, ...props }) => <a className="underline font-medium text-primary" target="_blank" rel="noopener noreferrer" {...props} />,
                                                code: ({ node, ...props }) => (
                                                    <code className="px-1 py-0.5 rounded font-mono text-sm bg-muted text-foreground" {...props} />
                                                ),
                                                pre: ({ node, ...props }) => (
                                                    <pre className="p-4 rounded-lg overflow-x-auto my-3 bg-muted text-foreground border" {...props} />
                                                ),
                                            }}
                                        >
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                    {msg.role === 'assistant' && msg.sources && (
                                        <SourceViewer sources={msg.sources} documents={documents} />
                                    )}
                                </div>
                                {msg.role === 'user' && (
                                    <div className="h-12 w-12 rounded-full bg-muted p-1 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                        <img src={userSrc} alt="User" className="h-full w-full object-cover rounded-full" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {sendMessageMutation.isPending && (
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-full bg-card p-1.5 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                    <img src={doggieSrc} alt="Bot" className="h-full w-full object-contain" />
                                </div>
                                <div className="bg-card border px-6 py-5 rounded-3xl rounded-bl-sm text-base text-muted-foreground flex items-center gap-3 shadow-sm">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span className="italic font-medium animate-pulse">{queryStatus}</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </div>

            <div className="p-6 bg-background border-t">
                <div className="max-w-3xl mx-auto relative flex items-center gap-3">
                    <Input
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pr-14 py-7 rounded-full shadow-sm text-lg bg-card text-card-foreground"
                        disabled={sendMessageMutation.isPending}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 rounded-full h-12 w-12 shadow-sm"
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessageMutation.isPending}
                    >
                        <Send className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </div>
    );
};