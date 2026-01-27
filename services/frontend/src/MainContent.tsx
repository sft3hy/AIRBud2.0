import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCollectionDocuments,
  sendQueryStream,
  getCollectionHistory,
  getCollections,
  getCollectionStatus,
} from "./lib/api";
import { ChatMessage, SessionHistoryItem } from "./types";
import { logger } from "./lib/logger";
import { ProcessingView } from "./components/ProcessingView";

// Sub Components
import { WelcomeScreen } from "./components/chat/WelcomeScreen";
import { ChatHeader } from "./components/chat/ChatHeader";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";

interface MainContentProps {
  sessionId: string | null;
  activeJobId: string | null;
}

export const MainContent: React.FC<MainContentProps> = ({
  sessionId,
  activeJobId,
}) => {
  const queryClient = useQueryClient();
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [queryStatus, setQueryStatus] = useState("Finding answer...");
  const [forceViewChat, setForceViewChat] = useState(false);

  useEffect(() => {
    if (activeJobId) setForceViewChat(false);
  }, [activeJobId]);

  // --- Queries ---

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

  // --- Side Effects ---

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

  // --- Mutation ---

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
          content: `Error: ${error instanceof Error ? error.message : "Unknown error"
            }`,
        },
      ]);
    },
  });

  const handleSend = (input: string) => {
    setChatHistory((prev) => [...prev, { role: "user", content: input }]);
    sendMessageMutation.mutate(input);
  };

  // --- Render Logic ---

  const [minimizedProcessing, setMinimizedProcessing] = useState(false);

  const showProcessing =
    !minimizedProcessing &&
    !forceViewChat &&
    !minimizedProcessing &&
    !forceViewChat &&
    activeJobId &&
    activeJobId === sessionId && // STRICTLY SCOPE TO CURRENT COLLECTION
    jobStatus &&
    jobStatus.status !== "idle" &&
    jobStatus.status !== "completed" &&
    jobStatus.status !== "error" &&
    jobStatus.stage !== "done";

  // If job completes, we automatically go to chat
  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      setForceViewChat(true);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    }
  }, [jobStatus]);

  if (showProcessing) {
    return (
      <ProcessingView
        status={jobStatus!}
        onComplete={() => {
          setForceViewChat(true);
          queryClient.invalidateQueries({ queryKey: ["documents"] });
        }}
        // Add props for minimizing
        canMinimize={hasDocuments} // Only allow minimizing if there are docs to chat with
        onMinimize={() => setMinimizedProcessing(true)}
      />
    );
  }

  if (!sessionId) return <WelcomeScreen />;

  return (
    <div className="flex h-full w-full flex-col">
      <ChatHeader
        activeCollectionName={
          activeCollection ? activeCollection.name : "Active Session"
        }
      />

      <MessageList
        chatHistory={chatHistory}
        isPending={sendMessageMutation.isPending}
        queryStatus={queryStatus}
        documents={documents}
      />

      <ChatInput
        onSend={handleSend}
        isPending={sendMessageMutation.isPending}
        hasDocuments={hasDocuments}
      />
    </div>
  );
};
