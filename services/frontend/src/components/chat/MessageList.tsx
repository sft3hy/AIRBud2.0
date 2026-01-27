import React, { useRef, useEffect } from "react";
import { } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "../../types";
import { ChatMessageBubble } from "./ChatMessageBubble";
import doggieSrc from "../../assets/doggie.svg";
import { QueryStatusIndicator } from "./QueryStatusIndicator";

interface MessageListProps {
  chatHistory: ChatMessage[];
  isPending: boolean;
  queryStatus: string;
  documents: any[];
}

export const MessageList: React.FC<MessageListProps> = ({
  chatHistory,
  isPending,
  queryStatus,
  documents,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when history changes
  useEffect(() => {
    if (bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [chatHistory, isPending, queryStatus]);

  return (
    <div className="flex-1 overflow-auto relative bg-transparent animate-in fade-in duration-500">
      <ScrollArea className="h-full md:px-10 py-0" ref={scrollRef}>
        <div className="space-y-10 pb-4 max-w-5xl mx-auto min-h-[500px]">
          {chatHistory.map((msg, idx) => (
            <ChatMessageBubble key={idx} msg={msg} documents={documents} />
          ))}

          {isPending && (
            <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="h-10 w-10 rounded-full bg-card p-1.5 flex items-center justify-center shrink-0 border shadow-sm mt-auto mb-1">
                <img
                  src={doggieSrc}
                  alt="Bot"
                  className="h-full w-full object-contain"
                />
              </div>
              <QueryStatusIndicator status={queryStatus} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};
