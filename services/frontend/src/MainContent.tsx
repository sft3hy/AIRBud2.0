import React, { useState, useEffect, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { CircleArrowUp, FolderOpen, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

import {
  fetchCollectionDocuments,
  sendQueryStream,
  getCollectionHistory,
  getCollections,
  getCollectionStatus,
} from "./lib/api";
import { ChatMessage, SessionHistoryItem } from "./types";
import { logger } from "./lib/logger";
import { SourceViewer } from "./components/SourceViewer";
import { ProcessingView } from "./components/ProcessingView";
import { UserStatus } from "./components/UserStatus";
import { Button } from "@/components/ui/button";
// Input is used as a controlled component below
import { ScrollArea } from "@/components/ui/scroll-area";
import doggieSrc from "./assets/doggie.svg";
import userSrc from "./assets/user.svg";

// ... (MemoizedMessage and WelcomeScreen components remain unchanged) ...

const MemoizedMessage = memo(({ msg }: { msg: ChatMessage }) => {
  return (
    <div
      className={`flex gap-4 ${
        msg.role === "user" ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex flex-col max-w-[85%] ${
          msg.role === "user" ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`px-4 py-2 rounded-3xl text-base leading-relaxed shadow-md backdrop-blur-sm ${
            msg.role === "user"
              ? "bg-primary text-primary-foreground rounded-br-sm prose-invert"
              : "bg-card/20 border rounded-bl-sm text-card-foreground"
          }`}
        >
          <ReactMarkdown
            components={{
              p: ({ node, ...props }) => (
                <p className="mb-3 last:mb-0" {...props} />
              ),
              ul: ({ node, ...props }) => (
                <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />
              ),
              ol: ({ node, ...props }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />
              ),
              li: ({ node, ...props }) => <li className="" {...props} />,
              strong: ({ node, ...props }) => (
                <span className="font-bold" {...props} />
              ),
              a: ({ node, ...props }) => (
                <a
                  className="underline font-medium text-primary"
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              code: ({ node, ...props }) => (
                <code
                  className="px-1 py-0.5 rounded font-mono text-sm bg-muted text-foreground"
                  {...props}
                />
              ),
              pre: ({ node, ...props }) => (
                <pre
                  className="p-4 rounded-lg overflow-x-auto my-3 bg-muted text-foreground border"
                  {...props}
                />
              ),
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.role === "assistant" && msg.sources && (
          <SourceViewer sources={msg.sources} documents={[]} />
        )}
      </div>
      {/* {msg.role === "user" && (
        <div className="h-12 w-12 rounded-full bg-muted p-1 flex items-center justify-center shrink-0 border shadow-sm mt-1">
          <img
            src={userSrc}
            alt="User"
            className="h-full w-full object-cover rounded-full"
          />
        </div>
      )} */}
    </div>
  );
});

const WelcomeScreen = () => (
  <div className="flex h-full w-full flex-col bg-transparent">
    <div className="z-10 flex items-center justify-between border-b bg-background/80 backdrop-blur-md px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold leading-none">Collections</h1>
          <p className="text-xs text-muted-foreground mt-1 leading-none">
            Create knowledge bases and chat
          </p>
        </div>
      </div>
      <UserStatus />
    </div>
    <div className="flex flex-col items-center justify-center flex-1 p-8 text-center bg-background/20 rounded-xl m-4 border border-white/10 animate-in fade-in duration-500">
      <div className="mb-6 h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.2)]">
        <img src={doggieSrc} alt="AIRBud 2.0" className="h-16 w-16" />
      </div>
      <h2 className="text-3xl font-bold mb-4">👋 Welcome to AIRBud 2.0</h2>
      <p className="text-lg text-muted-foreground mb-4 max-w-md">
        Create or select a collection from the sidebar to begin. Or check out
        some groups!
      </p>
      <div className="flex gap-4">
        <Link to="/help">
          <Button variant="link" className="text-primary gap-1 text-base">
            User Guide <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
        <Link to="/system-overview">
          <Button variant="link" className="text-primary gap-1 text-base">
            System Overview <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
        <Link to="/our-team">
          <Button variant="link" className="text-primary gap-1 text-base">
            Our team <span aria-hidden="true">&rarr;</span>
          </Button>
        </Link>
      </div>
    </div>
  </div>
);

export const MainContent = ({
  sessionId,
  activeJobId,
}: {
  sessionId: string | null;
  activeJobId: string | null;
}) => {
  const queryClient = useQueryClient();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [queryStatus, setQueryStatus] = useState("Finding answer...");
  const [isFocused, setIsFocused] = useState(false);

  // REMOVED: local isPending state. We use sendMessageMutation.isPending instead.

  const [forceViewChat, setForceViewChat] = useState(false);

  useEffect(() => {
    if (activeJobId) setForceViewChat(false);
  }, [activeJobId]);

  const { data: jobStatus } = useQuery({
    queryKey: ["status", activeJobId],
    queryFn: () => getCollectionStatus(activeJobId!),
    enabled: !!activeJobId,
    refetchInterval: 1000,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["collections"],
    queryFn: getCollections,
    staleTime: 1000 * 60 * 5,
  });

  const activeCollection = collections.find((c) => String(c.id) === sessionId);

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", sessionId],
    queryFn: () => fetchCollectionDocuments(sessionId!),
    enabled: !!sessionId,
  });

  const hasDocuments = documents.length > 0;

  const { data: serverHistory } = useQuery({
    queryKey: ["history", sessionId],
    queryFn: () => getCollectionHistory(sessionId!),
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (serverHistory && Array.isArray(serverHistory)) {
      const formatted: ChatMessage[] = serverHistory.flatMap(
        (item: SessionHistoryItem) => [
          { role: "user", content: item.question },
          {
            role: "assistant",
            content: item.response,
            sources: item.sources || item.results || [],
          },
        ],
      );
      setChatHistory(formatted);
    } else if (sessionId && !serverHistory) {
      setChatHistory([]);
    }
  }, [serverHistory, sessionId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (question: string) => {
      if (!sessionId) throw new Error("No Session");
      setQueryStatus("Initiating Search...");
      return await sendQueryStream(sessionId, question, (step) => {
        setQueryStatus(step);
      });
    },
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.response, sources: data.results },
      ]);
    },
    onError: (error) => {
      logger.error("Query failed", error);
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ]);
    },
  });

  // Use the mutation's status for loading state
  const isPending = sendMessageMutation.isPending;

  useEffect(() => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [chatHistory, isPending, queryStatus]);

  const handleSend = () => {
    if (!input.trim() || !sessionId || !hasDocuments) return;
    setChatHistory((prev) => [...prev, { role: "user", content: input }]);
    sendMessageMutation.mutate(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showProcessing =
    !forceViewChat &&
    activeJobId &&
    jobStatus &&
    jobStatus.status !== "idle" &&
    jobStatus.status !== "completed" &&
    jobStatus.status !== "error" &&
    jobStatus.stage !== "done";

  if (showProcessing) {
    return (
      <ProcessingView
        status={jobStatus!}
        onComplete={() => {
          setForceViewChat(true);
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        }}
      />
    );
  }

  if (!sessionId) return <WelcomeScreen />;

  return (
    <div className="flex h-full w-full flex-col ">
      {/* Header */}
      <div className="z-10 flex items-center justify-between  px-6 py-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-6 w-6 text-primary" />
          <p className="flex items-center text-lg font-semibold">
            <span>
              Chatting with:{" "}
              {activeCollection ? activeCollection.name : "Active Session"}
            </span>
          </p>
        </div>
        <UserStatus />
      </div>

      <div className="flex-1 overflow-auto relative bg-transparent animate-in fade-in duration-500">
        <ScrollArea className="h-full md:px-10 py-0" ref={scrollRef}>
          <div className="space-y-10 pb-4 max-w-2xl mx-auto min-h-[500px]">
            {chatHistory.map((msg, idx) => (
              <MemoizedMessage key={idx} msg={msg} />
            ))}

            {isPending && (
              <div className="flex gap-4">
                <div className="h-12 w-12 rounded-full bg-card p-1.5 flex items-center justify-center shrink-0 border shadow-sm mt-1">
                  <img
                    src={doggieSrc}
                    alt="Bot"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="bg-card/90 backdrop-blur border px-1 py-5 rounded-3xl rounded-bl-sm text-base text-muted-foreground flex items-center gap-3 shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="italic font-medium animate-pulse">
                    {queryStatus}
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </div>

      {/* STYLIZED INPUT AREA */}
      <div className="w-full px-1 pb-6 z-20">
        <div className="max-w-2xl mx-auto">
          {/* Input Container */}
          <div
            className={`relative flex items-end gap-3 bg-muted/40 border rounded-[24px] transition-all duration-300 ${
              isFocused
                ? "ring-2 ring-primary/20 border-primary/50 shadow-lg shadow-primary/5"
                : "border-border/50 shadow-sm hover:shadow-md hover:bg-muted/60"
            }`}
          >
            {/* Input Field */}
            <div className="flex-1 relative">
              <textarea
                placeholder={
                  hasDocuments
                    ? "Chat with your collection..."
                    : "Upload a document to start chatting..."
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isPending || !hasDocuments}
                rows={1}
                className={`w-full px-5 py-3 text-base bg-transparent rounded-l-[24px] outline-none transition-all duration-200 text-foreground placeholder:text-muted-foreground resize-none overflow-y-auto ${
                  !hasDocuments ? "opacity-50 cursor-not-allowed" : ""
                }`}
                style={{
                  maxHeight: "360px", // 15 lines * 24px line height
                  minHeight: "44px",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 360) + "px";
                }}
              />
            </div>

            {/* Send Button */}
            <div className="pr-2 pb-2">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isPending || !hasDocuments}
                className={`group relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                  !input.trim() || isPending || !hasDocuments
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-lg hover:shadow-primary/25 active:scale-95"
                }`}
              >
                {/* Glow effect on hover */}
                {input.trim() && !isPending && hasDocuments && (
                  <div className="absolute inset-0 rounded-full bg-primary blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                )}

                <CircleArrowUp
                  className={`relative z-10 transition-all duration-300 ${
                    !input.trim() || isPending || !hasDocuments
                      ? "w-5 h-5"
                      : "w-5 h-5 group-hover:scale-110"
                  } ${isPending ? "animate-pulse" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
