import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, Loader2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

import { fetchSessionDocuments, sendQuery, getSessionHistory } from './lib/api';
import { ChatMessage, SessionHistoryItem } from './types';
import { logger } from './lib/logger';
import { SourceViewer } from './components/SourceViewer';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

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
            Upload a document or load a past session from the sidebar to begin.
        </p>
        <Link to="/how-it-works">
            <Button variant="link" className="text-primary gap-1 text-base">
                How it works <span aria-hidden="true">&rarr;</span>
            </Button>
        </Link>
    </div>
);

export const MainContent = ({ sessionId }: { sessionId: string | null }) => {
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: documents = [] } = useQuery({
        queryKey: ['documents', sessionId],
        queryFn: () => fetchSessionDocuments(sessionId!),
        enabled: !!sessionId,
    });

    const { data: serverHistory } = useQuery({
        queryKey: ['history', sessionId],
        queryFn: () => getSessionHistory(sessionId!),
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
            return await sendQuery(sessionId, question);
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

    if (!sessionId) return <WelcomeScreen />;

    const queryCount = chatHistory.filter(x => x.role === 'user').length;
    const visionModel = documents.length > 0 ? documents[0].vision_model_used : null;

    return (
        <div className="flex flex-col h-full w-full bg-background">
            {/* Header */}
            <div className="px-6 py-3 border-b flex items-center justify-between bg-card shadow-sm z-10">
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium text-sm">
                        {documents.length > 0 ? (
                            <>
                                {documents.length === 1 ? documents[0].original_filename : `${documents.length} documents`}
                                <span className="text-muted-foreground ml-2">| {queryCount} queries</span>
                            </>
                        ) : (
                            "Active Session"
                        )}
                    </span>
                </div>

                {/* Vision Model Badge */}
                {visionModel && (
                    <Badge variant="secondary" className="gap-1.5 text-xs font-normal border">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        Model: <span className="font-medium text-foreground">{visionModel}</span>
                    </Badge>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden relative bg-muted/20">
                <ScrollArea className="h-full px-4 md:px-20 py-4" ref={scrollRef}>
                    <div className="space-y-8 pb-4 max-w-4xl mx-auto min-h-[500px]">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                                {msg.role === 'assistant' && (
                                    <div className="h-10 w-10 rounded-full bg-card p-1 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                        <img src={doggieSrc} alt="Bot" className="h-full w-full object-contain" />
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-5 py-4 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-primary text-primary-foreground rounded-br-sm prose-invert'
                                        : 'bg-card border rounded-bl-sm text-card-foreground'
                                        }`}>
                                        <ReactMarkdown
                                            components={{
                                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                                li: ({ node, ...props }) => <li className="" {...props} />,
                                                strong: ({ node, ...props }) => <span className="font-bold" {...props} />,
                                                a: ({ node, ...props }) => <a className="underline font-medium text-primary" target="_blank" rel="noopener noreferrer" {...props} />,
                                                code: ({ node, ...props }) => (
                                                    <code className="px-1 py-0.5 rounded font-mono text-xs bg-muted text-foreground" {...props} />
                                                ),
                                                pre: ({ node, ...props }) => (
                                                    <pre className="p-3 rounded-lg overflow-x-auto my-2 bg-muted text-foreground border" {...props} />
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
                                    <div className="h-10 w-10 rounded-full bg-muted p-1 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                        <img src={userSrc} alt="User" className="h-full w-full object-cover rounded-full" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {sendMessageMutation.isPending && (
                            <div className="flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-card p-1 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                                    <img src={doggieSrc} alt="Bot" className="h-full w-full object-contain" />
                                </div>
                                <div className="bg-card border px-5 py-4 rounded-2xl rounded-bl-sm text-sm text-muted-foreground flex items-center gap-2 shadow-sm">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="italic">Finding answer...</span>
                                </div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
                <div className="max-w-3xl mx-auto relative flex items-center gap-2">
                    <Input
                        placeholder="Ask a question..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="pr-12 py-6 rounded-full shadow-sm text-base bg-card text-card-foreground"
                        disabled={sendMessageMutation.isPending}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 rounded-full h-10 w-10 shadow-sm"
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessageMutation.isPending}
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};